# Refactoring Plan - Dependencies and Overlaps

## Critical Dependencies Map

### ⚠️ Breaking Changes Alert
The following changes will temporarily break functionality and require completion before the app is usable:

1. **Phase 1.1 (API Version)** → Breaks webhooks until deployment
2. **Phase 2.1 (Parallel Loading)** → Breaks initial load until cache implementation
3. **Phase 3.2 (GraphQL Centralization)** → Breaks all API routes until migration complete
4. **Phase 4.1 (Admin Extensions)** → Requires full deployment cycle

---

## Phase Dependencies

### Phase 1: Critical Performance & Bug Fixes ✅ COMPLETED IN 10 MINUTES

#### 1.1 Fix API Version Mismatch ✅
**Breaks**: 
- Webhook functionality until deployment completes
- Any API calls using October24 version features

**Must Complete Before**:
- Any webhook testing
- Phase 5.1 (Direct API Access) - requires January25 version

**Safe to Pause**: YES - Can deploy immediately

**Status**: ✅ COMPLETED - API version now correctly set to January25

#### 1.2 Fix Mobile Loading Issue ✅
**Depends On**: None

**Conflicts With**:
- Phase 3.1 (Authentication) - both modify auth flow
- If started, must complete retry logic to avoid infinite loops

**Safe to Pause**: NO - Once started, must complete or mobile remains broken

**Status**: ✅ COMPLETED - Mobile now loads correctly with retry logic

#### 1.3 Remove Obsolete Code ✅
**Depends On**: None

**Impacts**:
- Phase 3.2 (GraphQL Centralization) - fewer files to migrate
- Phase 2.2 (Query Optimization) - removes conflicting queries

**Order Requirement**: MUST do before Phase 3.2 to avoid migrating dead code

**Safe to Pause**: YES - Can remove files incrementally

**Status**: ✅ COMPLETED - Obsolete code removed (kept 3 files still in use)

---

### Phase 2: Performance Optimization

#### 2.1 Implement Parallel Data Loading
**Depends On**:
- Phase 2.3 (Caching) should be ready or will cause errors

**Breaks**:
- Initial app load if caching not implemented
- StepVendorType component until data flow updated

**Must Do Together**:
- Update loader AND component in same session
- Deploy cache implementation first or simultaneously

**Safe to Pause**: NO - App unusable until both parts complete

#### 2.2 Optimize GraphQL Queries
**Depends On**:
- Phase 1.3 (Remove obsolete) - to avoid conflicts

**Impacts**:
- Phase 2.4 (Request Optimization) - changes request patterns
- Phase 3.2 (Centralization) - easier if done after optimization

**Can Break**:
- Vendor/Product Type selection if pagination not handled correctly

**Safe to Pause**: YES - Can optimize one query at a time

#### 2.3 Enhanced Caching Strategy
**Must Complete Before**:
- Phase 2.1 (Parallel Loading) - or app will break

**Impacts**:
- All data fetching throughout app
- Performance testing results

**Safe to Pause**: YES - But don't start 2.1 until complete

#### 2.4 Request Optimization
**Depends On**:
- Phase 2.2 (Query Optimization) - to avoid rework

**Safe to Pause**: YES - Incremental improvements

---

### Phase 3: Code Quality & Architecture

#### 3.1 Standardize Authentication
**Conflicts With**:
- Phase 1.2 (Mobile Fix) - both modify auth flow

**Order**: 
- If 1.2 in progress, complete it first
- Or do 3.1 first and incorporate mobile fixes

**Breaks**:
- All API routes temporarily during migration
- Complete all routes in one session

**Safe to Pause**: NO - Must update all routes together

#### 3.2 Centralize GraphQL Queries
**Depends On**:
- Phase 1.3 (Remove obsolete) - complete first
- Phase 2.2 (Optimize queries) - ideally complete first

**Breaks**:
- EVERY API route until migration complete
- Must update imports in all files

**Deployment Required**: Full deployment after completion

**Safe to Pause**: NO - App completely broken until done

#### 3.3 Improve Error Handling
**Can Do Anytime**: YES

**Best After**:
- Phase 3.2 (Centralized queries) - to avoid rework

**Safe to Pause**: YES - Incremental improvements

#### 3.4 UI/UX Quick Wins
**Independent**: Can do anytime

**Safe to Pause**: YES - Each change independent

---

### Phase 4: Admin Extensions

#### 4.1 Product Creation Extension
**Depends On**:
- Phase 1.1 (API Version) - needs January25
- Core app must be stable

**Independent From**: Other phases

**Deployment**: Requires full deploy cycle

