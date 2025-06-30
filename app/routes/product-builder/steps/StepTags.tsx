import { useCallback, useState, useEffect, useMemo } from 'react';
import {
  Card,
  TextField,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  Tag,
  Button,
  Autocomplete,
  Icon,
  Box,
  Badge,
  Checkbox,
} from '@shopify/polaris';
import { SearchIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';

interface StepTagsProps {
  formData: {
    vendor: string;
    productType: string;
    category: { id: string; name: string; } | null;
    title: string;
    tags: string[];
  };
  onChange: (updates: Partial<Pick<StepTagsProps['formData'], 'tags'>>) => void;
  onNext: () => void;
  onBack: () => void;
  productId?: string | null;
}

interface TagsResponse {
  tags: string[];
}

interface OptionDescriptor {
  value: string;
  label: string;
}

export default function StepTags({ formData, onChange, onNext, onBack, productId }: StepTagsProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (formData.tags?.length > 0) return formData.tags;
    
    const currentYear = new Date().getFullYear().toString();
    const defaultTags = [currentYear];
    if (formData.vendor && formData.vendor !== 'Default Vendor') {
      defaultTags.push(formData.vendor);
    }
    return defaultTags;
  });
  
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<OptionDescriptor[]>([]);

  // Ensure default tags are passed to parent component immediately
  useEffect(() => {
    if ((!formData.tags || formData.tags.length === 0) && selectedTags.length > 0) {
      onChange({ tags: selectedTags });
    }
  }, [formData.tags, selectedTags, onChange]);

  // Fetch existing tags from products of the selected type
  const { data: productTypeTags = [], isLoading: productTypeTagsLoading, isError: productTypeTagsError } = useQuery({
    queryKey: ['tags', formData.productType],
    enabled: !!formData.productType,
    queryFn: async (): Promise<string[]> => {
      const response = await fetch(`/api/shopify/products?type=tags&productType=${encodeURIComponent(formData.productType)}`);
      if (!response.ok) {
        throw new Error('Failed to load tags');
      }
      const data = await response.json() as TagsResponse;
      return data.tags;
    }
  });

  // Fetch all tags from the store for autocomplete suggestions
  const { data: allTags = [], isLoading: allTagsLoading, isError: allTagsError } = useQuery({
    queryKey: ['allTags'],
    enabled: !!formData.productType,
    queryFn: async (): Promise<string[]> => {
      const response = await fetch('/api/shopify/products?type=allTags');
      if (!response.ok) {
        throw new Error('Failed to load all tags');
      }
      const data = await response.json() as TagsResponse;
      return data.tags;
    }
  });

  // Create autocomplete options from available tags
  const autocompleteOptions = useMemo(() => {
    if (!allTags || allTags.length === 0) return [];
    
    // Filter out already selected tags and create options
    const availableTags = allTags.filter(tag => !selectedTags.includes(tag));
    
    // Filter by search input if provided
    const filteredTags = inputValue.trim() 
      ? availableTags.filter(tag => 
          tag.toLowerCase().includes(inputValue.toLowerCase())
        )
      : availableTags.slice(0, 10); // Show top 10 when no search

    return filteredTags.map(tag => ({
      value: tag,
      label: tag,
    }));
  }, [allTags, selectedTags, inputValue]);

  // Determine if we should show "Add [tag]" option for new tags
  const shouldShowAddNewTag = useMemo(() => {
    if (!inputValue.trim()) return false;
    
    // Check if the typed value doesn't exist in any of our tag sources
    const allAvailableTags = [...(productTypeTags || []), ...(allTags || [])];
    const exactMatch = allAvailableTags.some(tag => 
      tag.toLowerCase() === inputValue.toLowerCase()
    );
    
    return !exactMatch && !selectedTags.includes(inputValue.trim());
  }, [inputValue, productTypeTags, allTags, selectedTags]);

  // Add "Add [tag]" option to autocomplete if applicable
  const finalOptions = useMemo(() => {
    const options = [...autocompleteOptions];
    
    if (shouldShowAddNewTag) {
      options.unshift({
        value: inputValue.trim(),
        label: `Add "${inputValue.trim()}"`,
      });
    }
    
    return options;
  }, [autocompleteOptions, shouldShowAddNewTag, inputValue]);

  // Get product type specific suggestions for the suggestion box
  const productTypeTagSuggestions = useMemo(() => {
    if (!productTypeTags || productTypeTags.length === 0) return [];
    
    const currentYear = new Date().getFullYear().toString();
    const filteredTags = productTypeTags.filter(tag => 
      !selectedTags.includes(tag) &&
      tag !== formData.vendor &&
      tag !== currentYear
    );
    
    // Sort alphabetically and organize into 3 columns
    const sortedTags = filteredTags.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    return sortedTags.slice(0, 12); // Show up to 12 tags (4 rows × 3 columns)
  }, [productTypeTags, selectedTags, formData.vendor]);

  // Organize tags into 3 columns for display
  const tagColumns = useMemo(() => {
    const columns: string[][] = [[], [], []];
    productTypeTagSuggestions.forEach((tag, index) => {
      columns[index % 3].push(tag);
    });
    return columns;
  }, [productTypeTagSuggestions]);

  const updateSelectedTags = useCallback((newTags: string[]) => {
    setSelectedTags(newTags);
    onChange({ tags: newTags });
  }, [onChange]);

  const handleTagRemove = useCallback((tag: string) => {
    // Prevent removing default tags
    const currentYear = new Date().getFullYear().toString();
    if (tag === formData.vendor || tag === currentYear) {
      return;
    }
    
    const newTags = selectedTags.filter((t) => t !== tag);
    updateSelectedTags(newTags);
  }, [selectedTags, updateSelectedTags, formData.vendor]);

  const updateText = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const updateSelection = useCallback((selected: string[]) => {
    // Handle selection - Autocomplete provides array of selected values
    const newTag = selected[0]; // We only handle single selection at a time
    
    if (newTag && !selectedTags.includes(newTag)) {
      updateSelectedTags([...selectedTags, newTag]);
    }
    
    // Clear input after selection
    setInputValue('');
  }, [selectedTags, updateSelectedTags]);

  const handleSuggestionToggle = useCallback((tag: string, checked: boolean) => {
    if (checked) {
      // Immediately add tag when checked
      if (!selectedTags.includes(tag)) {
        updateSelectedTags([...selectedTags, tag]);
      }
    } else {
      // Remove tag when unchecked
      updateSelectedTags(selectedTags.filter(t => t !== tag));
    }
  }, [selectedTags, updateSelectedTags]);

  const isLoading = productTypeTagsLoading || allTagsLoading;
  const hasError = productTypeTagsError && allTagsError;

  const textField = (
    <Autocomplete.TextField
      onChange={updateText}
      label=""
      value={inputValue}
      prefix={<Icon source={SearchIcon} tone="base" />}
      placeholder="Add additional tags..."
      autoComplete="off"
      labelHidden
    />
  );

  return (
    <>
      {/* Enhanced Product Information Display Card */}
      <Card>
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
      </Card>

      <Card>
        <BlockStack gap="500">
          <Text variant="headingMd" as="h2">
            Add Your Product Tags
          </Text>

          {hasError && (
            <Banner tone="warning">
              <Text as="p">
                Unable to load existing tags. You can still add custom tags below.
              </Text>
            </Banner>
          )}

          {!hasError && !isLoading && productTypeTags && productTypeTags.length === 0 && !allTagsLoading && (
            <Banner tone="info">
              <Text as="p">
                No tags found for "{formData.productType}" products. You can choose from tags used by other products or create new ones.
              </Text>
            </Banner>
          )}

          <BlockStack gap="400">
            {/* Product Type Tag Suggestions */}
            {productTypeTagSuggestions.length > 0 && (
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">
                  Suggested Tags
                </Text>
                
                <Box>
                  <BlockStack gap="300">
                    <Box 
                      background="bg-surface-secondary" 
                      padding="300" 
                      borderRadius="200"
                    >
                      <BlockStack gap="300">
                        <Text variant="bodySm" as="p" tone="subdued">
                          Tags from other products with the same product type
                        </Text>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {tagColumns.map((column, columnIndex) => (
                          <div key={columnIndex}>
                            {column.map((tag) => (
                              <div key={tag} style={{ marginBottom: '8px' }}>
                                <Checkbox
                                  label={tag}
                                  checked={selectedTags.includes(tag)}
                                  onChange={(checked) => handleSuggestionToggle(tag, checked)}
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </BlockStack>
                  </Box>


                </BlockStack>
              </Box>
              </BlockStack>
            )}

            {/* Main Tags Input with Autocomplete */}
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">
                Additional Tags
              </Text>

              <Autocomplete
                options={finalOptions}
                selected={[]}
                onSelect={updateSelection}
                textField={textField}
                loading={isLoading}
                emptyState={
                  inputValue.trim() && finalOptions.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center' }}>
                      <Text as="p" tone="subdued">No matching tags found</Text>
                    </div>
                  ) : undefined
                }
              />
            </BlockStack>

            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <BlockStack gap="300">
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">
                    Selected Tags ({selectedTags.length.toString()})
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Default tags cannot be deleted from within Product Builder Pro
                  </Text>
                </BlockStack>
                
                <InlineStack gap="200" wrap>
                  {selectedTags.map((tag) => {
                    const currentYear = new Date().getFullYear().toString();
                    const isDefaultTag = tag === formData.vendor || tag === currentYear;
                    
                    return (
                      <Tag 
                        key={tag} 
                        onRemove={!isDefaultTag ? () => handleTagRemove(tag) : undefined}
                      >
                        {tag}
                      </Tag>
                    );
                  })}
                </InlineStack>

                {selectedTags.length === 0 && (
                  <Text as="p" tone="subdued">
                    No tags selected yet. Add tags to help organize your product.
                  </Text>
                )}
              </BlockStack>
            )}
          </BlockStack>

          <InlineStack gap="300" align="end">
            <Button onClick={onBack}>Back</Button>
            <Button 
              variant="primary" 
              onClick={onNext}
            >
              Next
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>
    </>
  );
} 