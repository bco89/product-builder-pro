# Performance Optimization Checklist

## Goal: Reduce Initial Load Time from ~5s to <2s

### Current Performance Bottlenecks
- [ ] Sequential API calls on load
- [ ] Fetching ALL vendors (could be thousands)
- [ ] Fetching ALL products to get product types
- [ ] No prefetching or parallel loading
- [ ] Cache only populated after first slow request
- [ ] Scope check on every page load

---

## Pre-Optimization Measurements

### Baseline Metrics (Record Before Starting)
- [ ] Initial load time: _______ seconds
- [ ] Time to interactive: _______ seconds
- [ ] Vendors API call: _______ ms
- [ ] Product types API call: _______ ms
- [ ] Number of sequential requests: _______

### How to Measure
```javascript
// Add to app/routes/app.product-builder.tsx
console.time('Initial Load');
// ... existing code
console.timeEnd('Initial Load');

// For API calls
console.time('Fetch Vendors');
const vendors = await fetch('/api/shopify/products?type=vendors');
console.timeEnd('Fetch Vendors');
```

---

## Quick Wins (30 min - 1 hour each)

### 1. Remove Unnecessary Scope Check ✅
**Impact**: Saves 200-400ms per load

```typescript
// In app/routes/app.tsx
// Cache scope check for 24 hours instead of checking every load
const SCOPE_CHECK_CACHE_KEY = 'scope_check_result';
const SCOPE_CHECK_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Check cache first
const cachedResult = await CacheService.get(shop, SCOPE_CHECK_CACHE_KEY);
if (cachedResult && !forceRefresh) {
  return json({ scopeCheck: cachedResult });
}
```

### 2. Implement Request Deduplication ✅
**Impact**: Prevents duplicate API calls

```typescript
// In app/services/shopifyApi.ts
class ShopifyApiService {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async deduplicatedFetch(key: string, fetchFn: () => Promise<any>) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    const promise = fetchFn();
    this.pendingRequests.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }
}
```

### 3. Add Simple Prefetching ✅
**Impact**: Data ready when needed

```typescript
// In app/routes/app._index.tsx or app.tsx
// Prefetch common data on app load
useEffect(() => {
  // Prefetch in background
  fetch('/api/shopify/products?type=vendors');
  fetch('/api/shopify/products?type=productTypes');
}, []);
```

---

## Major Optimizations (2-4 hours each)

### 1. Parallel Data Loading Implementation ⚡
**Impact**: Reduce load time by 50-70%

```typescript
// BEFORE (Sequential - Slow)
const shopData = await admin.graphql(shopQuery);
const vendors = await fetch('/api/shopify/products?type=vendors');
const productTypes = await fetch('/api/shopify/products?type=productTypes');

// AFTER (Parallel - Fast)
const [shopData, vendors, productTypes] = await Promise.all([
  admin.graphql(shopQuery),
  CacheService.get(shop, 'vendors') || fetchVendors(admin),
  CacheService.get(shop, 'productTypes') || fetchProductTypes(admin)
]);
```

### 2. Optimize Vendor Query ⚡
**Impact**: From scanning 1000s to loading 100

```typescript
// BEFORE - Fetches ALL vendors
query {
  productVendors(first: 250) {
    edges { node }
    pageInfo { hasNextPage, endCursor }
  }
}

// AFTER - Smart loading
query {
  # Get recent/popular vendors first
  products(first: 100, sortKey: UPDATED_AT, reverse: true) {
    edges {
      node {
        vendor
      }
    }
  }
}

// Then deduplicate and sort by frequency
const vendorCounts = products.reduce((acc, p) => {
  acc[p.vendor] = (acc[p.vendor] || 0) + 1;
  return acc;
}, {});

const popularVendors = Object.entries(vendorCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 50)
  .map(([vendor]) => vendor);
```

### 3. Smart Product Type Loading ⚡
**Impact**: 10x faster for large catalogs

```typescript
// BEFORE - Scans all products
async function getAllProductTypes(admin) {
  const allTypes = new Set();
  let cursor = null;
  
  do {
    const response = await admin.graphql(/* query ALL products */);
    // Process hundreds of products
  } while (hasNextPage);
}

// AFTER - Efficient sampling
async function getProductTypesSample(admin) {
  // Get types from recent products
  const recentTypes = await admin.graphql(`
    query {
      products(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            productType
          }
        }
      }
    }
  `);
  
  // Get types from popular products  
  const popularTypes = await admin.graphql(`
    query {
      products(first: 50, sortKey: BEST_SELLING) {
        edges {
          node {
            productType
          }
        }
      }
    }
  `);
  
  // Combine and deduplicate
  return [...new Set([...recentTypes, ...popularTypes])];
}
```

---

## Advanced Optimizations (4-6 hours)

