import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { GET_STORE_SETTINGS } from "../graphql";

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticateAdmin(request);

  try {
    // Query the shop to get the default weight unit
    const response = await admin.graphql(GET_STORE_SETTINGS);

    const responseJson = await response.json();
    
    if (responseJson.errors) {
      console.error("GraphQL errors:", responseJson.errors);
      return json(
        { error: "Failed to fetch shop settings" },
        { status: 500 }
      );
    }

    const shop = responseJson.data?.shop;
    
    return json({
      defaultWeightUnit: shop?.weightUnit || 'POUNDS',
      currencyCode: shop?.currencyCode,
      name: shop?.name,
      currencyFormats: shop?.currencyFormats
    });
  } catch (error) {
    console.error("Failed to fetch shop settings:", error);
    return json(
      { error: "Failed to fetch shop settings" },
      { status: 500 }
    );
  }
}; 