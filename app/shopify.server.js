import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October24,
  scopes: ["write_products"],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  isEmbeddedApp: true,
  hooks: {
    afterAuth: async ({ session }) => {
      console.log("[afterAuth] Session created:", session);
      await shopify.registerWebhooks({ session });
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
});

// Add logging to authenticate function
const originalAuthenticate = shopify.authenticate;
shopify.authenticate = {
  ...originalAuthenticate,
  admin: async (request) => {
    console.log("[authenticate.admin] Request URL:", request.url);
    try {
      const result = await originalAuthenticate.admin(request);
      console.log("[authenticate.admin] Authentication successful:", {
        hasSession: !!result.session,
        hasAdmin: !!result.admin
      });
      return result;
    } catch (error) {
      console.error("[authenticate.admin] Authentication failed:", error);
      throw error;
    }
  }
};

export default shopify;
export const apiVersion = ApiVersion.October24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
