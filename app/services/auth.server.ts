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
    
    // Provide consistent error responses
    if (error instanceof Response) {
      throw error; // Pass through Shopify responses
    }
    
    // Handle common authentication errors
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    
    if (errorMessage.includes('Invalid session') || errorMessage.includes('Session not found')) {
      throw new Response("Session expired. Please reload the page.", { status: 401 });
    }
    
    if (errorMessage.includes('Missing authorization')) {
      throw new Response("Authorization required. Please log in to continue.", { status: 401 });
    }
    
    // Generic authentication error
    throw new Response("Authentication failed. Please try again.", { status: 401 });
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
    
    // Provide consistent error responses for webhooks
    if (error instanceof Response) {
      throw error; // Pass through Shopify responses
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Webhook authentication failed';
    
    if (errorMessage.includes('Invalid webhook')) {
      throw new Response("Invalid webhook signature", { status: 401 });
    }
    
    if (errorMessage.includes('Missing headers')) {
      throw new Response("Required webhook headers missing", { status: 400 });
    }
    
    // Generic webhook error
    throw new Response("Webhook authentication failed", { status: 401 });
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