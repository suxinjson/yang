import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

export function databaseOptions(env = process.env) {
  const url = env.DATABASE_URL ? new URL(env.DATABASE_URL) : null
  const database = url ? decodeURIComponent(url.pathname.slice(1)) : env.PGDATABASE
  const user = url ? decodeURIComponent(url.username) : env.PGUSER
  if (!database || !user || database === 'member' || ['member', 'member_app', 'postgres'].includes(user)) throw new Error('请使用独立数据库和专用业务账号，禁止使用 member 库或现有系统账号')
  return { ...(url ? { connectionString: env.DATABASE_URL } : { host: env.PGHOST || 'db', port: Number(env.PGPORT || 5432), database, user, password: env.PGPASSWORD }),
    max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, application_name: 'ganglegang' }
}

// Every mutation has one commit boundary before its response; snapshots are detached.
export function createSerialExecutor() {
  let tail = Promise.resolve()
  return task => { const result = tail.then(task); tail = result.catch(() => {}); return result }
}

export class PostgresStateRepository {
  static async open(migrate) {
    const repository = new PostgresStateRepository()
    try {
      repository.pool = new pg.Pool(databaseOptions())
      repository.pool.on('error', () => console.error('PostgreSQL 连接中断'))
      repository.lock = await repository.pool.connect()
      // The room coordinator currently supports one instance. Refuse stale-cache writers.
      const lock = await repository.lock.query('SELECT pg_try_advisory_lock(721614, 1) AS acquired')
      if (!lock.rows[0].acquired) throw new Error('已有游戏实例连接此库，请勿同时启动多个实例')
      const version = await repository.lock.query('SELECT version FROM app_schema_version WHERE version=1')
      if (!version.rowCount) throw new Error('请先备份并执行 npm run db:migrate')
      const state = await repository.lock.query('SELECT payload FROM gameplay_state WHERE id=1')
      if (!state.rowCount) await repository.save(migrate())
      const saved = await repository.lock.query('SELECT payload FROM gameplay_state WHERE id=1')
      repository.value = saved.rows[0].payload
      const accounts = await repository.lock.query('SELECT id,payload FROM profiles')
      repository.value.profiles = Object.fromEntries(accounts.rows.map(row => [row.id, { ...row.payload, id: row.id, items: {} }]))
      const items = await repository.lock.query('SELECT profile_id,item_id,quantity,payload FROM inventory')
      for (const row of items.rows) repository.value.profiles[row.profile_id].items[row.item_id] = { ...row.payload, itemId: row.item_id, quantity: Number(row.quantity) }
      
      // Load platform metadata if platform tables exist
      const hasHome = (await repository.lock.query("SELECT to_regclass('public.home_spaces') AS reg")).rows[0]?.reg
      if (hasHome) {
        repository.hasPlatformTables = true
        const homes = await repository.lock.query('SELECT profile_id, wallpaper_id, flooring_id, placed_furnitures FROM home_spaces')
        repository.value.homeSpaces = Object.fromEntries(homes.rows.map(r => [r.profile_id, {
          wallpaperId: r.wallpaper_id,
          flooringId: r.flooring_id,
          placedFurnitures: r.placed_furnitures || []
        }]))

        const avatars = await repository.lock.query('SELECT profile_id, features, equipped_slots FROM player_avatars')
        repository.value.avatars = Object.fromEntries(avatars.rows.map(r => [r.profile_id, {
          features: r.features || {},
          equippedSlots: r.equipped_slots || {}
        }]))

        const companions = await repository.lock.query('SELECT profile_id, partner_name, favorability, partner_avatar, pet_type, pet_hunger, pet_status FROM companion_states')
        repository.value.companions = Object.fromEntries(companions.rows.map(r => [r.profile_id, {
          partnerName: r.partner_name,
          favorability: r.favorability,
          partnerAvatar: r.partner_avatar,
          petType: r.pet_type,
          petHunger: r.pet_hunger,
          petStatus: r.pet_status
        }]))

        const jobs = await repository.lock.query('SELECT profile_id, job_id, started_at, duration_seconds, reward_coins, claimed FROM idle_jobs WHERE claimed = false')
        repository.value.idleJobs = Object.fromEntries(jobs.rows.map(r => [r.profile_id, {
          jobId: r.job_id,
          startedAt: r.started_at,
          durationSeconds: r.duration_seconds,
          rewardCoins: r.reward_coins,
          claimed: r.claimed
        }]))
      }
      return repository
    } catch (error) { await repository.close(); throw error }
  }

  load() { return structuredClone(this.value) }

