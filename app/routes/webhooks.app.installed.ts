import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { CacheWarmingService } from "../services/cacheWarming.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, admin } = await authenticate.webhook(request);

  if (!admin) {
    logger.error("No admin context in app/installed webhook");
    throw new Response("Unauthorized", { status: 401 });
  }

  logger.info("App installed webhook received", { shop, topic });

  try {
    // Warm the cache for this new installation
    await CacheWarmingService.warmCache(shop, admin);
    
    logger.info("App installation completed successfully", { shop });
    
    return new Response("OK", { status: 200 });
  } catch (error) {
    logger.error("Error processing app/installed webhook", { 
      shop, 
      error 
    });
    
    // Return OK to prevent webhook retry - cache warming failures shouldn't break installation
    return new Response("OK", { status: 200 });
  }
};