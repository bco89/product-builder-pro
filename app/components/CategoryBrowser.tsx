import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  TextField,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Icon,
  Text,
  Box,
  Scrollable,
  Spinner,
  Badge
} from '@shopify/polaris';
import { 
  SearchIcon, 
  ChevronRightIcon,
  FolderIcon,
  CheckIcon,
  ChevronLeftIcon
} from '@shopify/polaris-icons';

interface Category {
  id: string;
  name: string;
  fullName: string;
  level: number;
  isLeaf: boolean;
  isRoot?: boolean;
  parentId?: string;
  childrenIds?: string[];
}

interface CategoryBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
  selectedCategory: Category | null;
  productType: string;
  vendor: string;
}

export function CategoryBrowser({ 
  open, 
  onClose, 
  onSelect, 
  selectedCategory,
  productType,
  vendor 
}: CategoryBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestedCategories, setSuggestedCategories] = useState<Category[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Category[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Fetch categories
  const fetchCategories = useCallback(async (search = '', parentId: string | null = null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'categories',
        productType,
        ...(parentId && { parentId }),
        ...(search && { search })
      });
      
      const response = await fetch(`/api/shopify/categories-by-product-type?${params}`);
      const data = await response.json();
      
      setCategories(data.categories || []);
      setSuggestedCategories(data.suggestedCategories || []);
      setSearchMode(!!search);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }, [productType]);

  // Handle search with debouncing
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery) {
        fetchCategories(searchQuery);
      } else {
        fetchCategories('', currentParentId);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, currentParentId, fetchCategories]);

  // Navigate to category
  const navigateToCategory = (category: Category) => {
    if (!category.isLeaf) {
      // Clear search when navigating to allow proper folder browsing
      setSearchQuery('');
      setCurrentParentId(category.id);
      setBreadcrumbs([...breadcrumbs, category]);
      setSuggestedCategories([]); // Clear suggestions when navigating deeper
    }
  };

  // Navigate via breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index);
    const parentId = index > 0 ? breadcrumbs[index - 1].id : null;
    
    setBreadcrumbs(newBreadcrumbs);
    setCurrentParentId(parentId);
    setSearchQuery('');
    
    // Show suggestions again if we're back to root level
    if (index === 0) {
      fetchCategories('', null);
    }
  };

  // Select category
  const handleSelectCategory = (category: Category) => {
    // Allow selection of both leaf and non-leaf categories
    onSelect(category);
    onClose();
  };

  // Reset on open
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setBreadcrumbs([]);
      setCurrentParentId(null);
      setSearchMode(false);
      setHoveredCategory(null);
      setSuggestedCategories([]);
      fetchCategories('', null);
    }
  }, [open, fetchCategories]);

  const CategoryRow = ({ category, index, isSuggested = false }: { category: Category; index: number; isSuggested?: boolean }) => {
    const isSelected = category.id === selectedCategory?.id;
    const isHovered = hoveredCategory === category.id;
    
    return (
              <Box
        key={category.id}
        paddingInline="400"
        paddingBlock="300"
        borderBlockEndWidth={index === categories.length - 1 ? "0" : "025"}
        borderColor="border"
        background={isHovered ? "bg-surface-hover" : isSelected ? "bg-surface-selected" : isSuggested ? "bg-surface-success" : undefined}
      >
        <div
          style={{
            cursor: 'pointer',
            width: '100%'
          }}
          onMouseEnter={() => setHoveredCategory(category.id)}
          onMouseLeave={() => setHoveredCategory(null)}
          onClick={() => {
            if (category.isLeaf) {
              handleSelectCategory(category);
            } else if (searchMode) {
              // In search mode, clicking a folder shows options: navigate or select
              // For better UX, let's navigate to show subcategories
              navigateToCategory(category);
            } else {
              navigateToCategory(category);
            }
          }}
        >
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <InlineStack gap="300" blockAlign="center" wrap={false}>
              <Icon 
                source={category.isLeaf ? CheckIcon : FolderIcon} 
                tone={isSelected ? 'success' : 'subdued'}
              />
              <BlockStack gap="100">
                <Text 
                  as="span" 
                  variant="bodyMd" 
                  fontWeight={isSelected ? 'semibold' : 'regular'}
                  tone={isSelected ? 'success' : undefined}
                >
                  {category.name}
                </Text>
                {searchMode && category.level > 0 && (
                  <Text as="span" variant="bodySm" tone="subdued">
                    {category.fullName}
                  </Text>
                )}
              </BlockStack>
            </InlineStack>
            
            <InlineStack gap="200" align="end">
              {isSuggested && (
                <Badge tone="success" size="small">
                  Suggested
                </Badge>
              )}
              {/* Show action buttons with better labels */}
              <InlineStack gap="100">
                <div onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="micro"
                    variant={isSelected ? 'primary' : 'tertiary'}
                    onClick={() => handleSelectCategory(category)}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </Button>
                </div>
                {!category.isLeaf && searchMode && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="micro"
                      variant="tertiary"
                      onClick={() => navigateToCategory(category)}
                    >
                      Browse
                    </Button>
                  </div>
                )}
              </InlineStack>
              {!category.isLeaf && !searchMode && (
                <Icon source={ChevronRightIcon} tone="subdued" />
              )}
            </InlineStack>
          </InlineStack>
        </div>
      </Box>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Product Category"
      primaryAction={{
        content: 'Cancel',
        onAction: onClose,
      }}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="500">
          {/* Search Field */}
          <TextField
            label="Search categories"
            labelHidden
            placeholder="Search categories..."
            prefix={<Icon source={SearchIcon} />}
            value={searchQuery}
            onChange={setSearchQuery}
            autoComplete="off"
            clearButton
            onClearButtonClick={() => setSearchQuery('')}
          />

          {/* Back Button */}
          {!searchMode && breadcrumbs.length > 0 && (
            <Box paddingBlockEnd="200">
              <Button
                icon={ChevronLeftIcon}
                onClick={() => {
                  const parentIndex = breadcrumbs.length - 1;
                  navigateToBreadcrumb(parentIndex);
                }}
                variant="tertiary"
                size="medium"
              >
                Back to {breadcrumbs.length === 1 ? 'All Categories' : breadcrumbs[breadcrumbs.length - 2]?.name || 'Previous Level'}
              </Button>
            </Box>
          )}

          {/* Breadcrumbs */}
          {!searchMode && breadcrumbs.length > 0 && (
            <Box paddingBlockStart="100" paddingBlockEnd="200">
              <InlineStack gap="200" align="start" wrap={false}>
                <Button
                  size="micro"
                  variant="plain"
                  onClick={() => navigateToBreadcrumb(0)}
                >
                  All categories
                </Button>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.id}>
                    <Box paddingInlineStart="100" paddingInlineEnd="100">
                      <Icon source={ChevronRightIcon} tone="subdued" />
                    </Box>
                    <Button
                      size="micro"
                      variant="plain"
                      onClick={() => navigateToBreadcrumb(index + 1)}
                    >
                      {crumb.name}
                    </Button>
                  </React.Fragment>
                ))}
              </InlineStack>
            </Box>
          )}

          {/* Suggested Categories */}
          {!searchMode && !currentParentId && suggestedCategories.length > 0 && (
            <BlockStack gap="300">
              <Box paddingBlockStart="200">
                <InlineStack gap="300" align="start" blockAlign="center">
                  <Text as="h3" variant="headingSm" tone="success">
                    Suggested Categories
                  </Text>
                  <Badge tone="info" size="small">
                    {`From existing ${productType} products`}
                  </Badge>
                </InlineStack>
              </Box>
              <Card padding="0">
                <div style={{ maxHeight: '200px', overflow: 'hidden' }}>
                  <Scrollable style={{ height: '100%' }}>
                    <BlockStack gap="0">
                      {suggestedCategories.map((category, index) => (
                        <CategoryRow 
                          key={`suggested-${category.id}`} 
                          category={category} 
                          index={index}
                          isSuggested={true}
                        />
                      ))}
                    </BlockStack>
                  </Scrollable>
                </div>
              </Card>
            </BlockStack>
          )}

          {/* Category List */}
          <BlockStack gap="300">
            {!searchMode && !currentParentId && suggestedCategories.length > 0 && (
              <Box paddingBlockStart="400">
                <Text as="h3" variant="headingSm">
                  All Categories
                </Text>
              </Box>
            )}
            <Card padding="0">
              <div style={{ minHeight: '400px', maxHeight: '500px', overflow: 'hidden' }}>
                {loading ? (
                  <Box padding="800">
                    <InlineStack align="center" blockAlign="center" gap="300">
                      <Spinner size="small" />
                      <Text as="p" variant="bodyMd" tone="subdued">Loading categories...</Text>
                    </InlineStack>
                  </Box>
                ) : categories.length === 0 ? (
                  <Box padding="800">
                    <InlineStack align="center">
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        {searchQuery 
                          ? `No categories found for "${searchQuery}"`
                          : 'No categories available'}
                      </Text>
                    </InlineStack>
                  </Box>
                ) : (
                  <Scrollable style={{ height: '100%', maxHeight: '500px' }}>
                    <BlockStack gap="0">
                      {categories.map((category, index) => (
                        <CategoryRow key={category.id} category={category} index={index} />
                      ))}
                    </BlockStack>
                  </Scrollable>
                )}
              </div>
            </Card>
          </BlockStack>

          {/* Selected Category Display */}
          {selectedCategory && (
            <Card>
              <Box padding="400">
                <InlineStack gap="300" align="space-between" blockAlign="center">
                  <BlockStack gap="200">
                    <Text as="span" variant="headingSm" tone="success">Selected Category</Text>
                    <Text as="span" variant="bodyMd">{selectedCategory.fullName || selectedCategory.name}</Text>
                  </BlockStack>
                  <Badge tone="success" size="small">
                    Selected
                  </Badge>
                </InlineStack>
              </Box>
            </Card>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
} 