import { useCallback } from 'react';
import {
  Card,
  TextField,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  Button,
} from '@shopify/polaris';

interface Variant {
  id: string;
  title: string;
  sku: string;
  barcode: string;
}

interface StepSKUBarcodeProps {
  formData: {
    options: Array<{ name: string; values: string[] }>;
    skus: string[];
    barcodes: string[];
  };
  onChange: (updates: Partial<StepSKUBarcodeProps['formData']>) => void;
}

export default function StepSKUBarcode({ formData, onChange }: StepSKUBarcodeProps) {
  // Generate variants based on options
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

    return combinations.map((combination, index) => {
      const title = combination.join(' / ');
      return {
        id: index.toString(),
        title,
        sku: formData.skus[index] || '',
        barcode: formData.barcodes[index] || '',
      };
    });
  }, [formData.options, formData.skus, formData.barcodes]);

  const variants = generateVariants();

  const handleSKUChange = useCallback((index: number, value: string) => {
    const newSkus = [...(formData.skus || [])];
    newSkus[index] = value;
    onChange({ skus: newSkus });
  }, [formData.skus, onChange]);

  const handleBarcodeChange = useCallback((index: number, value: string) => {
    const newBarcodes = [...(formData.barcodes || [])];
    newBarcodes[index] = value;
    onChange({ barcodes: newBarcodes });
  }, [formData.barcodes, onChange]);

  const generateSKUs = useCallback(() => {
    const baseSkus = variants.map((variant, index) => {
      const variantParts = variant.title.split(' / ');
      const sku = variantParts
        .map(part => part.substring(0, 3).toUpperCase())
        .join('-');
      return `${sku}-${(index + 1).toString().padStart(3, '0')}`;
    });
    onChange({ skus: baseSkus });
  }, [variants, onChange]);

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          SKU & Barcode Assignment
        </Text>

        {variants.length === 0 ? (
          <Banner tone="info">
            <Text as="p">
              No variants have been created yet. Please go back to the Variants step
              to create product variants first.
            </Text>
          </Banner>
        ) : (
          <BlockStack gap="500">
            <InlineStack gap="300">
              <Button onClick={generateSKUs}>Generate SKUs</Button>
            </InlineStack>

            {variants.map((variant, index) => (
              <Card key={variant.id}>
                <BlockStack gap="500">
                  <Text variant="headingSm" as="h3">
                    {variant.title}
                  </Text>

                  <BlockStack gap="300">
                    <TextField
                      label="SKU"
                      value={formData.skus[index] || ''}
                      onChange={(value) => handleSKUChange(index, value)}
                      autoComplete="off"
                      helpText="Stock Keeping Unit - unique identifier for this variant"
                    />

                    <TextField
                      label="Barcode (ISBN, UPC, GTIN, etc.)"
                      value={formData.barcodes[index] || ''}
                      onChange={(value) => handleBarcodeChange(index, value)}
                      autoComplete="off"
                      helpText="Optional - Enter a valid barcode or leave blank"
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