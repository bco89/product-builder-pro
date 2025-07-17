import { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  DataTable,
  Thumbnail,
  Button,
  Badge,
  BlockStack,
  InlineStack,
  Text,
  Filters,
  ChoiceList,
  Toast,
  Modal,
  Box,
  Spinner,
  Tooltip,
  Icon,
  Banner,
} from '@shopify/polaris';
import { MagicIcon, AlertCircleIcon, InfoIcon } from '@shopify/polaris-icons';
import { authenticate } from '../shopify.server';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LoadingProgress from '../components/LoadingProgress';
import DescriptionEditor from '../components/product-builder/DescriptionEditor';
import AIGenerationForm from '../components/product-builder/AIGenerationForm';
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
  
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const tinymceApiKey = process.env.TINYMCE_API_KEY || searchParams.get('tinymce_api_key') || '';
  
  return json({ 
    shop: admin.rest.session.shop,
    tinymceApiKey 
  });
};


export default function ImproveDescriptions() {
  const { tinymceApiKey } = useLoaderData<typeof loader>();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [showGenerationForm, setShowGenerationForm] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<{ message: string; details?: string; code?: string } | null>(null);
  const [showKeywordToast, setShowKeywordToast] = useState(false);

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

  // Fetch shop settings
  const { data: shopSettings, isLoading: isLoadingSettings, error: settingsError } = useQuery({
    queryKey: ['shopSettings'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/shop-settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate improved description
  const generateDescription = useMutation({
    mutationFn: async (params: {
      product: Product;
      method: 'manual' | 'url' | 'context';
      productUrl?: string;
      additionalContext?: string;
      keywords: { primary: string; secondary: string };
    }) => {
      // Show progress
      setGenerationProgress(10);
      
      const payload = {
        method: params.method,
        productTitle: params.product.title,
        productType: params.product.productType,
        vendor: params.product.vendor,
        keywords: [params.keywords.primary, params.keywords.secondary].filter(Boolean),
        productUrl: params.productUrl,
        additionalContext: params.additionalContext,
        existingDescription: params.method === 'context' ? params.product.description : undefined,
        hasImages: false,
        shopSettings: {
          businessType: 'retailer',
          storeName: '',
          storeLocation: '',
          uniqueSellingPoints: '',
          coreValues: '',
          brandPersonality: '',
          targetCustomerOverride: '',
          additionalCustomerInsights: '',
          excludedCustomerSegments: '',
          ...shopSettings
        },
      };

      // Update progress
      setGenerationProgress(50);

      const response = await fetch('/api/shopify/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      // Update progress
      setGenerationProgress(90);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      
      const result = await response.json();
      setGenerationProgress(100);
      return result;
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
        setShowGenerationForm(false);
        setError(null);
      }
    },
    onError: (err: any) => {
      setError({
        message: err.error || 'Failed to generate description. Please try again.',
        details: err.details,
        code: err.code
      });
    },
    onSettled: () => {
      setGenerationProgress(0);
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
    setShowGenerationForm(true);
    setError(null);
  };

  const handleGenerate = (params: {
    method: 'manual' | 'url' | 'context';
    productUrl?: string;
    additionalContext?: string;
    keywords: { primary: string; secondary: string };
  }) => {
    if (!selectedProduct) return;
    
    // Show toast if no keywords provided
    if (!params.keywords.primary && !params.keywords.secondary) {
      setShowKeywordToast(true);
    }
    
    generateDescription.mutate({
      product: selectedProduct,
      ...params
    });
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
          setShowGenerationForm(true);
          setError(null);
          generateDescription.reset();
        }}
        title={`Improve: ${selectedProduct?.title || ''}`}
        primaryAction={{
          content: 'Save Changes',
          onAction: () => selectedProduct && updateProduct.mutate(selectedProduct),
          loading: updateProduct.isPending,
          disabled: !selectedProduct?.description,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setModalOpen(false);
              setSelectedProduct(null);
              setShowGenerationForm(true);
              setError(null);
              generateDescription.reset();
            },
          },
        ]}
        large
      >
        <Modal.Section>
          {selectedProduct && (
            <BlockStack gap="500">
              {/* Shop Settings Badge */}
              <InlineStack gap="400" align="space-between">
                <Text variant="headingMd" as="h2">AI-Powered Description Generation</Text>
                <InlineStack gap="200" align="center">
                  {isLoadingSettings ? (
                    <>
                      <Spinner accessibilityLabel="Loading settings" size="small" />
                      <Text as="p" variant="bodySm" tone="subdued">Loading...</Text>
                    </>
                  ) : settingsError ? (
                    <Badge tone="warning">Default perspective</Badge>
                  ) : shopSettings?.businessType ? (
                    <Badge tone="success">
                      {shopSettings.businessType === 'manufacturer' ? 'Product Creator' : 'Retailer'}
                    </Badge>
                  ) : (
                    <>
                      <Text as="span" variant="bodySm" tone="subdued">No perspective</Text>
                      <Tooltip content="Please go to AI Description Settings to choose whether you create products or sell products from other brands. This will improve the quality of generated descriptions.">
                        <Icon source={InfoIcon} tone="subdued" />
                      </Tooltip>
                    </>
                  )}
                </InlineStack>
              </InlineStack>
              
              {/* Loading State */}
              {generateDescription.isPending ? (
                <LoadingProgress
                  variant="ai-generation"
                  progress={generationProgress}
                  messages={[
                    "🔍 Analyzing your product information...",
                    "🎨 Creating engaging content...",
                    "✍️ Writing compelling copy...",
                    "🎯 Optimizing for search engines...",
                    "✅ Adding final touches..."
                  ]}
                  showSkeleton={true}
                  title="Generating AI Description"
                  estimatedTime={20}
                />
              ) : showGenerationForm ? (
                <>
                  {/* Generation Form */}
                  <AIGenerationForm
                    onGenerate={handleGenerate}
                    isGenerating={generateDescription.isPending}
                    showManualOption={false}
                    defaultMethod={selectedProduct.description ? 'context' : 'url'}
                  />
                  
                  {/* Error display */}
                  {error && (
                    <Banner tone="critical">
                      <BlockStack gap="200">
                        <InlineStack gap="200" align="center">
                          <Icon source={AlertCircleIcon} />
                          <Text as="p" fontWeight="semibold">{error.message}</Text>
                        </InlineStack>
                        {error.details && (
                          <Text as="p" variant="bodySm">{error.details}</Text>
                        )}
                        {error.code === 'INVALID_URL' && (
                          <Text as="p" variant="bodySm">
                            Tip: Make sure the URL starts with http:// or https:// and points to a product page.
                          </Text>
                        )}
                        {error.code === 'TIMEOUT' && (
                          <Text as="p" variant="bodySm">
                            Tip: Some websites are slow to load. Try waiting a moment and generating again.
                          </Text>
                        )}
                      </BlockStack>
                    </Banner>
                  )}
                </>
              ) : (
                <>
                  {/* Description Editor */}
                  <DescriptionEditor
                    description={selectedProduct.description || ''}
                    seoTitle={selectedProduct.seo?.title || ''}
                    seoDescription={selectedProduct.seo?.description || ''}
                    onChange={(updates) => {
                      setSelectedProduct({
                        ...selectedProduct,
                        description: updates.description ?? selectedProduct.description,
                        seo: {
                          ...selectedProduct.seo,
                          title: updates.seoTitle ?? selectedProduct.seo?.title,
                          description: updates.seoDescription ?? selectedProduct.seo?.description,
                        }
                      });
                    }}
                    tinymceApiKey={tinymceApiKey}
                    descriptionHeight={300}
                  />
                  
                  {/* Regenerate Button */}
                  <Box>
                    <Button 
                      onClick={() => setShowGenerationForm(true)}
                      icon={MagicIcon}
                    >
                      Regenerate with AI
                    </Button>
                  </Box>
                </>
              )}
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
      
      {showKeywordToast && (
        <Toast
          content="Consider adding a primary keyword to help improve the AI-generated description quality. You can continue without one if preferred."
          onDismiss={() => setShowKeywordToast(false)}
          duration={5000}
        />
      )}
    </Page>
  );
}