import { Card, BlockStack, Text, Button, InlineStack, Tooltip, Icon } from '@shopify/polaris';
import { InfoIcon } from '@shopify/polaris-icons';
import type { FormData } from '../FormContext';

interface StepVariantDecisionProps {
  formData?: FormData;
  onDecision: (hasVariants: boolean) => void;
  onBack: () => void;
}

export default function StepVariantDecision({ formData, onDecision, onBack }: StepVariantDecisionProps) {
  const basePricing = formData?.pricing?.[0];

  return (
    <>
      {/* Product Summary Card */}
      {formData && (
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
            {basePricing && (
              <Text as="span">
                <Text as="span" fontWeight="bold">Price:</Text> ${basePricing.price || '0.00'}
                {basePricing.compareAtPrice && (
                  <>
                    {' • '}
                    <Text as="span" fontWeight="bold">Compare at:</Text> ${basePricing.compareAtPrice}
                  </>
                )}
                {basePricing.cost && (
                  <>
                    {' • '}
                    <Text as="span" fontWeight="bold">Cost:</Text> ${basePricing.cost}
                  </>
                )}
              </Text>
            )}
          </BlockStack>
        </Card>
      )}

      {/* Variant Decision Step Card */}
      <Card>
        <BlockStack gap="500">
          <InlineStack gap="200" blockAlign="center">
            <Text variant="headingMd" as="h2">
              Does this product have variants?
            </Text>
            <Tooltip content={`Choose whether your product comes in different options like sizes, colors, or styles.${basePricing?.price ? ' Your base pricing will be applied to all variants.' : ''}`}>
              <Icon source={InfoIcon} tone="info" />
            </Tooltip>
          </InlineStack>

          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">No Variants</Text>
                <Text as="p">
                  This is a single product with one SKU and price.
                </Text>
                <Button onClick={() => onDecision(false)}>
                  Continue without variants
                </Button>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">Has Variants</Text>
                <Text as="p">
                  This product comes in multiple options.
                  Example: A t-shirt in different sizes and colors.
                </Text>
                <Button variant="primary" onClick={() => onDecision(true)}>
                  Add variants to this product
                </Button>
              </BlockStack>
            </Card>
          </BlockStack>

          <InlineStack gap="300">
            <Button onClick={onBack}>Back</Button>
          </InlineStack>
        </BlockStack>
      </Card>
    </>
  );
} 