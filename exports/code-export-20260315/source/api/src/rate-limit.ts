import Redis from 'ioredis'

interface ConsumeResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

interface Bucket {
  count: number
  resetAt: number
}

export class RateLimiter {
  private redis: Redis | null
  private buckets = new Map<string, Bucket>()
  private readonly maxPerMinute: number

  constructor(redisUrl: string | undefined, maxPerMinute = 120) {
    this.maxPerMinute = maxPerMinute
    this.redis = redisUrl ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 }) : null
  }

  async consume(key: string): Promise<ConsumeResult> {
    if (this.redis) {
      return this.consumeRedis(key)
    }
    return this.consumeMemory(key)
  }

  private async consumeRedis(key: string): Promise<ConsumeResult> {
    if (!this.redis) {
      return this.consumeMemory(key)
    }

    const now = Date.now()
    const window = Math.floor(now / 60000)
    const redisKey = `rate:${window}:${key}`

    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect()
      }
      const count = await this.redis.incr(redisKey)
      if (count === 1) {
        await this.redis.expire(redisKey, 60)
      }
      return {
        allowed: count <= this.maxPerMinute,
        remaining: Math.max(0, this.maxPerMinute - count),
        resetInSeconds: 60 - Math.floor((now % 60000) / 1000),
      }
    } catch {
      return this.consumeMemory(key)
    }
  }

  private consumeMemory(key: string): ConsumeResult {
    const now = Date.now()
    const existing = this.buckets.get(key)

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + 60_000,
      })
      return { allowed: true, remaining: this.maxPerMinute - 1, resetInSeconds: 60 }
    }

    existing.count += 1
    this.buckets.set(key, existing)

    return {
      allowed: existing.count <= this.maxPerMinute,
      remaining: Math.max(0, this.maxPerMinute - existing.count),
      resetInSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }
}

