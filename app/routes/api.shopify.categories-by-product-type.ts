import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const vendor = url.searchParams.get('vendor');
  const productType = url.searchParams.get('productType');

  if (!vendor || !productType) {
    return json({ categories: [] });
  }

  try {
    const response = await admin.graphql(
      `#graphql
      query getCategoriesByProductType($query: String!) {
        products(first: 250, query: $query) {
          edges {
            node {
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
          query: `vendor:'${vendor}' AND product_type:'${productType}'`
        }
      }
    );

    const data = await response.json();
    const products = data.data.products.edges;
    
    // Extract unique categories
    const categories = new Map();
    products.forEach(({ node }) => {
      if (node.productCategory?.productTaxonomyNode) {
        const { id, name } = node.productCategory.productTaxonomyNode;
        categories.set(id, { id, name });
      }
    });

    return json({ 
      categories: Array.from(categories.values())
    });
  } catch (error) {
    console.error("Failed to fetch categories by product type:", error);
    return json({ categories: [] });
  }
}; 