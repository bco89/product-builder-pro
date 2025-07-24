# Admin Extensions Implementation Guide

## Overview
Admin Extensions allow merchants to access Product Builder Pro directly from Shopify admin pages. This guide covers implementing two extensions:
1. **Product Creation Extension** - Add products from the admin products page
2. **Description Enhancement Extension** - Improve descriptions from product detail pages

---

## Prerequisites

- [ ] Phase 1.1 (API Version) must be complete
- [ ] Core app must be stable
- [ ] Shopify CLI version 3.x installed
- [ ] Admin Extensions enabled in Partner Dashboard

---

## Extension 1: Product Creation Action

### Step 1: Initialize Extension Structure
```bash
# From project root
shopify app generate extension

# Select:
# > Admin action
# Name: product-create-action
# This creates: extensions/product-create-action/
```

### Step 2: Configure Extension
```toml
# extensions/product-create-action/shopify.extension.toml
name = "Create with Product Builder"
type = "admin_action"
handle = "product-create-action"

[[targets]]
module = "./src/index.js"
target = "admin.product-index.action.render"

[capabilities]
api_access = true
network_access = true
```

### Step 3: Implement Extension Logic
```javascript
// extensions/product-create-action/src/index.js
import {extend, Button, Modal} from '@shopify/admin-ui-extensions';

extend('admin.product-index.action.render', (root, api) => {
  const {close, data, container} = api;
  
  // Create button that opens Product Builder
  const button = root.createComponent(Button, {
    title: 'Create with Product Builder',
    primary: true,
    onPress: async () => {
      // Get current context (filters, search, etc)
      const context = {
        returnUrl: data.productIndex.url,
        filters: data.productIndex.filters,
        shop: data.shop.domain
      };
      
      // Build Product Builder URL with context
      const baseUrl = `https://${data.shop.domain}/admin/apps/product-builder-pro`;
      const params = new URLSearchParams({
        context: JSON.stringify(context),
        source: 'admin-extension'
      });
      
      // Navigate to Product Builder
      await api.navigation.navigate(`${baseUrl}?${params}`);
    }
  });
  
  root.appendChild(button);
});
```

### Step 4: Update Product Builder to Handle Context
```typescript
// app/routes/app.product-builder.tsx
// Add to loader function:
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const context = url.searchParams.get('context');
  const source = url.searchParams.get('source');
  
  let extensionContext = null;
  if (context && source === 'admin-extension') {
    try {
      extensionContext = JSON.parse(context);
    } catch (e) {
      console.error('Invalid extension context', e);
    }
  }
  
  // ... existing loader code
  
  return json({
    shop: session.shop,
    extensionContext,
    // ... other data
  });
};

// Add success handling to return to admin
const handleSuccess = (productId: string) => {
  if (extensionContext?.returnUrl) {
    // Navigate back to admin products page
    window.location.href = extensionContext.returnUrl;
  } else {
    // Normal success flow
    navigate(`/app/product-builder/success/${productId}`);
  }
};
```

---

## Extension 2: Description Enhancement Action

### Step 1: Initialize Enhancement Extension
```bash
shopify app generate extension

# Select:
# > Admin action  
# Name: description-enhance-action
```

### Step 2: Configure for Product Details Page
```toml
# extensions/description-enhance-action/shopify.extension.toml
name = "Enhance Description with AI"
type = "admin_action"
handle = "description-enhance-action"

[[targets]]
module = "./src/index.js"
target = "admin.product-details.action.render"

[capabilities]
api_access = true
network_access = true
```

### Step 3: Implement Enhancement UI
```javascript
// extensions/description-enhance-action/src/index.js
import {extend, Button, Modal, TextArea, Stack} from '@shopify/admin-ui-extensions';

