import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { CacheService } from "../services/cacheService";
import { prisma } from "../db.server";
import { logger } from "../services/logger.server";

export const loader = async ({ request }: { request: Request }) => {
  try {
    const { session } = await authenticateAdmin(request);
    
    // Get cache statistics
    const cacheStats = CacheService.getAllStats();
    
    // Get all cache entries for this shop
    const cacheEntries = await prisma.storeCache.findMany({
      where: {
        shop: session.shop
      },
      select: {
        dataType: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Calculate cache entry metadata
    const now = new Date();
    const cacheMetadata = cacheEntries.map(entry => {
      const expiresAt = new Date(entry.expiresAt);
      const age = now.getTime() - entry.updatedAt.getTime();
      const remainingTTL = expiresAt.getTime() - now.getTime();
      const isExpired = remainingTTL <= 0;
      const isStale = age > (15 * 60 * 1000 * 0.8); // 80% of 15 minutes
      
      return {
        dataType: entry.dataType,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        expiresAt: expiresAt,
        age: Math.round(age / 1000), // in seconds
        remainingTTL: Math.round(remainingTTL / 1000), // in seconds
        isExpired,
        isStale
      };
    });
    
    logger.info("Cache stats requested", { 
      shop: session.shop,
      entriesCount: cacheEntries.length 
    });
    
    return json({
      shop: session.shop,
      hitStats: cacheStats,
      cacheEntries: cacheMetadata,
      summary: {
        totalEntries: cacheEntries.length,
        expiredEntries: cacheMetadata.filter(e => e.isExpired).length,
        staleEntries: cacheMetadata.filter(e => e.isStale && !e.isExpired).length,
        freshEntries: cacheMetadata.filter(e => !e.isStale && !e.isExpired).length
      }
    });
  } catch (error) {
    logger.error("Failed to fetch cache stats", { error });
    return json({ error: "Failed to fetch cache statistics" }, { status: 500 });
  }
};