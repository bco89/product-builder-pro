import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { CacheService } from "../services/cacheService";
import { GET_VENDORS } from "../graphql/queries";
import type { VendorsResponse } from "../types/shopify";

export const loader = async ({ request }: { request: Request }) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Try to get from cache first
    const cachedVendors = await CacheService.get<string[]>(session.shop, 'vendors');
    if (cachedVendors) {
      return json({ vendors: cachedVendors });
    }

    // If not in cache, fetch from Shopify
    const response = await admin.graphql<VendorsResponse>(GET_VENDORS);
    const data = await response.json();
    
    const vendors = data.data.shop.productVendors.edges.map(edge => edge.node);

    // Cache the results
    await CacheService.set(session.shop, 'vendors', vendors);

    return json({ vendors });

  } catch (error) {
    console.error("Failed to fetch vendors:", error);
    return json(
      { 
        message: "Failed to fetch vendors",
        error: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}; 