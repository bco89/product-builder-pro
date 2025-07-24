import { logger } from "./logger.server";

interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * Simple in-memory request deduplication cache.
 * Prevents duplicate API calls for the same data within a short time window.
 */
export class RequestCache {
  private static instance: RequestCache;
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 100; // 100ms cleanup delay

  private constructor() {} // Singleton pattern

  static getInstance(): RequestCache {
    if (!RequestCache.instance) {
      RequestCache.instance = new RequestCache();
    }
    return RequestCache.instance;
  }

  /**
   * Deduplicates requests by returning existing promises for identical keys.
   * Automatically cleans up cache entries after the promise resolves.
   */
  async deduplicate<T>(
    key: string, 
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check if we have a recent request for this key
    const existing = this.cache.get(key);
    if (existing) {
      logger.info(`Request deduplication hit for key: ${key}`);
      return existing.promise as Promise<T>;
    }

    logger.info(`Request deduplication miss for key: ${key}`);
    
    // Create new request
    const promise = fetcher();
    this.cache.set(key, {
      promise,
      timestamp: Date.now()
    });

    // Clean up after response (success or failure)
    promise.finally(() => {
      setTimeout(() => {
        this.cache.delete(key);
        logger.debug(`Cleaned up cache entry for key: ${key}`);
      }, ttl);
    });

    return promise;
  }

  /**
   * Generates a cache key from request parameters
   */
  static generateKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${endpoint}|${sortedParams}`;
  }

  /**
   * Clears all cache entries (useful for testing)
   */
  clear(): void {
    this.cache.clear();
    logger.info('Request cache cleared');
  }

  /**
   * Gets current cache size (useful for monitoring)
   */
  get size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const requestCache = RequestCache.getInstance();