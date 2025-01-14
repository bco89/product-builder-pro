// Generic Shopify Edge type
export interface ShopifyEdge<T> {
  node: T;
}

// API Response types
export interface VendorsResponse {
  data: {
    shop: {
      productVendors: {
        edges: ShopifyEdge<string>[];
      };
    };
  };
}

export interface ProductTypesResponse {
  data: {
    shop: {
      productTypes: {
        edges: ShopifyEdge<string>[];
      };
    };
  };
}

export interface ProductTagsResponse {
  data: {
    shop: {
      productTags: {
        edges: ShopifyEdge<string>[];
      };
    };
  };
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductOptionsResponse {
  data: {
    products: {
      edges: ShopifyEdge<{
        options: ProductOption[];
      }>[];
    };
  };
}

// Cache types
export interface CacheData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export type CacheableDataType = 'vendors' | 'productTypes' | 'tags' | 'options'; 