/**
 * TypeScript types for Product Builder application
 */

// Form phases
export type Phase = 'productInfo' | 'variantInfo';

// Form step definitions
export interface Step {
  id: string;
  title: string;
  phase: Phase;
  component: string;
}

// Product form data
export interface ProductFormData {
  // Step 1: Vendor & Type
  vendor?: string;
  productType?: string;
  category?: string;
  
  // Step 2: Product Details
  title: string;
  description?: string;
  handle?: string;
  
  // Step 3: Tags
  tags: string[];
  
  // Step 4: Pricing
  price?: string;
  compareAtPrice?: string;
  
  // Step 5: Variant Decision
  hasVariants: boolean;
  
  // Step 6: Variants
  options?: Array<{
    name: string;
    values: string[];
  }>;
  
  // Step 7: SKU & Barcode
  sku?: string;
  barcode?: string;
  skus?: Record<string, string>;
  barcodes?: Record<string, string>;
  
  // Additional fields
  weight?: number;
  weightUnit?: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
  status?: 'ACTIVE' | 'DRAFT';
  quantity?: number;
  locationId?: string;
}

// Validation state
export interface ValidationState {
  handle?: {
    isValid: boolean;
    checking: boolean;
    message?: string;
  };
  sku?: {
    isValid: boolean;
    checking: boolean;
    message?: string;
  };
  barcode?: {
    isValid: boolean;
    checking: boolean;
    message?: string;
  };
  skus?: Record<string, {
    isValid: boolean;
    exists: boolean;
    productTitle?: string;
  }>;
  barcodes?: Record<string, {
    isValid: boolean;
    exists: boolean;
    productTitle?: string;
  }>;
}

// Step component props
export interface StepComponentProps {
  formData: ProductFormData;
  updateFormData: (data: Partial<ProductFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Cache data types
export interface CachedProductTypes {
  productTypes: string[];
  timestamp: number;
}

export interface CachedVendors {
  vendors: string[];
  timestamp: number;
}

export interface CachedCategories {
  [productType: string]: {
    categories: Array<{
      id: string;
      name: string;
      fullName: string;
    }>;
    timestamp: number;
  };
}

// Store settings
export interface StoreSettings {
  weightUnit: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
  currencyCode: string;
  locations: Array<{
    id: string;
    name: string;
    isActive: boolean;
    fulfillsOnlineOrders: boolean;
  }>;
}

// Product builder context
export interface ProductBuilderContext {
  storeSettings?: StoreSettings;
  isLoading: boolean;
  error?: string;
}

// Category selection
export interface Category {
  id: string;
  name: string;
  fullName: string;
  level: number;
  parentId?: string;
  children?: Category[];
}

// Variant combination
export interface VariantCombination {
  options: string[];
  key: string;
  sku?: string;
  barcode?: string;
  price?: string;
  compareAtPrice?: string;
  quantity?: number;
}

// Modal states
export interface ConflictModalState {
  isOpen: boolean;
  type?: 'sku' | 'barcode';
  conflicts?: Array<{
    value: string;
    existingProducts: Array<{
      id: string;
      title: string;
      variant?: string;
    }>;
  }>;
}

// API error types
export interface ApiError {
  message: string;
  field?: string;
  code?: string;
}

// Success state
export interface ProductCreationSuccess {
  productId: string;
  productTitle: string;
  productHandle: string;
  variantCount: number;
}