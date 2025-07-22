import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { CacheService } from "../services/cacheService";
import { logger } from "../services/logger.server.ts";

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
}

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);
  
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

    // Check cache first - properly isolated by shop
    const cached = await CacheService.get<ProductTypesData>(shop, 'productTypes');
    if (cached) {
      logger.info("Returning cached product types data for shop:", { shop });
      return json(cached);
    }

    // First, fetch all product types using the dedicated query
    const allProductTypes: string[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    
    // Fetch all product types with pagination
    while (hasNextPage) {
      const productTypesQuery = `#graphql
        query getProductTypes($first: Int!, $after: String) {
          productTypes(first: $first, after: $after) {
            edges {
              node
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }`;
      
      const productTypesResponse = await admin.graphql(productTypesQuery, { 
        variables: { 
          first: 1000, // Max page size for productTypes
          after: cursor 
        } 
      });
      const productTypesData = await productTypesResponse.json();
      
      if (productTypesData.data?.productTypes?.edges) {
        productTypesData.data.productTypes.edges.forEach((edge: { node: string }) => {
          if (edge.node) {
            allProductTypes.push(edge.node);
          }
        });
        
        hasNextPage = productTypesData.data.productTypes.pageInfo.hasNextPage;
        cursor = productTypesData.data.productTypes.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    }
    
    // Sort all product types alphabetically
    const allUniqueProductTypes = [...new Set(allProductTypes)].sort();
    
    // Now fetch products to build the vendor-product type mapping
    // This is still needed for the productTypesByVendor mapping
    const vendorProductTypes: { productType: string; vendor: string }[] = [];
    hasNextPage = true;
    cursor = null;
    
    while (hasNextPage) {
      const query = `#graphql
        query getProductVendorMapping($cursor: String) {
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
          vendorProductTypes.push({
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
    vendorProductTypes.forEach(item => {
      if (!productTypesByVendor[item.vendor]) {
        productTypesByVendor[item.vendor] = [];
      }
      if (!productTypesByVendor[item.vendor].includes(item.productType)) {
        productTypesByVendor[item.vendor].push(item.productType);
      }
    });
    
    // Sort product types within each vendor
    Object.keys(productTypesByVendor).forEach(vendor => {
      productTypesByVendor[vendor].sort();
    });
    
    const result: ProductTypesData = { 
      productTypesByVendor, 
      allProductTypes: allUniqueProductTypes,
      totalProducts: vendorProductTypes.length
    };
    
    // Cache the result with proper shop isolation
    await CacheService.set(shop, 'productTypes', result);
    
    return json(result);
  } catch (error) {
    logger.error("Failed to fetch all product types:", error);
    return json({ 
      error: "Failed to fetch product types",
      productTypesByVendor: {},
      allProductTypes: []
    }, { status: 500 });
  }
}; 