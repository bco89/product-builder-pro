# Product Builder Pro - Comprehensive Refactoring Plan

## Overview
This document outlines the complete refactoring plan for Product Builder Pro, focusing on performance optimization, code cleanup, Admin Extensions implementation, and mobile compatibility fixes. The plan is organized into 5 phases to be completed over approximately 4 weeks.

## ⚠️ CRITICAL WARNING
Some phases contain breaking changes that will make the app unusable until completed. See REFACTORING_PLAN_DEPENDENCIES.md for detailed overlap analysis. DO NOT start these phases unless you have time to complete them:
- Phase 2.1 (Parallel Loading) - Requires Phase 2.3 complete first
- Phase 3.2 (GraphQL Centralization) - 4-6 hour window, app broken until done
- Phase 5.1 (Direct API) - 6-8 hour window, major changes

## Current Issues Summary
- **Performance**: Initial app load takes ~5 seconds (primary user complaint)
- **Mobile**: App fails to load on mobile devices due to permission/scope issues
- **Code Quality**: Obsolete code, inconsistent patterns, API version mismatch
- **Missing Features**: No Admin Extensions for contextual product creation
- **Technical Debt**: No centralized error handling, inefficient GraphQL queries

## Success Criteria
- [ ] Initial load time reduced to under 2 seconds
- [ ] Mobile app loads and functions correctly
- [ ] Admin Extensions implemented for product creation and description improvement
- [ ] All obsolete code removed
- [ ] No regression in existing functionality
- [ ] Positive feedback from beta testers

---

## Phase 1: Critical Performance & Bug Fixes (Week 1)

### 1.1 Fix API Version Mismatch
**Priority**: CRITICAL  
**Time Estimate**: 1 hour
**Dependencies**: None
**Breaks**: Webhooks until deployment
**Safe to Pause**: YES - Deploy immediately after change

- [ ] Open `shopify.server.js`
- [ ] Change line 35 from `apiVersion: ApiVersion.October24` to `apiVersion: ApiVersion.January25`
- [ ] Verify `shopify.app.toml` webhook version matches (should be "2025-01")
- [ ] Commit changes: `git add -A && git commit -m "Fix API version mismatch to January25"`
- [ ] Push to deploy: `git push origin main`
- [ ] Monitor deployment: `fly logs --app product-builder-pro`
- [ ] Verify app still loads after deployment completes

### 1.2 Fix Mobile Loading Issue
**Priority**: CRITICAL  
**Time Estimate**: 4 hours
**Dependencies**: None (but conflicts with Phase 3.1 if done simultaneously)
**Breaks**: Mobile remains broken if not completed
**Safe to Pause**: NO - Must complete retry logic once started

- [ ] Open `app/components/ScopeCheck.tsx`
- [ ] Change line 21 timeout from 500ms to 2000ms
- [ ] Add mobile device detection:
  ```javascript
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const timeout = isMobile ? 3000 : 1500;
  ```
- [ ] Implement retry mechanism for App Bridge initialization:
  - [ ] Add retry counter (max 3 attempts)
  - [ ] Implement exponential backoff (1s, 2s, 4s)
  - [ ] Add better error logging
- [ ] Update error handling when scopes API is unavailable:
  - [ ] Add specific mobile error handling
  - [ ] Prevent redirect loops
  - [ ] Show user-friendly error message
- [ ] Test on actual mobile devices (iOS Safari, Chrome Android)
- [ ] Commit mobile fixes: `git add -A && git commit -m "Fix mobile loading with increased timeout and retry logic"`
- [ ] Push to deploy: `git push origin main`
- [ ] Monitor deployment: `fly logs --app product-builder-pro`
- [ ] Test mobile access after deployment completes

### 1.3 Remove Obsolete Code & Features
**Priority**: HIGH  
**Time Estimate**: 3 hours
**Dependencies**: Should complete before Phase 3.2
**Breaks**: Nothing if done carefully
**Safe to Pause**: YES - Can remove files incrementally

#### Delete Unused API Routes
- [ ] Delete `app/routes/api.shopify.all-product-types.ts`
- [ ] Delete `app/routes/api.shopify.create-product.ts`
- [ ] Delete `app/routes/api.shopify.product-types.ts`
- [ ] Delete `app/routes/api.shopify.categorize-product.ts`
- [ ] Delete `app/routes/api.shopify.store-metrics.ts` (verify not used first)
- [ ] Delete `app/routes/api.shopify.store-settings.ts` (verify not used first)

#### Remove Image Analysis Features
- [ ] Open `app/routes/product-builder/steps/StepAIDescription.tsx`
- [ ] Remove image analysis UI components
- [ ] Remove image processing logic
- [ ] Update AI prompt generation to exclude image context
- [ ] Remove any image-related imports

