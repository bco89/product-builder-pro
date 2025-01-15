import { useCallback } from 'react';
import {
  Card,
  TextField,
  BlockStack,
  Text,
  Banner,
  Button,
  InlineStack,
} from '@shopify/polaris';

interface PricingData {
  price: string;
  compareAtPrice: string;
  cost: string;
}

interface StepPricingProps {
  formData: {
    options: Array<{ name: string; values: string[] }>;
    pricing: PricingData[];
  };
  onChange: (updates: Partial<StepPricingProps['formData']>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepPricing({ formData, onChange, onNext, onBack }: StepPricingProps) {
  const hasVariants = formData.options.length > 0;

  const handleSingleProductPriceChange = useCallback((field: keyof PricingData, value: string) => {
    const newPricing = [{ 
      ...(formData.pricing[0] || { price: '', compareAtPrice: '', cost: '' }),
      [field]: value 
    }];
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
              required
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
                      required
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

        <InlineStack gap="300" align="end">
          <Button onClick={onBack}>Back</Button>
          <Button 
            primary 
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