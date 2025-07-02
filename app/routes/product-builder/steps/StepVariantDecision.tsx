import { Card, BlockStack, Text, Button, InlineStack, Banner } from '@shopify/polaris';
import type { FormData } from '../FormContext';

interface StepVariantDecisionProps {
  formData?: FormData;
  onDecision: (hasVariants: boolean) => void;
  onBack: () => void;
}

export default function StepVariantDecision({ formData, onDecision, onBack }: StepVariantDecisionProps) {
  const basePricing = formData?.pricing?.[0];

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Does this product have variants?
        </Text>
        
        {/* Show pricing context if available */}
        {basePricing?.price && (
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Base Pricing Set</Text>
              <Text as="p">
                <Text as="span" fontWeight="bold">Price:</Text> ${basePricing.price}
                {basePricing.compareAtPrice && (
                  <>
                    {' • '}
                    <Text as="span" fontWeight="bold">Compare at:</Text> ${basePricing.compareAtPrice}
                  </>
                )}
              </Text>
              <Text as="p" tone="subdued">
                This pricing will be applied to {formData?.title ? `"${formData.title}"` : 'your product'}.
              </Text>
            </BlockStack>
          </Card>
        )}
        
        <Banner tone="info">
          <Text as="p">
            Choose whether your product comes in different options like sizes, colors, or styles.
            {basePricing?.price && " Your base pricing will be applied to all variants."}
          </Text>
        </Banner>

        <BlockStack gap="400">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">No Variants</Text>
              <Text as="p">
                This is a single product with one SKU and price.
                Example: A unique artwork or a service.
                {basePricing?.price && ` The price will be $${basePricing.price}.`}
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
                {basePricing?.price && ` All variants will start with the base price of $${basePricing.price}.`}
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
  );
} 