#### Clean Up Unused Files
- [ ] Delete `app/utils/errorHandling.ts`
- [ ] Delete `app/routes/app.additional.tsx`
- [ ] Update `app/routes/_index/route.tsx` to remove placeholder content

#### Clean Up shopifyApi.ts
- [ ] Open `app/services/shopifyApi.ts`
- [ ] Remove `getVendors()` method (lines 84-88)
- [ ] Remove `createProduct()` method (lines 122-134)
- [ ] Remove unused `session` parameter from constructor
- [ ] Remove any references to deleted methods
- [ ] Commit all changes: `git add -A && git commit -m "Remove obsolete code and unused features"`
- [ ] Push to deploy: `git push origin main`
- [ ] Monitor deployment: `fly logs --app product-builder-pro`
- [ ] Verify app functionality after deployment

---

## Phase 2: Performance Optimization (Week 1-2)

### 2.1 Implement Parallel Data Loading
**Priority**: HIGH  
**Time Estimate**: 4 hours
**⚠️ CRITICAL**: Must complete Phase 2.3 (Caching) FIRST or app will break
**Dependencies**: Requires Phase 2.3 complete
**Breaks**: Initial app load if caching not ready
**Safe to Pause**: NO - Must update loader AND components together

- [ ] Open `app/routes/app.product-builder.tsx`
- [ ] Modify loader to use Promise.all():
  ```typescript
  const [shopData, cachedVendors, cachedProductTypes] = await Promise.all([
    admin.graphql(/* shop query */),
    CacheService.get(shop, 'vendors'),
    CacheService.get(shop, 'productTypes')
  ]);
  ```
- [ ] Pass prefetched data to child components via context or props
- [ ] Update `StepVendorType` to use prefetched data
- [ ] Implement background refresh for missing cache data
- [ ] Test with cache cleared to ensure proper fallback
- [ ] Commit changes: `git add -A && git commit -m "Implement parallel data loading"`
- [ ] Push to deploy: `git push origin main`
- [ ] Monitor deployment and verify performance improvement

### 2.2 Optimize GraphQL Queries
**Priority**: HIGH  
**Time Estimate**: 6 hours
**Dependencies**: Better if Phase 1.3 complete (removes conflicts)
**Breaks**: Vendor/Product selection if not careful
**Safe to Pause**: YES - Can optimize one query at a time

#### Optimize Vendor Query
- [ ] Open `app/routes/api.shopify.products.ts`
- [ ] Modify vendor query to limit initial fetch:
  ```graphql
  query ($first: Int = 100, $after: String) {
    productVendors(first: $first, after: $after, sort: { sortKey: CREATED_AT, reverse: true }) {
      edges { node }
      pageInfo { hasNextPage, endCursor }
    }
  }
  ```
- [ ] Implement progressive loading UI
- [ ] Add "Load More" button for additional vendors
- [ ] Cache vendors by relevance/frequency

#### Optimize Product Type Query
- [ ] Open `app/routes/api.shopify.product-types-by-vendor.ts`
- [ ] Create new efficient query that doesn't scan all products:
  ```graphql
  query ($vendor: String!) {
    products(first: 50, query: $vendor, sortKey: PRODUCT_TYPE) {
      edges {
        node {
          productType
        }
      }
    }
  }
  ```
- [ ] Implement deduplication logic
- [ ] Add result limiting (max 50 types)
- [ ] Test with stores having many products

### 2.3 Enhanced Caching Strategy
**Priority**: MEDIUM  
**Time Estimate**: 4 hours
**⚠️ MUST COMPLETE BEFORE 2.1**
**Dependencies**: None
**Breaks**: Nothing
**Safe to Pause**: YES - But don't start 2.1 until this is done

#### Implement Cache Pre-warming
- [ ] Create `app/services/cacheWarming.server.ts`
- [ ] Add function to pre-populate cache on app installation
- [ ] Implement webhook handler for `app/installed` event
- [ ] Pre-fetch common data (vendors, product types)

#### Add Background Cache Refresh
- [ ] Modify `CacheService` to track cache age
- [ ] Implement background refresh when cache is 80% expired
- [ ] Add stale-while-revalidate pattern:
  - [ ] Return stale data immediately
  - [ ] Fetch fresh data in background
  - [ ] Update cache when fresh data arrives

#### Cache Scope Checks
- [ ] Modify `app/routes/app.tsx` loader
- [ ] Cache scope check results for 24 hours
- [ ] Only re-check on explicit trigger or error

### 2.4 Request Optimization
**Priority**: MEDIUM  
**Time Estimate**: 3 hours

- [ ] Implement request deduplication in `shopifyApi.ts`
- [ ] Add in-memory cache for identical concurrent requests
- [ ] Remove redundant shop domain queries
- [ ] Consolidate multiple scope checks into single check
- [ ] Add request batching for related queries

