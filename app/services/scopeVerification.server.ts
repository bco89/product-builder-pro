import { logger } from "./logger.server";

// Define the required scopes for the app
const REQUIRED_SCOPES = ["write_products", "read_products"];

interface ScopeCheckResult {
  hasRequiredScopes: boolean;
  missingScopes: string[];
  currentScopes: string[];
}

export async function checkScopes(admin: any): Promise<ScopeCheckResult> {
  try {
    // Query current app installation scopes
    const response = await admin.graphql(
      `#graphql
      query getCurrentScopes {
        currentAppInstallation {
          accessScopes {
            handle
          }
        }
      }`
    );

    const data = await response.json();
    
    if (data.errors) {
      logger.error("Error fetching current scopes", { errors: data.errors });
      throw new Error("Failed to fetch current scopes");
    }

    // Extract current scopes
    const currentScopes = data.data?.currentAppInstallation?.accessScopes?.map(
      (scope: { handle: string }) => scope.handle
    ) || [];

    logger.info("Current scopes check", { 
      currentScopes, 
      requiredScopes: REQUIRED_SCOPES 
    });

    // Check if all required scopes are present
    const missingScopes = REQUIRED_SCOPES.filter(
      scope => !currentScopes.includes(scope)
    );

    return {
      hasRequiredScopes: missingScopes.length === 0,
      missingScopes,
      currentScopes
    };
  } catch (error) {
    logger.error("Scope verification failed", { error });
    // On error, assume scopes are missing to trigger re-auth
    return {
      hasRequiredScopes: false,
      missingScopes: REQUIRED_SCOPES,
      currentScopes: []
    };
  }
}

export function buildOAuthUrl(shop: string, host: string): string {
  const clientId = process.env.SHOPIFY_API_KEY;
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/oauth`;
  const scopes = REQUIRED_SCOPES.join(',');
  
  // Generate a random state for security
  const state = Math.random().toString(36).substring(7);
  
  const oauthUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${clientId}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`;
  
  logger.info("Built OAuth URL", { shop, scopes, redirectUri });
  
  return oauthUrl;
}