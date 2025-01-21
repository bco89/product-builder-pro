import type { ProductFormData } from '../hooks/useProductBuilderForm';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class ProductValidationService {
  validateVendorType(data: Pick<ProductFormData, 'vendor' | 'productType'>): ValidationResult {
    const errors: Record<string, string> = {};
    
    if (!data.vendor) {
      errors.vendor = 'Vendor is required';
    }
    if (!data.productType) {
      errors.productType = 'Product type is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateProductDetails(data: Pick<ProductFormData, 'title' | 'description' | 'images'>): ValidationResult {
    const errors: Record<string, string> = {};
    
    if (!data.title) {
      errors.title = 'Title is required';
    }
    if (!data.description) {
      errors.description = 'Description is required';
    }
    if (!data.images.length) {
      errors.images = 'At least one image is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Add other validation methods...
} 