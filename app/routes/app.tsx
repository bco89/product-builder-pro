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
import { Redirect } from "@shopify/app-bridge/actions";

const queryClient = new QueryClient();

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    host: url.searchParams.get("host")
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

  // Subscribe to App Bridge redirect actions for client-side routing
  useEffect(() => {
    const unsubscribe = app.subscribe(Redirect.Action.APP, (redirectData: any) => {
      console.log(`App Bridge navigation to: ${redirectData.path}`);
      // Add query params to the path
      const separator = redirectData.path.includes('?') ? '&' : '?';
      const fullPath = `${redirectData.path}${separator}${queryString}`;
      navigate(fullPath);
    });

    return () => {
      unsubscribe();
    };
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
  const { apiKey, host } = useLoaderData<typeof loader>();

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
