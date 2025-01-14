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

interface ReviewFormData {
  vendor: string;
  productType: string;
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
  currency: string;
  tags: string[];
}

interface StepReviewProps {
  formData: ReviewFormData;
  onSubmit: () => void;
  onEdit: (step: number) => void;
  isSubmitting: boolean;
}

export default function StepReview({ formData, onSubmit, onEdit, isSubmitting }: StepReviewProps) {
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

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CAD': return 'C$';
      case 'AUD': return 'A$';
      default: return '$';
    }
  };

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Review Product Information
        </Text>

        <Banner tone="warning">
          <Text as="p">
            Please review all information carefully before creating the product.
            You can go back to any step to make changes.
          </Text>
        </Banner>

        <BlockStack gap="400">
          {/* Basic Information */}
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingSm" as="h3">Basic Information</Text>
                <Button variant="plain" onClick={() => onEdit(0)}>Edit</Button>
              </InlineStack>
              <List type="bullet">
                <List.Item>Vendor: {formData.vendor}</List.Item>
                <List.Item>Product Type: {formData.productType}</List.Item>
              </List>
            </BlockStack>
          </Card>

          {/* Product Details */}
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingSm" as="h3">Product Details</Text>
                <Button variant="plain" onClick={() => onEdit(1)}>Edit</Button>
              </InlineStack>
              <BlockStack gap="400">
                <Text as="p" fontWeight="bold">{formData.title}</Text>
                <Text as="p">{formData.description}</Text>
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
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingSm" as="h3">Variants</Text>
                <Button variant="plain" onClick={() => onEdit(2)}>Edit</Button>
              </InlineStack>
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

          {/* SKUs and Barcodes */}
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingSm" as="h3">SKUs & Barcodes</Text>
                <Button variant="plain" onClick={() => onEdit(3)}>Edit</Button>
              </InlineStack>
              {variants.map((variant, index) => (
                <BlockStack key={index} gap="200">
                  <Text as="p" fontWeight="bold">{variant.title}</Text>
                  <List type="bullet">
                    <List.Item>SKU: {variant.sku}</List.Item>
                    {variant.barcode && (
                      <List.Item>Barcode: {variant.barcode}</List.Item>
                    )}
                  </List>
                </BlockStack>
              ))}
            </BlockStack>
          </Card>

          {/* Pricing */}
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingSm" as="h3">Pricing ({formData.currency})</Text>
                <Button variant="plain" onClick={() => onEdit(4)}>Edit</Button>
              </InlineStack>
              {variants.map((variant, index) => (
                <BlockStack key={index} gap="200">
                  <Text as="p" fontWeight="bold">{variant.title}</Text>
                  <List type="bullet">
                    <List.Item>Price: {getCurrencySymbol(formData.currency)}{variant.price}</List.Item>
                    {variant.compareAtPrice && (
                      <List.Item>Compare at: {getCurrencySymbol(formData.currency)}{variant.compareAtPrice}</List.Item>
                    )}
                    {variant.cost && (
                      <List.Item>Cost: {getCurrencySymbol(formData.currency)}{variant.cost}</List.Item>
                    )}
                  </List>
                </BlockStack>
              ))}
            </BlockStack>
          </Card>

          {/* Tags */}
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingSm" as="h3">Tags</Text>
                <Button variant="plain" onClick={() => onEdit(5)}>Edit</Button>
              </InlineStack>
              <InlineStack gap="200" wrap>
                {formData.tags.map((tag, index) => (
                  <Badge key={index}>{tag}</Badge>
                ))}
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>

        <Divider />

        <InlineStack align="end">
          <Button
            variant="primary"
            loading={isSubmitting}
            onClick={onSubmit}
          >
            Create Product
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
} 