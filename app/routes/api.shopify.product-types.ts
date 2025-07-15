import { authenticate } from "../shopify.server";
import { errorResponse, successResponse, logApiRequest } from "../utils/api-response";

export const loader = async ({ request }: { request: Request }) => {
  const { admin, session } = await authenticate.admin(request);

  logApiRequest("api.shopify.product-types", "GET", { shop: session.shop });

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

    return successResponse({ productTypes });
  } catch (error) {
    return errorResponse(
      error,
      "Failed to fetch product types",
      { shop: session.shop, endpoint: "api.shopify.product-types" }
    );
  }
}; 