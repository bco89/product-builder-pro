declare module "@shopify/shopify-api" {
  export interface AdminContext {
    graphql: (query: string, options?: { variables: Record<string, any> }) => Promise<Response>;
  }

  export interface AuthenticateAdmin {
    admin: AdminContext;
  }

  export const authenticate: {
    admin: (request: Request) => Promise<AuthenticateAdmin>;
  };
}

export * from "@shopify/shopify-api"; 