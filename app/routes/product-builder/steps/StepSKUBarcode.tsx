import { useCallback } from 'react';
import {
  Card,
  TextField,
  BlockStack,
  InlineStack,
  Text,
  Button,
} from '@shopify/polaris';

interface StepSKUBarcodeProps {
  formData: {
    options: Array<{ name: string; values: string[] }>;
    skus: string[];
    barcodes: string[];
  };
  onChange: (updates: Partial<StepSKUBarcodeProps['formData']>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepSKUBarcode({ formData, onChange, onNext, onBack }: StepSKUBarcodeProps) {
  const hasVariants = formData.options.length > 0;

  const handleSKUChange = useCallback((value: string) => {
    const newSkus = [value];
    onChange({ skus: newSkus });
  }, [onChange]);

  const handleBarcodeChange = useCallback((value: string) => {
    const newBarcodes = [value];
    onChange({ barcodes: newBarcodes });
  }, [onChange]);

  const handleVariantSKUChange = useCallback((index: number, value: string) => {
    const newSkus = [...(formData.skus || [])];
    newSkus[index] = value;
    onChange({ skus: newSkus });
  }, [formData.skus, onChange]);

  const handleVariantBarcodeChange = useCallback((index: number, value: string) => {
    const newBarcodes = [...(formData.barcodes || [])];
    newBarcodes[index] = value;
    onChange({ barcodes: newBarcodes });
  }, [formData.barcodes, onChange]);

  // Generate variants if they exist
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
      sku: formData.skus[index] || '',
      barcode: formData.barcodes[index] || '',
    }));
  }, [formData.options, formData.skus, formData.barcodes, hasVariants]);

  const variants = generateVariants();

  const handleSubmit = () => {
    if (hasVariants) {
      if (variants.every(v => v.sku)) {
        onNext();
      }
    } else if (formData.skus[0]) {
      onNext();
    }
  };

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          SKU & Barcode Assignment
        </Text>

        {!hasVariants ? (
          // Single product SKU/Barcode form
          <BlockStack gap="400">
            <TextField
              label="SKU"
              value={formData.skus[0] || ''}
              onChange={handleSKUChange}
              autoComplete="off"
              helpText="Stock Keeping Unit - unique identifier for this product"
            />

            <TextField
              label="Barcode (ISBN, UPC, GTIN, etc.)"
              value={formData.barcodes[0] || ''}
              onChange={handleBarcodeChange}
              autoComplete="off"
              helpText="Optional - Enter a valid barcode or leave blank"
            />
          </BlockStack>
        ) : (
          // Variant SKUs/Barcodes form
          <BlockStack gap="500">
            {variants.map((variant, index) => (
              <Card key={variant.id}>
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">
                    {variant.title}
                  </Text>

                  <BlockStack gap="300">
                    <TextField
                      label="SKU"
                      value={variant.sku}
                      onChange={(value) => handleVariantSKUChange(index, value)}
                      autoComplete="off"
                      helpText="Stock Keeping Unit - unique identifier for this variant"
                    />

                    <TextField
                      label="Barcode (ISBN, UPC, GTIN, etc.)"
                      value={variant.barcode}
                      onChange={(value) => handleVariantBarcodeChange(index, value)}
                      autoComplete="off"
                      helpText="Optional - Enter a valid barcode or leave blank"
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
            variant="primary"
            onClick={handleSubmit}
            disabled={hasVariants ? 
              variants.some(v => !v.sku) : 
              !formData.skus[0]
            }
          >
            Next
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
} 