extend('admin.product-details.action.render', (root, api) => {
  const {close, data, container} = api;
  const product = data.product;
  
  let modal = null;
  let enhancedDescription = '';
  
  // Enhancement button
  const button = root.createComponent(Button, {
    title: 'Enhance Description',
    onPress: () => {
      showEnhancementModal();
    }
  });
  
  function showEnhancementModal() {
    modal = root.createComponent(Modal, {
      title: 'Enhance Product Description',
      onClose: () => modal.remove(),
    });
    
    const modalContent = modal.createComponent(Stack, {vertical: true});
    
    // Current description
    modalContent.appendChild(
      modalContent.createComponent(TextArea, {
        label: 'Current Description',
        value: product.description || '',
        rows: 4,
        disabled: true
      })
    );
    
    // Loading/Enhanced description
    const enhancedField = modalContent.createComponent(TextArea, {
      label: 'Enhanced Description',
      value: 'Generating enhanced description...',
      rows: 8,
      disabled: true
    });
    
    // Action buttons
    const actions = modalContent.createComponent(Stack, {
      distribution: 'trailing'
    });
    
    actions.appendChild(
      actions.createComponent(Button, {
        title: 'Cancel',
        onPress: () => modal.remove()
      })
    );
    
    const saveButton = actions.createComponent(Button, {
      title: 'Save Enhanced Description',
      primary: true,
      disabled: true,
      onPress: async () => {
        await saveEnhancedDescription();
      }
    });
    
    modalContent.appendChild(actions);
    root.appendChild(modal);
    
    // Generate enhanced description
    generateEnhancement(product, enhancedField, saveButton);
  }
  
  async function generateEnhancement(product, field, saveButton) {
    try {
      // Call your AI service
      const response = await fetch(`/api/shopify/generate-description`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          productId: product.id,
          title: product.title,
          description: product.description,
          productType: product.productType,
          vendor: product.vendor
        })
      });
      
      const data = await response.json();
      enhancedDescription = data.description;
      
      // Update UI
      field.updateProps({
        value: enhancedDescription,
        disabled: false
      });
      
      saveButton.updateProps({disabled: false});
      
    } catch (error) {
      field.updateProps({
        value: 'Error generating description. Please try again.'
      });
    }
  }
  
  async function saveEnhancedDescription() {
    try {
      // Update product via GraphQL
      const mutation = `
        mutation updateProduct($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              description
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      await api.graphql(mutation, {
        variables: {
          input: {
            id: product.id,
            description: enhancedDescription
          }
        }
      });
      
      // Close modal and refresh page
      modal.remove();
      api.toast.show('Description updated successfully', {duration: 3000});
      
      // Refresh the page to show new description
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      api.toast.show('Error saving description', {
        duration: 3000,
        isError: true
      });
    }
  }
  
  root.appendChild(button);
});
```

---

## Extension 3: Bulk Enhancement Action

### Step 1: Configure Bulk Action
```toml
# In description-enhance-action/shopify.extension.toml
# Add bulk target
[[targets]]
module = "./src/bulk.js"
target = "admin.product-index.selection-action.render"
```

### Step 2: Implement Bulk Processing
```javascript
// extensions/description-enhance-action/src/bulk.js
import {extend, Button} from '@shopify/admin-ui-extensions';

extend('admin.product-index.selection-action.render', (root, api) => {
  const {close, data} = api;
  const selectedIds = data.selected;
  
  const button = root.createComponent(Button, {
    title: `Enhance ${selectedIds.length} Descriptions`,
    primary: true,
    onPress: async () => {
      // Navigate to bulk processing page
      const params = new URLSearchParams({
        ids: selectedIds.join(','),
        action: 'enhance-descriptions'
      });
      
      await api.navigation.navigate(
        `/apps/product-builder-pro/bulk-enhance?${params}`
      );
    }
  });
  
  root.appendChild(button);
});
```

### Step 3: Create Bulk Processing Page
```typescript
// app/routes/app.bulk-enhance.tsx
import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Layout, Card, ProgressBar, Banner } from "@shopify/polaris";
import { useState, useEffect } from "react";

export const loader = async ({ request }: LoaderArgs) => {
  const url = new URL(request.url);
  const ids = url.searchParams.get('ids')?.split(',') || [];
  
  return json({ productIds: ids });
};

export default function BulkEnhance() {
  const { productIds } = useLoaderData();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  
  useEffect(() => {
    processProducts();
  }, []);
  
  const processProducts = async () => {
    for (let i = 0; i < productIds.length; i++) {
      const id = productIds[i];
      setStatus(prev => ({...prev, [id]: 'processing'}));
      
      try {
        // Process each product
        await enhanceProductDescription(id);
        setStatus(prev => ({...prev, [id]: 'complete'}));
      } catch (error) {
        setStatus(prev => ({...prev, [id]: 'error'}));
      }
      
      setProgress((i + 1) / productIds.length * 100);
    }
  };
  
  const enhanceProductDescription = async (productId: string) => {
    // Implementation here
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate
  };
  
  return (
    <Page
      title="Bulk Description Enhancement"
      backAction={{ onAction: () => navigate('/app') }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <p>Enhancing {productIds.length} product descriptions...</p>
            <br />
            <ProgressBar progress={progress} />
            <br />
            <p>{Math.floor(progress)}% complete</p>
          </Card>
        </Layout.Section>
        
        {progress === 100 && (
          <Layout.Section>
            <Banner
              status="success"
              title="Enhancement complete!"
              action={{
                content: "Return to products",
                onAction: () => window.location.href = '/admin/products'
              }}
            />
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
```

---

## Testing Extensions

### Development and Deployment
```bash
# After making extension changes, commit and deploy
git add -A
git commit -m "Add Admin Extensions for product creation and description enhancement"
git push origin main

# Monitor deployment
fly logs --app product-builder-pro

# Extensions are deployed with the app
shopify app info  # Verify extensions are active
```

### Testing Checklist
- [ ] Extension appears in correct admin location
- [ ] Button/action triggers correctly
- [ ] Context passes to app properly
- [ ] Return navigation works
- [ ] Error states handled gracefully
- [ ] Bulk operations process correctly
- [ ] Performance acceptable for 100+ products

---

## Deployment

### Step 1: Build Extensions
```bash
# Build all extensions
shopify app build
```

### Step 2: Deploy Extensions
```bash
# Commit and deploy all changes
git add -A
git commit -m "Deploy Admin Extensions"
git push origin main

# This automatically:
# - Deploys app via Fly.io
# - Updates extension registrations
# - Applies new permissions

# Monitor deployment
fly logs --app product-builder-pro
```

### Step 3: Verify in Partner Dashboard
1. Go to Partner Dashboard
2. Select your app
3. Check "Extensions" tab
4. Verify all extensions show as "Active"

---

## Troubleshooting

### Extension Not Showing
1. Check `target` in extension.toml matches intended location
2. Verify extension is deployed: `shopify app info`
3. Check browser console for errors
4. Ensure app has required scopes

### Navigation Issues
1. Use full URLs for navigation
2. Check if running in iframe vs new tab
3. Handle both embedded and non-embedded contexts

### API Access Issues
1. Verify `api_access = true` in extension config
2. Check authentication is working
3. Use proper GraphQL client from api object

### Performance Issues
1. Implement pagination for large datasets
2. Use background jobs for bulk operations
3. Show progress indicators
4. Consider queue system for 100+ items

---

## Best Practices

1. **Always provide feedback** - Loading states, progress bars, success messages
2. **Handle errors gracefully** - Don't break the admin experience
3. **Respect merchant's context** - Return them where they started
4. **Test with real data** - Use stores with many products
5. **Consider mobile** - Admin extensions should work on mobile admin
6. **Follow Shopify design** - Use Admin UI components for consistency

---

## Next Steps

After implementing extensions:
1. Test with beta merchants
2. Monitor usage analytics
3. Gather feedback on workflow improvements
4. Consider additional extension points:
   - Order pages
   - Customer pages
   - Discount pages
5. Optimize based on real usage patterns