import { Card, BlockStack, Text, Button, InlineStack, Banner } from '@shopify/polaris';

interface StepVariantDecisionProps {
  onDecision: (hasVariants: boolean) => void;
  onBack: () => void;
}

export default function StepVariantDecision({ onDecision, onBack }: StepVariantDecisionProps) {
  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Does this product have variants?
        </Text>
        
        <Banner tone="info">
          <Text as="p">
            Choose whether your product comes in different options like sizes, colors, or styles.
          </Text>
        </Banner>

        <BlockStack gap="400">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">No Variants</Text>
              <Text as="p">
                This is a single product with one SKU and price.
                Example: A unique artwork or a service.
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
  );
} 