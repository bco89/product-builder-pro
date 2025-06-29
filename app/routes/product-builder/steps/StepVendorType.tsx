import { useCallback, useMemo } from 'react';
import {
  Card,
  FormLayout,
  Select,
  Button,
  Text,
  ButtonGroup,
  Spinner,
} from '@shopify/polaris';
import { useQuery } from '@tanstack/react-query';
import { GET_PRODUCT_CATEGORIES } from '~/graphql/queries';

interface Category {
  id: string;
  name: string;
}

interface ProductCategory {
  id: string;
  name: string;
}

interface ProductType {
  productType: string;
  category: {
    id: string;
    name: string;
  } | null;
}

interface FormDataType {
  vendor: string;
  productType: string;
  category: {
    id: string;
    name: string;
  } | null;
}

interface StepVendorTypeProps {
  formData: FormDataType;
  onChange: (updates: Partial<FormDataType>) => void;
  onNext: () => void;
  onBack: () => void;
  productId?: string | null;
}

export default function StepVendorType({ formData, onChange, onNext, onBack, productId }: StepVendorTypeProps) {
  // Fetch all vendors
  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/products?type=vendors');
      const data = await response.json();
      return data.vendors || [];
    }
  });

  // Fetch product types for selected vendor
  const { data: vendorProductTypes, isLoading: productTypesLoading } = useQuery({
    queryKey: ['productTypes', formData.vendor],
    enabled: !!formData.vendor,
    queryFn: async () => {
      const response = await fetch(`/api/shopify/products?type=productTypes&vendor=${encodeURIComponent(formData.vendor)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product types');
      }
      const data = await response.json();
      return data.productTypes as ProductType[];
    }
  });

  // Updated query for categories
  const { data: productTypeCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', formData.vendor, formData.productType],
    enabled: !!formData.vendor && !!formData.productType,
    queryFn: async () => {
      const response = await fetch(`/api/shopify/products?type=categories&productType=${encodeURIComponent(formData.productType)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      return data.categories || [];
    }
  });

  const handleVendorChange = useCallback((value: string) => {
    console.log('Vendor changed to:', value); // Debug log
    onChange({ 
      vendor: value,
      productType: '',
      category: null
    });
  }, [onChange]);

  const handleProductTypeChange = useCallback((value: string) => {
    onChange({ 
      productType: value,
      category: null
    });
  }, [onChange]);

  const handleCategoryChange = useCallback((selected: string) => {
    const category = productTypeCategories?.find((cat: Category) => cat.id === selected) || null;
    onChange({ category });
  }, [onChange, productTypeCategories]);

  const vendorOptions = (vendorsData || []).map((vendor: string) => ({ 
    label: vendor, 
    value: vendor 
  }));

  const productTypeOptions = useMemo(() => {
    if (!vendorProductTypes?.length) {
      return [];
    }
    return vendorProductTypes.map(type => ({
      label: type.productType,
      value: type.productType
    }));
  }, [vendorProductTypes]);

  const categoryOptions = useMemo(() => {
    return productTypeCategories?.map((cat: Category) => ({
      label: cat.name,
      value: cat.id
    })) || [];
  }, [productTypeCategories]);

  const handleSubmit = () => {
    if (formData.vendor && formData.productType) {
      onNext();
    }
  };

  return (
    <Card>
      <FormLayout>
        <Text variant="headingMd" as="h2">Select Vendor & Product Type</Text>
        
        <Select
          label="Vendor"
          options={vendorOptions}
          value={formData.vendor}
          onChange={handleVendorChange}
          disabled={vendorsLoading}
          placeholder={vendorsLoading ? "Loading vendors..." : "Select a vendor"}
        />

        <Select
          label="Product Type"
          options={productTypeOptions}
          value={formData.productType}
          onChange={handleProductTypeChange}
          disabled={productTypesLoading || !formData.vendor}
          placeholder={
            !formData.vendor 
              ? "Select a vendor first" 
              : productTypesLoading 
                ? "Loading product types..." 
                : productTypeOptions.length === 0
                  ? "No product types found for this vendor"
                  : "Select a product type"
          }
          helpText={
            !formData.vendor 
              ? "Please select a vendor to see available product types" 
              : productTypeOptions.length === 0 && !productTypesLoading
                ? "This vendor has no existing products. Please create a product in Shopify first."
                : ""
          }
        />

        <Select
          label="Product Category"
          options={categoryOptions}
          value={formData.category?.id || ''}
          onChange={handleCategoryChange}
          disabled={categoriesLoading || !formData.productType}
          placeholder={
            !formData.productType 
              ? "Select a product type first" 
              : categoriesLoading 
                ? "Loading categories..." 
                : "Select a category"
          }
          helpText={
            !formData.productType 
              ? "Please select a product type to see available categories" 
              : "Select the appropriate Shopify product category for better discoverability"
          }
        />

        <ButtonGroup>
          <Button onClick={onBack}>Back</Button>
          <Button 
            variant="primary"
            onClick={handleSubmit} 
            disabled={!formData.vendor || !formData.productType}
          >
            Next
          </Button>
        </ButtonGroup>
      </FormLayout>
    </Card>
  );
} 