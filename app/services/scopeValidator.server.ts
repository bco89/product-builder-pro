/**
 * Scope validation service
 * Validates that the current session has all required scopes
 */

import { logger } from "./logger.server";

// Get configured scopes from the shopify.server.js configuration
const REQUIRED_SCOPES = ["write_products", "read_products"];

export interface ScopeValidationResult {
  isValid: boolean;
  missingScopes: string[];
  sessionScopes: string[];
  requiredScopes: string[];
}

/**
 * Validates that a session has all required scopes
 */
export function validateSessionScopes(sessionScopes: string | null): ScopeValidationResult {
  // Parse session scopes
  const currentScopes = sessionScopes ? sessionScopes.split(',').map(s => s.trim()) : [];
  
  // Find missing scopes
  const missingScopes = REQUIRED_SCOPES.filter(scope => !currentScopes.includes(scope));
  
  const result: ScopeValidationResult = {
    isValid: missingScopes.length === 0,
    missingScopes,
    sessionScopes: currentScopes,
    requiredScopes: REQUIRED_SCOPES
  };
  
  if (!result.isValid) {
    logger.warn("Session has missing scopes", {
      currentScopes,
      requiredScopes: REQUIRED_SCOPES,
      missingScopes
    });
  }
  
  return result;
}

/**
 * Checks if a session needs to be refreshed due to scope changes
 */
export function sessionNeedsRefresh(session: { scope: string | null; needsScopeRefresh?: boolean }): boolean {
  // Check if explicitly marked for refresh
  if (session.needsScopeRefresh) {
    return true;
  }
  
  // Check if scopes are missing
  const validation = validateSessionScopes(session.scope);
  return !validation.isValid;
}