import { prisma } from '../db.server.ts';
import type { CacheData, CacheableDataType } from '../types/shopify';
import { logger } from './logger.server';

const CACHE_TTL = 1000 * 60 * 15; // 15 minutes in milliseconds
const STALE_THRESHOLD = 0.8; // Consider cache stale at 80% of TTL

export interface CacheGetOptions {
  /**
   * If true, returns stale data while refreshing in background
   */
  staleWhileRevalidate?: boolean;
  /**
   * Callback to refresh data in background
   */
  onStaleData?: () => Promise<void>;
}

export interface CacheMetadata {
  isStale: boolean;
  age: number;
  remainingTTL: number;
  hitRate?: number;
}

export class CacheService {
  private static hitStats = new Map<string, { hits: number; misses: number }>();
  
  /**
   * Get cached data with optional stale-while-revalidate support
   */
  static async get<T>(
    shop: string, 
    dataType: CacheableDataType,
    options?: CacheGetOptions
  ): Promise<{ data: T | null; metadata?: CacheMetadata }> {
    const cacheKey = `${shop}:${dataType}`;
    const stats = this.getStats(cacheKey);
    
    const cached = await prisma.storeCache.findUnique({
      where: {
        shop_dataType: {
          shop,
          dataType,
        },
      },
    });

    if (!cached) {
      stats.misses++;
      logger.debug('Cache miss', { shop, dataType, hitRate: this.getHitRate(cacheKey) });
      return { data: null };
    }

    try {
      const parsedData = JSON.parse(cached.data) as CacheData<T>;
      const now = Date.now();
      const age = now - parsedData.timestamp;
      const expiresAt = new Date(cached.expiresAt).getTime();
      const remainingTTL = expiresAt - now;
      const isExpired = now > expiresAt;
      const isStale = age > (CACHE_TTL * STALE_THRESHOLD);
      
      const metadata: CacheMetadata = {
        isStale,
        age,
        remainingTTL: Math.max(0, remainingTTL),
        hitRate: this.getHitRate(cacheKey)
      };

      // If expired and not using stale-while-revalidate, return null
      if (isExpired && !options?.staleWhileRevalidate) {
        stats.misses++;
        logger.debug('Cache expired', { shop, dataType, age, metadata });
        return { data: null, metadata };
      }

      // We have data - it's a hit
      stats.hits++;
      
      // If stale or expired and we have a refresh callback, trigger it
      if ((isStale || isExpired) && options?.onStaleData) {
        logger.info('Serving stale cache, refreshing in background', { 
          shop, 
          dataType, 
          age, 
          isExpired,
          metadata 
        });
        
        // Fire and forget - don't await
        options.onStaleData().catch(error => {
          logger.error('Background cache refresh failed', { shop, dataType, error });
        });
      }

      logger.debug('Cache hit', { 
        shop, 
        dataType, 
        isStale, 
        age, 
        metadata 
      });
      
      return { data: parsedData.data, metadata };
    } catch (error) {
      stats.misses++;
      logger.error('Failed to parse cached data', { shop, dataType, error });
      return { data: null };
    }
  }

  /**
   * Legacy get method for backward compatibility
   */
  static async getLegacy<T>(shop: string, dataType: CacheableDataType): Promise<T | null> {
    const result = await this.get<T>(shop, dataType);
    return result.data;
  }

  static async set<T>(
    shop: string,
    dataType: CacheableDataType,
    data: T,
    ttl: number = CACHE_TTL
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    const cacheData: CacheData<T> = {
      data,
      timestamp: now.getTime(),
      expiresAt: expiresAt.getTime(),
    };

    await prisma.storeCache.upsert({
      where: {
        shop_dataType: {
          shop,
          dataType,
        },
      },
      update: {
        data: JSON.stringify(cacheData),
        expiresAt,
      },
      create: {
        shop,
        dataType,
        data: JSON.stringify(cacheData),
        expiresAt,
      },
    });
    
    logger.debug('Cache set', { shop, dataType, ttl });
  }

  static async invalidate(shop: string, dataType: CacheableDataType): Promise<void> {
    await prisma.storeCache.delete({
      where: {
        shop_dataType: {
          shop,
          dataType,
        },
      },
    });
    
    logger.debug('Cache invalidated', { shop, dataType });
  }
  
  /**
   * Get cache statistics
   */
  private static getStats(key: string) {
    if (!this.hitStats.has(key)) {
      this.hitStats.set(key, { hits: 0, misses: 0 });
    }
    return this.hitStats.get(key)!;
  }
  
  /**
   * Calculate hit rate for a cache key
   */
  private static getHitRate(key: string): number {
    const stats = this.getStats(key);
    const total = stats.hits + stats.misses;
    return total === 0 ? 0 : (stats.hits / total) * 100;
  }
  
  /**
   * Get all cache statistics
   */
  static getAllStats() {
    const allStats: Record<string, any> = {};
    this.hitStats.forEach((stats, key) => {
      const total = stats.hits + stats.misses;
      allStats[key] = {
        ...stats,
        total,
        hitRate: total === 0 ? 0 : (stats.hits / total) * 100
      };
    });
    return allStats;
  }
  
  /**
   * Clear cache statistics
   */
  static clearStats() {
    this.hitStats.clear();
  }
}