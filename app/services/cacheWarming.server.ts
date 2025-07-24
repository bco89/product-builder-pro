import { CacheService } from './cacheService';
import { logger } from './logger.server';
import { ShopDataService } from './shopData.server';
// Using any type for admin as it's a Shopify-specific object with graphql method
import { GET_VENDORS, GET_PRODUCT_TYPES_BY_VENDOR } from '../graphql';

interface ProductNode {
  productType: string;
  vendor: string;
}

interface ProductEdge {
  node: ProductNode;
}

// Removed unused interface - using direct type annotations instead

interface VendorsData {
  vendors: string[];
  totalVendors: number;
  lastUpdated: number;
}

interface ProductTypesData {
  productTypesByVendor: Record<string, string[]>;
  allProductTypes: string[];
  totalProducts: number;
  lastUpdated: number;
}

export class CacheWarmingService {
  /**
   * Pre-populate cache with common data on app installation
   */
  static async warmCache(shop: string, admin: any) {
    logger.info('Starting cache warming', { shop });
    
    try {
      // Warm vendors cache
      await this.warmVendorsCache(shop, admin);
      
      // Warm product types cache
      await this.warmProductTypesCache(shop, admin);
      
      logger.info('Cache warming completed successfully', { shop });
    } catch (error) {
      logger.error('Cache warming failed', { shop, error });
      // Don't throw - cache warming failures shouldn't break app installation
    }
  }
  
  /**
   * Warm the vendors cache
   */
  private static async warmVendorsCache(shop: string, admin: any) {
    try {
      const allVendors: string[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;
      
      // Fetch all vendors using the dedicated productVendors query
      while (hasNextPage) {
        const vendorQuery = `#graphql
          query getVendors($first: Int!, $after: String) {
            productVendors(first: $first, after: $after, sort: { sortKey: CREATED_AT, reverse: true }) {
              edges {
                cursor
                node
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }`;
        
        const vendorResponse = await admin.graphql(vendorQuery, { 
          variables: { 
            first: 1000, // Max page size for productVendors
            after: cursor 
          } 
        });
        const vendorData: any = await vendorResponse.json();
        
        if (vendorData.errors) {
          logger.error('GraphQL errors warming vendors cache', { 
            shop, 
            errors: vendorData.errors 
          });
          return;
        }
        
        if (vendorData.data?.productVendors?.edges) {
          vendorData.data.productVendors.edges.forEach((edge: { node: string }) => {
            if (edge.node) {
              allVendors.push(edge.node);
            }
          });
          
          hasNextPage = vendorData.data.productVendors.pageInfo.hasNextPage;
          cursor = vendorData.data.productVendors.pageInfo.endCursor;
        } else {
          hasNextPage = false;
        }
      }
      
      // Sort vendors alphabetically
      const sortedVendors = allVendors.sort((a, b) => a.localeCompare(b));
      
      // Cache the result
      const vendorsData: VendorsData = {
        vendors: sortedVendors,
        totalVendors: sortedVendors.length,
        lastUpdated: Date.now()
      };
      
      await CacheService.set(shop, 'vendors', vendorsData);
      
      logger.info('Vendors cache warmed', { 
        shop, 
        vendorCount: sortedVendors.length 
      });
    } catch (error) {
      logger.error('Failed to warm vendors cache', { shop, error });
    }
  }
  
  /**
   * Warm the product types cache
   */
  private static async warmProductTypesCache(shop: string, admin: any) {
    try {
      // Use ShopDataService to fetch all product types efficiently
      const shopDataService = ShopDataService.getInstance(shop);
      const allProductTypes = await shopDataService.getAllProductTypes(admin);
      
      logger.info('All product types fetched for cache warming', { 
        shop, 
        productTypeCount: allProductTypes.length 
      });
      
      // For initial cache warming, we'll also fetch a sample of vendor-specific types
      // Get the first few vendors and their product types
      const { data: vendorsData } = await CacheService.get<VendorsData>(shop, 'vendors');
      
      if (vendorsData && vendorsData.vendors.length > 0) {
        const productTypesByVendor: Record<string, string[]> = {};
        
        // Fetch product types for the first 5 vendors as a sample
        const sampleVendors = vendorsData.vendors.slice(0, 5);
        
        for (const vendor of sampleVendors) {
          const vendorTypes: string[] = [];
          let hasNextPage = true;
          let cursor: string | null = null;
          
          while (hasNextPage) {
            const query = `#graphql
              query getVendorProductTypes($vendor: String!, $first: Int!, $after: String) {
                products(first: $first, query: $vendor, after: $after) {
                  edges {
                    node {
                      productType
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }`;
            
            const response = await admin.graphql(query, { 
              variables: { 
                vendor: `vendor:"${vendor}"`,
                first: 100,
                after: cursor 
              } 
            });
            const data: any = await response.json();
            
            if (data.data?.products?.edges) {
              data.data.products.edges.forEach((edge: { node: { productType: string } }) => {
                if (edge.node.productType && !vendorTypes.includes(edge.node.productType)) {
                  vendorTypes.push(edge.node.productType);
                }
              });
              
              hasNextPage = data.data.products.pageInfo.hasNextPage;
              cursor = data.data.products.pageInfo.endCursor;
            } else {
              hasNextPage = false;
            }
          }
          
          productTypesByVendor[vendor] = vendorTypes.sort();
        }
        
        // Cache the initial data
        const cacheData: ProductTypesData = { 
          productTypesByVendor, 
          allProductTypes: allProductTypes,
          totalProducts: 0, // We don't need to track total products anymore
          lastUpdated: Date.now()
        };
        
        await CacheService.set(shop, 'productTypes', cacheData);
        
        logger.info('Product types cache warmed', { 
          shop, 
          vendorCount: Object.keys(productTypesByVendor).length,
          uniqueProductTypes: allProductTypes.length
        });
      }
    } catch (error) {
      logger.error('Failed to warm product types cache', { shop, error });
    }
  }
  
  /**
   * Refresh stale cache data in the background
   */
  static async refreshStaleCache(shop: string, admin: any, dataType: 'vendors' | 'productTypes') {
    logger.info('Refreshing stale cache in background', { shop, dataType });
    
    try {
      if (dataType === 'vendors') {
        await this.warmVendorsCache(shop, admin);
      } else if (dataType === 'productTypes') {
        await this.warmProductTypesCache(shop, admin);
      }
    } catch (error) {
      logger.error('Background cache refresh failed', { shop, dataType, error });
    }
  }
}