import Redis from 'ioredis'

const REDIS_PASSWORD = process.env.REDIS_PASSWORD
if (!REDIS_PASSWORD) {
  throw new Error('FATAL: REDIS_PASSWORD must be set in environment')
}

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableOfflineQueue: false,
  commandTimeout: 5000,
})

redis.on('error', (err) => {
  console.error('Redis error:', err)
})
