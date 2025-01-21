import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const productType = url.searchParams.get('productType');

  if (!productType) {
    return json({ options: [] });
  }

  try {
    const response = await admin.graphql(
      `#graphql
      query getProductOptions($query: String!) {
        products(first: 250, query: $query) {
          edges {
            node {
              options {
                name
                values
              }
            }
          }
        }
      }`,
      {
        variables: {
          query: `product_type:'${productType}'`
        }
      }
    );

    const data = await response.json();
    const products = data.data.products.edges;
    
    // Get unique option names and their values
    const optionsMap = new Map<string, Set<string>>();
    
    products.forEach(({ node }) => {
      node.options.forEach((option: { name: string; values: string[] }) => {
        if (!optionsMap.has(option.name)) {
          optionsMap.set(option.name, new Set());
        }
        option.values.forEach(value => {
          optionsMap.get(option.name)?.add(value);
        });
      });
    });

    // Convert the map to the desired format
    const options = Array.from(optionsMap.entries()).map(([name, values]) => ({
      name,
      values: Array.from(values)
    }));

    return json({ options });
  } catch (error) {
    console.error("Failed to fetch product options:", error);
    return json({ options: [] });
  }
}; 