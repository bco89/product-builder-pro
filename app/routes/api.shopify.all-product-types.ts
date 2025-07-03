import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { productTypesCache } from "../services/productTypesCache";

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

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    // Check cache first
    const cached = await productTypesCache.getAll();
    if (cached) {
      console.log("Returning cached product types data");
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
    
    const result = { 
      productTypesByVendor, 
      allProductTypes: allUniqueProductTypes,
      totalProducts: allProductTypes.length
    };
    
    // Cache the result
    await productTypesCache.setAll(result);
    
    return json(result);
  } catch (error) {
    console.error("Failed to fetch all product types:", error);
    return json({ 
      error: "Failed to fetch product types",
      productTypesByVendor: {},
      allProductTypes: []
    }, { status: 500 });
  }
}; 