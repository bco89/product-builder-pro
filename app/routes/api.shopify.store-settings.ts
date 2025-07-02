import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    // Query the shop to get the default weight unit
    const response = await admin.graphql(
      `#graphql
      query getShopSettings {
        shop {
          weightUnit
        }
      }`
    );

    const responseJson = await response.json();
    
    if (responseJson.errors) {
      console.error("GraphQL errors:", responseJson.errors);
      return json(
        { error: "Failed to fetch shop settings" },
        { status: 500 }
      );
    }

    const weightUnit = responseJson.data?.shop?.weightUnit || 'POUNDS';
    
    return json({
      defaultWeightUnit: weightUnit
    });
  } catch (error) {
    console.error("Failed to fetch shop settings:", error);
    return json(
      { error: "Failed to fetch shop settings" },
      { status: 500 }
    );
  }
}; 