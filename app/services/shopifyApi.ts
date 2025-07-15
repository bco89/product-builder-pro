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

interface SKUValidationResult {
  available: boolean;
  conflictingProduct?: {
    id: string;
    title: string;
    handle: string;
  };
}

interface BarcodeValidationResult {
  available: boolean;
  conflictingProduct?: {
    id: string;
    title: string;
    handle: string;
  };
}

interface ValidationConflict {
  type: 'sku' | 'barcode';
  value: string;
  conflictingProduct: {
    id: string;
    title: string;
    handle: string;
  };
}

interface BatchValidationResult {
  valid: boolean;
  conflicts: ValidationConflict[];
}

interface StoreMetrics {
  productCount: number;
  storeSize: 'small' | 'medium' | 'large';
}

interface StoreSettings {
  defaultWeightUnit: 'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS';
}

export interface ShopifyApiService {
  getVendors(): Promise<string[]>;
  getProductTypes(vendor: string): Promise<ProductType[]>;
  getCategories(vendor: string, productType: string): Promise<ProductCategory[]>;
  validateHandle(handle: string): Promise<HandleValidationResult>;
  createProduct(productData: ProductFormData): Promise<any>;
  getStoreMetrics(): Promise<StoreMetrics>;
  getStoreSettings(): Promise<StoreSettings>;
  validateSKU(sku: string): Promise<SKUValidationResult>;
  validateBarcode(barcode: string): Promise<BarcodeValidationResult>;
  validateSKUsBatch(skus: string[], barcodes?: string[]): Promise<BatchValidationResult>;
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

  async getStoreMetrics(): Promise<StoreMetrics> {
    const response = await fetch('/api/shopify/store-metrics');
    if (!response.ok) {
      throw new Error('Failed to fetch store metrics');
    }
    return response.json();
  }

  async getStoreSettings(): Promise<StoreSettings> {
    const response = await fetch('/api/shopify/store-settings');
    if (!response.ok) {
      throw new Error('Failed to fetch store settings');
    }
    return response.json();
  }

  async validateSKU(sku: string): Promise<SKUValidationResult> {
    const response = await fetch(`/api/shopify/validate-sku?sku=${encodeURIComponent(sku)}`);
    if (!response.ok) {
      throw new Error('Failed to validate SKU');
    }
    return response.json();
  }

  async validateBarcode(barcode: string): Promise<BarcodeValidationResult> {
    const response = await fetch(`/api/shopify/validate-barcode?barcode=${encodeURIComponent(barcode)}`);
    if (!response.ok) {
      throw new Error('Failed to validate Barcode');
    }
    return response.json();
  }

  async validateSKUsBatch(skus: string[], barcodes: string[] = []): Promise<BatchValidationResult> {
    const response = await fetch('/api/shopify/validate-skus-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ skus, barcodes }),
    });
    if (!response.ok) {
      throw new Error('Failed to validate SKUs/Barcodes batch');
    }
    return response.json();
  }
} 