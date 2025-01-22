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
}

export default function StepPricing({ formData, onChange, onNext, onBack }: StepPricingProps) {
  const [useIndividualPricing, setUseIndividualPricing] = useState(false);
  const hasVariants = formData.options.length > 0;

  // Initialize pricing array when component mounts
  useEffect(() => {
    const shouldInitialize = !formData.pricing || formData.pricing.length === 0;
    if (shouldInitialize) {
      if (hasVariants) {
        const variantCount = formData.options.reduce((acc, option) => 
          acc * option.values.length, 1);
        
        const initialPricing = Array(variantCount).fill(null).map(() => ({
          price: '',
          compareAtPrice: '',
          cost: ''
        }));
        
        onChange({ pricing: initialPricing });
      } else {
        onChange({ 
          pricing: [{
            price: '',
            compareAtPrice: '',
            cost: ''
          }]
        });
      }
    }
  }, [hasVariants, formData.options.length]); // Only depend on these values

  const handleSingleProductPriceChange = useCallback((field: keyof PricingData, value: string) => {
    const newPricing = [{ 
      ...(formData.pricing[0] || { price: '', compareAtPrice: '', cost: '' }),
      [field]: value 
    }];
    onChange({ pricing: newPricing });
  }, [formData.pricing, onChange]);

  const handleBulkPriceChange = useCallback((field: keyof PricingData, value: string) => {
    const newPricing = formData.pricing.map(pricing => ({
      ...pricing,
      [field]: value
    }));
    onChange({ pricing: newPricing });
  }, [formData.pricing, onChange]);

  const handleVariantPriceChange = useCallback((index: number, field: keyof PricingData, value: string) => {
    const newPricing = [...(formData.pricing || [])];
    newPricing[index] = {
      ...(newPricing[index] || { price: '', compareAtPrice: '', cost: '' }),
      [field]: value
    };
    onChange({ pricing: newPricing });
  }, [formData.pricing, onChange]);

  const generateVariants = useCallback(() => {
    if (!hasVariants) return [];

    const cartesian = (...arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>(
        (results, array) => 
          results
            .map(result => array.map(value => [...result, value]))
            .reduce((subResults, array) => [...subResults, ...array], []),
        [[]]
      );
    };

    const optionValues = formData.options.map(option => option.values);
    const combinations = cartesian(...optionValues);

    return combinations.map((combination, index) => ({
      id: index.toString(),
      title: combination.join(' / '),
      pricing: formData.pricing[index] || { price: '', compareAtPrice: '', cost: '' }
    }));
  }, [formData.options, formData.pricing, hasVariants]);

  const variants = generateVariants();

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Pricing Information
        </Text>

        {!hasVariants ? (
          // Single product pricing form
          <BlockStack gap="400">
            <TextField
              label="Price"
              type="number"
              prefix="$"
              value={formData.pricing[0]?.price || ''}
              onChange={(value) => handleSingleProductPriceChange('price', value)}
              autoComplete="off"
            />

            <TextField
              label="Compare at price"
              type="number"
              prefix="$"
              value={formData.pricing[0]?.compareAtPrice || ''}
              onChange={(value) => handleSingleProductPriceChange('compareAtPrice', value)}
              autoComplete="off"
              helpText="Optional - Original price before discount"
            />

            <TextField
              label="Cost per item"
              type="number"
              prefix="$"
              value={formData.pricing[0]?.cost || ''}
              onChange={(value) => handleSingleProductPriceChange('cost', value)}
              autoComplete="off"
              helpText="Optional - Cost of goods for profit calculations"
            />
          </BlockStack>
        ) : (
          <BlockStack gap="500">
            {!useIndividualPricing ? (
              // Bulk pricing form
              <BlockStack gap="400">
                <TextField
                  label="Price for all variants"
                  type="number"
                  prefix="$"
                  value={formData.pricing[0]?.price || ''}
                  onChange={(value) => handleBulkPriceChange('price', value)}
                  autoComplete="off"
                />

                <TextField
                  label="Compare at price for all variants"
                  type="number"
                  prefix="$"
                  value={formData.pricing[0]?.compareAtPrice || ''}
                  onChange={(value) => handleBulkPriceChange('compareAtPrice', value)}
                  autoComplete="off"
                  helpText="Optional - Original price before discount"
                />

                <TextField
                  label="Cost per item for all variants"
                  type="number"
                  prefix="$"
                  value={formData.pricing[0]?.cost || ''}
                  onChange={(value) => handleBulkPriceChange('cost', value)}
                  autoComplete="off"
                  helpText="Optional - Cost of goods for profit calculations"
                />
              </BlockStack>
            ) : (
              // Variant pricing form
              <BlockStack gap="500">
                {variants.map((variant, index) => (
                  <Card key={variant.id}>
                    <BlockStack gap="500">
                      <Text variant="headingSm" as="h3">
                        {variant.title}
                      </Text>

                      <BlockStack gap="300">
                        <TextField
                          label="Price"
                          type="number"
                          prefix="$"
                          value={variant.pricing.price}
                          onChange={(value) => handleVariantPriceChange(index, 'price', value)}
                          autoComplete="off"
                        />

                        <TextField
                          label="Compare at price"
                          type="number"
                          prefix="$"
                          value={variant.pricing.compareAtPrice}
                          onChange={(value) => handleVariantPriceChange(index, 'compareAtPrice', value)}
                          autoComplete="off"
                          helpText="Optional - Original price before discount"
                        />

                        <TextField
                          label="Cost per item"
                          type="number"
                          prefix="$"
                          value={variant.pricing.cost}
                          onChange={(value) => handleVariantPriceChange(index, 'cost', value)}
                          autoComplete="off"
                          helpText="Optional - Cost of goods for profit calculations"
                        />
                      </BlockStack>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        )}

        <InlineStack gap="300" align="end">
          <Button onClick={onBack}>Back</Button>
          {hasVariants && (
            <Button onClick={() => setUseIndividualPricing(!useIndividualPricing)}>
              {useIndividualPricing ? 'Use same price for all variants' : 'Add pricing to variants individually'}
            </Button>
          )}
          <Button 
            variant="primary"
            onClick={onNext}
            disabled={hasVariants ? 
              variants.some(v => !v.pricing.price) : 
              !formData.pricing[0]?.price
            }
          >
            Next
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
} 