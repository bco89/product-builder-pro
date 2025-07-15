import {
  Card,
  BlockStack,
  Text,
  InlineStack,
  Thumbnail,
  Box,
} from '@shopify/polaris';

interface ProductInfoCardProps {
  title?: string;
  vendor?: string;
  productType?: string;
  category?: string;
  image?: string | File;
  price?: string;
  compareAtPrice?: string;
  cost?: string;
  /**
   * Controls which fields to display. By default, all provided fields are shown.
   */
  displayFields?: {
    title?: boolean;
    vendor?: boolean;
    productType?: boolean;
    category?: boolean;
    image?: boolean;
    price?: boolean;
  };
}

/**
 * ProductInfoCard - A reusable component for displaying product information
 * across different steps in the product builder workflow.
 * 
 * This component provides a consistent way to show product details at the top
 * of various step components, helping users keep track of their product information
 * as they progress through the builder.
 */
export function ProductInfoCard({
  title,
  vendor,
  productType,
  category,
  image,
  price,
  compareAtPrice,
  cost,
  displayFields = {},
}: ProductInfoCardProps) {
  // Determine which fields to show (default to showing all provided fields)
  const showTitle = displayFields.title !== false && title;
  const showVendor = displayFields.vendor !== false && vendor;
  const showProductType = displayFields.productType !== false && productType;
  const showCategory = displayFields.category !== false && category;
  const showImage = displayFields.image !== false && image;
  const showPrice = displayFields.price !== false && price;

  // Helper to get image source
  const getImageSource = (img: string | File): string => {
    if (typeof img === 'string') return img;
    return URL.createObjectURL(img);
  };

  return (
    <Card>
      <BlockStack gap="200">
        {showImage && (
          <Box paddingBlockEnd="200">
            <InlineStack gap="300" align="start">
              <Thumbnail
                source={getImageSource(image)}
                alt={title || 'Product'}
                size="medium"
              />
              <BlockStack gap="100">
                {showTitle && (
                  <Text as="h3" variant="headingMd" fontWeight="bold">
                    {title}
                  </Text>
                )}
                {showPrice && (
                  <InlineStack gap="200">
                    <Text as="span" fontWeight="semibold">
                      ${price}
                    </Text>
                    {compareAtPrice && (
                      <Text as="span" tone="subdued">
                        <s>${compareAtPrice}</s>
                      </Text>
                    )}
                  </InlineStack>
                )}
              </BlockStack>
            </InlineStack>
          </Box>
        )}
        
        {!showImage && showTitle && (
          <Text as="span">
            <Text as="span" fontWeight="bold">Product:</Text> {title || 'Not specified'}
          </Text>
        )}
        
        <InlineStack gap="400" wrap>
          {showVendor && (
            <Text as="span">
              <Text as="span" fontWeight="bold">Vendor:</Text> {vendor || 'Not specified'}
            </Text>
          )}
          {showProductType && (
            <Text as="span">
              <Text as="span" fontWeight="bold">Product Type:</Text> {productType || 'Not specified'}
            </Text>
          )}
          {showCategory && (
            <Text as="span">
              <Text as="span" fontWeight="bold">Category:</Text> {category || 'Not specified'}
            </Text>
          )}
        </InlineStack>
        
        {showPrice && (compareAtPrice || cost) && (
          <InlineStack gap="400" wrap>
            <Text as="span">
              <Text as="span" fontWeight="bold">Price:</Text> ${price || '0.00'}
            </Text>
            {compareAtPrice && (
              <Text as="span">
                <Text as="span" fontWeight="bold">Compare at:</Text> ${compareAtPrice}
              </Text>
            )}
            {cost && (
              <Text as="span">
                <Text as="span" fontWeight="bold">Cost:</Text> ${cost}
              </Text>
            )}
          </InlineStack>
        )}
      </BlockStack>
    </Card>
  );
}