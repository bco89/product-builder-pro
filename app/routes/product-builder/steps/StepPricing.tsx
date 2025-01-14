import { useCallback } from 'react';
import {
  Card,
  TextField,
  BlockStack,
  Text,
  Banner,
  Select,
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
    currency: string;
  };
  onChange: (updates: Partial<StepPricingProps['formData']>) => void;
}

export default function StepPricing({ formData, onChange }: StepPricingProps) {
  const generateVariants = useCallback(() => {
    if (!formData.options.length) return [];

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
  }, [formData.options, formData.pricing]);

  const variants = generateVariants();

  const handlePriceChange = useCallback((index: number, field: keyof PricingData, value: string) => {
    const newPricing = [...(formData.pricing || [])];
    newPricing[index] = {
      ...(newPricing[index] || { price: '', compareAtPrice: '', cost: '' }),
      [field]: value
    };
    onChange({ pricing: newPricing });
  }, [formData.pricing, onChange]);

  const handleCurrencyChange = useCallback((value: string) => {
    onChange({ currency: value });
  }, [onChange]);

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Pricing Information
        </Text>

        <Select
          label="Currency"
          options={[
            { label: 'USD ($)', value: 'USD' },
            { label: 'EUR (€)', value: 'EUR' },
            { label: 'GBP (£)', value: 'GBP' },
            { label: 'CAD ($)', value: 'CAD' },
            { label: 'AUD ($)', value: 'AUD' }
          ]}
          value={formData.currency}
          onChange={handleCurrencyChange}
        />

        {variants.length === 0 ? (
          <Banner tone="info">
            <Text as="p">
              No variants have been created yet. Please go back to the Variants step
              to create product variants first.
            </Text>
          </Banner>
        ) : (
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
                      prefix={formData.currency === 'USD' ? '$' : ''}
                      value={variant.pricing.price}
                      onChange={(value) => handlePriceChange(index, 'price', value)}
                      autoComplete="off"
                    />

                    <TextField
                      label="Compare at price"
                      type="number"
                      prefix={formData.currency === 'USD' ? '$' : ''}
                      value={variant.pricing.compareAtPrice}
                      onChange={(value) => handlePriceChange(index, 'compareAtPrice', value)}
                      autoComplete="off"
                      helpText="Optional - Original price before discount"
                    />

                    <TextField
                      label="Cost per item"
                      type="number"
                      prefix={formData.currency === 'USD' ? '$' : ''}
                      value={variant.pricing.cost}
                      onChange={(value) => handlePriceChange(index, 'cost', value)}
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
    </Card>
  );
} 