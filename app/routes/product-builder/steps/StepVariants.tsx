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
  onNext: () => void;
  onBack: () => void;
}

export default function StepVariants({ formData, onChange, onNext, onBack }: StepVariantsProps) {
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

  const handleNoVariants = useCallback(() => {
    onChange({ options: [] });
    onNext();
  }, [onChange, onNext]);

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Product Variants
        </Text>

        <BlockStack gap="500">
          <InlineStack gap="300">
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
                <Button primary onClick={onNext}>
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