import { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  DataTable,
  Thumbnail,
  Button,
  TextField,
  Badge,
  BlockStack,
  InlineStack,
  Text,
  Filters,
  ChoiceList,
  Toast,
  Modal,
  Box,
  Banner,
  Spinner,
} from '@shopify/polaris';
import { EditIcon, MagicIcon } from '@shopify/polaris-icons';
import { authenticate } from '../shopify.server';
import { json } from '@remix-run/node';
import { useLoaderData, useSubmit, useNavigation } from '@remix-run/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoaderFunctionArgs } from "@remix-run/node";

interface Product {
  id: string;
  title: string;
  description: string;
  handle: string;
  productType: string;
  vendor: string;
  featuredImage?: {
    url: string;
    altText?: string;
  };
  seo?: {
    title?: string;
    description?: string;
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  return json({ shop: admin.rest.session.shop });
};

export default function ImproveDescriptions() {
  const { shop } = useLoaderData<typeof loader>();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', searchValue, selectedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchValue) params.append('query', searchValue);
      if (selectedFilters.length > 0) params.append('filters', selectedFilters.join(','));
      
      const response = await fetch(`/api/shopify/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  const products = productsData?.products || [];

  // Generate improved description
  const generateDescription = useMutation({
    mutationFn: async (product: Product) => {
      const response = await fetch('/api/shopify/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'manual',
          productTitle: product.title,
          productType: product.productType,
          vendor: product.vendor,
          keywords: [product.title.split(' ')[0], product.productType],
          existingDescription: product.description,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate description');
      return response.json();
    },
    onSuccess: (data) => {
      if (selectedProduct) {
        setSelectedProduct({
          ...selectedProduct,
          description: data.description,
          seo: {
            title: data.seoTitle,
            description: data.seoDescription,
          }
        });
      }
    },
    onError: () => {
      setToastMessage('Failed to generate description. Please try again.');
    }
  });

  // Update product
  const updateProduct = useMutation({
    mutationFn: async (product: Product) => {
      const response = await fetch('/api/shopify/update-product-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          description: product.description,
          seoTitle: product.seo?.title,
          seoDescription: product.seo?.description,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      setSelectedProduct(null);
      setToastMessage('Product description updated successfully!');
    },
    onError: () => {
      setToastMessage('Failed to update product. Please try again.');
    }
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleFiltersChange = useCallback((value: string[]) => {
    setSelectedFilters(value);
  }, []);

  const handleImproveClick = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const rows = products.map((product: Product) => [
    <Box maxWidth="60px">
      {product.featuredImage ? (
        <Thumbnail
          source={product.featuredImage.url}
          alt={product.featuredImage.altText || product.title}
          size="small"
        />
      ) : (
        <Thumbnail source="" alt="No image" size="small" />
      )}
    </Box>,
    <Text variant="bodyMd" fontWeight="semibold">{product.title}</Text>,
    product.productType || '-',
    product.vendor || '-',
    product.description ? (
      <Badge tone="success">Has description</Badge>
    ) : (
      <Badge tone="warning">No description</Badge>
    ),
    <Button
      icon={MagicIcon}
      onClick={() => handleImproveClick(product)}
      size="slim"
    >
      Improve
    </Button>
  ]);

  return (
    <Page
      title="Improve Product Descriptions"
      subtitle="Enhance your existing product descriptions with AI"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Filters
                queryValue={searchValue}
                filters={[
                  {
                    key: 'status',
                    label: 'Description Status',
                    filter: (
                      <ChoiceList
                        title="Description Status"
                        titleHidden
                        choices={[
                          { label: 'Has description', value: 'has_description' },
                          { label: 'No description', value: 'no_description' },
                        ]}
                        selected={selectedFilters}
                        onChange={handleFiltersChange}
                        allowMultiple
                      />
                    ),
                  },
                ]}
                onQueryChange={handleSearchChange}
                onQueryClear={() => setSearchValue('')}
                onClearAll={() => {
                  setSearchValue('');
                  setSelectedFilters([]);
                }}
              />

              {isLoading ? (
                <Box padding="600">
                  <BlockStack gap="400" align="center">
                    <Spinner accessibilityLabel="Loading products" />
                    <Text as="p" tone="subdued">Loading products...</Text>
                  </BlockStack>
                </Box>
              ) : (
                <DataTable
                  columnContentTypes={[
                    'text',
                    'text',
                    'text',
                    'text',
                    'text',
                    'text',
                  ]}
                  headings={[
                    'Image',
                    'Product',
                    'Type',
                    'Vendor',
                    'Description',
                    'Action',
                  ]}
                  rows={rows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedProduct(null);
        }}
        title={`Improve: ${selectedProduct?.title || ''}`}
        primaryAction={{
          content: 'Save Changes',
          onAction: () => selectedProduct && updateProduct.mutate(selectedProduct),
          loading: updateProduct.isPending,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setModalOpen(false);
              setSelectedProduct(null);
            },
          },
        ]}
        large
      >
        <Modal.Section>
          {selectedProduct && (
            <BlockStack gap="400">
              <Banner tone="info">
                <Text as="p">
                  Click "Generate with AI" to create an improved description, or edit manually below.
                </Text>
              </Banner>

              <Button
                variant="primary"
                icon={MagicIcon}
                onClick={() => generateDescription.mutate(selectedProduct)}
                loading={generateDescription.isPending}
                fullWidth
              >
                Generate with AI
              </Button>

              <TextField
                label="Product Description"
                value={selectedProduct.description || ''}
                onChange={(value) => setSelectedProduct({
                  ...selectedProduct,
                  description: value
                })}
                multiline={8}
                autoComplete="off"
              />

              <TextField
                label="SEO Title"
                value={selectedProduct.seo?.title || ''}
                onChange={(value) => setSelectedProduct({
                  ...selectedProduct,
                  seo: {
                    ...selectedProduct.seo,
                    title: value
                  }
                })}
                helpText="Maximum 60 characters"
                autoComplete="off"
              />

              <TextField
                label="SEO Description"
                value={selectedProduct.seo?.description || ''}
                onChange={(value) => setSelectedProduct({
                  ...selectedProduct,
                  seo: {
                    ...selectedProduct.seo,
                    description: value
                  }
                })}
                multiline={3}
                helpText="Maximum 155 characters"
                autoComplete="off"
              />
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>

      {toastMessage && (
        <Toast
          content={toastMessage}
          onDismiss={() => setToastMessage('')}
          duration={4000}
        />
      )}
    </Page>
  );
}