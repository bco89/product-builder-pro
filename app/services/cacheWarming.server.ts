import { CacheService } from './cacheService';
import { logger } from './logger.server';
import type { AdminApiContext } from '@shopify/shopify-app-remix/server';

interface ProductNode {
  productType: string;
  vendor: string;
}

interface ProductEdge {
  node: ProductNode;
}

interface ProductsData {
  data: {
    products: {
      edges: ProductEdge[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
    };
  };
}

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
  static async warmCache(shop: string, admin: AdminApiContext) {
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
  private static async warmVendorsCache(shop: string, admin: AdminApiContext) {
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
        const vendorData = await vendorResponse.json();
        
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
  private static async warmProductTypesCache(shop: string, admin: AdminApiContext) {
    try {
      const allProductTypes: { productType: string; vendor: string }[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;
      
      // Fetch all products with pagination
      while (hasNextPage) {
        const query = `#graphql
          query getProductTypes($cursor: String) {
            products(first: 250, after: $cursor) {
              edges {
                cursor
                node {
                  productType
                  vendor
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }`;
        
        const response = await admin.graphql(query, { 
          variables: { cursor } 
        });
        const data = (await response.json()) as ProductsData;
        
        if (data.data?.products?.edges) {
          data.data.products.edges.forEach(edge => {
            if (edge.node.productType && edge.node.vendor) {
              allProductTypes.push({
                productType: edge.node.productType,
                vendor: edge.node.vendor
              });
            }
          });
          
          hasNextPage = data.data.products.pageInfo.hasNextPage;
          cursor = data.data.products.pageInfo.endCursor;
        } else {
          hasNextPage = false;
        }
      }
      
      // Group by vendor and deduplicate
      const productTypesByVendor: Record<string, string[]> = {};
      allProductTypes.forEach(item => {
        if (!productTypesByVendor[item.vendor]) {
          productTypesByVendor[item.vendor] = [];
        }
        if (!productTypesByVendor[item.vendor].includes(item.productType)) {
          productTypesByVendor[item.vendor].push(item.productType);
        }
      });
      
      // Sort product types within each vendor
      Object.keys(productTypesByVendor).forEach(vendorKey => {
        productTypesByVendor[vendorKey].sort();
      });
      
      // Get all unique product types
      const allUniqueProductTypes = [...new Set(allProductTypes.map(pt => pt.productType))].sort();
      
      // Cache the result
      const cacheData: ProductTypesData = { 
        productTypesByVendor, 
        allProductTypes: allUniqueProductTypes,
        totalProducts: allProductTypes.length,
        lastUpdated: Date.now()
      };
      
      await CacheService.set(shop, 'productTypes', cacheData);
      
      logger.info('Product types cache warmed', { 
        shop, 
        vendorCount: Object.keys(productTypesByVendor).length,
        uniqueProductTypes: allUniqueProductTypes.length,
        totalProducts: allProductTypes.length
      });
    } catch (error) {
      logger.error('Failed to warm product types cache', { shop, error });
    }
  }
  
  /**
   * Refresh stale cache data in the background
   */
  static async refreshStaleCache(shop: string, admin: AdminApiContext, dataType: 'vendors' | 'productTypes') {
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