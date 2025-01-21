import { useCallback, useState } from 'react';
import {
  Card,
  TextField,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  Tag,
  Button,
  Combobox,
  Listbox,
} from '@shopify/polaris';
import { useQuery } from '@tanstack/react-query';

interface StepTagsProps {
  formData: {
    tags: string[];
  };
  onChange: (updates: Partial<StepTagsProps['formData']>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface TagsResponse {
  tags: string[];
}

export default function StepTags({ formData, onChange, onNext, onBack }: StepTagsProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(formData.tags || []);

  // Fetch existing tags from Shopify
  const { data: existingTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async (): Promise<string[]> => {
      const response = await fetch('/api/shopify/tags');
      if (!response.ok) {
        throw new Error('Failed to load tags');
      }
      const data = await response.json() as TagsResponse;
      return data.tags;
    }
  });

  const updateTags = useCallback((newTags: string[]) => {
    setSelectedTags(newTags);
    onChange({ tags: newTags });
  }, [onChange]);

  const handleTagRemove = useCallback((tag: string) => {
    const newTags = selectedTags.filter((t) => t !== tag);
    updateTags(newTags);
  }, [selectedTags, updateTags]);

  const handleAddTag = useCallback(() => {
    if (!inputValue || selectedTags.includes(inputValue)) return;

    const newTags = [...selectedTags, inputValue];
    updateTags(newTags);
    setInputValue('');
  }, [inputValue, selectedTags, updateTags]);

  const filteredTags = existingTags.filter((tag: string) => 
    tag.toLowerCase().includes(inputValue.toLowerCase()) &&
    !selectedTags.includes(tag)
  );

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Product Tags
        </Text>

        <BlockStack gap="300">
          <Combobox
            activator={
              <Combobox.TextField
                label="Add tags"
                value={inputValue}
                onChange={(value) => {
                  setInputValue(value);
                  if (value.endsWith('\n')) {
                    handleAddTag();
                  }
                }}
                placeholder="Search or enter new tag"
                autoComplete="off"
              />
            }
          >
            {filteredTags.length > 0 ? (
              <Listbox onSelect={(value: string) => {
                updateTags([...selectedTags, value]);
                setInputValue('');
              }}>
                {filteredTags.map((tag: string) => (
                  <Listbox.Option key={tag} value={tag}>
                    {tag}
                  </Listbox.Option>
                ))}
              </Listbox>
            ) : null}
          </Combobox>

          <InlineStack gap="300">
            <Button onClick={handleAddTag}>Add Tag</Button>
          </InlineStack>

          {selectedTags.length > 0 && (
            <InlineStack gap="200" wrap>
              {selectedTags.map((tag) => (
                <Tag key={tag} onRemove={() => handleTagRemove(tag)}>
                  {tag}
                </Tag>
              ))}
            </InlineStack>
          )}

          {selectedTags.length === 0 && (
            <Banner tone="info">
              <BlockStack gap="200">
                <Text as="p">
                  Add tags to help customers find your product. Tags can be used for:
                </Text>
                <ul style={{ marginLeft: '20px' }}>
                  <li>Product categorization</li>
                  <li>Search optimization</li>
                  <li>Collection automation</li>
                  <li>Product filtering</li>
                </ul>
              </BlockStack>
            </Banner>
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
  );
} 