  async save(value) {
    const client = this.lock
    await client.query('BEGIN')
    try {
      const { profiles = {}, homeSpaces = {}, avatars = {}, companions = {}, idleJobs = {}, ...gameplay } = value
      await client.query('INSERT INTO gameplay_state(id,payload) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload', [JSON.stringify(gameplay)])
      
      for (const profile of Object.values(profiles)) {
        if (JSON.stringify(this.value?.profiles?.[profile.id]) === JSON.stringify(profile)) continue
        const { items = {}, ...account } = profile
        await client.query('INSERT INTO profiles(id,payload) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload', [profile.id, JSON.stringify(account)])
        
        // Write to legacy inventory table (enforces CHECK (quantity >= 0))
        for (const item of Object.values(items)) {
          await client.query(
            'INSERT INTO inventory(profile_id,item_id,quantity,payload) VALUES($1,$2,$3,$4) ON CONFLICT(profile_id,item_id) DO UPDATE SET quantity=excluded.quantity,payload=excluded.payload',
            [profile.id, item.itemId, item.quantity, JSON.stringify(item)]
          )
        }

        // If platform tables are available, sync to normalized tables
        if (this.hasPlatformTables) {
          const gold = Number(profile.goldCoins ?? profile.gold ?? 100)
          const heart = Number(profile.heartCoins ?? profile.heart ?? 0)
          const secretHash = profile.secretHash || '0'.repeat(64)
          await client.query(
            `INSERT INTO player_profiles(profile_id, secret_hash, gold_coins, heart_coins, revision, updated_at)
             VALUES($1, $2, $3, $4, $5, NOW())
             ON CONFLICT(profile_id) DO UPDATE SET gold_coins=excluded.gold_coins, heart_coins=excluded.heart_coins, revision=excluded.revision, updated_at=NOW()`,
            [profile.id, secretHash, gold, heart, profile.revision || 0]
          )

          for (const item of Object.values(items)) {
            const cat = item.category || (item.itemId.startsWith('wardrobe.') ? 'wardrobe' : item.itemId.startsWith('furniture.') ? 'furniture' : 'game_tool')
            await client.query(
              `INSERT INTO player_inventory(profile_id, category, catalog_id, quantity, is_equipped, metadata, updated_at)
               VALUES($1, $2, $3, $4, $5, $6, NOW())
               ON CONFLICT(profile_id, catalog_id) WHERE (category IN ('currency', 'game_tool', 'pet_supply', 'work_token'))
               DO UPDATE SET quantity=excluded.quantity, is_equipped=excluded.is_equipped, metadata=excluded.metadata, updated_at=NOW()`,
              [profile.id, cat, item.itemId, item.quantity, Boolean(item.isEquipped), JSON.stringify(item.metadata || {})]
            )
          }

          if (homeSpaces[profile.id]) {
            const hs = homeSpaces[profile.id]
            await client.query(
              `INSERT INTO home_spaces(profile_id, wallpaper_id, flooring_id, placed_furnitures, updated_at)
               VALUES($1, $2, $3, $4, NOW())
               ON CONFLICT(profile_id) DO UPDATE SET wallpaper_id=excluded.wallpaper_id, flooring_id=excluded.flooring_id, placed_furnitures=excluded.placed_furnitures, updated_at=NOW()`,
              [profile.id, hs.wallpaperId || 'wall_cream', hs.flooringId || 'floor_wood', JSON.stringify(hs.placedFurnitures || [])]
            )
          }

          if (avatars[profile.id]) {
            const av = avatars[profile.id]
            await client.query(
              `INSERT INTO player_avatars(profile_id, features, equipped_slots, updated_at)
               VALUES($1, $2, $3, NOW())
               ON CONFLICT(profile_id) DO UPDATE SET features=excluded.features, equipped_slots=excluded.equipped_slots, updated_at=NOW()`,
              [profile.id, JSON.stringify(av.features || {}), JSON.stringify(av.equippedSlots || {})]
            )
          }

          if (companions[profile.id]) {
            const cp = companions[profile.id]
            await client.query(
              `INSERT INTO companion_states(profile_id, partner_name, favorability, partner_avatar, pet_type, pet_hunger, pet_status, updated_at)
               VALUES($1, $2, $3, $4, $5, $6, $7, NOW())
               ON CONFLICT(profile_id) DO UPDATE SET partner_name=excluded.partner_name, favorability=excluded.favorability, partner_avatar=excluded.partner_avatar, pet_type=excluded.pet_type, pet_hunger=excluded.pet_hunger, pet_status=excluded.pet_status, updated_at=NOW()`,
              [profile.id, cp.partnerName || '亲爱的', cp.favorability || 100, JSON.stringify(cp.partnerAvatar || {}), cp.petType || 'cat', cp.petHunger || 80, cp.petStatus || 'idle']
            )
          }

          if (idleJobs[profile.id]) {
            const ij = idleJobs[profile.id]
            await client.query(
              `INSERT INTO idle_jobs(profile_id, job_id, started_at, duration_seconds, reward_coins, claimed)
               VALUES($1, $2, $3, $4, $5, $6)
               ON CONFLICT(profile_id) DO UPDATE SET job_id=excluded.job_id, started_at=excluded.started_at, duration_seconds=excluded.duration_seconds, reward_coins=excluded.reward_coins, claimed=excluded.claimed`,
              [profile.id, ij.jobId, ij.startedAt, ij.durationSeconds, ij.rewardCoins, Boolean(ij.claimed)]
            )
          }
        }
      }
      await client.query('COMMIT')
      this.value = structuredClone(value)
    } catch (error) { await client.query('ROLLBACK'); throw error }
  }

  async close() { if (this.lock) { this.lock.release(true); this.lock = null }; await this.pool?.end() }
}

export class FileStateRepository {
  constructor(file, migrate, write) {
    this.file = file
    this.write = write
    if (!fs.existsSync(file)) this.write(file, migrate())
  }
  load() { return JSON.parse(fs.readFileSync(this.file, 'utf8')) }
  async save(value) { this.write(this.file, value) }
  async close() {}
}

export async function openStateRepository(directory, migrate, write) {
  const driver = process.env.STORAGE_DRIVER || (process.env.DATABASE_URL || process.env.PGDATABASE ? 'postgres' : 'file')
  if (driver === 'postgres') return PostgresStateRepository.open(migrate)
  if (driver !== 'file') throw new Error('未知的数据存储类型')
  return new FileStateRepository(path.join(directory, 'coupon-ledger.json'), migrate, write)
}
