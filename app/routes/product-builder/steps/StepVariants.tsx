import { useCallback, useState, useEffect } from 'react';
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

export default function StepVariants({ formData, onChange, onNext, onBack, shouldShowOptionsForm = false }: StepVariantsProps) {
  const [showOptionsForm, setShowOptionsForm] = useState(shouldShowOptionsForm);
  const [selectedOptionName, setSelectedOptionName] = useState('');
  const [selectedOptionValue, setSelectedOptionValue] = useState('');
  const [currentOptionIndex, setCurrentOptionIndex] = useState<number | null>(null);

  // Auto-show options form when shouldShowOptionsForm is true
  useEffect(() => {
    if (shouldShowOptionsForm && formData.options.length === 0) {
      setShowOptionsForm(true);
    }
  }, [shouldShowOptionsForm, formData.options.length]);

  // Fetch existing option names for the selected product type
  const { data: existingOptions, isLoading: optionsLoading } = useQuery({
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
    setSelectedOptionValue(''); // Reset value when option name changes
  }, []);

  const handleOptionValueChange = useCallback((value: string) => {
    setSelectedOptionValue(value);
  }, []);

  const handleAddOptionWithValue = useCallback(() => {
    if (!selectedOptionName || !selectedOptionValue) return;
    
    const existingOptionIndex = formData.options.findIndex(opt => opt.name === selectedOptionName);
    
    if (existingOptionIndex >= 0) {
      // Add value to existing option
      const updatedOptions = [...formData.options];
      if (!updatedOptions[existingOptionIndex].values.includes(selectedOptionValue)) {
        updatedOptions[existingOptionIndex].values.push(selectedOptionValue);
        onChange({ options: updatedOptions });
      }
    } else {
      // Create new option with value
      const updatedOptions = [
        ...formData.options,
        { name: selectedOptionName, values: [selectedOptionValue] }
      ];
      onChange({ options: updatedOptions });
    }
    
    setSelectedOptionValue('');
  }, [selectedOptionName, selectedOptionValue, formData.options, onChange]);

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

  // Create options for the dropdown
  const optionNameOptions = existingOptions?.map(option => ({
    label: option.name,
    value: option.name
  })) || [];

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
  const availableValues = existingOptions
    ?.find(opt => opt.name === selectedOptionName)
    ?.values || [];

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
              <Select
                label="Option Name"
                options={optionNameOptions}
                value={selectedOptionName}
                onChange={handleOptionNameChange}
                placeholder={optionsLoading ? "Loading options..." : "Select an option name"}
                helpText="Choose an option like Size, Color, Material, etc."
              />

              {selectedOptionName && (
                <Select
                  label="Option Value"
                  options={availableValues.map(value => ({ label: value, value }))}
                  value={selectedOptionValue}
                  onChange={handleOptionValueChange}
                  placeholder="Select an option value"
                  helpText={`Choose a value for ${selectedOptionName}`}
                />
              )}

              {selectedOptionName && selectedOptionValue && (
                <Button onClick={handleAddOptionWithValue}>
                  Add Option and Value
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
                            value={selectedOptionValue}
                            onChange={setSelectedOptionValue}
                            placeholder={`Enter ${option.name.toLowerCase()} value`}
                            autoComplete="off"
                            helpText="Type a new value or select from suggestions below"
                          />
                          
                          {(() => {
                            const optionData = existingOptions?.find(o => o.name === option.name);
                            const filteredSuggestions = optionData?.values.filter(v => 
                              selectedOptionValue && v.toLowerCase().includes(selectedOptionValue.toLowerCase())
                            ) || [];
                            
                            if (filteredSuggestions.length > 0 && selectedOptionValue) {
                              return (
                                <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                                  <BlockStack gap="100">
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      Suggestions:
                                    </Text>
                                    <InlineStack gap="200" wrap>
                                      {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
                                        <Button
                                          key={index}
                                          size="slim"
                                          onClick={() => setSelectedOptionValue(suggestion)}
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
                            onClick={handleAddOptionWithValue} 
                            disabled={!selectedOptionValue}
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
                          setSelectedOptionValue('');
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