import Redis from 'ioredis'

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'burgerm1nute',
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableOfflineQueue: false,
  commandTimeout: 5000,
})

redis.on('error', (err) => {
  console.error('Redis error:', err)
})
