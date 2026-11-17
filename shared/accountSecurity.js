import crypto from 'node:crypto'
import { promisify } from 'node:util'
const scrypt = promisify(crypto.scrypt)

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = await scrypt(password, salt, 64)
  return `scrypt:${salt}:${hash.toString('hex')}`
}
export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false
  if (stored.startsWith('scrypt:')) {
    const [, salt, hash] = stored.split(':')
    if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return false
    return crypto.timingSafeEqual(await scrypt(password, salt, 64), Buffer.from(hash, 'hex'))
  }
  // Migrate existing accounts only after successful password authentication.
  const hash = crypto.createHash('sha256').update(password + '_gang_salt').digest('hex')
  return /^[a-f0-9]{64}$/.test(stored) && crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(stored, 'hex'))
}

export function createAuthLimiter() {
  const attempts = new Map()
  return (req, res, next) => {
    const now = Date.now()
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key)
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase().slice(0, 64) : ''
    const keys = [`ip:${req.ip}`, `account:${username}`]
    if (attempts.size > 20000 || keys.some(key => (attempts.get(key)?.count || 0) >= 10)) return res.status(429).json({ error: '登录尝试过多，请稍后再试' })
    for (const key of keys) {
      const entry = attempts.get(key) || { until: now + 60000, count: 0 }
      entry.count++
      attempts.set(key, entry)
    }
    next()
  }
}
