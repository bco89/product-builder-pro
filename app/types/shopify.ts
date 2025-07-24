/**
 * TypeScript types for Shopify API responses and GraphQL queries
 */

// Base Shopify GraphQL types
export interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: ShopifyGraphQLError[];
}

export interface ShopifyGraphQLError {
  message: string;
  extensions?: {
    code: string;
    [key: string]: any;
  };
  path?: (string | number)[];
}

// Product types
export interface ShopifyProduct {
  id: string;
  title: string;
  description?: string;
  handle?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  vendor?: string;
  productType?: string;
  tags: string[];
  metafields?: ShopifyMetafield[];
  variants: {
    edges: Array<{
      node: ShopifyProductVariant;
    }>;
  };
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  sku?: string;
  barcode?: string;
  price: string;
  compareAtPrice?: string;
  inventoryQuantity?: number;
  weight?: number;
  weightUnit?: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
}

export interface ShopifyMetafield {
  id?: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
}

// Product creation/update types
export interface ProductCreateInput {
  title: string;
  descriptionHtml?: string;
  handle?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  status?: 'ACTIVE' | 'DRAFT';
  metafields?: MetafieldInput[];
}

export interface MetafieldInput {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

export interface ProductVariantInput {
  sku?: string;
  barcode?: string;
  price?: string;
  compareAtPrice?: string;
  weight?: number;
  weightUnit?: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
  inventoryQuantities?: {
    availableQuantity: number;
    locationId: string;
  }[];
  options?: string[];
}

export interface ProductVariantsBulkInput {
  id?: string;
  sku?: string;
  barcode?: string;
  price?: string;
  compareAtPrice?: string;
  weight?: number;
  weightUnit?: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
  inventoryQuantities?: {
    availableQuantity: number;
    locationId: string;
  }[];
}

// Store and settings types
export interface ShopifyShop {
  id: string;
  name: string;
  email: string;
  primaryDomain: {
    url: string;
    host: string;
  };
  currencyCode: string;
  weightUnit: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
}

export interface ShopifyLocation {
  id: string;
  name: string;
  isActive: boolean;
  fulfillsOnlineOrders: boolean;
}

// Query response types
export interface ProductTypesResponse {
  shop: {
    productTypes: {
      edges: Array<{
        node: string;
      }>;
    };
  };
}

export interface ProductVendorsResponse {
  shop: {
    productVendors: {
      edges: Array<{
        node: string;
      }>;
    };
  };
}

export interface StoreMetricsResponse {
  shop: {
    name: string;
    email: string;
    primaryDomain: {
      url: string;
      host: string;
    };
    plan: {
      displayName: string;
    };
    allProductsCount: {
      count: number;
    };
    staffMembers: {
      edges: Array<{
        node: {
          id: string;
        };
      }>;
    };
  };
}

export interface LocationsResponse {
  locations: {
    edges: Array<{
      node: ShopifyLocation;
    }>;
  };
}

// Mutation response types
export interface ProductCreateResponse {
  productCreate: {
    product?: ShopifyProduct;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

export interface ProductUpdateResponse {
  productUpdate: {
    product?: ShopifyProduct;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

export interface ProductVariantsBulkUpdateResponse {
  productVariantsBulkUpdate: {
    productVariants?: ShopifyProductVariant[];
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

export interface ProductVariantsBulkCreateResponse {
  productVariantsBulkCreate: {
    productVariants?: ShopifyProductVariant[];
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

// API request/response types for our endpoints
export interface CreateProductRequest {
  title: string;
  description?: string;
  handle?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  status?: 'ACTIVE' | 'DRAFT';
  price?: string;
  compareAtPrice?: string;
  weight?: number;
  weightUnit?: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
  sku?: string;
  barcode?: string;
  quantity?: number;
  options?: Array<{
    name: string;
    values: string[];
  }>;
  variants?: Array<{
    options: string[];
    sku?: string;
    barcode?: string;
    price?: string;
    compareAtPrice?: string;
    weight?: number;
    weightUnit?: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
    quantity?: number;
  }>;
}

export interface UpdateProductVariantsRequest {
  productId: string;
  options?: Array<{
    name: string;
    values: string[];
  }>;
  skus?: Record<string, string>;
  barcodes?: Record<string, string>;
  pricing?: {
    price?: string;
    compareAtPrice?: string;
  };
  weight?: number;
  weightUnit?: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
}

export interface ValidationResponse {
  isValid: boolean;
  exists?: boolean;
  message?: string;
  conflictingProducts?: Array<{
    id: string;
    title: string;
    handle?: string;
  }>;
}

export interface BatchValidationRequest {
  values: string[];
  productId?: string;
}

export interface BatchValidationResponse {
  results: Record<string, {
    isValid: boolean;
    exists: boolean;
    productTitle?: string;
  }>;
}

// Cache types
export type CacheableDataType = 'productTypes' | 'vendors' | 'storeSettings' | 'scopeCheck';

export interface CacheData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Vendor cache data structure
export interface VendorsData {
  vendors: string[];
  totalVendors: number;
  lastUpdated?: number;
}

// Scope check cache data structure
export interface ScopeCheckData {
  hasRequiredScopes: boolean;
  missingScopes: string[];
  currentScopes: string[];
  lastChecked: number;
}