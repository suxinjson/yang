import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import pg from 'pg'
import { databaseOptions } from '../shared/stateRepository.js'

const options = databaseOptions()
const directory = path.resolve(process.env.BACKUP_DIR || 'data/backups')
fs.mkdirSync(directory, { recursive: true })
const backup = path.join(directory, 'ganglegang-' + new Date().toISOString().replace(/[:.]/g, '-') + '.dump')
const connection = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
const env = { ...process.env, ...(connection ? { PGHOST: connection.hostname, PGPORT: connection.port || '5432', PGDATABASE: decodeURIComponent(connection.pathname.slice(1)), PGUSER: decodeURIComponent(connection.username), PGPASSWORD: decodeURIComponent(connection.password) } : {}) }
// Passwords stay in the child environment, never command arguments or logs.
const dump = spawnSync(process.env.PG_DUMP_BIN || 'pg_dump', ['--format=custom', '--file', backup], { env, stdio: ['ignore', 'ignore', 'pipe'] })
if (dump.error || dump.status !== 0 || !fs.existsSync(backup) || fs.statSync(backup).size === 0) throw new Error('pg_dump 备份失败，已停止迁移。请检查 PostgreSQL 17 客户端、连接和备份目录')
const pool = new pg.Pool(options)
try {
  const client = await pool.connect()
  try {
    const { rows } = await client.query('SELECT pg_try_advisory_lock(721614,1) AS acquired')
    if (!rows[0].acquired) throw new Error('请先停止游戏服务再执行结构迁移')
    await client.query(fs.readFileSync(new URL('../deploy/schema.sql', import.meta.url), 'utf8'))
    console.log('结构迁移完成；备份：' + backup)
  } finally { client.release(true) }
} finally { await pool.end() }
