"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class RateLimiter {
    redis;
    buckets = new Map();
    maxPerMinute;
    constructor(redisUrl, maxPerMinute = 120) {
        this.maxPerMinute = maxPerMinute;
        this.redis = redisUrl ? new ioredis_1.default(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 }) : null;
    }
    async consume(key) {
        if (this.redis) {
            return this.consumeRedis(key);
        }
        return this.consumeMemory(key);
    }
    async consumeRedis(key) {
        if (!this.redis) {
            return this.consumeMemory(key);
        }
        const now = Date.now();
        const window = Math.floor(now / 60000);
        const redisKey = `rate:${window}:${key}`;
        try {
            if (this.redis.status !== 'ready') {
                await this.redis.connect();
            }
            const count = await this.redis.incr(redisKey);
            if (count === 1) {
                await this.redis.expire(redisKey, 60);
            }
            return {
                allowed: count <= this.maxPerMinute,
                remaining: Math.max(0, this.maxPerMinute - count),
                resetInSeconds: 60 - Math.floor((now % 60000) / 1000),
            };
        }
        catch {
            return this.consumeMemory(key);
        }
    }
    consumeMemory(key) {
        const now = Date.now();
        const existing = this.buckets.get(key);
        if (!existing || existing.resetAt <= now) {
            this.buckets.set(key, {
                count: 1,
                resetAt: now + 60_000,
            });
            return { allowed: true, remaining: this.maxPerMinute - 1, resetInSeconds: 60 };
        }
        existing.count += 1;
        this.buckets.set(key, existing);
        return {
            allowed: existing.count <= this.maxPerMinute,
            remaining: Math.max(0, this.maxPerMinute - existing.count),
            resetInSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }
}
exports.RateLimiter = RateLimiter;
