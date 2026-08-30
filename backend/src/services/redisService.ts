import Redis from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import { config } from '../config/env';

let redisClient: Redis | null = null;
let memoryServer: RedisMemoryServer | null = null;
let redisConnectionOptions: { host: string; port: number; password?: string; tls?: any } = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  tls: config.redis.host.includes('upstash.io') ? {} : undefined,
};

export async function initRedis(): Promise<{ host: string; port: number; password?: string; tls?: any }> {
  try {
    const isUpstash = config.redis.host.includes('upstash.io');
    const tlsConfig = isUpstash ? {} : undefined;

    // Try connecting to configured Redis host
    const testClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      tls: tlsConfig,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null, // don't retry
    });

    testClient.on('error', () => {
      // Suppress unhandled error log during initial connection probe
    });

    await testClient.connect();
    await testClient.ping();
    await testClient.quit();

    console.log(`[Redis] Successfully connected to Redis at ${config.redis.host}:${config.redis.port}`);
    redisConnectionOptions = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      tls: tlsConfig,
    };
    return redisConnectionOptions;
  } catch (err) {
    console.warn(`[Redis] External Redis not running at ${config.redis.host}:${config.redis.port}. Starting in-memory Redis server...`);
    try {
      memoryServer = new RedisMemoryServer();
      const host = await memoryServer.getHost();
      const port = await memoryServer.getPort();

      console.log(`[Redis] Memory Redis Server active at ${host}:${port}`);
      redisConnectionOptions = { host, port };
      return redisConnectionOptions;
    } catch (memErr) {
      console.error('[Redis] Failed to start in-memory Redis server fallback:', memErr);
      throw memErr;
    }
  }
}

export function getRedisOptions() {
  return redisConnectionOptions;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    const opts = getRedisOptions();
    redisClient = new Redis({
      host: opts.host,
      port: opts.port,
      password: opts.password,
      tls: opts.tls,
      maxRetriesPerRequest: null,
    });
    redisClient.on('error', (err) => console.error('[Redis Client Error]', err.message));
  }
  return redisClient;
}

export async function stopRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
