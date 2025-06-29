import type { ProductFormData } from '../hooks/useProductBuilderForm';

interface ProductType {
  productType: string;
  category: {
    id: string;
    name: string;
  } | null;
}

interface ProductCategory {
  id: string;
  name: string;
}

interface HandleValidationResult {
  available: boolean;
  handle: string;
  suggestions: string[];
  conflictingProduct?: {
    handle: string;
    title: string;
  };
}

export interface ShopifyApiService {
  getVendors(): Promise<string[]>;
  getProductTypes(vendor: string): Promise<ProductType[]>;
  getCategories(vendor: string, productType: string): Promise<ProductCategory[]>;
  validateHandle(handle: string): Promise<HandleValidationResult>;
  createProduct(productData: ProductFormData): Promise<any>;
}

export class ShopifyApiServiceImpl implements ShopifyApiService {
  constructor(private session: any) {}

  async getVendors(): Promise<string[]> {
    const response = await fetch('/api/shopify/vendors');
    const data = await response.json();
    return data.vendors || [];
  }

  async getProductTypes(vendor: string): Promise<ProductType[]> {
    const response = await fetch(
      `/api/shopify/product-types-by-vendor?vendor=${encodeURIComponent(vendor)}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch product types');
    }
    const data = await response.json();
    return data.productTypes;
  }

  async getCategories(vendor: string, productType: string): Promise<ProductCategory[]> {
    const response = await fetch(
      `/api/shopify/categories-by-product-type?vendor=${encodeURIComponent(vendor)}&productType=${encodeURIComponent(productType)}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const data = await response.json();
    return data.categories;
  }

  async validateHandle(handle: string): Promise<HandleValidationResult> {
    const response = await fetch(
      `/api/shopify/validate-handle?handle=${encodeURIComponent(handle)}`
    );
    if (!response.ok) {
      throw new Error('Failed to validate product handle');
    }
    return response.json();
  }

  async createProduct(productData: ProductFormData): Promise<any> {
    const response = await fetch('/api/shopify/create-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });
    if (!response.ok) {
      throw new Error('Failed to create product');
    }
    return response.json();
  }
} 