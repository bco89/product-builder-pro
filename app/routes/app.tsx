import { Outlet, useLoaderData, useRouteError, useSearchParams, useLocation, useNavigate } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Frame } from '@shopify/polaris';
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useEffect, useMemo } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { checkScopes } from "../services/scopeVerification.server";
import { logger } from "../services/logger.server";
import { CacheService } from "../services/cacheService";
import type { ScopeCheckData } from "../types/shopify";

const queryClient = new QueryClient();

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const host = url.searchParams.get("host") || "";

  // Check if we should skip scope verification (e.g., during OAuth callback)
  const skipScopeCheck = url.searchParams.get("skipScopeCheck") === "true";
  
  let scopeCheck = { hasRequiredScopes: true, missingScopes: [] as string[], currentScopes: [] as string[] };
  
  if (!skipScopeCheck) {
    try {
      // Try to get cached scope check first
      const { data: cachedScopeCheck } = await CacheService.get<ScopeCheckData>(
        session.shop, 
        'scopeCheck',
        {
          staleWhileRevalidate: true,
          onStaleData: async () => {
            // Refresh scope check in background
            try {
              const freshScopeCheck = await checkScopes(admin);
              await CacheService.set(
                session.shop,
                'scopeCheck',
                {
                  ...freshScopeCheck,
                  lastChecked: Date.now()
                } as ScopeCheckData,
                1000 * 60 * 60 * 24 // Cache for 24 hours
              );
            } catch (error) {
              logger.error("Failed to refresh scope check cache", { error, shop: session.shop });
            }
          }
        }
      );
      
      if (cachedScopeCheck) {
        // Use cached scope check
        scopeCheck = {
          hasRequiredScopes: cachedScopeCheck.hasRequiredScopes,
          missingScopes: cachedScopeCheck.missingScopes,
          currentScopes: cachedScopeCheck.currentScopes
        };
        logger.debug("Using cached scope check", {
          shop: session.shop,
          age: Date.now() - cachedScopeCheck.lastChecked
        });
      } else {
        // No cache, check scopes and cache the result
        scopeCheck = await checkScopes(admin);
        
        // Cache the scope check result
        await CacheService.set(
          session.shop,
          'scopeCheck',
          {
            ...scopeCheck,
            lastChecked: Date.now()
          } as ScopeCheckData,
          1000 * 60 * 60 * 24 // Cache for 24 hours
        );
      }
      
      if (!scopeCheck.hasRequiredScopes) {
        logger.warn("Missing required scopes, will be handled by App Bridge", {
          shop: session.shop,
          missingScopes: scopeCheck.missingScopes,
          currentScopes: scopeCheck.currentScopes
        });
        
        // Don't redirect - let App Bridge handle scope requests for managed installations
        // The client-side ScopeCheck component will handle this
      } else {
        logger.info("Scope check passed", {
          shop: session.shop,
          scopes: scopeCheck.currentScopes
        });
      }
    } catch (error) {
      logger.error("Error during scope verification", { error, shop: session.shop });
      // Continue loading the app even if scope check fails
      // This prevents infinite redirect loops
    }
  }

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    host,
    scopeCheck // Return scope check results to client
  });
};

function AppContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const app = useAppBridge();

  // Build query string with required params
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (searchParams.has('shop')) params.set('shop', searchParams.get('shop')!);
    if (searchParams.has('host')) params.set('host', searchParams.get('host')!);
    if (searchParams.has('embedded')) params.set('embedded', searchParams.get('embedded')!);
    return params.toString();
  }, [searchParams]);

  // Handle navigation with query parameters
  useEffect(() => {
    // For Shopify embedded apps, navigation is handled by the App Bridge provider
    // and the ui-nav-menu component. We don't need to subscribe to navigation events
    // as the AppProvider handles this internally.
    
    // The ui-nav-menu links will be updated with query parameters below
  }, [app, navigate, queryString]);

  // Effect to update navigation links with query parameters
  useEffect(() => {
    // Small delay to ensure ui-nav-menu is fully rendered
    const timer = setTimeout(() => {
      const navMenu = document.querySelector('ui-nav-menu');
      if (!navMenu) {
        console.warn('ui-nav-menu not found');
        return;
      }

      const links = navMenu.querySelectorAll('a');
      console.log(`Found ${links.length} navigation links`);
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/app')) {
          // Update href to include query parameters
          const separator = href.includes('?') ? '&' : '?';
          const fullHref = `${href}${separator}${queryString}`;
          link.setAttribute('href', fullHref);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [queryString, location.pathname]); // Re-run when params or path changes

  return (
    <>
      <ui-nav-menu>
        <a href="/app" rel="home">Product Builder</a>
        <a href="/app/product-builder">Create Product</a>
        <a href="/app/improve-descriptions">Improve Descriptions</a>
        <a href="/app/prompt-logs">Prompt Logs</a>
        <a href="/app/settings">Settings</a>
      </ui-nav-menu>
      <Frame>
        <Outlet />
      </Frame>
    </>
  );
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider isEmbeddedApp apiKey={apiKey}>
        <AppContent />
      </AppProvider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("[app.jsx error boundary]", error);
  return boundary.error(error);
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
