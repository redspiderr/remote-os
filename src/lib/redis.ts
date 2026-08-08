import { createClient, RedisClientType } from 'redis';

// Redis configuration for caching
// Falls back to PostgreSQL if Redis is not available

let redisClient: RedisClientType | null = null;
let isRedisAvailable = false;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient) return redisClient;
  
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!redisUrl) {
    console.warn('Redis not configured — using database directly');
    return null;
  }
  
  try {
    redisClient = createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD || undefined,
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
      isRedisAvailable = false;
    });
    
    redisClient.on('connect', () => {
      console.log('Redis connected');
      isRedisAvailable = true;
    });
    
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.error('Redis connection failed:', err);
    return null;
  }
}

// Cache utilities
export async function cacheGet(key: string): Promise<string | null> {
  const client = await getRedisClient();
  if (!client) return null;
  return client.get(key);
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number = 300 // 5 min default
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  await client.setEx(key, ttlSeconds, value);
}

export async function cacheDelete(key: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  await client.del([key]);
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(keys);
  }
}

// Cache decorator for API routes
export function withCache(
  handler: Function,
  keyGenerator: (req: Request) => string,
  ttlSeconds: number = 300
) {
  return async function cachedHandler(req: Request, ...args: any[]) {
    const cacheKey = keyGenerator(req);
    
    // Try to get from cache
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }
    
    // Call handler
    const response = await handler(req, ...args);
    
    // Cache the response if successful
    if (response.status === 200) {
      const body = await response.clone().text();
      await cacheSet(cacheKey, body, ttlSeconds);
    }
    
    return response;
  };
}