---

## Phase 3: Code Quality & Architecture (Week 2)

### 3.1 Standardize Authentication
**Priority**: MEDIUM  
**Time Estimate**: 2 hours
**Dependencies**: Conflicts with Phase 1.2 if done together
**Breaks**: All API routes during migration
**Safe to Pause**: NO - Must update all routes in one session

- [ ] Update all API routes to use `authenticateAdmin` from `auth.server.ts`
- [ ] Remove direct imports of `authenticate` from `shopify.server`
- [ ] Add consistent error handling for authentication failures
- [ ] Update logging to use structured format
- [ ] Test all API endpoints for proper authentication

### 3.2 Centralize GraphQL Queries
**Priority**: MEDIUM  
**Time Estimate**: 4 hours
**⚠️ BREAKING CHANGE - 4-6 HOUR WINDOW REQUIRED**
**Dependencies**: Complete Phase 1.3 first, ideally Phase 2.2
**Breaks**: EVERY API route until complete
**Safe to Pause**: NO - App completely broken until done

- [ ] Create comprehensive `app/graphql/queries.ts` file
- [ ] Move all inline queries from API routes
- [ ] Create fragments for common fields:
  - [ ] Product fields fragment
  - [ ] Variant fields fragment
  - [ ] Media fields fragment
- [ ] Add TypeScript types for all queries
- [ ] Update all API routes to import from central file

### 3.3 Improve Error Handling
**Priority**: MEDIUM  
**Time Estimate**: 3 hours

- [ ] Create `app/services/errorHandler.server.ts`
- [ ] Implement centralized GraphQL error parser
- [ ] Add retry logic with exponential backoff:
  - [ ] Max 3 retries
  - [ ] Handle rate limiting (429 errors)
  - [ ] Handle transient errors (500, 502, 503)
- [ ] Create user-friendly error messages mapping
- [ ] Add error boundary component for UI
- [ ] Implement error logging to monitoring service

### 3.4 UI/UX Quick Wins
**Priority**: LOW  
**Time Estimate**: 2 hours

- [ ] Remove all emoji usage from loading messages
- [ ] Update `app/routes/_index/route.tsx`:
  - [ ] Replace placeholder content
  - [ ] Add proper app description
  - [ ] Update feature list
- [ ] Fix excessive padding in `app/routes/product-builder/route.tsx`:
  - [ ] Change `paddingBlockEnd="800"` to `paddingBlockEnd="200"`
- [ ] Add loading skeletons:
  - [ ] Vendor list skeleton
  - [ ] Product type skeleton
  - [ ] Form field skeletons
- [ ] Fix TODO comments in `StepSKUBarcode.tsx` (lines 532, 549)

---

## Phase 4: Admin Extensions Implementation (Week 3)

### 4.1 Product Creation Extension
**Priority**: HIGH  
**Time Estimate**: 8 hours

#### Setup Extension Infrastructure
- [ ] Create `extensions/product-create-action` directory
- [ ] Add extension configuration in `shopify.extension.toml`
- [ ] Configure action for `/products` page
- [ ] Set up development environment for extensions

#### Implement Extension UI
- [ ] Create action that opens Product Builder in modal/new tab
- [ ] Pass context (current page, filters) to Product Builder
- [ ] Implement deep linking to product builder with params
- [ ] Add return navigation to products page

#### Integration with Existing Flow
- [ ] Modify product builder to accept extension context
- [ ] Add success callback to refresh products page
- [ ] Implement error handling for extension context
- [ ] Test with various product page states

### 4.2 Description Enhancement Extension
**Priority**: HIGH  
**Time Estimate**: 6 hours

#### Setup Description Extension
- [ ] Create `extensions/description-enhance-action` directory
- [ ] Configure action for product detail pages
- [ ] Add necessary scopes and permissions

#### Implement Enhancement Flow
- [ ] Create UI for inline description editing
- [ ] Integrate with existing AI service
- [ ] Add before/after preview
- [ ] Implement save functionality
- [ ] Add undo capability

#### Bulk Operations
- [ ] Add bulk action for multiple products
- [ ] Create queue system for bulk operations
- [ ] Implement progress tracking UI
- [ ] Add cancellation capability
- [ ] Test with 100+ products

### 4.3 Extension Testing & Polish
**Priority**: MEDIUM  
**Time Estimate**: 4 hours

- [ ] Test extensions in development
- [ ] Deploy to staging environment
- [ ] Test with beta users
- [ ] Fix any integration issues
- [ ] Add analytics tracking
- [ ] Document extension usage

---

## Phase 5: Modern Shopify Features (Week 3-4)

