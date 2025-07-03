// Simple in-memory cache for product types
// In production, you might want to use Redis or another caching solution

interface ProductTypesData {
  productTypesByVendor: Record<string, string[]>;
  allProductTypes: string[];
  totalProducts: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ProductTypesMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 10 * 60 * 1000; // 10 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Create a singleton instance
const memoryCache = new ProductTypesMemoryCache();

const CACHE_KEY = 'product_types';
const VENDOR_CACHE_PREFIX = 'product_types_vendor_';

export const productTypesCache = {
  async getAll(): Promise<ProductTypesData | null> {
    return memoryCache.get(CACHE_KEY);
  },
  
  async setAll(data: ProductTypesData): Promise<void> {
    memoryCache.set(CACHE_KEY, data);
  },
  
  async getByVendor(vendor: string): Promise<string[] | null> {
    return memoryCache.get(`${VENDOR_CACHE_PREFIX}${vendor}`);
  },
  
  async setByVendor(vendor: string, productTypes: string[]): Promise<void> {
    memoryCache.set(`${VENDOR_CACHE_PREFIX}${vendor}`, productTypes);
  },
  
  async invalidateAll(): Promise<void> {
    memoryCache.clear();
  },
  
  async invalidateVendor(vendor: string): Promise<void> {
    memoryCache.delete(`${VENDOR_CACHE_PREFIX}${vendor}`);
  }
}; 