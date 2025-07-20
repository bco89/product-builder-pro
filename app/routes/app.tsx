import { Outlet, useLoaderData, useRouteError, useSearchParams, useLocation, useNavigate } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Frame } from '@shopify/polaris';
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useEffect } from "react";

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

export default function App() {
  const { apiKey, host } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Effect to update navigation links with query parameters and handle client-side navigation
  useEffect(() => {
    const navMenu = document.querySelector('ui-nav-menu');
    if (!navMenu) return;

    const links = navMenu.querySelectorAll('a');
    const requiredParams = new URLSearchParams();
    
    // Preserve essential Shopify embedded app parameters
    if (searchParams.has('shop')) requiredParams.set('shop', searchParams.get('shop')!);
    if (searchParams.has('host')) requiredParams.set('host', searchParams.get('host')!);
    if (searchParams.has('embedded')) requiredParams.set('embedded', searchParams.get('embedded')!);

    // Store click handlers for cleanup
    const clickHandlers = new Map();

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/app')) {
        // Update href to include query parameters
        const separator = href.includes('?') ? '&' : '?';
        const fullHref = `${href}${separator}${requiredParams.toString()}`;
        link.setAttribute('href', fullHref);
        
        // Create click handler for client-side navigation
        const clickHandler = (e) => {
          e.preventDefault();
          navigate(fullHref);
        };
        
        // Store handler reference for cleanup
        clickHandlers.set(link, clickHandler);
        
        // Add click event listener
        link.addEventListener('click', clickHandler);
      }
    });

    // Cleanup function to remove event listeners
    return () => {
      clickHandlers.forEach((handler, link) => {
        link.removeEventListener('click', handler);
      });
    };
  }, [searchParams, location.pathname, navigate]); // Re-run when params, path, or navigate changes

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider isEmbeddedApp apiKey={apiKey}>
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
