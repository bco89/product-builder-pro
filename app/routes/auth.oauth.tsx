import { LoaderFunction, redirect } from "@remix-run/node";
import { logger } from "../services/logger.server";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");
  
  logger.info("OAuth callback received", { 
    shop, 
    host,
    searchParams: Object.fromEntries(url.searchParams)
  });

  // After OAuth, redirect back to the app with a flag to skip scope check
  // This prevents an infinite redirect loop
  const redirectUrl = `/app?shop=${shop}&host=${host}&skipScopeCheck=true`;
  
  logger.info("Redirecting after OAuth", { redirectUrl });
  
  return redirect(redirectUrl);
};