import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { GET_PRODUCT_COUNT } from "../graphql";

interface StoreMetrics {
  productCount: number;
  storeSize: 'small' | 'medium' | 'large';
}

export const loader = async ({ request }: { request: Request }) => {
  const requestId = Logger.generateRequestId();
  try {
    const { admin, session } = await authenticateAdmin(request);
  const context = {
    operation: 'storemetrics',
    shop: session.shop,
    requestId,
  };

    // Get product count from Shopify
    const response = await admin.graphql(GET_PRODUCT_COUNT);
    const data = await response.json();
    const productCount = data.data?.productsCount?.count || 0;

    // Determine store size based on product count
    let storeSize: 'small' | 'medium' | 'large';
    if (productCount > 10000) {
      storeSize = 'large';
    } else if (productCount > 2000) {
      storeSize = 'medium';
    } else {
      storeSize = 'small';
    }

    const metrics: StoreMetrics = {
      productCount,
      storeSize
    };

    return json(metrics);

  } catch (error) {
    return errorResponse(error, context);
  }
}; 