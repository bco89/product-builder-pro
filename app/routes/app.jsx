import { Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

const queryClient = new QueryClient();

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: session.shop,
    host: url.searchParams.get("host")
  };
};

export default function App() {
  const { apiKey, shop, host } = useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider isEmbeddedApp apiKey={apiKey} shop={shop} host={host}>
        <NavMenu
          navigation={[
            {
              label: "Product Builder",
              destination: "/app/product-builder",
            },
          ]}
        />
        <Outlet />
      </AppProvider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("[app.jsx error boundary]", error);
  return boundary.error(error);
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
