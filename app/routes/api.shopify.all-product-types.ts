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
    Object.keys(productTypesByVendor).forEach(vendor => {
      productTypesByVendor[vendor].sort();
    });
    
    // Get all unique product types
    const allUniqueProductTypes = [...new Set(allProductTypes.map(pt => pt.productType))].sort();
    
    const result: ProductTypesData = { 
      productTypesByVendor, 
      allProductTypes: allUniqueProductTypes,
      totalProducts: allProductTypes.length
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