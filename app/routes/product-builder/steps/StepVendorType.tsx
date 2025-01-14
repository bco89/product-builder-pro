import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  FormLayout,
  Select,
  Button,
  ButtonGroup,
  Text,
  Banner,
} from '@shopify/polaris';

interface StepVendorTypeProps {
  formData: {
    vendor: string;
    productType: string;
  };
  onChange: (updates: Partial<typeof formData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepVendorType({ formData, onChange, onNext, onBack }: StepVendorTypeProps) {
  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/vendors');
      const data = await response.json();
      return data.vendors || [];
    }
  });

  const { data: productTypesData, isLoading: productTypesLoading } = useQuery({
    queryKey: ['productTypes'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/product-types');
      const data = await response.json();
      return data.productTypes || [];
    }
  });

  const vendorOptions = (vendorsData || []).map(vendor => ({ label: vendor, value: vendor }));
  const productTypeOptions = (productTypesData || []).map(type => ({ label: type, value: type }));

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
          onChange={(value) => onChange({ vendor: value })}
          disabled={vendorsLoading}
          placeholder="Select a vendor"
        />

        <Select
          label="Product Type"
          options={productTypeOptions}
          value={formData.productType}
          onChange={(value) => onChange({ productType: value })}
          disabled={productTypesLoading}
          placeholder="Select a product type"
        />

        <ButtonGroup>
          <Button onClick={onBack}>Back</Button>
          <Button primary onClick={handleSubmit} disabled={!formData.vendor || !formData.productType}>
            Next
          </Button>
        </ButtonGroup>
      </FormLayout>
    </Card>
  );
} 