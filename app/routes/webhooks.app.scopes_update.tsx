import { authenticate } from "../shopify.server";
import db from "../db.server.ts";
import { logger } from "../services/logger.server.ts";
import { CacheService } from "../services/cacheService";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  logger.webhook(topic, shop);
  const current = payload.current;

  // Mark all sessions for this shop as needing scope refresh
  // This ensures all users will get new tokens with updated scopes
  await db.session.updateMany({
    where: {
      shop: shop,
    },
    data: {
      scope: current.toString(),
      needsScopeRefresh: true,
    },
  });
  
  logger.info(`Marked all sessions for shop ${shop} as needing scope refresh`, {
    newScopes: current.toString(),
    sessionCount: await db.session.count({ where: { shop } })
  });
  
  // Invalidate vendor cache to force refresh with new scopes
  logger.info(`Invalidating vendor cache for shop ${shop} after scope update`);
  await CacheService.invalidate(shop, 'vendors');

  return new Response();
};
