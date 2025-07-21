import { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  Badge,
  BlockStack,
  InlineStack,
  Text,
  IndexTable,
  IndexFilters,
  useIndexResourceState,
  ChoiceList,
  Toast,
  Modal,
  Box,
  Spinner,
  Tooltip,
  Icon,
  Banner,
  Thumbnail,
  Pagination,
  EmptySearchResult,
  LegacyFilters,
  TextField,
  Popover,
  ActionList,
  Tag,
} from '@shopify/polaris';
import { MagicIcon, AlertCircleIcon, InfoIcon, ImageIcon, SearchIcon } from '@shopify/polaris-icons';
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
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [showGenerationForm, setShowGenerationForm] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<{ message: string; details?: string; code?: string } | null>(null);
  const [showKeywordToast, setShowKeywordToast] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Popover states for filters
  const [vendorPopoverActive, setVendorPopoverActive] = useState(false);
  const [typePopoverActive, setTypePopoverActive] = useState(false);
  const [statusPopoverActive, setStatusPopoverActive] = useState(false);
  const [addFilterPopoverActive, setAddFilterPopoverActive] = useState(false);

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', searchValue, selectedFilters, selectedVendors, selectedProductTypes, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchValue) params.append('query', searchValue);
      if (selectedFilters.length > 0) params.append('filters', selectedFilters.join(','));
      if (selectedVendors.length > 0) params.append('vendors', selectedVendors.join(','));
      if (selectedProductTypes.length > 0) params.append('productTypes', selectedProductTypes.join(','));
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const response = await fetch(`/api/shopify/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  const products = productsData?.products || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Index table selection state
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(products);

  // Fetch vendors for filter
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/products?type=vendors');
      if (!response.ok) throw new Error('Failed to fetch vendors');
      return response.json();
    }
  });

  // Fetch product types for filter
  const { data: productTypesData } = useQuery({
    queryKey: ['productTypes-all'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/products?type=productTypes&vendor=all');
      if (!response.ok) throw new Error('Failed to fetch product types');
      return response.json();
    }
  });

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
    setCurrentPage(1); // Reset to first page on search
  }, []);

  const handleFiltersChange = useCallback((value: string[]) => {
    setSelectedFilters(value);
    setCurrentPage(1); // Reset to first page on filter change
    setStatusPopoverActive(false);
  }, []);

  const handleVendorsChange = useCallback((value: string[]) => {
    setSelectedVendors(value);
    setCurrentPage(1);
    setVendorPopoverActive(false);
  }, []);

  const handleProductTypesChange = useCallback((value: string[]) => {
    setSelectedProductTypes(value);
    setCurrentPage(1);
    setTypePopoverActive(false);
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

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setSearchValue('');
    setSelectedFilters([]);
    setSelectedVendors([]);
    setSelectedProductTypes([]);
    setCurrentPage(1);
  }, []);

  // Calculate if any filters are active
  const hasActiveFilters = selectedVendors.length > 0 || 
    selectedProductTypes.length > 0 || 
    selectedFilters.length > 0 ||
    searchValue !== '';

  // Get applied filters for display
  const appliedFilters: any[] = [];
  if (selectedVendors.length > 0) {
    const vendorLabel = selectedVendors.length === 1 
      ? `Vendor: ${selectedVendors[0]}`
      : `Vendors: ${selectedVendors.length} selected`;
    appliedFilters.push({
      key: 'vendors',
      label: vendorLabel,
      onRemove: () => {
        setSelectedVendors([]);
        setCurrentPage(1);
      },
    });
  }
  if (selectedProductTypes.length > 0) {
    const typeLabel = selectedProductTypes.length === 1 
      ? `Type: ${selectedProductTypes[0]}`
      : `Types: ${selectedProductTypes.length} selected`;
    appliedFilters.push({
      key: 'productTypes',
      label: typeLabel,
      onRemove: () => {
        setSelectedProductTypes([]);
        setCurrentPage(1);
      },
    });
  }
  if (selectedFilters.length > 0) {
    selectedFilters.forEach(filter => {
      appliedFilters.push({
        key: filter,
        label: filter === 'has_description' ? 'Has description' : 'No description',
        onRemove: () => {
          setSelectedFilters(selectedFilters.filter(f => f !== filter));
          setCurrentPage(1);
        },
      });
    });
  }

  // Create IndexTable rows
  const rowMarkup = products.map((product, index) => (
    <IndexTable.Row
      id={product.id}
      key={product.id}
      selected={selectedResources.includes(product.id)}
      position={index}
    >
      <IndexTable.Cell>
        <div style={{ width: '36px', height: '36px' }}>
          {product.featuredImage ? (
            <Thumbnail
              source={product.featuredImage.url}
              alt={product.featuredImage.altText || product.title}
              size="small"
            />
          ) : (
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'var(--p-color-bg-surface-secondary)',
              borderRadius: 'var(--p-border-radius-100)',
              border: '1px solid var(--p-color-border-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ width: '16px', height: '16px' }}>
                <Icon source={ImageIcon} tone="subdued" />
              </div>
            </div>
          )}
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text 
          variant="bodyMd" 
          fontWeight="medium"
          as="span"
          truncate
        >
          <div style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '1.2rem',
            maxHeight: '2.4rem'
          }}>
            {product.title}
          </div>
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{product.productType || '-'}</IndexTable.Cell>
      <IndexTable.Cell>{product.vendor || '-'}</IndexTable.Cell>
      <IndexTable.Cell>
        {product.description ? (
          <Badge tone="success">Has description</Badge>
        ) : (
          <Badge tone="warning">No description</Badge>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button
          icon={MagicIcon}
          onClick={() => handleImproveClick(product)}
          size="slim"
        >
          Improve
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));


  return (
    <Page
      title="Improve Product Descriptions"
      subtitle="Enhance your existing product descriptions with AI"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              {/* Search Bar */}
              <TextField
                label=""
                placeholder="Search by product title"
                value={searchValue}
                onChange={(value) => {
                  handleSearchChange(value);
                }}
                clearButton
                onClearButtonClick={() => {
                  setSearchValue('');
                  setCurrentPage(1);
                }}
                autoComplete="off"
                connectedLeft={
                  <Icon source={SearchIcon} tone="subdued" />
                }
              />

              {/* Filter Buttons */}
              <InlineStack gap="200">
                {/* Vendors Filter */}
                <Popover
                  active={vendorPopoverActive}
                  activator={
                    <Button
                      onClick={() => setVendorPopoverActive(!vendorPopoverActive)}
                      disclosure={vendorPopoverActive ? 'up' : 'down'}
                    >
                      Vendors
                    </Button>
                  }
                  onClose={() => setVendorPopoverActive(false)}
                  preferredAlignment="left"
                >
                  <Box padding="400" minWidth="200px">
                    <ChoiceList
                      title="Select vendors"
                      titleHidden
                      choices={vendorsData?.vendors?.map((vendor: string) => ({
                        label: vendor,
                        value: vendor,
                      })) || []}
                      selected={selectedVendors}
                      onChange={handleVendorsChange}
                      allowMultiple
                    />
                  </Box>
                </Popover>

                {/* Product Type Filter */}
                <Popover
                  active={typePopoverActive}
                  activator={
                    <Button
                      onClick={() => setTypePopoverActive(!typePopoverActive)}
                      disclosure={typePopoverActive ? 'up' : 'down'}
                    >
                      Product Type
                    </Button>
                  }
                  onClose={() => setTypePopoverActive(false)}
                  preferredAlignment="left"
                >
                  <Box padding="400" minWidth="200px">
                    <ChoiceList
                      title="Select product types"
                      titleHidden
                      choices={productTypesData?.productTypes?.map((type: any) => ({
                        label: type.productType,
                        value: type.productType,
                      })) || []}
                      selected={selectedProductTypes}
                      onChange={handleProductTypesChange}
                      allowMultiple
                    />
                  </Box>
                </Popover>

                {/* Status Filter */}
                <Popover
                  active={statusPopoverActive}
                  activator={
                    <Button
                      onClick={() => setStatusPopoverActive(!statusPopoverActive)}
                      disclosure={statusPopoverActive ? 'up' : 'down'}
                    >
                      Statuses
                    </Button>
                  }
                  onClose={() => setStatusPopoverActive(false)}
                  preferredAlignment="left"
                >
                  <Box padding="400" minWidth="200px">
                    <ChoiceList
                      title="Select status"
                      titleHidden
                      choices={[
                        { label: 'Has description', value: 'has_description' },
                        { label: 'No description', value: 'no_description' },
                      ]}
                      selected={selectedFilters}
                      onChange={handleFiltersChange}
                      allowMultiple
                    />
                  </Box>
                </Popover>

                {/* Add Filter Button */}
                <Button
                  onClick={() => {}}
                  icon={<span>+</span>}
                  plain
                >
                  Add filter
                </Button>
              </InlineStack>

              {/* Applied Filters */}
              {appliedFilters.length > 0 && (
                <InlineStack gap="200">
                  {appliedFilters.map((filter) => (
                    <Tag key={filter.key} onRemove={filter.onRemove}>
                      {filter.label}
                    </Tag>
                  ))}
                  {appliedFilters.length > 0 && (
                    <Button plain onClick={handleClearAll}>
                      Clear all
                    </Button>
                  )}
                </InlineStack>
              )}

              {isLoading ? (
                <Box padding="600">
                  <BlockStack gap="400" align="center">
                    <Spinner accessibilityLabel="Loading products" />
                    <Text as="p" tone="subdued">Loading products...</Text>
                  </BlockStack>
                </Box>
              ) : products.length === 0 ? (
                <EmptySearchResult
                  title="No products found"
                  description="Try changing your filters or search term"
                  withIllustration
                />
              ) : (
                <IndexTable
                  resourceName={{ singular: 'product', plural: 'products' }}
                  itemCount={products.length}
                  selectedItemsCount={
                    allResourcesSelected ? 'All' : selectedResources.length
                  }
                  onSelectionChange={handleSelectionChange}
                  headings={[
                    { title: '', alignment: 'start' as const },
                    { title: 'Product', alignment: 'start' as const },
                    { title: 'Type', alignment: 'start' as const },
                    { title: 'Vendor', alignment: 'start' as const },
                    { title: 'Description', alignment: 'start' as const },
                    { title: 'Action', alignment: 'start' as const },
                  ]}
                >
                  {rowMarkup}
                </IndexTable>
              )}
              
              {/* Pagination */}
              {products.length > 0 && totalCount > itemsPerPage && (
                <Box padding="400">
                  <InlineStack align="center" blockAlign="center">
                    <Pagination
                      hasPrevious={hasPreviousPage}
                      onPrevious={() => setCurrentPage(prev => prev - 1)}
                      hasNext={hasNextPage}
                      onNext={() => setCurrentPage(prev => prev + 1)}
                    />
                    <Box paddingInlineStart="400">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Page {currentPage} of {totalPages} ({totalCount} total products)
                      </Text>
                    </Box>
                  </InlineStack>
                </Box>
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