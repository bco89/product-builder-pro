import { authenticate } from "../shopify.server";
import db from "../db.server.ts";
import { logger } from "../services/logger.server.ts";
import { CacheService } from "../services/cacheService";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  logger.webhook(topic, shop);
  const current = payload.current;

  if (session) {
    await db.session.update({
      where: {
        id: session.id,
      },
      data: {
        scope: current.toString(),
      },
    });
    
    // Invalidate vendor cache to force refresh with new scopes
    logger.info(`Invalidating vendor cache for shop ${shop} after scope update`);
    await CacheService.invalidate(shop, 'vendors');
  }

  return new Response();
};
