import { Card, BlockStack, Text, Button, InlineStack, Banner, Badge, List } from '@shopify/polaris';

interface StepFinalReviewProps {
  formData: any;
  productId: string | null;
  onSubmit: () => void;
  onEdit: (step: number) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function StepFinalReview({ 
  formData, 
  productId, 
  onSubmit, 
  onEdit, 
  onBack, 
  isSubmitting 
}: StepFinalReviewProps) {
  // Calculate total variants
  const totalVariants = formData.options.reduce((acc: number, opt: any) => 
    acc * opt.values.length, 1
  );

  // Get base pricing from Phase 1
  const basePricing = formData.pricing[0] || { price: '0.00' };

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Review Variant Configuration
        </Text>

        <Banner tone="success">
          <Text as="p">
            Your product has been created! Review the variant configuration below.
          </Text>
        </Banner>

        {/* Show variant summary */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">Product Variants</Text>
            <List>
              {formData.options.map((option: any, index: number) => (
                <List.Item key={index}>
                  <strong>{option.name}:</strong> {option.values.join(', ')}
                </List.Item>
              ))}
            </List>
            <Text as="p">
              <strong>Total variants to be created:</strong> {totalVariants}
            </Text>
          </BlockStack>
        </Card>

        {/* SKU Summary */}
        {formData.skus.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">SKUs Assigned</Text>
              <Text as="p">
                {formData.skus.filter((sku: string) => sku).length} of {totalVariants} variants have SKUs
              </Text>
            </BlockStack>
          </Card>
        )}

        {/* Pricing Summary */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">Pricing</Text>
            <BlockStack gap="200">
              <Text as="p">
                <strong>Base price:</strong> ${basePricing.price}
              </Text>
              {basePricing.compareAtPrice && (
                <Text as="p">
                  <strong>Compare at price:</strong> ${basePricing.compareAtPrice}
                </Text>
              )}
              <Banner tone="info">
                <Text as="p">
                  All variants will be created with the base price of ${basePricing.price}. 
                  You can adjust individual variant prices later in the product catalog.
                </Text>
              </Banner>
            </BlockStack>
          </BlockStack>
        </Card>

        <InlineStack gap="300" align="space-between">
          <Button onClick={onBack}>Back</Button>
          <Button
            variant="primary"
            loading={isSubmitting}
            onClick={onSubmit}
          >
            Finalize Variants
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
} 