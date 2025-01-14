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
} from '@shopify/polaris';

interface Option {
  name: string;
  values: string[];
}

interface StepVariantsProps {
  formData: {
    options: Option[];
    variants: any[]; // Will be generated based on options
  };
  onChange: (updates: Partial<StepVariantsProps['formData']>) => void;
}

export default function StepVariants({ formData, onChange }: StepVariantsProps) {
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [currentOptionIndex, setCurrentOptionIndex] = useState<number | null>(null);

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

  return (
    <Card>
      <BlockStack gap="4">
        <Text variant="headingMd" as="h2">
          Product Variants
        </Text>

        <BlockStack gap="4">
          <InlineStack gap="2">
            <div style={{ flexGrow: 1 }}>
              <TextField
                label="Option Name"
                value={newOptionName}
                onChange={setNewOptionName}
                placeholder="e.g., Size, Color, Material"
                autoComplete="off"
              />
            </div>
            <div style={{ marginTop: 'auto' }}>
              <Button onClick={handleAddOption}>Add Option</Button>
            </div>
          </InlineStack>

          {formData.options.length > 0 && (
            <BlockStack gap="4">
              {formData.options.map((option, optionIndex) => (
                <Card key={optionIndex}>
                  <BlockStack gap="4">
                    <InlineStack align="space-between">
                      <Text variant="headingSm" as="h3">
                        {option.name}
                      </Text>
                      <Button
                        plain
                        destructive
                        onClick={() => handleRemoveOption(optionIndex)}
                      >
                        Remove
                      </Button>
                    </InlineStack>

                    {currentOptionIndex === optionIndex && (
                      <InlineStack gap="2">
                        <div style={{ flexGrow: 1 }}>
                          <TextField
                            label="Value"
                            labelHidden
                            value={newOptionValue}
                            onChange={setNewOptionValue}
                            placeholder={`Enter ${option.name.toLowerCase()} value`}
                            autoComplete="off"
                          />
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                          <Button onClick={handleAddValue}>Add Value</Button>
                        </div>
                      </InlineStack>
                    )}

                    <InlineStack gap="2" wrap>
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
                        plain
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

          {formData.options.length === 0 && (
            <Banner status="info">
              <Text as="p">
                Add options like Size, Color, or Material to create product variants.
                Each option can have multiple values (e.g., Size: S, M, L).
              </Text>
            </Banner>
          )}
        </BlockStack>
      </BlockStack>
    </Card>
  );
} 