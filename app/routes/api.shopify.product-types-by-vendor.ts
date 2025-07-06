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
    // Try to get cached data first
    const cachedData = await productTypesCache.getAll();
    
    if (cachedData && cachedData.productTypesByVendor) {
      // Use cached data
      const suggestedProductTypes = cachedData.productTypesByVendor[vendor] || [];
      const allProductTypes = cachedData.allProductTypes || [];
      
      return json({
        suggestedProductTypes,
        allProductTypes,
        vendor,
        totalSuggested: suggestedProductTypes.length,
        totalAll: allProductTypes.length
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
    
    // Cache the result
    const cacheData = { 
      productTypesByVendor, 
      allProductTypes: allUniqueProductTypes,
      totalProducts: allProductTypes.length
    };
    await productTypesCache.setAll(cacheData);
    
    // Return vendor-specific data
    const suggestedProductTypes = productTypesByVendor[vendor] || [];
    
    return json({
      suggestedProductTypes,
      allProductTypes: allUniqueProductTypes,
      vendor,
      totalSuggested: suggestedProductTypes.length,
      totalAll: allUniqueProductTypes.length
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