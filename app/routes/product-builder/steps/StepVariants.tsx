import { useCallback, useState, useEffect, useMemo } from 'react';
import {
  Card,
  TextField,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  Tag,
  Listbox,
  Combobox,
  Box,
  Badge,
  Checkbox,
  Scrollable,
  Icon,
  ChoiceList,
} from '@shopify/polaris';
import { SearchIcon, PlusIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';

interface Option {
  name: string;
  values: string[];
}

interface StepVariantsProps {
  formData: {
    vendor: string;
    productType: string;
    category: { id: string; name: string; } | null;
    title: string;
    options: Option[];
    variants: any[]; // Will be generated based on options
    pricing?: Array<{
      price?: string;
      compareAtPrice?: string;
      cost?: string;
    }>;
  };
  onChange: (updates: Partial<StepVariantsProps['formData']>) => void;
  onNext: () => void;
  onBack: () => void;
  shouldShowOptionsForm?: boolean;
}

// Smart sorting function for option values
const smartSort = (values: string[]): string[] => {
  // Common size patterns - expanded to include full words
  const sizeOrder = [
    'XXS', 'XS', 'EXTRA SMALL', 'X-SMALL', 'XSMALL',
    'S', 'SMALL',
    'M', 'MEDIUM', 'MED',
    'L', 'LARGE', 'LG',
    'XL', 'X-LARGE', 'XLARGE', 'EXTRA LARGE',
    'XXL', 'XX-LARGE', 'XXLARGE', 'EXTRA EXTRA LARGE',
    'XXXL', '3XL', 'XXX-LARGE', 'XXXLARGE',
    '4XL', '5XL'
  ];
  const numericSizeOrder = ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32', '34', '36', '38', '40'];
  
  // Check if all values are clothing sizes
  const isClothingSizes = values.every(value => 
    sizeOrder.includes(value.toUpperCase()) || 
    /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d+XL)$/i.test(value) ||
    /^(EXTRA\s+SMALL|SMALL|MEDIUM|LARGE|EXTRA\s+LARGE)$/i.test(value)
  );
  
  // Check if all values are numeric sizes
  const isNumericSizes = values.every(value => 
    /^\d+(\.\d+)?$/.test(value) || numericSizeOrder.includes(value)
  );
  
  // Check if all values are shoe sizes (including half sizes)
  const isShoeSizes = values.every(value => 
    /^\d+(\.\d+)?$/.test(value) && parseFloat(value) >= 3 && parseFloat(value) <= 20
  );
  
  if (isClothingSizes) {
    // Sort by clothing size order
    return values.sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a.toUpperCase());
      const bIndex = sizeOrder.indexOf(b.toUpperCase());
      
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });
  }
  
  if (isNumericSizes || isShoeSizes) {
    // Sort numerically
    return values.sort((a, b) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      return aNum - bNum;
    });
  }
  
  // Default alphabetical sort
  return values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

