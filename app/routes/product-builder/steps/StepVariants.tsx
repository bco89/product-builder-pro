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
  Select,
  Listbox,
  Combobox,
  Box,
  Badge,
  Checkbox,
  Scrollable,
} from '@shopify/polaris';
import { useQuery } from '@tanstack/react-query';

interface Option {
  name: string;
  values: string[];
}

interface StepVariantsProps {
  formData: {
    productType: string;
    options: Option[];
    variants: any[]; // Will be generated based on options
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

  // Auto-show options form when shouldShowOptionsForm is true
  useEffect(() => {
    if (shouldShowOptionsForm && formData.options.length === 0) {
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

  const handleAddOptionsClick = useCallback(() => {
    setShowOptionsForm(true);
  }, []);

  const handleOptionNameChange = useCallback((value: string) => {
    setSelectedOptionName(value);
    setSelectedOptionValues([]); // Reset selected values when option name changes
    setCustomValue('');
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

  const handleSelectAllValues = useCallback(() => {
    const availableValues = existingOptions
      ?.find(opt => opt.name === selectedOptionName)
      ?.values || [];
    
    const sortedValues = smartSort(availableValues);
    const valuesToSelect = sortedValues.slice(0, 20); // Limit to 20
    setSelectedOptionValues(valuesToSelect);
  }, [selectedOptionName, existingOptions]);

  const handleClearAllValues = useCallback(() => {
    setSelectedOptionValues([]);
  }, []);

  const handleAddCustomValue = useCallback(() => {
    if (customValue.trim() && !selectedOptionValues.includes(customValue.trim()) && selectedOptionValues.length < 20) {
      setSelectedOptionValues(prev => [...prev, customValue.trim()]);
      setCustomValue('');
    }
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
    
    setSelectedOptionValues([]);
    setCustomValue('');
    
    // Auto-advance to next step
    onNext();
  }, [selectedOptionName, selectedOptionValues, formData.options, onChange, onNext]);

  const handleAddSingleValue = useCallback((optionIndex: number) => {
    if (!customValue.trim()) return;
    
    const updatedOptions = [...formData.options];
    if (!updatedOptions[optionIndex].values.includes(customValue.trim())) {
      updatedOptions[optionIndex].values.push(customValue.trim());
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

  // Create options for the dropdown - fallback to custom input if API fails
  const optionNameOptions = useMemo(() => {
    if (optionsError) {
      return [{ label: 'Enter custom option name', value: '' }];
    }
    return existingOptions?.map(option => ({
      label: option.name,
      value: option.name
    })) || [];
  }, [existingOptions, optionsError]);

  if (!showOptionsForm && formData.options.length === 0) {
    return (
      <Card>
        <BlockStack gap="500">
          <Text variant="headingMd" as="h2">
            Product Variants
          </Text>
          
          <Banner tone="info">
            <Text as="p">
              Would you like to add variants to your product?
            </Text>
          </Banner>

          <InlineStack gap="300" align="center">
            <Button onClick={onBack}>Back</Button>
            <Button onClick={handleNoVariants}>
              This product has no variants
            </Button>
            <Button variant="primary" onClick={handleAddOptionsClick}>
              Add Options and Variants
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>
    );
  }

  // Get available option values for selected option name
  const availableValues = useMemo(() => {
    if (optionsError) return [];
    const values = existingOptions?.find(opt => opt.name === selectedOptionName)?.values || [];
    return smartSort(values);
  }, [existingOptions, selectedOptionName, optionsError]);

  // Calculate total variants that will be created
  const calculateVariantCount = () => {
    if (formData.options.length === 0) return 0;
    return formData.options.reduce((acc, option) => acc * option.values.length, 1);
  };

  const variantCount = calculateVariantCount();

  return (
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

        {optionsError && (
          <Banner tone="warning">
            <Text as="p">
              Unable to load existing options. You can still create custom options below.
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
              {optionsError ? (
                <TextField
                  label="Option Name"
                  value={selectedOptionName}
                  onChange={setSelectedOptionName}
                  placeholder="Enter option name (e.g., Size, Color, Material)"
                  helpText="Enter a custom option name since existing options could not be loaded."
                  autoComplete="off"
                />
              ) : (
                <Select
                  label="Option Name"
                  options={optionNameOptions}
                  value={selectedOptionName}
                  onChange={handleOptionNameChange}
                  placeholder={optionsLoading ? "Loading options..." : "Select an option name"}
                  helpText="Choose an option like Size, Color, Material, etc."
                />
              )}

              {selectedOptionName && availableValues.length > 0 && (
                <Box>
                  <BlockStack gap="400">
                    <InlineStack gap="200" align="space-between">
                      <Text variant="headingSm" as="h4">
                        Select Values for {selectedOptionName}
                      </Text>
                      <InlineStack gap="200">
                        <Text variant="bodySm" as="p" tone="subdued">
                          {selectedOptionValues.length} of 20 selected
                        </Text>
                        {selectedOptionValues.length > 0 && (
                          <Button size="slim" onClick={handleClearAllValues}>
                            Clear All
                          </Button>
                        )}
                        {availableValues.length > 0 && selectedOptionValues.length < 20 && (
                          <Button size="slim" onClick={handleSelectAllValues}>
                            Select All (max 20)
                          </Button>
                        )}
                      </InlineStack>
                    </InlineStack>

                    <Box 
                      background="bg-surface-secondary" 
                      padding="400" 
                      borderRadius="200"
                    >
                      <div style={{height: '160px', overflow: 'auto'}}>
                        <BlockStack gap="200">
                          {availableValues.map((value, index) => {
                            const isSelected = selectedOptionValues.includes(value);
                            const isDisabled = !isSelected && selectedOptionValues.length >= 20;
                            
                            return (
                              <Checkbox
                                key={`${value}-${index}`}
                                label={value}
                                checked={isSelected}
                                disabled={isDisabled}
                                onChange={(checked) => handleValueSelectionChange(value, checked)}
                              />
                            );
                          })}
                        </BlockStack>
                      </div>
                    </Box>

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

              {selectedOptionName && (
                <Box>
                  <BlockStack gap="300">
                    <TextField
                      label="Add Custom Value"
                      value={customValue}
                      onChange={setCustomValue}
                      placeholder={`Enter custom ${selectedOptionName.toLowerCase()} value`}
                      helpText="Add a custom value not in the list above"
                      disabled={selectedOptionValues.length >= 20}
                      autoComplete="off"
                      connectedRight={
                        <Button 
                          onClick={handleAddCustomValue}
                          disabled={!customValue.trim() || selectedOptionValues.length >= 20}
                        >
                          Add
                        </Button>
                      }
                    />
                    
                    {selectedOptionValues.length > 0 && (
                      <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="bodySm" as="p" fontWeight="medium">
                            Selected values ({selectedOptionValues.length}):
                          </Text>
                          <InlineStack gap="200" wrap>
                            {smartSort(selectedOptionValues).map((value, index) => (
                              <Badge key={`selected-${index}`} tone="info">
                                {value}
                              </Badge>
                            ))}
                          </InlineStack>
                        </BlockStack>
                      </Box>
                    )}
                  </BlockStack>
                </Box>
              )}

              {selectedOptionName && (selectedOptionValues.length > 0) && (
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
              <Banner tone="success">
                <Text as="p">
                  Great! Your variants are being configured. The system will automatically handle creating all combinations.
                </Text>
              </Banner>
              
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
                            placeholder={`Enter ${option.name.toLowerCase()} value`}
                            autoComplete="off"
                            helpText="Type a new value or select from suggestions below"
                          />
                          
                          {(() => {
                            const optionData = existingOptions?.find(o => o.name === option.name);
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
                            Add Value
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
  );
} 