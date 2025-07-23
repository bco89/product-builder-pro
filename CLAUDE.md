# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Product Builder Pro is a Shopify embedded app built with Remix that provides a guided multi-step wizard for creating products. It uses Shopify Polaris for UI components and PostgreSQL with Prisma for data persistence.

## Essential Commands

```bash
# Development
npm run dev                    # Start Shopify app development server

# Database
npm run setup                  # Initialize database (prisma generate && prisma db push)
npm run prisma:generate       # Generate Prisma client
npm run prisma:migrate        # Run database migrations
npm run prisma:studio        # Open Prisma Studio GUI

# Build & Deploy
npm run build                 # Build the Remix app
npm run deploy               # Deploy to Shopify (updates app config)

# Code Quality
npm run lint                 # Run ESLint

# Production
npm start                    # Start production server
```

## Architecture Overview

### Tech Stack
- **Framework**: Remix v2.7.1 (React-based full-stack)
- **UI**: Shopify Polaris v12.0.0
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Shopify OAuth via @shopify/shopify-app-remix
- **TypeScript**: Full type coverage

### Key Directories
- `/app/routes` - Remix routes (file-based routing)
- `/app/services` - Server-side services (auth, caching, logging, Shopify API)
- `/app/product-builder` - Product builder feature components
- `/app/components` - Reusable React components
- `/app/graphql` - GraphQL queries for Shopify Admin API
- `/prisma` - Database schema and migrations

### Product Builder Workflow

The product builder follows a two-phase approach:

**Phase 1** (Basic Product):
1. Vendor & Product Type selection
2. Product Details (title, description, images, category)
3. Tags
4. Pricing
5. Variant Decision

**Phase 2** (Variants/Finalization):
- With variants: Configure options, generate variants, set SKUs/pricing
- Without variants: Add SKU/barcode
- Final review and success

The product is created in Shopify between phases to enable better error handling.

### Key Services

**Authentication** (`app/services/auth.server.ts`):
- Wraps Shopify authentication with logging
- Use `authenticate.admin(request)` for authenticated routes

**Caching** (`app/services/cacheService.ts`):
- Database-backed caching with 15-minute TTL
- Used for product types, vendors, store settings

**Shopify API** (`app/services/shopifyApi.ts`):
- Service class for GraphQL operations
- Methods: `createProductBasic()`, `updateProductVariants()`, validation methods

### API Routes Pattern
- `/api.shopify.*` - Internal API endpoints
- Use Remix actions for mutations
- Use loaders for data fetching

### GraphQL Documentation
When working with Shopify GraphQL, reference these local docs first:
- `/docs/graphql-admin-api-docs-*.md` - API documentation
- `/docs/graphql-types-*.md` - Type definitions

### Important Patterns

1. **Error Handling**: Always wrap Shopify API calls in try-catch blocks
2. **Validation**: Use both client-side and server-side validation
3. **Session Management**: Access shop domain via `session.shop`
4. **Logging**: Use the logger service for structured logging
5. **TypeScript**: Leverage existing type definitions in `/app/types`

### Authentication & Scope Management

**Scope Handling**:
- The app uses App Bridge for scope management in managed installation mode
- Server-side scope checks should NOT redirect to OAuth URLs
- Missing scopes are handled by the client-side `ScopeCheck` component
- Sessions with missing scopes are preserved (not deleted) to allow App Bridge handling

**Key Components**:
- `app/components/ScopeCheck.tsx` - Wraps components requiring specific scopes
- `app/services/auth.server.ts` - Authentication wrapper with logging (preserves sessions)
- `app/services/scopeVerification.server.ts` - Server-side scope checking
- `app/routes/app.tsx` - Main app loader returns scope check results to client

**API Version**:
- Currently using Shopify API version January 2025 (2025-01)
- Configured in `app/shopify.server.js` as `ApiVersion.January25`
- Must match webhook API version in `shopify.app.toml`

### Testing & Deployment Notes

- No test framework is currently configured
- Use `npm run lint` before committing
- For production deployment, set `NODE_ENV=production`
- Database connection configured via `DATABASE_URL` environment variable

### Production Deployment (Fly.io)

**Database**:
- Production uses PostgreSQL (not MySQL)
- Prisma schema must have `provider = "postgresql"`
- Local development can use MySQL with a different schema if needed

**Deployment Process**:
- Push to GitHub main branch triggers automatic deployment
- Monitor deployment: `fly logs --app product-builder-pro`
- Deployment typically takes 1-3 minutes

**Environment Variables**:
- All Shopify keys and secrets are managed by Fly.io
- Database URL is automatically configured
- No manual environment variable setup needed

### Common Tasks

**Adding a new API endpoint**:
1. Create file in `/app/routes/api.shopify.*.ts`
2. Export an `action` function for POST requests
3. Use `authenticate.admin(request)` for authentication
4. Return JSON responses

**Adding a new product builder step**:
1. Create component in `/app/routes/product-builder/steps/`
2. Add to step navigation in main route file
3. Update form data types as needed

**Working with Shopify API**:
1. Check existing queries in `/app/graphql`
2. Use the ShopifyApi service for operations
3. Reference local GraphQL docs for field availability