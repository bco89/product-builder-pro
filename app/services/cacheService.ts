import { prisma } from '../db.server.ts';
import type { CacheData, CacheableDataType } from '../types/shopify';

const CACHE_TTL = 1000 * 60 * 15; // 15 minutes in milliseconds

export class CacheService {
  static async get<T>(shop: string, dataType: CacheableDataType): Promise<T | null> {
    const cached = await prisma.storeCache.findUnique({
      where: {
        shop_dataType: {
          shop,
          dataType,
        },
      },
    });

    if (!cached || new Date() > new Date(cached.expiresAt)) {
      return null;
    }

    try {
      const parsedData = JSON.parse(cached.data) as CacheData<T>;
      return parsedData.data;
    } catch (error) {
      console.error('Failed to parse cached data:', error);
      return null;
    }
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
  }

  static async invalidate(shop: string, dataType: CacheableDataType): Promise<void> {
    try {
      await prisma.storeCache.delete({
        where: {
          shop_dataType: {
            shop,
            dataType,
          },
        },
      });
    } catch (error) {
      // Ignore if cache entry doesn't exist
      console.warn(`Cache entry not found for invalidation: ${shop}/${dataType}`);
    }
  }

  static async invalidateAll(shop: string): Promise<void> {
    await prisma.storeCache.deleteMany({
      where: { shop },
    });
  }

  /**
   * Get cached data or fetch it if not available
   * @param shop - Shop domain
   * @param dataType - Type of data to cache
   * @param fetcher - Function to fetch data if not in cache
   * @param ttl - Time to live in milliseconds (optional)
   * @returns Cached or freshly fetched data
   */
  static async getOrFetch<T>(
    shop: string,
    dataType: CacheableDataType,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(shop, dataType);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const freshData = await fetcher();
    
    // Cache the fresh data
    await this.set(shop, dataType, freshData, ttl);
    
    return freshData;
  }

  /**
   * Clear expired cache entries (useful for cleanup)
   */
  static async clearExpired(): Promise<number> {
    const result = await prisma.storeCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  /**
   * Get raw cache entry (for backward compatibility)
   */
  static async getCacheEntry(shop: string, dataType: string) {
    return prisma.storeCache.findUnique({
      where: {
        shop_dataType: {
          shop,
          dataType,
        },
      },
    });
  }

  /**
   * Set raw cache entry (for backward compatibility)
   */
  static async setCacheEntry(
    shop: string,
    dataType: string,
    data: string,
    expiresAt: Date
  ) {
    return prisma.storeCache.upsert({
      where: {
        shop_dataType: {
          shop,
          dataType,
        },
      },
      update: {
        data,
        expiresAt,
      },
      create: {
        shop,
        dataType,
        data,
        expiresAt,
      },
    });
  }
} 