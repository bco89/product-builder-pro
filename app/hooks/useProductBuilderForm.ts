import { useState, useCallback } from 'react';

export interface ProductFormData {
  vendor: string;
  productType: string;
  category: {
    id: string;
    name: string;
  } | null;
  title: string;
  description: string;
  images: File[];
  options: Array<{ name: string; values: string[] }>;
  skus: {
    [key: string]: string;
  };
  barcodes: {
    [key: string]: string;
  };
  pricing: {
    [key: string]: {
      price: string;
      compareAtPrice: string;
      cost: string;
    };
  };
  tags: string[];
}

export function useProductBuilderForm(initialData?: Partial<ProductFormData>) {
  const [formData, setFormData] = useState<ProductFormData>({
    vendor: '',
    productType: '',
    category: null,
    title: '',
    description: '',
    images: [],
    options: [],
    skus: {},
    barcodes: {},
    pricing: {},
    tags: [],
    ...initialData
  });

  const updateForm = useCallback((updates: Partial<ProductFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    formData,
    updateForm
  };
} 