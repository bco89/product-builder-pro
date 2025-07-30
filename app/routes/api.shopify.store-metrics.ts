import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface StoreMetrics {
  productCount: number;
  storeSize: 'small' | 'medium' | 'large';
}

export const loader = async ({ request }: { request: Request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    // Get product count from Shopify
    const query = `#graphql
      query GetProductCount {
        productsCount {
          count
        }
      }`;

    const response = await admin.graphql(query);
    const data = await response.json();
    const productCount = data.data.productsCount.count;

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
    console.error('Error fetching store metrics:', error);
    // Default to small store if we can't determine size
    return json({
      productCount: 0,
      storeSize: 'small'
    } as StoreMetrics);
  }
}; 