import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { CacheService } from "../services/cacheService";
import { CacheWarmingService } from "../services/cacheWarming.server";

interface ProductNode {
  productType: string;
  vendor: string;
}

interface ProductEdge {
  cursor: string;
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
  const { admin } = await authenticate.admin(request);
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

  try {
    // First, get the shop domain
    const shopResponse = await admin.graphql(
      `#graphql
      query {
        shop {
          myshopifyDomain
        }
      }`
    );
    const shopData = await shopResponse.json();
    const shop = shopData.data.shop.myshopifyDomain;

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
      
      // Process products
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
    
    // Cache the result with proper shop isolation and timestamp
    const cacheData: ProductTypesData = { 
      productTypesByVendor, 
      allProductTypes: allUniqueProductTypes,
      totalProducts: allProductTypes.length,
      lastUpdated: Date.now()
    };
    await CacheService.set(shop, 'productTypes', cacheData);
    
    // Return vendor-specific data
    const suggestedProductTypes = productTypesByVendor[vendor] || [];
    
    return json({
      suggestedProductTypes,
      allProductTypes: allUniqueProductTypes,
      vendor,
      totalSuggested: suggestedProductTypes.length,
      totalAll: allUniqueProductTypes.length,
      fromCache: false,
      totalProcessed: allProductTypes.length
    });
    
  } catch (error) {
    console.error("Failed to fetch product types by vendor:", error);
    return json({ 
      error: "Failed to fetch product types",
      suggestedProductTypes: [],
      allProductTypes: [],
      vendor,
      totalSuggested: 0,
      totalAll: 0
    }, { status: 500 });
  }
}; 