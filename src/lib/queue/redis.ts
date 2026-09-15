import Redis from "ioredis";

function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL && process.env.REDIS_URL.trim() !== ""
    ? process.env.REDIS_URL.trim()
    : undefined;
}

export function isRedisConfigured(): boolean {
  return Boolean(getRedisUrl());
}

let redisInstance: Redis | null = null;

export function getRedisConnection(): Redis | null {
  const url = getRedisUrl();
  if (!url) return null;

  if (!redisInstance) {
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisInstance.on("error", (err) => {
      console.warn("Redis Connection Error:", err.message);
    });
  }

  return redisInstance;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
    } catch {
      redisInstance.disconnect();
    }
    redisInstance = null;
  }
}
