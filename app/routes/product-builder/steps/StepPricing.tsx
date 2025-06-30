import { useCallback, useState, useEffect } from 'react';
import {
  Card,
  TextField,
  BlockStack,
  Text,
  Banner,
  Button,
  InlineStack,
} from '@shopify/polaris';
import type { FormData, PricingData } from '../FormContext';

interface StepPricingProps {
  formData: FormData;
  onChange: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  productId?: string | null;
}

export default function StepPricing({ formData, onChange, onNext, onBack, productId }: StepPricingProps) {
  // Initialize pricing array when component mounts
  useEffect(() => {
    const shouldInitialize = !formData.pricing || formData.pricing.length === 0;
    if (shouldInitialize) {
      onChange({ 
        pricing: [{
          price: '',
          compareAtPrice: '',
          cost: ''
        }]
      });
    }
  }, []); // Only run once on mount

  const handlePriceChange = useCallback((field: keyof PricingData, value: string) => {
    const newPricing = [{ 
      ...(formData.pricing[0] || { price: '', compareAtPrice: '', cost: '' }),
      [field]: value 
    }];
    onChange({ pricing: newPricing });
  }, [formData.pricing, onChange]);

  return (
    <>
      {/* Enhanced Product Information Display Card */}
      <Card>
        <BlockStack gap="200">
          <Text as="span">
            <Text as="span" fontWeight="bold">Product Title:</Text> {formData.title || 'Not specified'}
          </Text>
          <InlineStack gap="400" wrap>
            <Text as="span">
              <Text as="span" fontWeight="bold">Vendor:</Text> {formData.vendor || 'Not specified'}
            </Text>
            <Text as="span">
              <Text as="span" fontWeight="bold">Product Type:</Text> {formData.productType || 'Not specified'}
            </Text>
            <Text as="span">
              <Text as="span" fontWeight="bold">Category:</Text> {formData.category?.name || 'Not specified'}
            </Text>
          </InlineStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="500">
          <Text variant="headingMd" as="h2">
            Product Pricing
          </Text>

          <Banner tone="info">
            <Text as="p">
              Set the base price for your product. This price will be applied to all variants. 
              You can adjust individual variant prices later in the product catalog.
            </Text>
          </Banner>

          <BlockStack gap="400">
            <TextField
              label="Price"
              type="number"
              prefix="$"
              value={formData.pricing[0]?.price || ''}
              onChange={(value) => handlePriceChange('price', value)}
              autoComplete="off"
              helpText="This price will be applied to all product variants"
            />

            <TextField
              label="Compare at price"
              type="number"
              prefix="$"
              value={formData.pricing[0]?.compareAtPrice || ''}
              onChange={(value) => handlePriceChange('compareAtPrice', value)}
              autoComplete="off"
              helpText="Optional - Original price before discount"
            />

            <TextField
              label="Cost per item"
              type="number"
              prefix="$"
              value={formData.pricing[0]?.cost || ''}
              onChange={(value) => handlePriceChange('cost', value)}
              autoComplete="off"
              helpText="Optional - Cost of goods for profit calculations"
            />
          </BlockStack>

          <InlineStack gap="300" align="end">
            <Button onClick={onBack}>Back</Button>
            <Button 
              variant="primary"
              onClick={onNext}
              disabled={!formData.pricing[0]?.price}
            >
              Next
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>
    </>
  );
} 