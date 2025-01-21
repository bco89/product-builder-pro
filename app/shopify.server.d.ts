declare module "../shopify.server" {
  export const authenticate: {
    admin: (request: Request) => Promise<{
      admin: {
        graphql: (query: string) => Promise<Response>;
      };
    }>;
  };
} 