### 5.1 Enable Direct API Access
**Priority**: HIGH  
**Time Estimate**: 4 hours
**⚠️ BREAKING CHANGE - 6-8 HOUR WINDOW REQUIRED**
**Dependencies**: Requires Phase 1.1 complete, easier after Phase 3.2
**Breaks**: All API calls must be updated
**Safe to Pause**: NO - Once started, must complete all updates

#### Configure Direct API
- [ ] Update `shopify.app.toml`:
  ```toml
  [access.admin]
  direct_api_mode = "offline"
  embedded_app_direct_api_access = true
  ```
- [ ] Deploy configuration changes

#### Update API Calls
- [ ] Identify all GraphQL calls that can use Direct API
- [ ] Update fetch calls to use `shopify:admin/api/2025-01/graphql.json`
- [ ] Remove unnecessary server round trips
- [ ] Test authentication and error handling
- [ ] Measure performance improvements

### 5.2 Shopify Managed Installation Updates
**Priority**: LOW  
**Time Estimate**: 2 hours

- [ ] Review current scope configuration
- [ ] Move optional scopes to `optional_scopes` in TOML
- [ ] Remove legacy OAuth code paths
- [ ] Update scope request handling
- [ ] Test installation flow
- [ ] Test scope upgrade flow

### 5.3 Polaris Component Updates
**Priority**: LOW  
**Time Estimate**: 3 hours

- [ ] Remove custom scrollbar styling
- [ ] Extract inline styles to CSS modules:
  - [ ] StepVendorType styles
  - [ ] StepVariants styles
- [ ] Ensure consistent spacing:
  - [ ] Use Polaris spacing tokens
  - [ ] Remove hard-coded margins/padding
- [ ] Improve form validation:
  - [ ] Add real-time validation
  - [ ] Show inline errors immediately
  - [ ] Add helpful validation messages

---

## Testing Checklist

### After Each Phase
- [ ] Test all existing functionality (no regressions)
- [ ] Test on mobile devices (iOS and Android)
- [ ] Check initial load time with performance profiler
- [ ] Verify all API endpoints work correctly
- [ ] Test with stores having many products/vendors
- [ ] Get feedback from at least 2 beta testers

### Final Testing
- [ ] Complete end-to-end product creation flow
- [ ] Test AI description generation
- [ ] Test variant creation (up to 25 variants)
- [ ] Test all caching scenarios
- [ ] Test Admin Extensions
- [ ] Performance audit (target < 2s load time)
- [ ] Mobile functionality verification
- [ ] Error handling verification

---

## Deployment Strategy

### Deployment Process
All deployments happen automatically via Fly.io when pushing to main:
```bash
# Make changes
git add -A
git commit -m "Descriptive commit message"
git push origin main

# Monitor deployment
fly logs --app product-builder-pro

# Check deployment status
fly status --app product-builder-pro
```

### Incremental Deployment
1. Deploy Phase 1 fixes immediately (critical bugs)
2. Deploy Phase 2 performance improvements
3. Test with beta users for 2-3 days
4. Deploy Phase 3 code quality improvements
5. Deploy Phase 4 Admin Extensions (major feature)
6. Final deployment of Phase 5 optimizations

### Rollback Plan
- [ ] Tag each deployment in git before major changes:
  ```bash
  git tag pre-phase-X-YYYY-MM-DD
  git push origin --tags
  ```
- [ ] Rollback via Fly.io if needed:
  ```bash
  fly releases --app product-builder-pro
  fly deploy --image registry.fly.io/product-builder-pro:[previous-version]
  ```
- [ ] Monitor error rates after each deployment
- [ ] Have developer verify app functionality after each deployment

---

## Monitoring & Success Metrics

### Key Metrics to Track
- Initial load time (target: < 2 seconds)
- Mobile success rate (target: 100%)
- API error rates (target: < 0.1%)
- User engagement with Admin Extensions
- Beta tester satisfaction scores

### Monitoring Implementation
- [ ] Add performance tracking
- [ ] Implement error logging
- [ ] Track feature usage
- [ ] Set up alerts for critical issues
- [ ] Create dashboard for metrics

---

## Notes & Considerations

1. **No Testing Framework**: As requested, no unit or E2E tests will be implemented
2. **Variant UI**: The complex variant configuration UI will remain unchanged
3. **Two-Phase Approach**: The product creation flow will maintain its current structure
4. **AI Features**: Description generation remains a core feature; image analysis will be removed
5. **Timeline**: Aggressive 4-week timeline requires focused execution
6. **Beta Testing**: Continuous feedback from beta testers is critical

---

## Questions to Resolve

- [ ] Confirm stores for beta testing each phase
- [ ] Identify any specific vendor/product type limits to implement
- [ ] Clarify Admin Extension UI preferences
- [ ] Confirm monitoring/analytics requirements
- [ ] Identify any additional performance bottlenecks from beta feedback