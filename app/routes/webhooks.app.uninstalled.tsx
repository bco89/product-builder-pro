import { authenticate } from "../shopify.server";
import db from "../db.server.ts";
import { logger } from "../services/logger.server.ts";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  logger.webhook(topic, shop);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
