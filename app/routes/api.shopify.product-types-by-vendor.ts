import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { CacheService } from "../services/cacheService";
import { CacheWarmingService } from "../services/cacheWarming.server";
import { requestCache, RequestCache } from "../services/requestCache.server";
import { ShopDataService } from "../services/shopData.server";
import { GET_PRODUCT_TYPES_BY_VENDOR } from "../graphql";

interface ProductNode {
  productType: string;
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

interface ProductTypesData {
  productTypesByVendor: Record<string, string[]>;
  allProductTypes: string[];
  totalProducts: number;
  lastUpdated?: number;
}

export const loader = async ({ request }: { request: Request }) => {
  const requestId = Logger.generateRequestId();
  const { admin, session } = await authenticateAdmin(request);
  const context = {
    operation: 'producttypesbyvendor',
    shop: session.shop,
    requestId,
  };
  const url = new URL(request.url);
  const vendor = url.searchParams.get('vendor');
  
  if (!vendor) {
    return json({ 
      error: "Vendor parameter is required",
      suggestedProductTypes: [],
      allProductTypes: [],
      vendor: '',
      totalSuggested: 0,
      totalAll: 0
    }, { status: 400 });
  }

  // Generate cache key for request deduplication
  const cacheKey = RequestCache.generateKey('product-types-by-vendor', { vendor });

  try {
    // Use request deduplication to prevent concurrent identical requests
    return await requestCache.deduplicate(cacheKey, async () => {
    // Get shop domain from singleton service (cached for session)
    const shopDataService = ShopDataService.getInstance(request.headers.get('host') || '');
    const shopInfo = await shopDataService.getShopData(admin);
    const shop = shopInfo.myshopifyDomain;

    // Try to get cached data with stale-while-revalidate
    const { data: cachedData, metadata } = await CacheService.get<ProductTypesData>(shop, 'productTypes', {
      staleWhileRevalidate: true,
      onStaleData: async () => {
        // Refresh cache in background
        await CacheWarmingService.refreshStaleCache(shop, admin, 'productTypes');
      }
    });
    
    if (cachedData && cachedData.productTypesByVendor) {
      // Use cached data
      const suggestedProductTypes = cachedData.productTypesByVendor[vendor] || [];
      const allProductTypes = cachedData.allProductTypes || [];
      
      // Return cached data immediately for better performance
      return json({
        suggestedProductTypes,
        allProductTypes,
        vendor,
        totalSuggested: suggestedProductTypes.length,
        totalAll: allProductTypes.length,
        fromCache: true,
        cacheAge: Date.now() - (cachedData.lastUpdated || 0),
        cacheMetadata: metadata
      });
    }

    // If no cached data, fetch fresh data
    // Get all product types from singleton service (cached for session)
    const allProductTypes = await shopDataService.getAllProductTypes(admin);
    
    // Fetch vendor-specific product types (optimized query)
    const vendorProductTypes: string[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    
    // Fetch only products from this vendor with minimal fields
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
          first: 100, // Smaller page size for faster response
          after: cursor 
        } 
      });
      const data = (await response.json()) as ProductsData;
      
      // Process vendor-specific products
      data.data.products.edges.forEach(edge => {
        if (edge.node.productType && !vendorProductTypes.includes(edge.node.productType)) {
          vendorProductTypes.push(edge.node.productType);
        }
      });
      
      hasNextPage = data.data.products.pageInfo.hasNextPage;
      cursor = data.data.products.pageInfo.endCursor;
    }
    
    // Sort vendor-specific types
    const sortedVendorTypes = vendorProductTypes.sort();
    
    // Build optimized cache data structure
    const productTypesByVendor: Record<string, string[]> = {
      [vendor]: sortedVendorTypes
    };
    
    // Cache the result (we'll update the cache structure to be more efficient)
    const cacheData: ProductTypesData = { 
      productTypesByVendor, 
      allProductTypes: allProductTypes,
      totalProducts: vendorProductTypes.length,
      lastUpdated: Date.now()
    };
    
    // Update cache with vendor-specific data
    const existingCache = await CacheService.get<ProductTypesData>(shop, 'productTypes');
    if (existingCache.data) {
      // Merge with existing cache
      cacheData.productTypesByVendor = {
        ...existingCache.data.productTypesByVendor,
        [vendor]: sortedVendorTypes
      };
    }
    
    await CacheService.set(shop, 'productTypes', cacheData);
    
    return json({
      suggestedProductTypes: sortedVendorTypes,
      allProductTypes: allProductTypes,
      vendor,
      totalSuggested: sortedVendorTypes.length,
      totalAll: allProductTypes.length,
      fromCache: false,
      totalProcessed: vendorProductTypes.length
    });
    }); // End of requestCache.deduplicate
    
  } catch (error) {
    return errorResponse(error, context);
  }
}; 