**Safe to Pause**: YES - Extension independent of main app

#### 4.2 Description Enhancement Extension
**Depends On**:
- Phase 4.1 infrastructure setup
- AI service must be working

**Safe to Pause**: YES - Independent feature

#### 4.3 Extension Testing
**Must Complete**: Before any extension goes live

**Safe to Pause**: NO - Don't release untested extensions

---

### Phase 5: Modern Shopify Features

#### 5.1 Enable Direct API Access
**Depends On**:
- Phase 1.1 (API Version) - requires January25
- Phase 3.2 (Centralized queries) - easier after centralization

**Major Change**: 
- All API calls must be updated
- Significant testing required

**Safe to Pause**: NO - Once started, complete all updates

#### 5.2 Shopify Managed Installation
**Independent**: Can do anytime

**Safe to Pause**: YES

#### 5.3 Polaris Component Updates  
**Independent**: Can do anytime

**Safe to Pause**: YES - Each component independent

---

## Recommended Execution Order

### Week 1: Foundation (Can't pause once started)
1. **Day 1**: ~~Phase 1.1 (API Version) - Deploy immediately~~ ✅ COMPLETED
2. **Day 2**: ~~Phase 1.3 (Remove obsolete) - Clean codebase~~ ✅ COMPLETED  
3. **Day 3-4**: Phase 2.3 (Caching) - Must complete before 2.1 ⬅️ NEXT
4. **Day 5**: Phase 2.1 (Parallel Loading) - Do in one session

### Week 2: Stability (Some pausable)
1. **Day 1-2**: ~~Phase 1.2 (Mobile Fix) - Complete fully~~ ✅ COMPLETED
2. **Day 3**: Phase 2.2 (Query Optimization) - Can do incrementally  
3. **Day 4-5**: Phase 3.2 (Centralize GraphQL) - MUST complete in one session

### Week 3: Features (All pausable)
1. **Day 1-3**: Phase 4.1 (Product Extension)
2. **Day 4-5**: Phase 4.2 (Description Extension)

### Week 4: Polish (All pausable)
1. **Day 1-2**: Phase 5.1 (Direct API)
2. **Day 3-5**: Remaining optimizations

---

## Critical "No Pause" Operations

These MUST be completed once started or app breaks:

1. **Phase 1.2**: Mobile retry logic (partial implementation causes loops)
2. **Phase 2.1**: Parallel loading + component updates  
3. **Phase 3.1**: Authentication standardization (all routes)
4. **Phase 3.2**: GraphQL centralization (all queries)
5. **Phase 5.1**: Direct API migration (all calls)

---

## Safe Pause Points

Can stop and deploy at these points:

- After Phase 1.1 (API Version) ✅ COMPLETED
- After Phase 1.3 (Code removal) ✅ COMPLETED
- After Phase 2.3 (Caching implementation) ⬅️ NEXT SAFE PAUSE POINT
- After any Phase 4 sub-phase
- After Phase 3.4 (UI updates)
- Between query optimizations in 2.2

---

## 48-Hour Maintenance Windows

These phases require warning users of potential downtime:

1. **Phase 3.2** (GraphQL Centralization): 4-6 hour window
2. **Phase 5.1** (Direct API): 6-8 hour window  
3. **Phase 2.1** (If caching not ready): 2-3 hour window

---

## Rollback Points

Always create git tags at these points:

```bash
# Before starting any phase
git tag pre-phase-1.1-$(date +%Y%m%d)
git push origin --tags

# After completing critical phases
git tag post-phase-1-complete-$(date +%Y%m%d)
git push origin --tags

# Before major refactors
git tag pre-graphql-centralization-$(date +%Y%m%d)
git push origin --tags
```

Key tagging points:
- Before Phase 1.1 (baseline)
- After Phase 1 complete
- Before Phase 3.2 (major refactor)
- After Phase 3.2 (new baseline)
- Before Phase 5.1 (API changes)
- After each successful week

---

## Emergency Procedures

If a "No Pause" operation fails:

1. **Phase 2.1 Failure**: 
   ```bash
   git revert HEAD  # Revert loader AND component changes
   git push origin main
   ```

2. **Phase 3.2 Failure**: 
   ```bash
   git reset --hard pre-graphql-centralization
   git push --force origin main
   # Or use Fly.io rollback
   fly deploy --app product-builder-pro --image registry.fly.io/product-builder-pro:[last-working-version]
   ```

3. **Phase 5.1 Failure**: 
   ```bash
   # Revert Direct API changes
   git revert HEAD
   git push origin main
   ```

Always monitor deployments during critical operations:
```bash
fly logs --app product-builder-pro --tail
```