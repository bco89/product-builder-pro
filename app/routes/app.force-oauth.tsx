import { LoaderFunction, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { buildOAuthUrl } from "../services/scopeVerification.server";
import { logger } from "../services/logger.server";

// This route allows you to manually trigger OAuth re-authorization
// Navigate to /app/force-oauth to test the OAuth flow
export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const host = url.searchParams.get("host") || "";
  
  logger.info("Forcing OAuth re-authorization", { shop: session.shop });
  
  // Build OAuth URL and redirect
  const oauthUrl = buildOAuthUrl(session.shop, host);
  
  return redirect(oauthUrl);
};