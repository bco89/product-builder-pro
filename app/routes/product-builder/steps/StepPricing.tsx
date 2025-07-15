import { useCallback, useEffect } from 'react';
import {
  Card,
  TextField,
  BlockStack,
  Text,
  Banner,
} from '@shopify/polaris';
import type { FormData, PricingData } from '../FormContext';
import { ProductInfoCard } from '../../../components/ProductInfoCard';
import { StepNavigation } from '../../../components/StepNavigation';

interface StepPricingProps {
  formData: FormData;
  onChange: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  productId?: string | null;
}

// Helper functions for currency formatting
const formatCurrencyInput = (value: string): string => {
  if (!value) return '';
  
  // Remove all non-digit characters except decimal point
  let cleanValue = value.replace(/[^\d.]/g, '');
  
  // Handle multiple decimal points - keep only the first one
  const decimalIndex = cleanValue.indexOf('.');
  if (decimalIndex !== -1) {
    cleanValue = cleanValue.substring(0, decimalIndex + 1) + cleanValue.substring(decimalIndex + 1).replace(/\./g, '');
  }
  
  // Limit to 2 decimal places
  if (decimalIndex !== -1 && cleanValue.length > decimalIndex + 3) {
    cleanValue = cleanValue.substring(0, decimalIndex + 3);
  }
  
  return cleanValue;
};

const formatCurrencyForStorage = (value: string): string => {
  if (!value) return '';
  
  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) return '';
  
  return numericValue.toFixed(2);
};

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
    // Clean the input for immediate display
    const cleanValue = formatCurrencyInput(value);
    
    const newPricing = [{ 
      ...(formData.pricing[0] || { price: '', compareAtPrice: '', cost: '' }),
      [field]: cleanValue
    }];
    onChange({ pricing: newPricing });
  }, [formData.pricing, onChange]);

  const handlePriceBlur = useCallback((field: keyof PricingData, value: string) => {
    // Format for storage when user leaves the field
    const formattedValue = formatCurrencyForStorage(value);
    
    const newPricing = [{ 
      ...(formData.pricing[0] || { price: '', compareAtPrice: '', cost: '' }),
      [field]: formattedValue
    }];
    onChange({ pricing: newPricing });
  }, [formData.pricing, onChange]);

  return (
    <>
      {/* Enhanced Product Information Display Card */}
      <ProductInfoCard
        title={formData.title}
        vendor={formData.vendor}
        productType={formData.productType}
        category={formData.category?.name}
      />

      <Card>
        <BlockStack gap="500">
          <Text variant="headingMd" as="h2">
            Product Pricing
          </Text>

          <Banner tone="info">
            <Text as="p">
              Set the base price for your product. If you choose to add variants in the next step, 
              this price will be applied to all variants. You can adjust individual variant prices 
              later in the product catalog.
            </Text>
          </Banner>

          <BlockStack gap="400">
            <TextField
              label="Price"
              type="text"
              prefix="$"
              value={formData.pricing[0]?.price || ''}
              onChange={(value) => handlePriceChange('price', value)}
              onBlur={() => handlePriceBlur('price', formData.pricing[0]?.price || '')}
              autoComplete="off"
              helpText="Base price for your product - will be applied to all variants if you add them"
            />

            <TextField
              label="Compare at price"
              type="text"
              prefix="$"
              value={formData.pricing[0]?.compareAtPrice || ''}
              onChange={(value) => handlePriceChange('compareAtPrice', value)}
              onBlur={() => handlePriceBlur('compareAtPrice', formData.pricing[0]?.compareAtPrice || '')}
              autoComplete="off"
              helpText="Optional - Original price before discount"
            />

            <TextField
              label="Cost per item"
              type="text"
              prefix="$"
              value={formData.pricing[0]?.cost || ''}
              onChange={(value) => handlePriceChange('cost', value)}
              onBlur={() => handlePriceBlur('cost', formData.pricing[0]?.cost || '')}
              autoComplete="off"
              helpText="Optional - Cost of goods for profit calculations"
            />
          </BlockStack>

          <StepNavigation
            onBack={onBack}
            onNext={onNext}
            nextDisabled={!formData.pricing[0]?.price}
          />
        </BlockStack>
      </Card>
    </>
  );
} 