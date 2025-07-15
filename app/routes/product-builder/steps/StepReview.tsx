import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  Button,
  Divider,
  List,
  Thumbnail,
  Badge,
} from '@shopify/polaris';
import { useCallback, useState } from 'react';

interface ReviewFormData {
  vendor: string;
  productType: string;
  category: {
    id: string;
    name: string;
  } | null;
  googleCategory: string;
  title: string;
  description: string;
  images: File[];
  options: Array<{ name: string; values: string[] }>;
  skus: string[];
  barcodes: string[];
  pricing: Array<{
    price: string;
    compareAtPrice: string;
    cost: string;
  }>;
  tags: string[];
}

interface StepReviewProps {
  formData: ReviewFormData;
  onSubmit: () => void;
  onEdit: (step: number) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function StepReview({ formData, onSubmit, onEdit, onBack, isSubmitting }: StepReviewProps) {
  const [errorBanner, setErrorBanner] = useState<string>('');
  const STEPS = {
    VENDOR_TYPE: 0,
    PRODUCT_DETAILS: 1,
    VARIANTS: 2,
    SKU_BARCODE: 3,
    PRICING: 4,
    TAGS: 5
  } as const;

  const handleEdit = (step: number) => {
    onEdit(step);
  };

  const generateVariants = () => {
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
      title: combination.join(' / '),
      sku: formData.skus[index] || '',
      barcode: formData.barcodes[index] || '',
      price: formData.pricing[index]?.price || '',
      compareAtPrice: formData.pricing[index]?.compareAtPrice || '',
      cost: formData.pricing[index]?.cost || '',
    }));
  };

  const variants = generateVariants();
  const hasVariants = formData.options.length > 0;

  const handleSubmit = useCallback(async () => {
    // For the new unified flow, just call the parent's onSubmit
    // The product is already created, this just finalizes it
    onSubmit();
  }, [onSubmit]);

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Review Product Information
        </Text>

        <Banner tone="info">
          <Text as="p">
            Please review all information carefully before finalizing the product.
          </Text>
        </Banner>

        <BlockStack gap="400">
          {/* Enhanced Product Information Display Card */}
          <Card>
            <BlockStack gap="400">
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
              </BlockStack>
            </BlockStack>
          </Card>

          {/* Description Card */}
          <Card>
            <BlockStack gap="400">
              <Text variant="headingSm" as="h3">Description</Text>
              <BlockStack gap="300">
                {formData.description ? (
                  <div dangerouslySetInnerHTML={{ __html: formData.description }} />
                ) : (
                  <Text as="p">No description provided</Text>
                )}
                {formData.images.length > 0 && (
                  <InlineStack gap="300">
                    {formData.images.map((image, index) => (
                      <Thumbnail
                        key={index}
                        source={URL.createObjectURL(image)}
                        alt={`Product image ${index + 1}`}
                      />
                    ))}
                  </InlineStack>
                )}
              </BlockStack>
            </BlockStack>
          </Card>

          {/* Variants */}
          {hasVariants && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingSm" as="h3">Variants</Text>
                {formData.options.map((option, index) => (
                  <BlockStack key={index} gap="200">
                    <Text as="p" fontWeight="bold">{option.name}</Text>
                    <InlineStack gap="200">
                      {option.values.map((value, vIndex) => (
                        <Badge key={vIndex}>{value}</Badge>
                      ))}
                    </InlineStack>
                  </BlockStack>
                ))}
              </BlockStack>
            </Card>
          )}

          {/* SKU & Barcode */}
          <Card>
            <BlockStack gap="400">
              <Text variant="headingSm" as="h3">SKU & Barcode</Text>
              {hasVariants ? (
                variants.map((variant, index) => (
                  <BlockStack key={index} gap="200">
                    <Text as="p" fontWeight="bold">{variant.title}</Text>
                    <List type="bullet">
                      <List.Item>SKU: {variant.sku}</List.Item>
                      {variant.barcode && (
                        <List.Item>Barcode: {variant.barcode}</List.Item>
                      )}
                    </List>
                  </BlockStack>
                ))
              ) : (
                <List type="bullet">
                  <List.Item>SKU: {formData.skus[0]}</List.Item>
                  {formData.barcodes[0] && (
                    <List.Item>Barcode: {formData.barcodes[0]}</List.Item>
                  )}
                </List>
              )}
            </BlockStack>
          </Card>

          {/* Pricing */}
          <Card>
            <BlockStack gap="400">
              <Text variant="headingSm" as="h3">Pricing</Text>
              {hasVariants ? (
                variants.map((variant, index) => (
                  <BlockStack key={index} gap="200">
                    <Text as="p" fontWeight="bold">{variant.title}</Text>
                    <List type="bullet">
                      <List.Item>Price: ${variant.price}</List.Item>
                      {variant.compareAtPrice && (
                        <List.Item>Compare at: ${variant.compareAtPrice}</List.Item>
                      )}
                      {variant.cost && (
                        <List.Item>Cost: ${variant.cost}</List.Item>
                      )}
                    </List>
                  </BlockStack>
                ))
              ) : (
                <List type="bullet">
                  <List.Item>Price: ${formData.pricing[0]?.price}</List.Item>
                  {formData.pricing[0]?.compareAtPrice && (
                    <List.Item>Compare at: ${formData.pricing[0].compareAtPrice}</List.Item>
                  )}
                  {formData.pricing[0]?.cost && (
                    <List.Item>Cost: ${formData.pricing[0].cost}</List.Item>
                  )}
                </List>
              )}
            </BlockStack>
          </Card>

          {/* Tags */}
          <Card>
            <BlockStack gap="400">
              <Text variant="headingSm" as="h3">Tags</Text>
              <InlineStack gap="200" wrap>
                {formData.tags.map((tag, index) => (
                  <Badge key={index}>{tag}</Badge>
                ))}
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>

        <Divider />

        <InlineStack gap="300" align="end">
          <Button onClick={onBack}>Back</Button>
          <Button
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmit}
          >
            Create Product
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
} 