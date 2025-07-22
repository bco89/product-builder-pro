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
import { useCallback } from 'react';
import { smartSort } from '../../../utils/smartSort';

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

    // Sort option values before generating combinations
    const optionValues = formData.options.map(option => smartSort(option.values));
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
    <>
      <style>{`
        .product-description-content {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .product-description-content h1,
        .product-description-content h2,
        .product-description-content h3,
        .product-description-content h4,
        .product-description-content h5,
        .product-description-content h6 {
          margin: 1em 0 0.5em;
          font-weight: 600;
          line-height: 1.2;
        }
        .product-description-content h1 { font-size: 2em; }
        .product-description-content h2 { font-size: 1.5em; }
        .product-description-content h3 { font-size: 1.25em; }
        .product-description-content h4 { font-size: 1.1em; }
        .product-description-content h5 { font-size: 1em; }
        .product-description-content h6 { font-size: 0.9em; }
        .product-description-content p {
          margin: 0.5em 0;
          line-height: 1.5;
        }
        .product-description-content ul,
        .product-description-content ol {
          margin: 0.5em 0;
          padding-left: 2em;
        }
        .product-description-content li {
          margin: 0.25em 0;
        }
        .product-description-content strong {
          font-weight: 600;
        }
        .product-description-content em {
          font-style: italic;
        }
        .product-description-content u {
          text-decoration: underline;
        }
        .product-description-content a {
          color: #0066cc;
          text-decoration: underline;
        }
        .product-description-content a:hover {
          color: #0052a3;
        }
        .product-description-content blockquote {
          margin: 1em 0;
          padding-left: 1em;
          border-left: 3px solid #e0e0e0;
          color: #666;
        }
        .product-description-content pre {
          background-color: #f5f5f5;
          padding: 1em;
          border-radius: 4px;
          overflow-x: auto;
          font-family: monospace;
        }
        .product-description-content code {
          background-color: #f5f5f5;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }
        .product-description-content br {
          display: block;
          margin: 0.5em 0;
          content: "";
        }
        .product-description-content div[style*="text-align: center"] {
          text-align: center !important;
        }
        .product-description-content div[style*="text-align: right"] {
          text-align: right !important;
        }
        .product-description-content div[style*="text-align: left"] {
          text-align: left !important;
        }
      `}</style>
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
                  <div 
                    dangerouslySetInnerHTML={{ __html: formData.description }}
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: 'inherit',
                    }}
                    className="product-description-content"
                  />
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
    </>
  );
} 