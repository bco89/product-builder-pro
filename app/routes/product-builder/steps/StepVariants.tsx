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
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
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

  const handleAddOption = useCallback(() => {
    if (!newOptionName) return;
    
    const updatedOptions = [
      ...formData.options,
      { name: newOptionName, values: [] }
    ];
    onChange({ options: updatedOptions });
    setNewOptionName('');
    setCurrentOptionIndex(updatedOptions.length - 1);
  }, [formData.options, newOptionName, onChange]);

  const handleAddValue = useCallback(() => {
    if (currentOptionIndex === null || !newOptionValue) return;

    const updatedOptions = [...formData.options];
    if (!updatedOptions[currentOptionIndex].values.includes(newOptionValue)) {
      updatedOptions[currentOptionIndex].values.push(newOptionValue);
      onChange({ options: updatedOptions });
    }
    setNewOptionValue('');
  }, [currentOptionIndex, formData.options, newOptionValue, onChange]);

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

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Product Variants
        </Text>

        <BlockStack gap="500">
          <InlineStack gap="300">
            <div style={{ flexGrow: 1 }}>
              <Select
                label="Option Name"
                options={optionNameOptions}
                value={newOptionName}
                onChange={setNewOptionName}
                placeholder={optionsLoading ? "Loading options..." : "Select or enter an option name"}
                helpText="Select an existing option name or enter a new one"
              />
            </div>
            <div style={{ marginTop: 'auto' }}>
              <Button onClick={handleAddOption}>Add Option</Button>
            </div>
          </InlineStack>

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
                                value={newOptionValue}
                                onChange={setNewOptionValue}
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
                                    selected={newOptionValue === value}
                                  >
                                    {value}
                                  </Listbox.Option>
                                )) || null}
                            </Listbox>
                          </Combobox>
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                          <Button onClick={handleAddValue}>Add Value</Button>
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

          <BlockStack gap="300">
            {formData.options.length === 0 ? (
              <Banner tone="info">
                <BlockStack gap="200">
                  <Text as="p">
                    Add options like Size, Color, or Material to create product variants.
                    Each option can have multiple values (e.g., Size: S, M, L).
                  </Text>
                  <Text as="p">
                    If your product doesn't need variants, you can skip this step.
                  </Text>
                </BlockStack>
              </Banner>
            ) : null}

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
      </BlockStack>
    </Card>
  );
} 