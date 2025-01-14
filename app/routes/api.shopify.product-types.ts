import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { CacheService } from "../services/cacheService";
import { GET_PRODUCT_TYPES } from "~/graphql/queries";
import type { ProductTypesResponse } from "../types/shopify";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Try to get from cache first
    const cachedTypes = await CacheService.get<string[]>(session.shop, 'productTypes');
    if (cachedTypes) {
      return json({ productTypes: cachedTypes });
    }

    // If not in cache, fetch from Shopify
    const response = await admin.graphql<ProductTypesResponse>(GET_PRODUCT_TYPES);
    const data = await response.json();
    
    const productTypes = data.data.shop.productTypes.edges.map(edge => edge.node);

    // Cache the results
    await CacheService.set(session.shop, 'productTypes', productTypes);

    return json({ productTypes });

  } catch (error) {
    console.error("Failed to fetch product types:", error);
    return json(
      { 
        message: "Failed to fetch product types",
        error: error.message 
      }, 
      { status: 500 }
    );
  }
}; 