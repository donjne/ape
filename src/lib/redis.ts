import { Redis } from 'ioredis';
import type { Token } from '@/types/token'

// Create Redis instance
const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  throw new Error('REDIS_URL is not defined');
};

export const redis = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) {
      return null; // stop retrying
    }
    return Math.min(times * 50, 2000); // exponential backoff
  }
});

// Error handling
redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('Redis Client Connected');
});

// Helper functions for token operations
export const tokenHelpers = {
  async storeToken(token: Token) {
    await redis.set(
      `token:${token.mintAddress}`, 
      JSON.stringify(token),
      'EX',
      86400 // expire after 24 hours
    );
  },

  async getToken(mintAddress: string): Promise<Token | null> {
    const token = await redis.get(`token:${mintAddress}`);
    return token ? JSON.parse(token) : null;
  },

  async getAllTokens(): Promise<Token[]> {
    const keys = await redis.keys('token:*');
    if (keys.length === 0) return [];
    
    const tokens = await redis.mget(keys);
    return tokens
      .filter((token): token is string => token !== null)
      .map(token => JSON.parse(token));
  },

  async removeToken(mintAddress: string) {
    await redis.del(`token:${mintAddress}`);
  }
};