export default function StepVariants({ formData, onChange, onNext, onBack, shouldShowOptionsForm = false }: StepVariantsProps) {
  const [showOptionsForm, setShowOptionsForm] = useState(shouldShowOptionsForm);
  const [selectedOptionName, setSelectedOptionName] = useState('');
  const [selectedOptionValues, setSelectedOptionValues] = useState<string[]>([]);
  const [currentOptionIndex, setCurrentOptionIndex] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [isCustomOptionName, setIsCustomOptionName] = useState(false);
  
  // New state for Combobox implementation
  const [optionNameInputValue, setOptionNameInputValue] = useState('');
  const [valueInputValue, setValueInputValue] = useState('');
  const [valueSearchQuery, setValueSearchQuery] = useState('');
  const [valueComboboxInputValue, setValueComboboxInputValue] = useState('');

  // Auto-show options form when shouldShowOptionsForm is true OR when user reaches this step after deciding to have variants
  useEffect(() => {
    if ((shouldShowOptionsForm || true) && formData.options.length === 0) {
      setShowOptionsForm(true);
    }
  }, [shouldShowOptionsForm, formData.options.length]);

  // Fetch existing option names for the selected product type
  const { data: existingOptions, isLoading: optionsLoading, isError: optionsError } = useQuery({
    queryKey: ['productOptions', formData.productType],
    enabled: !!formData.productType,
    queryFn: async () => {
      const response = await fetch(`/api/shopify/products?type=options&productType=${encodeURIComponent(formData.productType)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product options');
      }
      const data = await response.json();
      // Filter out "Title" and "Default Title" options to avoid confusion
      const filteredOptions = (data.options as Option[]).filter(
        option => option.name.toLowerCase() !== 'title' && 
                 option.name.toLowerCase() !== 'default title'
      );
      return filteredOptions;
    }
  });

  // Fetch all options to show other product types' options
  const { data: allOptions, isLoading: allOptionsLoading, isError: allOptionsError } = useQuery({
    queryKey: ['allProductOptions'],
    enabled: !!formData.productType,
    queryFn: async () => {
      const response = await fetch('/api/shopify/products?type=allOptions');
      if (!response.ok) {
        throw new Error('Failed to fetch all product options');
      }
      const data = await response.json();
      // Filter out "Title" and "Default Title" options to avoid confusion
      const filteredOptions = (data.options as Option[]).filter(
        option => option.name.toLowerCase() !== 'title' && 
                 option.name.toLowerCase() !== 'default title'
      );
      return filteredOptions;
    }
  });

  const handleAddOptionsClick = useCallback(() => {
    setShowOptionsForm(true);
  }, []);

  // New handlers for Combobox option name selection
  const updateOptionNameText = useCallback((value: string) => {
    setOptionNameInputValue(value);
    setSelectedOptionName(value);
    setIsCustomOptionName(true);
    setSelectedOptionValues([]);
    setCustomValue('');
  }, []);

  const updateOptionNameSelection = useCallback((selected: string) => {
    if (selected.startsWith('create:')) {
      const newOptionName = selected.replace('create:', '');
      if (newOptionName === 'new') {
        // Focus the input field for the user to start typing
        setOptionNameInputValue('');
        setSelectedOptionName('');
        setIsCustomOptionName(true);
        return;
      }
      setSelectedOptionName(newOptionName);
      setOptionNameInputValue(newOptionName);
      setIsCustomOptionName(true);
    } else {
      setSelectedOptionName(selected);
      setOptionNameInputValue(selected);
      setIsCustomOptionName(false);
    }
    setSelectedOptionValues([]);
    setCustomValue('');
  }, []);

  // Enhanced value selection handlers
  const updateValueText = useCallback((value: string) => {
    setValueInputValue(value);
  }, []);

  const updateValueSelection = useCallback((selected: string[]) => {
    if (selected.some(s => s.startsWith('create:'))) {
      const newValues = selected
        .filter(s => s.startsWith('create:'))
        .map(s => s.replace('create:', ''));
      const existingValues = selected.filter(s => !s.startsWith('create:'));
      setSelectedOptionValues([...existingValues, ...newValues]);
    } else {
      setSelectedOptionValues(selected);
    }
  }, []);



  const handleValueSelectionChange = useCallback((value: string, checked: boolean) => {
    setSelectedOptionValues(prev => {
      if (checked) {
        // Add value if not already selected and under limit
        if (!prev.includes(value) && prev.length < 20) {
          return [...prev, value];
        }
        return prev;
      } else {
        // Remove value
        return prev.filter(v => v !== value);
      }
    });
  }, []);

  // New handler for ChoiceList multiple selection
  const handleChoiceListChange = useCallback((values: string[]) => {
    // Limit to 20 values maximum
    if (values.length <= 20) {
      setSelectedOptionValues(values);
    }
  }, []);

  // Handler for suggested value selection
  const handleSelectSuggestedValue = useCallback((value: string) => {
    if (!selectedOptionValues.includes(value) && selectedOptionValues.length < 20) {
      setSelectedOptionValues(prev => [...prev, value]);
    }
  }, [selectedOptionValues]);

  // Handler for value combobox text updates
  const updateValueComboboxText = useCallback((value: string) => {
    setValueComboboxInputValue(value);
  }, []);

  // Handler for value combobox selection
  const updateValueComboboxSelection = useCallback((selected: string) => {
    if (selected.startsWith('create:')) {
      const newValue = selected.replace('create:', '');
      if (newValue && !selectedOptionValues.includes(newValue) && selectedOptionValues.length < 20) {
        setSelectedOptionValues(prev => [...prev, newValue]);
        setValueComboboxInputValue('');
      }
    } else {
      if (!selectedOptionValues.includes(selected) && selectedOptionValues.length < 20) {
        setSelectedOptionValues(prev => [...prev, selected]);
        setValueComboboxInputValue('');
      }
    }
  }, [selectedOptionValues]);



  const handleClearAllValues = useCallback(() => {
    setSelectedOptionValues([]);
  }, []);

  const handleAddCustomValue = useCallback(() => {
    if (!customValue.trim()) return;
    
    // Split by comma and clean up each value
    const newValues = customValue
      .split(',')
      .map(value => value.trim())
      .filter(value => value.length > 0) // Remove empty values
      .filter(value => !selectedOptionValues.includes(value)); // Remove duplicates
    
    // Check if adding these values would exceed the limit
    const totalAfterAdding = selectedOptionValues.length + newValues.length;
    if (totalAfterAdding > 20) {
      // Only add values up to the limit
      const availableSlots = 20 - selectedOptionValues.length;
      const valuesToAdd = newValues.slice(0, availableSlots);
      setSelectedOptionValues(prev => [...prev, ...valuesToAdd]);
    } else {
      setSelectedOptionValues(prev => [...prev, ...newValues]);
    }
    
    setCustomValue('');
  }, [customValue, selectedOptionValues]);

  const handleAddSelectedValues = useCallback(() => {
    if (!selectedOptionName || selectedOptionValues.length === 0) return;
    
    const existingOptionIndex = formData.options.findIndex(opt => opt.name === selectedOptionName);
    
    if (existingOptionIndex >= 0) {
      // Add values to existing option
      const updatedOptions = [...formData.options];
      const newValues = selectedOptionValues.filter(
        value => !updatedOptions[existingOptionIndex].values.includes(value)
      );
      updatedOptions[existingOptionIndex].values.push(...newValues);
      // Sort the values after adding
      updatedOptions[existingOptionIndex].values = smartSort(updatedOptions[existingOptionIndex].values);
      onChange({ options: updatedOptions });
    } else {
      // Create new option with values
      const sortedValues = smartSort(selectedOptionValues);
      const updatedOptions = [
        ...formData.options,
        { name: selectedOptionName, values: sortedValues }
      ];
      onChange({ options: updatedOptions });
    }
    
    // Reset form state
    setSelectedOptionValues([]);
    setCustomValue('');
    setOptionNameInputValue('');
    setSelectedOptionName('');
    setIsCustomOptionName(false);
    
    // Auto-advance to next step
    onNext();
  }, [selectedOptionName, selectedOptionValues, formData.options, onChange, onNext]);

  const handleAddSingleValue = useCallback((optionIndex: number) => {
    if (!customValue.trim()) return;
    
    // Split by comma and clean up each value
    const newValues = customValue
      .split(',')
      .map(value => value.trim())
      .filter(value => value.length > 0) // Remove empty values
      .filter(value => !formData.options[optionIndex].values.includes(value)); // Remove duplicates
    
    if (newValues.length > 0) {
      const updatedOptions = [...formData.options];
      updatedOptions[optionIndex].values.push(...newValues);
      // Sort the values after adding
      updatedOptions[optionIndex].values = smartSort(updatedOptions[optionIndex].values);
      onChange({ options: updatedOptions });
    }
    
    setCustomValue('');
  }, [customValue, formData.options, onChange]);

  const handleRemoveValue = useCallback((optionIndex: number, valueIndex: number) => {
    const updatedOptions = [...formData.options];
    updatedOptions[optionIndex].values.splice(valueIndex, 1);
    onChange({ options: updatedOptions });
  }, [formData.options, onChange]);

  const handleRemoveOption = useCallback((optionIndex: number) => {
    const updatedOptions = [...formData.options];
    updatedOptions.splice(optionIndex, 1);
    onChange({ options: updatedOptions });
    setCurrentOptionIndex(null);
  }, [formData.options, onChange]);

  const handleNoVariants = useCallback(() => {
    onChange({ options: [] });
    onNext();
  }, [onChange, onNext]);





  // Organized options for better UX
  const organizedOptions = useMemo(() => {
    // Options used in products with the same product type
    const currentProductTypeOptions = existingOptions?.filter(opt => 
      !opt.name.toLowerCase().includes('title')
    ) || [];
    
    // Options used in other products (different product types)
    const otherProductOptions = allOptions?.filter(opt => 
      !opt.name.toLowerCase().includes('title') &&
      !currentProductTypeOptions.some(existing => existing.name === opt.name)
    ) || [];
    
    return {
      current: currentProductTypeOptions,
      other: otherProductOptions
    };
  }, [existingOptions, allOptions, formData.productType]);

  // Filtered options based on input
  const filteredOptions = useMemo(() => {
    if (!optionNameInputValue.trim()) {
      return [
        ...organizedOptions.current,
        ...organizedOptions.other.slice(0, 5) // Limit other options
      ];
    }

    const searchTerm = optionNameInputValue.toLowerCase();
    const allAvailableOptions = [
      ...organizedOptions.current,
      ...organizedOptions.other
    ];

    return allAvailableOptions.filter(option => {
      return option.name?.toLowerCase().includes(searchTerm);
    });
  }, [optionNameInputValue, organizedOptions]);

  // Check if input exactly matches an existing option
  const exactMatch = useMemo(() => {
    return filteredOptions.some(option => {
      return option.name?.toLowerCase() === optionNameInputValue.toLowerCase();
    });
  }, [filteredOptions, optionNameInputValue]);

  // Determine which options to use for values
  const optionsForValues = useMemo(() => {
    // Combine current product type options with all other options
    const currentOptions = existingOptions || [];
    const otherOptions = allOptions || [];
    
    // Create a map to avoid duplicates, prioritizing current product type options
    const optionsMap = new Map<string, Option>();
    
    // Add current product type options first (higher priority)
    currentOptions.forEach(option => {
      optionsMap.set(option.name.toLowerCase(), option);
    });
    
    // Add other options if not already present
    otherOptions.forEach(option => {
      if (!optionsMap.has(option.name.toLowerCase())) {
        optionsMap.set(option.name.toLowerCase(), option);
      }
    });
    
    return Array.from(optionsMap.values());
  }, [existingOptions, allOptions]);



  // Get available option values for selected option name
  const availableValues = useMemo(() => {
    if (optionsError && allOptionsError) return [];
    if (isCustomOptionName) return []; // No predefined values for custom options
    
    const values = optionsForValues?.find(opt => opt.name === selectedOptionName)?.values || [];
    return smartSort(values);
  }, [optionsForValues, selectedOptionName, optionsError, allOptionsError, isCustomOptionName]);

  // Organize values similar to how options are organized
  const organizedValues = useMemo(() => {
    if (!selectedOptionName || isCustomOptionName) return { current: [], other: [] };
    
    // Values from the current selected option name
    const currentOptionValues = existingOptions?.find(opt => opt.name === selectedOptionName)?.values || [];
    
    // Values from other option names (for cross-option suggestions)
    const otherOptionValues = optionsForValues
      ?.filter(opt => opt.name !== selectedOptionName)
      .flatMap(opt => opt.values)
      .filter((value, index, arr) => arr.indexOf(value) === index) // Remove duplicates
      || [];
    
    return {
      current: smartSort(currentOptionValues),
      other: smartSort(otherOptionValues.slice(0, 10)) // Limit to 10 suggestions
    };
  }, [selectedOptionName, existingOptions, optionsForValues, isCustomOptionName]);

  // Filtered values for combobox based on input
  const filteredValuesForCombobox = useMemo(() => {
    if (!valueComboboxInputValue.trim()) {
      return organizedValues.other.slice(0, 8); // Show top 8 other values when no input
    }

    const searchTerm = valueComboboxInputValue.toLowerCase();
    const allValues = [...organizedValues.current, ...organizedValues.other];

    return allValues
      .filter(value => value.toLowerCase().includes(searchTerm))
      .slice(0, 10); // Limit to 10 results
  }, [valueComboboxInputValue, organizedValues]);

  // Calculate total variants that will be created
  const calculateVariantCount = () => {
    if (formData.options.length === 0) return 0;
    return formData.options.reduce((acc, option) => acc * option.values.length, 1);
  };

  const variantCount = calculateVariantCount();
  const basePricing = formData.pricing?.[0];

  return (
    <>
      <style>
        {`
          /* Improve Listbox option hover states and cursor */
          [data-listbox-option] {
            cursor: pointer !important;
            transition: background-color 0.15s ease;
          }
          
          [data-listbox-option]:hover {
            background-color: var(--p-color-bg-surface-hover) !important;
          }
          
          [data-listbox-option]:focus {
            background-color: var(--p-color-bg-surface-selected) !important;
            outline: 2px solid var(--p-color-border-focus) !important;
            outline-offset: -2px !important;
          }
          
          [data-listbox-option] * {
            cursor: pointer !important;
          }
          
          /* Section headers should not be clickable */
          .option-section-header {
            cursor: default !important;
          }
          
          .option-section-header * {
            cursor: default !important;
          }
        `}
      </style>
      
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
          {basePricing && (
            <Text as="span">
              <Text as="span" fontWeight="bold">Price:</Text> ${basePricing.price || '0.00'}
              {basePricing.compareAtPrice && (
                <>
                  {' • '}
                  <Text as="span" fontWeight="bold">Compare at:</Text> ${basePricing.compareAtPrice}
                </>
              )}
              {basePricing.cost && (
                <>
                  {' • '}
                  <Text as="span" fontWeight="bold">Cost:</Text> ${basePricing.cost}
                </>
              )}
            </Text>
          )}
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="500">
          <Text variant="headingMd" as="h2">
            Product Variants
          </Text>

          <Banner tone="info">
            <Text as="p">
              Add options (like Size or Color) and their values to create product variants. 
              Each combination of option values will become a unique variant.
            </Text>
          </Banner>

          {optionsError && allOptionsError && (
            <Banner tone="warning">
              <Text as="p">
                Unable to load existing options. You can still create custom options below.
              </Text>
            </Banner>
          )}

          {(optionsLoading || allOptionsLoading) && (
            <Banner tone="info">
              <Text as="p">
                Loading option names...
              </Text>
            </Banner>
          )}

          {!optionsError && !optionsLoading && existingOptions && existingOptions.length === 0 && !allOptionsLoading && (
            <Banner tone="info">
              <Text as="p">
                No option names found for "{formData.productType}" products. 
                {allOptions && allOptions.length > 0 
                  ? `Found ${allOptions.length} options from other product types.`
                  : 'You can create a new option below.'
                }
              </Text>
            </Banner>
          )}

          {variantCount > 0 && (
            <Box background="bg-surface-secondary" padding="400" borderRadius="200">
              <InlineStack gap="200" align="center">
                <Text as="p" fontWeight="medium">Variants to be created:</Text>
                <Badge tone="info">{variantCount.toString()}</Badge>
              </InlineStack>
            </Box>
          )}

          <BlockStack gap="500">
            {/* Option Selection Form */}
            <Card>
              <BlockStack gap="400">
                {optionsError && allOptionsError ? (
                  <TextField
                    label="Option Name"
                    value={selectedOptionName}
                    onChange={setSelectedOptionName}
                    placeholder="Enter option name (e.g., Size, Color, Material)"
                    helpText="Enter a custom option name since existing options could not be loaded."
                    autoComplete="off"
                  />
                ) : (
                  <BlockStack gap="300">
                    <Combobox
                      activator={
                        <Combobox.TextField
                          prefix={<Icon source={SearchIcon} />}
                          onChange={updateOptionNameText}
                          label="Option Name"
                          value={optionNameInputValue}
                          placeholder="Search existing options or create new (e.g., Size, Color, Material)"
                          autoComplete="off"
                          loading={optionsLoading || allOptionsLoading}
                          helpText="Type to search existing options or create a new one."
                        />
                      }
                      preferredPosition="below"
                      height="280px"
                    >
                      {filteredOptions.length > 0 || optionNameInputValue ? (
                        <Listbox onSelect={updateOptionNameSelection}>
                          {/* Current product type options */}
                          {organizedOptions.current.length > 0 && (
                            <>
                              <div className="option-section-header">
                                <Box padding="200" background="bg-surface-secondary">
                                  <Text as="p" variant="bodySm" fontWeight="semibold" tone="subdued">
                                    Used in {formData.productType} products
                                  </Text>
                                </Box>
                              </div>
                              {organizedOptions.current
                                .filter(option => !optionNameInputValue || option.name.toLowerCase().includes(optionNameInputValue.toLowerCase()))
                                .map((option) => (
                                <Listbox.Option
                                  key={option.name}
                                  value={option.name}
                                >
                                  <Box padding="200">
                                    <InlineStack align="space-between" blockAlign="center">
                                      <Text as="span" variant="bodySm" fontWeight="medium">
                                        {option.name}
                                      </Text>
                                      <Badge tone="info" size="small">
                                        {`${option.values.length} values`}
                                      </Badge>
                                    </InlineStack>
                                  </Box>
                                </Listbox.Option>
                              ))}
                            </>
                          )}

                          {/* Other Option Names */}
                          {organizedOptions.other.length > 0 && (
                            <>
                              <div className="option-section-header">
                                <Box padding="200" background="bg-surface-secondary">
                                  <Text as="p" variant="bodySm" fontWeight="semibold" tone="subdued">
                                    Other Option Names
                                  </Text>
                                </Box>
                              </div>
                              {organizedOptions.other
                                .filter(option => !optionNameInputValue || option.name.toLowerCase().includes(optionNameInputValue.toLowerCase()))
                                .slice(0, 8)
                                .map((option) => (
                                <Listbox.Option
                                  key={option.name}
                                  value={option.name}
                                >
                                  <Box padding="200">
                                    <InlineStack align="space-between" blockAlign="center">
                                      <Text as="span" variant="bodySm">
                                        {option.name}
                                      </Text>
                                      <Badge size="small">
                                        {`${option.values.length} values`}
                                      </Badge>
                                    </InlineStack>
                                  </Box>
                                </Listbox.Option>
                              ))}
                            </>
                          )}

                          {/* Create new section - always visible */}
                          <div className="option-section-header">
                            <Box padding="200" background="bg-surface-secondary">
                              <Text as="p" variant="bodySm" fontWeight="semibold" tone="subdued">
                                Create new
                              </Text>
                            </Box>
                          </div>
                          
                          {/* Create new option when typing */}
                          {optionNameInputValue && !exactMatch && (
                            <Listbox.Option value={`create:${optionNameInputValue}`}>
                              <Box padding="200">
                                <InlineStack gap="200" blockAlign="center">
                                  <Box 
                                    background="bg-surface-brand" 
                                    borderRadius="100" 
                                    padding="050"
                                  >
                                    <Icon source={PlusIcon} tone="base" />
                                  </Box>
                                  <BlockStack gap="025">
                                    <Text as="span" variant="bodySm" fontWeight="medium">
                                      Create "{optionNameInputValue}"
                                    </Text>
                                    <Text as="span" variant="bodySm" tone="subdued">
                                      New option for your products
                                    </Text>
                                  </BlockStack>
                                </InlineStack>
                              </Box>
                            </Listbox.Option>
                          )}
                          
                          {/* Create new placeholder when not typing */}
                          {!optionNameInputValue && (
                            <Listbox.Option value="create:new">
                              <Box padding="200">
                                <InlineStack gap="200" blockAlign="center">
                                  <Box 
                                    background="bg-surface-tertiary" 
                                    borderRadius="100" 
                                    padding="050"
                                  >
                                    <Icon source={PlusIcon} tone="subdued" />
                                  </Box>
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    Start typing to create a new option
                                  </Text>
                                </InlineStack>
                              </Box>
                            </Listbox.Option>
                          )}
                        </Listbox>
                      ) : null}
                    </Combobox>
                  </BlockStack>
                )}

                {selectedOptionName && !isCustomOptionName && (
                  <Box>
                    <BlockStack gap="400">
                      <Text variant="headingSm" as="h4">
                        Add Values for {selectedOptionName}
                      </Text>

                      {/* Suggested Values Section */}
                      {organizedValues.current.length > 0 && (
                        <BlockStack gap="300">
                          <Text variant="bodySm" as="p" tone="subdued">
                            Values from other products with the same option name
                          </Text>
                          <Box 
                            background="bg-surface-secondary" 
                            padding="400" 
                            borderRadius="200"
                          >
                            <InlineStack gap="200" wrap>
                              {organizedValues.current.map((value, index) => (
                                <Button
                                  key={`suggested-${index}`}
                                  size="slim"
                                  disabled={selectedOptionValues.includes(value) || selectedOptionValues.length >= 20}
                                  onClick={() => handleSelectSuggestedValue(value)}
                                >
                                  {value}
                                </Button>
                              ))}
                            </InlineStack>
                          </Box>
                        </BlockStack>
                      )}

                      {/* Additional Values Combobox */}
                      <BlockStack gap="200">
                        <Text variant="bodySm" as="p">Additional Values</Text>
                                                 <Combobox
                           activator={
                             <Combobox.TextField
                               label="Additional values"
                               labelHidden
                               prefix={<Icon source={PlusIcon} />}
                               onChange={updateValueComboboxText}
                               value={valueComboboxInputValue}
                               placeholder="Add values used for other option names..."
                               autoComplete="off"
                               disabled={selectedOptionValues.length >= 20}
                             />
                           }
                          allowMultiple={false}
                        >
                          {filteredValuesForCombobox.length > 0 ? (
                            <Listbox onSelect={updateValueComboboxSelection}>
                              {filteredValuesForCombobox.map((value) => (
                                <Listbox.Option
                                  key={value}
                                  value={value}
                                  disabled={selectedOptionValues.includes(value)}
                                >
                                  <Box padding="200">
                                    <InlineStack gap="200" align="space-between">
                                      <Text as="span" variant="bodySm">
                                        {value}
                                      </Text>
                                      {selectedOptionValues.includes(value) && (
                                        <Badge tone="success">Selected</Badge>
                                      )}
                                    </InlineStack>
                                  </Box>
                                </Listbox.Option>
                              ))}
                              
                              {valueComboboxInputValue && !filteredValuesForCombobox.includes(valueComboboxInputValue) && (
                                <Listbox.Option value={`create:${valueComboboxInputValue}`}>
                                  <Box padding="200">
                                    <InlineStack gap="200">
                                      <Icon source={PlusIcon} />
                                      <Text as="span" variant="bodySm">
                                        Add "{valueComboboxInputValue}"
                                      </Text>
                                    </InlineStack>
                                  </Box>
                                </Listbox.Option>
                              )}
                            </Listbox>
                          ) : valueComboboxInputValue ? (
                            <Listbox onSelect={updateValueComboboxSelection}>
                              <Listbox.Option value={`create:${valueComboboxInputValue}`}>
                                <Box padding="200">
                                  <InlineStack gap="200">
                                    <Icon source={PlusIcon} />
                                    <Text as="span" variant="bodySm">
                                      Add "{valueComboboxInputValue}"
                                    </Text>
                                  </InlineStack>
                                </Box>
                              </Listbox.Option>
                            </Listbox>
                          ) : null}
                        </Combobox>
                      </BlockStack>

                      {selectedOptionValues.length >= 20 && (
                        <Banner tone="warning">
                          <Text as="p">
                            Maximum of 20 values can be selected at once.
                          </Text>
                        </Banner>
                      )}
                    </BlockStack>
                  </Box>
                )}

                {selectedOptionValues.length > 0 && (
                  <BlockStack gap="300">
                    <Text variant="bodySm" as="p" fontWeight="medium">
                      Selected Values ({selectedOptionValues.length})
                    </Text>
                    <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                      <InlineStack gap="200" align="space-between" blockAlign="start">
                        <InlineStack gap="200" wrap>
                          {smartSort(selectedOptionValues).map((value, index) => (
                            <Tag
                              key={`selected-${index}`}
                              onRemove={() => handleValueSelectionChange(value, false)}
                            >
                              {value}
                            </Tag>
                          ))}
                        </InlineStack>
                        {selectedOptionValues.length > 0 && (
                          <Button size="slim" onClick={handleClearAllValues}>
                            Clear All
                          </Button>
                        )}
                      </InlineStack>
                    </Box>
                  </BlockStack>
                )}

                {selectedOptionName && selectedOptionValues.length > 0 && (
                  <Button 
                    variant="primary" 
                    onClick={handleAddSelectedValues}
                    disabled={selectedOptionValues.length === 0}
                  >
                    Add {selectedOptionValues.length.toString()} Value{selectedOptionValues.length !== 1 ? 's' : ''} to {selectedOptionName}
                  </Button>
                )}
              </BlockStack>
            </Card>

            {/* Existing Options Display */}
            {formData.options.length > 0 && (
              <BlockStack gap="500">
                {formData.options.map((option, optionIndex) => (
                  <Card key={optionIndex}>
                    <BlockStack gap="500">
                      <InlineStack align="space-between">
                        <Text variant="headingSm" as="h3">
                          {option.name}
                        </Text>
                        <Button
                          tone="critical"
                          onClick={() => handleRemoveOption(optionIndex)}
                        >
                          Remove
                        </Button>
                      </InlineStack>

                      {currentOptionIndex === optionIndex && (
                        <Box paddingBlockEnd="600">
                          <BlockStack gap="400">
                            <TextField
                              label="Add new value"
                              value={customValue}
                              onChange={setCustomValue}
                              placeholder={`Enter ${option.name.toLowerCase()} value(s)`}
                              autoComplete="off"
                              helpText="Add variant titles for each product variant. Type a new value or select from suggestions below. Separate multiple values with commas (e.g., Small, Medium, Large)"
                            />
                            
                            {(() => {
                              const optionData = optionsForValues?.find(o => o.name === option.name);
                              const filteredSuggestions = optionData?.values.filter(v => 
                                customValue && v.toLowerCase().includes(customValue.toLowerCase())
                              ) || [];
                              
                              if (filteredSuggestions.length > 0 && customValue) {
                                return (
                                  <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                                    <BlockStack gap="100">
                                      <Text as="p" variant="bodySm" tone="subdued">
                                        Suggestions:
                                      </Text>
                                      <InlineStack gap="200" wrap>
                                        {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
                                          <Button
                                            key={`suggestion-${index}`}
                                            size="slim"
                                            onClick={() => setCustomValue(suggestion)}
                                          >
                                            {suggestion}
                                          </Button>
                                        ))}
                                      </InlineStack>
                                    </BlockStack>
                                  </Box>
                                );
                              }
                              return null;
                            })()}
                            
                            <Button 
                              onClick={() => handleAddSingleValue(optionIndex)} 
                              disabled={!customValue}
                              variant="primary"
                            >
                              {customValue.includes(',') ? 'Add All Values' : 'Add Value'}
                            </Button>
                          </BlockStack>
                        </Box>
                      )}

                      <InlineStack gap="300" wrap>
                        {option.values.map((value, valueIndex) => (
                          <Tag
                            key={valueIndex}
                            onRemove={() => handleRemoveValue(optionIndex, valueIndex)}
                          >
                            {value}
                          </Tag>
                        ))}
                      </InlineStack>

                      {currentOptionIndex !== optionIndex && (
                        <Button
                          onClick={() => {
                            setCurrentOptionIndex(optionIndex);
                            setCustomValue('');
                          }}
                          size="slim"
                        >
                          Add more values
                        </Button>
                      )}
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            )}

            <InlineStack gap="300" align="center">
              <Button onClick={onBack}>Back</Button>
              {formData.options.length > 0 && (
                <Button variant="primary" onClick={onNext}>
                  Continue with variants
                </Button>
              )}
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </Card>
    </>
  );
} 