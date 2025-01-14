import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(
      `#graphql
      query getProductTypes {
        shop {
          productTypes(first: 250) {
            edges {
              node
            }
          }
        }
      }`
    );

    const data = await response.json();
    const productTypes = data.data.shop.productTypes.edges.map(edge => edge.node);

    return json({ productTypes });
  } catch (error) {
    console.error("Failed to fetch product types:", error);
    return json({ productTypes: [] });
  }
}; 