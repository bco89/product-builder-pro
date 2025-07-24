# Quick Start Guide - Critical Fixes (Phase 1)

## 🚨 Start Here - Day 1 Critical Fixes

### Fix 1: API Version Mismatch (15 minutes)
**Impact**: Webhooks broken until fixed

```bash
# 1. Open shopify.server.js
# 2. Go to line 35
# 3. Change:
export const apiVersion = ApiVersion.October24;
# To:
export const apiVersion = ApiVersion.January25;

# 4. Verify shopify.app.toml has:
[webhooks]
api_version = "2025-01"

# 5. Commit and deploy:
git add -A
git commit -m "Fix API version mismatch to January25"
git push origin main

# 6. Monitor deployment:
fly logs --app product-builder-pro
# Wait for deployment to complete (1-3 minutes)
```

**Deploy Immediately**: This can go live right away with no side effects.

---

### Fix 2: Remove Dead Code (1 hour)
**Impact**: Cleans up codebase, no user impact

```bash
# Delete these files (they're not used):
rm app/routes/api.shopify.all-product-types.ts
rm app/routes/api.shopify.create-product.ts  
rm app/routes/api.shopify.product-types.ts
rm app/routes/api.shopify.categorize-product.ts
rm app/utils/errorHandling.ts
rm app/routes/app.additional.tsx

# Clean up shopifyApi.ts
# Remove lines 84-88 (getVendors method)
# Remove lines 122-134 (createProduct method)
# Remove unused 'session' from constructor
```

**Commit and Deploy**:
```bash
git add -A
git commit -m "Remove obsolete code and unused API routes"
git push origin main

# Monitor deployment
fly logs --app product-builder-pro
```

**Test After Deployment**:
1. Visit the deployed app
2. Check that app still loads
3. Try creating a product

---

### Fix 3: Mobile Loading Issue (2-3 hours)
**Impact**: Mobile currently broken, will be fixed

#### Step 1: Update Timeout
```typescript
// In app/components/ScopeCheck.tsx, line 21
// Change:
setTimeout(() => {
  setIsCheckingScopes(false);
}, 500);

// To:
setTimeout(() => {
  setIsCheckingScopes(false);
}, 2000);
```

#### Step 2: Add Mobile Detection
```typescript
// Add at top of ScopeCheck component:
const isMobile = typeof navigator !== 'undefined' && 
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const initTimeout = isMobile ? 3000 : 1500;

// Update timeout to use dynamic value:
setTimeout(() => {
  setIsCheckingScopes(false);
}, initTimeout);
```

#### Step 3: Add Retry Logic
```typescript
// Add retry mechanism for App Bridge init
const [retryCount, setRetryCount] = useState(0);
const maxRetries = 3;

useEffect(() => {
  const checkScopes = async () => {
    try {
      // existing scope check logic
    } catch (error) {
      if (retryCount < maxRetries) {
        const backoff = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, backoff);
      } else {
        console.error('Failed to initialize after', maxRetries, 'attempts');
        // Show user-friendly error
      }
    }
  };
  
  checkScopes();
}, [retryCount]);
```

**Deploy Mobile Fix**:
```bash
git add -A
git commit -m "Fix mobile loading with increased timeout and retry logic"
git push origin main

# Monitor deployment
fly logs --app product-builder-pro
```

**Test Mobile Fix After Deployment**:
1. Test on real iPhone/Android using the live app URL
2. Check that the app loads without permission errors
3. Verify retry logic works if needed

---

## 🎯 First Day Checklist

- [ ] Fix API version (15 min) - DEPLOY
- [ ] Delete unused files (30 min)
- [ ] Clean shopifyApi.ts (30 min)
- [ ] Update mobile timeout (30 min)
- [ ] Add mobile detection (30 min)
- [ ] Add retry logic (1 hour)
- [ ] Test on mobile device (30 min)
- [ ] Deploy all Phase 1 fixes

---

## ⚡ Performance Quick Wins (If Time Allows)

### Remove Excessive Padding
```typescript
// In app/routes/product-builder/route.tsx
// Find: paddingBlockEnd="800"
// Change to: paddingBlockEnd="200"
```

### Remove Emojis from Loading
```typescript
// In app/components/LoadingProgress.tsx
// Remove all emoji characters from loadingMessages arrays
// Keep professional messages only
```

### Update Landing Page
```html
<!-- In app/routes/_index/route.tsx -->
<!-- Replace all [your app] placeholders with actual content -->
<!-- Update feature descriptions -->
```

---

## 🚦 When to Stop/Deploy

**Safe to Deploy After**:
- API version fix (immediately)
- Dead code removal (anytime)
- Each mobile fix improvement

**Must Complete Before Deploy**:
- If you start retry logic, finish it
- Don't leave partial mobile detection

**Rollback If Needed**:
```bash
# Tag before starting
git tag pre-phase-1-fixes
git push origin --tags

# If something breaks, check recent deployments
fly releases --app product-builder-pro

# Rollback to previous version
fly deploy --app product-builder-pro --image registry.fly.io/product-builder-pro:[deployment-id]
```

---

## 📞 Emergency Contacts

If app breaks during fixes:
1. Check Fly.io logs: `fly logs --app product-builder-pro`
2. Rollback if needed (see above)
3. Mobile testing issues: Check browser console
4. API version issues: Check webhook logs in Partner Dashboard

---

## Next Steps

After completing Phase 1:
1. Monitor app for 24 hours
2. Get feedback from beta testers
3. Start Phase 2.3 (Caching) - MUST do before 2.1
4. Don't start Phase 2.1 until caching is ready

Remember: Phase 1 fixes are mostly independent. You can deploy after each one!