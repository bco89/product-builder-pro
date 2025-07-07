# Authentication Migration Guide

## Overview
The authentication logic has been refactored to use a cleaner service-based approach instead of wrapping the Shopify authenticate function. This provides better separation of concerns and makes the code more maintainable.

## Migration Steps

### 1. For Admin Authentication

**Old approach:**
```javascript
import { authenticate } from "../shopify.server";

const { admin } = await authenticate.admin(request);
```

**New approach (with logging):**
```javascript
import { authenticateAdmin } from "../services/auth.server";

const { admin } = await authenticateAdmin(request);
```

**Alternative (without logging):**
```javascript
import { authenticate } from "../shopify.server";

const { admin } = await authenticate.admin(request);
```

### 2. For Webhook Authentication

**Old approach:**
```javascript
import { authenticate } from "../shopify.server";

const { payload, session, topic, shop } = await authenticate.webhook(request);
```

**New approach (with logging):**
```javascript
import { authenticateWebhook } from "../services/auth.server";

const { payload, session, topic, shop } = await authenticateWebhook(request);
```

## Benefits

1. **Cleaner code**: No more wrapper functions in shopify.server.js
2. **Better performance tracking**: Duration logging for authentication requests
3. **Flexible**: Choose between logged and non-logged authentication
4. **Maintainable**: Authentication logic is centralized in one service

## Note
The old authentication methods still work, so migration can be done gradually. Routes that need authentication logging should use the new service methods.