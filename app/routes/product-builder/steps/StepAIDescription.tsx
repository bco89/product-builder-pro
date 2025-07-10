import { useState, useCallback, useEffect } from 'react';
import {
  Card,
  BlockStack,
  Text,
  Button,
  TextField,
  InlineStack,
  Banner,
  Spinner,
  RadioButton,
  FormLayout,
  Box,
  Badge,
  Divider,
  Icon,
  DropZone,
  Thumbnail,
} from '@shopify/polaris';
import { AlertCircleIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';

// Placeholder WYSIWYG Editor Component
const WYSIWYGEditor = ({ 
  value, 
  onChange, 
  height = 400,
  placeholder = "Enter content here..." 
}: { 
  value: string; 
  onChange: (content: string) => void; 
  height?: number;
  placeholder?: string;
}) => {
  return (
    <Box borderColor="border" borderWidth="025" borderRadius="200" padding="400" background="bg-surface">
      <BlockStack gap="200">
        <Text variant="bodyMd" tone="subdued">
          WYSIWYG Editor Placeholder (TinyMCE will be integrated here)
        </Text>
        <TextField
          label=""
          value={value}
          onChange={onChange}
          multiline={10}
          placeholder={placeholder}
          autoComplete="off"
        />
      </BlockStack>
    </Box>
  );
};

interface StepAIDescriptionProps {
  formData: {
    title: string;
    productType: string;
    category: { name: string } | null;
    vendor: string;
    images: File[];
    description: string;
    seoTitle: string;
    seoDescription: string;
  };
  onChange: (updates: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepAIDescription({ formData, onChange, onNext, onBack }: StepAIDescriptionProps) {
  const [inputMethod, setInputMethod] = useState<'manual' | 'url' | 'context'>('manual');
  const [productUrl, setProductUrl] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [contextImages, setContextImages] = useState<File[]>([]);
  const [keywords, setKeywords] = useState({ primary: '', secondary: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [error, setError] = useState('');

  // Fetch shop settings
  const { data: shopSettings } = useQuery({
    queryKey: ['shopSettings'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/shop-settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    }
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const payload = {
        method: inputMethod,
        productTitle: formData.title,
        productType: formData.productType,
        category: formData.category?.name || '',
        vendor: formData.vendor,
        keywords: [keywords.primary, keywords.secondary].filter(Boolean),
        productUrl: inputMethod === 'url' ? productUrl : undefined,
        additionalContext: inputMethod === 'context' ? additionalContext : undefined,
        hasImages: formData.images.length > 0 || contextImages.length > 0,
        shopSettings,
      };

      const response = await fetch('/api/shopify/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Generation failed');

      const result = await response.json();
      
      onChange({
        description: result.description,
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription,
      });

      setRegenerationCount(prev => prev + 1);
    } catch (err) {
      setError('Failed to generate description. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (regenerationCount < 3) {
      handleGenerate();
    }
  };

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[]) => {
      setContextImages((current) => [...current, ...acceptedFiles]);
    },
    [],
  );

  const contextImagesMarkup = contextImages.length > 0 && (
    <InlineStack gap="400">
      {contextImages.map((file, index) => (
        <InlineStack gap="200" align="center" key={index}>
          <Thumbnail
            size="small"
            alt={file.name}
            source={URL.createObjectURL(file)}
          />
          <Button onClick={() => {
            setContextImages(current => current.filter((_, i) => i !== index));
          }} variant="plain">Remove</Button>
        </InlineStack>
      ))}
    </InlineStack>
  );

  return (
    <>
      <Card>
        <BlockStack gap="200">
          <Text as="span">
            <Text as="span" fontWeight="bold">Product:</Text> {formData.title}
          </Text>
          <InlineStack gap="400" wrap>
            <Text as="span">
              <Text as="span" fontWeight="bold">Type:</Text> {formData.productType}
            </Text>
            <Text as="span">
              <Text as="span" fontWeight="bold">Category:</Text> {formData.category?.name || 'Not specified'}
            </Text>
          </InlineStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="500">
          <Text variant="headingMd" as="h2">AI-Powered Description Generation</Text>

          {/* Input Method Selection */}
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">Choose Input Method</Text>
            <BlockStack gap="200">
              <RadioButton
                label="Write description manually"
                checked={inputMethod === 'manual'}
                onChange={() => setInputMethod('manual')}
              />
              <RadioButton
                label="Generate from product URL"
                checked={inputMethod === 'url'}
                onChange={() => setInputMethod('url')}
              />
              <RadioButton
                label="Generate from text/images"
                checked={inputMethod === 'context'}
                onChange={() => setInputMethod('context')}
              />
            </BlockStack>
          </BlockStack>

          <Divider />

          {/* SEO Keywords */}
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">SEO Keywords</Text>
            <FormLayout>
              <FormLayout.Group>
                <TextField
                  label="Primary Keyword"
                  value={keywords.primary}
                  onChange={(value) => setKeywords(prev => ({ ...prev, primary: value }))}
                  helpText="Most important keyword for SEO"
                  autoComplete="off"
                />
                <TextField
                  label="Secondary Keyword"
                  value={keywords.secondary}
                  onChange={(value) => setKeywords(prev => ({ ...prev, secondary: value }))}
                  helpText="Supporting keyword (optional)"
                  autoComplete="off"
                />
              </FormLayout.Group>
            </FormLayout>
          </BlockStack>

          {/* Conditional Input Fields */}
          {inputMethod === 'url' && (
            <TextField
              label="Product URL"
              value={productUrl}
              onChange={setProductUrl}
              placeholder="https://example.com/product-page"
              helpText="Enter the URL of the product from manufacturer or supplier"
              autoComplete="off"
            />
          )}

          {inputMethod === 'context' && (
            <BlockStack gap="400">
              <TextField
                label="Additional Context"
                value={additionalContext}
                onChange={setAdditionalContext}
                multiline={4}
                helpText="Add details like size charts, special features, or usage instructions"
                autoComplete="off"
              />
              
              <Box>
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  Reference Images
                </Text>
                <Box paddingBlockStart="200">
                  <DropZone
                    accept="image/*"
                    type="image"
                    onDrop={handleDropZoneDrop}
                  >
                    {contextImagesMarkup || <DropZone.FileUpload />}
                  </DropZone>
                </Box>
              </Box>
            </BlockStack>
          )}

          {/* Generate Button */}
          {inputMethod !== 'manual' && (
            <Box>
              <Button
                variant="primary"
                onClick={handleGenerate}
                loading={isGenerating}
                disabled={
                  isGenerating ||
                  (inputMethod === 'url' && !productUrl) ||
                  !keywords.primary
                }
              >
                Generate Description
              </Button>
              
              {regenerationCount > 0 && regenerationCount < 3 && (
                <Box paddingBlockStart="200">
                  <InlineStack gap="200" align="center">
                    <Button
                      onClick={handleRegenerate}
                      disabled={isGenerating}
                    >
                      Regenerate ({3 - regenerationCount} left)
                    </Button>
                    <Badge tone="info">
                      Generation {regenerationCount} of 3
                    </Badge>
                  </InlineStack>
                </Box>
              )}
            </Box>
          )}

          {error && (
            <Banner tone="critical">
              <InlineStack gap="200" align="center">
                <Icon source={AlertCircleIcon} />
                <Text as="p">{error}</Text>
              </InlineStack>
            </Banner>
          )}

          <Divider />

          {/* Description Editor */}
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">Product Description</Text>
            <WYSIWYGEditor
              value={formData.description}
              onChange={(content) => onChange({ description: content })}
              height={400}
              placeholder="Enter your compelling product description here..."
            />
          </BlockStack>

          {/* SEO Title Editor */}
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">SEO Title</Text>
            <Text variant="bodySm" as="p" tone="subdued">
              Maximum 60 characters for optimal search engine display
            </Text>
            <WYSIWYGEditor
              value={formData.seoTitle}
              onChange={(content) => onChange({ seoTitle: content })}
              height={100}
              placeholder="Enter SEO optimized title..."
            />
            <Text variant="bodySm" as="p" tone={formData.seoTitle.length > 60 ? 'critical' : 'subdued'}>
              {formData.seoTitle.length}/60 characters
            </Text>
          </BlockStack>

          {/* SEO Description Editor */}
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">SEO Meta Description</Text>
            <Text variant="bodySm" as="p" tone="subdued">
              Maximum 155 characters for optimal search engine display
            </Text>
            <WYSIWYGEditor
              value={formData.seoDescription}
              onChange={(content) => onChange({ seoDescription: content })}
              height={120}
              placeholder="Enter SEO meta description..."
            />
            <Text variant="bodySm" as="p" tone={formData.seoDescription.length > 155 ? 'critical' : 'subdued'}>
              {formData.seoDescription.length}/155 characters
            </Text>
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