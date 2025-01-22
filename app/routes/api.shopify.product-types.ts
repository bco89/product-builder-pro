import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(
      `#graphql
      query getProductTypes {
        products(first: 250) {
          edges {
            node {
              productType
            }
          }
        }
      }`
    );

    const data = await response.json();
    const productTypes = [...new Set(
      data.data.products.edges
        .map((edge: { node: { productType: string } }) => edge.node.productType)
        .filter(Boolean)
    )];

    return json({ productTypes });
  } catch (error) {
    console.error("Failed to fetch product types:", error);
    return json({ productTypes: [] });
  }
}; 