import { useCallback, useState } from 'react';
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
}

export default function StepVariants({ formData, onChange, onNext, onBack }: StepVariantsProps) {
  const [showOptionsForm, setShowOptionsForm] = useState(false);
  const [selectedOptionName, setSelectedOptionName] = useState('');
  const [selectedOptionValue, setSelectedOptionValue] = useState('');
  const [currentOptionIndex, setCurrentOptionIndex] = useState<number | null>(null);

  // Fetch existing option names for the selected product type
  const { data: existingOptions, isLoading: optionsLoading } = useQuery({
    queryKey: ['productOptions', formData.productType],
    enabled: !!formData.productType,
    queryFn: async () => {
      const response = await fetch(`/api/shopify/product-options?productType=${encodeURIComponent(formData.productType)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product options');
      }
      const data = await response.json();
      return data.options as Option[];
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

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Product Variants
        </Text>

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
              />

              {selectedOptionName && (
                <Select
                  label="Option Value"
                  options={availableValues.map(value => ({ label: value, value }))}
                  value={selectedOptionValue}
                  onChange={handleOptionValueChange}
                  placeholder="Select an option value"
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
                      <InlineStack gap="300">
                        <div style={{ flexGrow: 1 }}>
                          <Combobox
                            activator={
                              <Combobox.TextField
                                label="Value"
                                labelHidden
                                value={selectedOptionValue}
                                onChange={setSelectedOptionValue}
                                placeholder={`Enter ${option.name.toLowerCase()} value`}
                                autoComplete="off"
                              />
                            }
                          >
                            <Listbox>
                              {existingOptions
                                ?.find(o => o.name === option.name)
                                ?.values.map((value, index) => (
                                  <Listbox.Option
                                    key={index}
                                    value={value}
                                    selected={selectedOptionValue === value}
                                  >
                                    {value}
                                  </Listbox.Option>
                                )) || null}
                            </Listbox>
                          </Combobox>
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                          <Button onClick={handleAddOptionWithValue}>
                            Add Value
                          </Button>
                        </div>
                      </InlineStack>
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
                        onClick={() => setCurrentOptionIndex(optionIndex)}
                      >
                        Add Values
                      </Button>
                    )}
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          )}

          <InlineStack gap="300" align="center">
            <Button onClick={onBack}>Back</Button>
            <Button onClick={handleNoVariants}>
              This product has no variants
            </Button>
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