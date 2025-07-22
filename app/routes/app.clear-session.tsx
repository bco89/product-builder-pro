import { LoaderFunction, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server";
import { prisma } from "../db.server";

// This route clears the session to force re-authentication
export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  logger.info("Clearing session for shop", { shop: session.shop });
  
  try {
    // Delete the session from the database
    await prisma.session.deleteMany({
      where: {
        shop: session.shop
      }
    });
    
    // Clear cache entries for this shop
    await prisma.cache.deleteMany({
      where: {
        shop: session.shop
      }
    });
    
    logger.info("Session and cache cleared", { shop: session.shop });
  } catch (error) {
    logger.error("Failed to clear session", { error, shop: session.shop });
  }
  
  // Redirect to login which will trigger re-authentication
  return redirect(`/auth/login?shop=${session.shop}`);
};