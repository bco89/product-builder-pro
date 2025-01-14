import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Select,
  Banner,
  Text,
  BlockStack,
  InlineStack,
  Link
} from '@shopify/polaris';
import { useQuery } from '@tanstack/react-query';
import type { SelectOption } from '@shopify/polaris';

interface StepVendorTypeProps {
  formData: {
    vendor: string;
    productType: string;
  };
  onChange: (updates: Partial<StepVendorTypeProps['formData']>) => void;
}

export default function StepVendorType({ formData, onChange }: StepVendorTypeProps) {
  const [error, setError] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [productTypes, setProductTypes] = useState([]);

  // Fetch existing vendors and product types from Shopify
  const { isLoading: isLoadingVendors, error: vendorError } = useQuery('vendors', async () => {
    const response = await fetch('/api/shopify/vendors');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load vendors');
    }
    const data = await response.json();
    setVendors(data.vendors.map(vendor => ({ label: vendor, value: vendor })));
  });

  const { isLoading: isLoadingTypes, error: typeError } = useQuery('productTypes', async () => {
    const response = await fetch('/api/shopify/product-types');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load product types');
    }
    const data = await response.json();
    setProductTypes(data.productTypes.map(type => ({ label: type, value: type })));
  });

  // Add useEffect to handle errors
  useEffect(() => {
    if (vendorError) {
      setError(vendorError.message);
    }
    if (typeError) {
      setError(typeError.message);
    }
  }, [vendorError, typeError]);

  const handleVendorChange = useCallback((value) => {
    setError(null);
    onChange({ vendor: value });
  }, [onChange]);

  const handleTypeChange = useCallback((value) => {
    setError(null);
    onChange({ productType: value });
  }, [onChange]);

  const isLoading = isLoadingVendors || isLoadingTypes;

  return (
    <Card>
      <BlockStack gap="4">
        <Text variant="headingMd" as="h2">
          Select Vendor and Product Type
        </Text>

        {error && (
          <Banner
            title="There was an error"
            status="critical"
            onDismiss={() => setError(null)}
          >
            <p>{error}</p>
          </Banner>
        )}

        <BlockStack gap="4">
          <Select
            label="Vendor"
            options={vendors}
            value={formData.vendor}
            onChange={handleVendorChange}
            disabled={isLoading}
            required
            helpText="Select from existing vendors. New vendors must be created in Shopify admin first."
          />

          <Select
            label="Product Type"
            options={productTypes}
            value={formData.productType}
            onChange={handleTypeChange}
            disabled={isLoading}
            required
            helpText="Select from existing product types. New types must be created in Shopify admin first."
          />

          {(!formData.vendor || !formData.productType) && (
            <Banner status="info">
              <BlockStack gap="2">
                <Text as="p">
                  New vendors and product types must be created in Shopify admin first.
                </Text>
                <InlineStack gap="2">
                  <Text as="span">Go to</Text>
                  <Link
                    url="https://admin.shopify.com/store/products"
                    external
                    removeUnderline
                  >
                    Shopify admin
                  </Link>
                  <Text as="span">to create them.</Text>
                </InlineStack>
              </BlockStack>
            </Banner>
          )}
        </BlockStack>
      </BlockStack>
    </Card>
  );
} 