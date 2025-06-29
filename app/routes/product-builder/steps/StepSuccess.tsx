import { Card, BlockStack, Text, Button, InlineStack, Banner, Icon, Box } from '@shopify/polaris';
import { CheckIcon } from '@shopify/polaris-icons';
import { useNavigate } from '@remix-run/react';

interface StepSuccessProps {
  productId: string | null;
  shop: string;
  variantCount: number;
}

export default function StepSuccess({ productId, shop, variantCount }: StepSuccessProps) {
  const navigate = useNavigate();
  
  const handleViewProduct = () => {
    if (productId) {
      const productIdNum = productId.replace('gid://shopify/Product/', '');
      const adminUrl = `https://${shop}/admin/products/${productIdNum}`;
      window.open(adminUrl, '_top');
    }
  };

  const handleBuildAnother = () => {
    navigate('/app/product-builder');
  };

  const handleGoToCatalog = () => {
    const catalogUrl = `https://${shop}/admin/products`;
    window.open(catalogUrl, '_top');
  };

  return (
    <Card>
      <BlockStack gap="600">
        <Box paddingBlockEnd="400">
          <BlockStack gap="400" align="center">
            <Box background="bg-fill-success" padding="400" borderRadius="full">
              <Icon source={CheckIcon} tone="success" />
            </Box>
            
            <BlockStack gap="200" align="center">
              <Text variant="headingLg" as="h2" fontWeight="bold">
                Product Created Successfully!
              </Text>
              <Text as="p" tone="subdued">
                Your product with {variantCount} variants has been created and is ready to sell.
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
            onClick={handleViewProduct}
            fullWidth
            size="large"
          >
            View Created Product
          </Button>
          
          <InlineStack gap="300">
            <Button
              onClick={handleBuildAnother}
              fullWidth
            >
              Build Another Product
            </Button>
            
            <Button
              onClick={handleGoToCatalog}
              fullWidth
            >
              Go to Product Catalog
            </Button>
          </InlineStack>
        </BlockStack>
      </BlockStack>
    </Card>
  );
} 