import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const vendor = url.searchParams.get('vendor');

  if (!vendor) {
    return json({ productTypes: [] });
  }

  try {
    const response = await admin.graphql(
      `#graphql
      query getProductTypesByVendor($query: String!) {
        products(first: 250, query: $query) {
          edges {
            node {
              productType
              productCategory {
                productTaxonomyNode {
                  id
                  name
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          query: `vendor:'${vendor}'`
        }
      }
    );

    const data = await response.json();
    const products = data.data.products.edges;
    
    // Get unique product types
    const productTypesMap = new Map();
    
    products.forEach(({ node }) => {
      if (!productTypesMap.has(node.productType) && node.productType) {
        productTypesMap.set(node.productType, {
          productType: node.productType,
          category: node.productCategory?.productTaxonomyNode || null
        });
      }
    });

    return json({ 
      productTypes: Array.from(productTypesMap.values())
    });
  } catch (error) {
    console.error("Failed to fetch product types by vendor:", error);
    return json({ productTypes: [] });
  }
}; 