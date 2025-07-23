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
      logger.warn("Session has missing scopes, but allowing request to continue for App Bridge handling", {
        sessionId: result.session.id,
        shop: result.session.shop,
        currentScope: result.session.scope,
      });
      
      // Don't delete the session - let App Bridge handle scope requests
      // The client-side ScopeCheck component will detect missing scopes
      // and use App Bridge to request them from the user
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