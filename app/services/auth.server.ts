/**
 * Authentication service with integrated logging
 * Provides a cleaner approach to authentication with built-in logging
 */

import { authenticate as shopifyAuthenticate } from "../shopify.server";
import { logger } from "./logger.server.ts";
import { sessionNeedsRefresh } from "./scopeValidator.server.ts";
import db from "../db.server.ts";

/**
 * Authenticate admin requests with logging
 */
export async function authenticateAdmin(request: Request) {
  const startTime = Date.now();
  const url = request.url;
  
  logger.auth("Admin authentication request", { url });
  
  try {
    const result = await shopifyAuthenticate.admin(request);
    
    const duration = Date.now() - startTime;
    logger.auth("Admin authentication successful", {
      url,
      duration,
      hasSession: !!result.session,
      hasAdmin: !!result.admin,
      shop: result.session?.shop,
    });
    
    // Check if the session needs to be refreshed due to scope changes
    if (result.session && sessionNeedsRefresh(result.session)) {
      logger.warn("Session needs refresh due to scope changes", {
        sessionId: result.session.id,
        shop: result.session.shop,
        currentScope: result.session.scope,
      });
      
      // Delete the session to force re-authentication
      try {
        await db.session.delete({
          where: { id: result.session.id }
        });
        
        logger.info("Deleted session with outdated scopes", {
          sessionId: result.session.id,
          shop: result.session.shop
        });
        
        // Throw an error to trigger re-authentication
        throw new Response("Session requires re-authentication due to scope changes", {
          status: 401,
          headers: {
            "X-Shopify-Retry-Invalid-Session-Request": "1"
          }
        });
      } catch (deleteError) {
        // If it's already a Response, re-throw it
        if (deleteError instanceof Response) {
          throw deleteError;
        }
        logger.error("Failed to delete session", deleteError, {
          sessionId: result.session.id
        });
      }
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Admin authentication failed", error, { url, duration });
    throw error;
  }
}

/**
 * Authenticate webhook requests with logging
 */
export async function authenticateWebhook(request: Request) {
  logger.auth("Webhook authentication request", { 
    url: request.url,
    headers: {
      'x-shopify-topic': request.headers.get('x-shopify-topic'),
      'x-shopify-shop-domain': request.headers.get('x-shopify-shop-domain'),
    }
  });
  
  try {
    const result = await shopifyAuthenticate.webhook(request);
    
    logger.auth("Webhook authentication successful", {
      topic: result.topic,
      shop: result.shop,
      hasSession: !!result.session,
    });
    
    return result;
  } catch (error) {
    logger.error("Webhook authentication failed", error);
    throw error;
  }
}

/**
 * Authenticate public requests (no logging needed)
 */
export const authenticatePublic = shopifyAuthenticate.public;

/**
 * Export the original authenticate object for cases where direct access is needed
 */
export const authenticate = shopifyAuthenticate;