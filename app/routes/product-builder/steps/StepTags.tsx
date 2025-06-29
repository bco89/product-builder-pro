import { useCallback, useState, useEffect } from 'react';
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
    vendor: string;
    productType: string;
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

export default function StepTags({ formData, onChange, onNext, onBack, productId }: StepTagsProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (formData.tags?.length > 0) return formData.tags;
    
    const currentYear = new Date().getFullYear().toString();
    const defaultTags = [currentYear];
    if (formData.vendor && formData.vendor !== 'Default Vendor') {
      defaultTags.push(formData.vendor);
    }
    return defaultTags;
  });

  // Ensure default tags are passed to parent component immediately
  useEffect(() => {
    // Only update if the parent doesn't already have these tags and we have default tags
    if ((!formData.tags || formData.tags.length === 0) && selectedTags.length > 0) {
      onChange({ tags: selectedTags });
    }
  }, [formData.tags, selectedTags, onChange]);

  // Fetch existing tags from products of the selected type
  const { data: existingTags = [], isLoading } = useQuery({
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

  const updateTags = useCallback((newTags: string[]) => {
    setSelectedTags(newTags);
    onChange({ tags: newTags });
  }, [onChange]);

  const handleTagRemove = useCallback((tag: string) => {
    const newTags = selectedTags.filter((t) => t !== tag);
    updateTags(newTags);
  }, [selectedTags, updateTags]);

  const handleTagToggle = useCallback((tag: string) => {
    if (selectedTags.includes(tag)) {
      handleTagRemove(tag);
    } else {
      updateTags([...selectedTags, tag]);
    }
  }, [selectedTags, updateTags, handleTagRemove]);

  const filteredTags = existingTags.filter((tag: string) => 
    tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">
          Product Tags
        </Text>

        <BlockStack gap="300">
          <TextField
            label="Filter existing tags"
            value={inputValue}
            onChange={setInputValue}
            autoComplete="off"
            placeholder={isLoading ? "Loading tags..." : "Type to filter tags"}
          />

          <BlockStack gap="200">
            {isLoading ? (
              <Text as="p">Loading tags...</Text>
            ) : filteredTags.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {filteredTags.map((tag) => {
                  const isDefaultTag = tag === formData.vendor || tag === new Date().getFullYear().toString();
                  const isSelected = selectedTags.includes(tag);
                  
                  return (
                    <div key={tag} style={{ padding: '8px 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: isDefaultTag ? 'not-allowed' : 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !isDefaultTag && handleTagToggle(tag)}
                          disabled={isDefaultTag}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ opacity: isDefaultTag ? 0.7 : 1 }}>
                          {tag} {isDefaultTag && '(Default)'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : inputValue ? (
              <Text as="p">No matching tags found</Text>
            ) : null}
          </BlockStack>

          {selectedTags.length > 0 && (
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Selected Tags:</Text>
              <InlineStack gap="200" wrap>
                {selectedTags.map((tag) => (
                  <Tag 
                    key={tag} 
                    onRemove={
                      // Prevent removing default tags
                      tag !== formData.vendor && tag !== new Date().getFullYear().toString() 
                        ? () => handleTagRemove(tag) 
                        : undefined
                    }
                  >
                    {tag}
                  </Tag>
                ))}
              </InlineStack>
            </BlockStack>
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