### 1. Implement Progressive Enhancement 🚀
```typescript
// Load critical data first, enhance later
const [criticalData, setEnhancedData] = useState(null);

// Fast initial load
useEffect(() => {
  loadCriticalData().then(setCriticalData);
}, []);

// Background enhancement
useEffect(() => {
  if (criticalData) {
    loadRemainingData().then(setEnhancedData);
  }
}, [criticalData]);
```

### 2. Cache Warming Strategy 🚀
```typescript
// On app installation, pre-populate cache
export async function warmCache(shop: string, admin: any) {
  const warmingTasks = [
    CacheService.set(shop, 'vendors', await fetchPopularVendors(admin)),
    CacheService.set(shop, 'productTypes', await fetchCommonTypes(admin)),
    CacheService.set(shop, 'categories', await fetchCategories(admin))
  ];
  
  await Promise.all(warmingTasks);
}

// Background refresh before expiry
setInterval(async () => {
  const cacheItems = await CacheService.getExpiringSoon(shop);
  for (const item of cacheItems) {
    // Refresh in background
    refreshCacheItem(item);
  }
}, 5 * 60 * 1000); // Check every 5 minutes
```

### 3. Implement Direct API Access 🚀
```typescript
// BEFORE - Goes through your server
const response = await fetch('/api/shopify/products');

// AFTER - Direct to Shopify (faster)
const response = await fetch('shopify:admin/api/2025-01/graphql.json', {
  method: 'POST',
  body: JSON.stringify({ query: PRODUCTS_QUERY })
});
```

---

## Testing Performance Improvements

### Manual Testing
```javascript
// Add performance markers
performance.mark('app-start');

// After initial render
performance.mark('app-interactive');
performance.measure('load-time', 'app-start', 'app-interactive');

console.log('Load time:', 
  performance.getEntriesByName('load-time')[0].duration
);
```

### Automated Monitoring
```typescript
// Add to app/routes/app.tsx
import { useEffect } from 'react';

function PerformanceMonitor() {
  useEffect(() => {
    // Log Web Vitals
    if ('web-vital' in window) {
      window.webVitals.onReport((metric) => {
        console.log(metric.name, metric.value);
        // Send to analytics
      });
    }
  }, []);
}
```

---

## Performance Budget

### Target Metrics
- [ ] Initial Load: < 2 seconds ✅
- [ ] Time to Interactive: < 2.5 seconds ✅
- [ ] API Response Time: < 500ms per call ✅
- [ ] Cache Hit Rate: > 80% ✅

### Monitoring Dashboard
```typescript
// Track these metrics
const metrics = {
  initialLoad: 0,
  apiCalls: [],
  cacheHits: 0,
  cacheMisses: 0,
  errorRate: 0
};

// Log to console or monitoring service
console.table(metrics);
```

---

## Rollout Strategy

### Phase 1: Quick Wins (Day 1)
- [ ] Implement request deduplication
- [ ] Add simple prefetching
- [ ] Cache scope checks
- [ ] Deploy: `git add -A && git commit -m "Performance quick wins" && git push origin main`
- [ ] Monitor: `fly logs --app product-builder-pro`

### Phase 2: Major Optimizations (Day 2-3)
- [ ] Parallel data loading
- [ ] Optimize vendor query
- [ ] Smart product type loading
- [ ] Deploy: `git add -A && git commit -m "Major performance optimizations" && git push origin main`
- [ ] Verify improvements with beta testers

### Phase 3: Advanced (Day 4-5)
- [ ] Progressive enhancement
- [ ] Cache warming
- [ ] Direct API access
- [ ] Deploy: `git add -A && git commit -m "Advanced performance features" && git push origin main`
- [ ] Measure final performance metrics

---

## Post-Optimization Checklist

### Verify Improvements
- [ ] Initial load time: _______ seconds (target: <2s)
- [ ] All features still working
- [ ] No console errors
- [ ] Mobile performance improved
- [ ] Beta tester feedback positive

### Document Results
- [ ] Before/after metrics
- [ ] Specific improvements made
- [ ] Any trade-offs or limitations
- [ ] Recommendations for future

---

## Common Pitfalls to Avoid

1. **Don't over-optimize**: Stop when you hit <2s
2. **Test with real data**: Use stores with many products
3. **Consider network latency**: Test on slower connections
4. **Watch memory usage**: Don't cache everything
5. **Maintain functionality**: Speed isn't worth broken features

---

## Emergency Rollback

If performance optimizations break something:

```bash
# Tag before major optimization
git tag pre-performance-opt
git push origin --tags

# If optimizations break the app
fly releases --app product-builder-pro

# Rollback to previous version
fly deploy --app product-builder-pro --image registry.fly.io/product-builder-pro:[deployment-id]

# Or revert commits and redeploy
git revert HEAD
git push origin main
```

Remember: Measure → Optimize → Measure → Celebrate! 🎉