import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { logger } from "./logger.server";

interface ShopData {
  shop: string;
  name: string;
  email?: string;
  myshopifyDomain: string;
}

interface StoreSettings {
  defaultWeightUnit: 'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS';
}

interface StoreMetrics {
  productCount: number;
  storeSize: 'small' | 'medium' | 'large';
}

interface AllProductTypes {
  types: string[];
  lastUpdated: number;
}

/**
 * Singleton service for caching shop-level data that rarely changes.
 * Reduces redundant API calls for shop domain, settings, and global data.
 */
export class ShopDataService {
  private static instances = new Map<string, ShopDataService>();
  
  private shopData: ShopData | null = null;
  private storeSettings: StoreSettings | null = null;
  private storeMetrics: StoreMetrics | null = null;
  private allProductTypes: AllProductTypes | null = null;
  private validationCache = new Map<string, { result: any; timestamp: number }>();
  
  private readonly VALIDATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly ALL_TYPES_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  private constructor(private shopDomain: string) {
    // Private constructor for singleton pattern
  }

  static getInstance(shopDomain: string): ShopDataService {
    if (!ShopDataService.instances.has(shopDomain)) {
      ShopDataService.instances.set(shopDomain, new ShopDataService(shopDomain));
    }
    return ShopDataService.instances.get(shopDomain)!;
  }

  /**
   * Gets shop data, fetching if not cached
   */
  async getShopData(admin: AdminApiContext): Promise<ShopData> {
    if (this.shopData) {
      logger.debug('Shop data cache hit', { shop: this.shopDomain });
      return this.shopData;
    }

    logger.info('Fetching shop data', { shop: this.shopDomain });
    
    const response = await admin.graphql(
      `#graphql
      query getShopData {
        shop {
          name
          email
          myshopifyDomain
        }
      }`
    );

    const data = await response.json();
    
    if (data.errors) {
      logger.error('Failed to fetch shop data', { errors: data.errors });
      throw new Error('Failed to fetch shop data');
    }

    this.shopData = {
      shop: this.shopDomain,
      ...data.data.shop
    };

    return this.shopData;
  }

  /**
   * Gets store settings, fetching if not cached
   */
  async getStoreSettings(admin: AdminApiContext): Promise<StoreSettings> {
    if (this.storeSettings) {
      logger.debug('Store settings cache hit', { shop: this.shopDomain });
      return this.storeSettings;
    }

    logger.info('Fetching store settings', { shop: this.shopDomain });
    
    const response = await admin.graphql(
      `#graphql
      query getStoreSettings {
        shop {
          weightUnit
        }
      }`
    );

    const data = await response.json();
    
    if (data.errors) {
      logger.error('Failed to fetch store settings', { errors: data.errors });
      throw new Error('Failed to fetch store settings');
    }

    this.storeSettings = {
      defaultWeightUnit: data.data.shop.weightUnit
    };

    return this.storeSettings;
  }

  /**
   * Gets store metrics, fetching if not cached
   */
  async getStoreMetrics(admin: AdminApiContext): Promise<StoreMetrics> {
    if (this.storeMetrics) {
      logger.debug('Store metrics cache hit', { shop: this.shopDomain });
      return this.storeMetrics;
    }

    logger.info('Fetching store metrics', { shop: this.shopDomain });
    
    const response = await admin.graphql(
      `#graphql
      query getStoreMetrics {
        productsCount {
          count
        }
      }`
    );

    const data = await response.json();
    
    if (data.errors) {
      logger.error('Failed to fetch store metrics', { errors: data.errors });
      throw new Error('Failed to fetch store metrics');
    }

    const productCount = data.data.productsCount.count;
    let storeSize: 'small' | 'medium' | 'large' = 'small';
    
    if (productCount > 1000) {
      storeSize = 'large';
    } else if (productCount > 100) {
      storeSize = 'medium';
    }

    this.storeMetrics = {
      productCount,
      storeSize
    };

    return this.storeMetrics;
  }

  /**
   * Gets all product types, fetching if not cached or stale
   */
  async getAllProductTypes(admin: AdminApiContext): Promise<string[]> {
    const now = Date.now();
    
    if (this.allProductTypes && (now - this.allProductTypes.lastUpdated) < this.ALL_TYPES_CACHE_TTL) {
      logger.debug('All product types cache hit', { shop: this.shopDomain });
      return this.allProductTypes.types;
    }

    logger.info('Fetching all product types', { shop: this.shopDomain });
    
    const allTypes: string[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    // Use productTypes query for efficiency
    while (hasNextPage) {
      const response = await admin.graphql(
        `#graphql
        query getAllProductTypes($first: Int!, $after: String) {
          productTypes(first: $first, after: $after) {
            edges {
              node
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }`,
        {
          variables: {
            first: 250, // Max allowed
            after: cursor
          }
        }
      );

      const data = await response.json();
      
      if (data.errors) {
        logger.error('Failed to fetch product types', { errors: data.errors });
        throw new Error('Failed to fetch product types');
      }

      if (data.data?.productTypes?.edges) {
        data.data.productTypes.edges.forEach((edge: { node: string }) => {
          if (edge.node) {
            allTypes.push(edge.node);
          }
        });

        hasNextPage = data.data.productTypes.pageInfo.hasNextPage;
        cursor = data.data.productTypes.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    }

    // Sort alphabetically
    const sortedTypes = allTypes.sort((a, b) => a.localeCompare(b));

    this.allProductTypes = {
      types: sortedTypes,
      lastUpdated: now
    };

    return sortedTypes;
  }

  /**
   * Caches validation results to prevent redundant checks
   */
  cacheValidationResult(type: string, value: string, result: any): void {
    const key = `${type}:${value}`;
    this.validationCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Gets cached validation result if available and not expired
   */
  getCachedValidationResult(type: string, value: string): any | null {
    const key = `${type}:${value}`;
    const cached = this.validationCache.get(key);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.VALIDATION_CACHE_TTL) {
      this.validationCache.delete(key);
      return null;
    }
    
    logger.debug('Validation cache hit', { type, value });
    return cached.result;
  }

  /**
   * Clears all cached data for this shop
   */
  clearCache(): void {
    this.shopData = null;
    this.storeSettings = null;
    this.storeMetrics = null;
    this.allProductTypes = null;
    this.validationCache.clear();
    logger.info('Shop data cache cleared', { shop: this.shopDomain });
  }

  /**
   * Clears all instances (useful for testing)
   */
  static clearAllInstances(): void {
    ShopDataService.instances.clear();
  }
}