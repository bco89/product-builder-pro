import { prisma } from '../db.server';
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
    await prisma.storeCache.delete({
      where: {
        shop_dataType: {
          shop,
          dataType,
        },
      },
    });
  }
} 