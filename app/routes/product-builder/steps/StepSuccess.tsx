import { Card, BlockStack, Text, Button, InlineStack, Banner, Box } from '@shopify/polaris';
import { useNavigate } from '@remix-run/react';

interface StepSuccessProps {
  productId: string | null;
  shop: string;
  variantCount: number;
  onBuildAnother?: () => void;
  productTitle?: string;
}

export default function StepSuccess({ productId, shop, variantCount, onBuildAnother, productTitle }: StepSuccessProps) {
  const navigate = useNavigate();
  
  const handleViewProduct = () => {
    if (productId) {
      const productIdNum = productId.replace('gid://shopify/Product/', '');
      const adminUrl = `https://${shop}/admin/products/${productIdNum}`;
      window.open(adminUrl, '_top');
    }
  };

  const handleBuildAnother = () => {
    if (onBuildAnother) {
      onBuildAnother();
    } else {
      navigate('/app/product-builder');
    }
  };

  const handleGoToCatalog = () => {
    const catalogUrl = `https://${shop}/admin/products`;
    window.open(catalogUrl, '_top');
  };

  const getSubheadingText = () => {
    const productName = productTitle || "Your product";
    return variantCount === 1 
      ? `${productName} has been created and is ready to sell.`
      : `${productName} with ${variantCount} variants has been created and is ready to sell.`;
  };

  return (
    <Card>
      <BlockStack gap="600">
        <Box paddingBlockEnd="400">
          <BlockStack gap="400" align="center">
            <BlockStack gap="200" align="center">
              <Text variant="headingLg" as="h2" fontWeight="bold">
                Product Created Successfully!
              </Text>
              <Text as="p" tone="subdued">
                {getSubheadingText()}
              </Text>
            </BlockStack>
          </BlockStack>
        </Box>

        <Box borderColor="border" borderWidth="025" padding="400" borderRadius="200">
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">What's next?</Text>
            <Text as="p" tone="subdued">
              Choose an action below to continue managing your products.
            </Text>
          </BlockStack>
        </Box>

        <BlockStack gap="300">
          <Button
            variant="primary"
            onClick={handleBuildAnother}
            fullWidth
            size="large"
          >
            Build Another Product
          </Button>
          
          <Button
            variant="primary"
            onClick={handleViewProduct}
            fullWidth
            size="large"
          >
            View Created Product
          </Button>
          
          <Button
            onClick={handleGoToCatalog}
            fullWidth
            size="large"
          >
            View All Products
          </Button>
        </BlockStack>
      </BlockStack>
    </Card>
  );
} 