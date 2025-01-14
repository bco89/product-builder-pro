import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(
      `#graphql
      query getVendors {
        shop {
          productVendors(first: 250) {
            edges {
              node
            }
          }
        }
      }`
    );

    const data = await response.json();
    const vendors = data.data.shop.productVendors.edges.map(edge => edge.node);

    return json({ vendors });
  } catch (error) {
    console.error("Failed to fetch vendors:", error);
    return json({ vendors: [] });
  }
}; 