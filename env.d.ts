/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Shopify API credentials
      SHOPIFY_API_KEY: string;
      SHOPIFY_API_SECRET: string;

      // Shopify app configuration
      SHOPIFY_APP_URL: string;
      SHOPIFY_SCOPES: string;
      SHOPIFY_APP_NAME: string;

      // Database configuration
      DATABASE_URL: string;

      // Development configuration
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;

      // Security
      SESSION_SECRET: string;

      // Optional: For future GPT integration
      OPENAI_API_KEY?: string;
    }
  }
}

// This export is necessary to make this a module
export {}
