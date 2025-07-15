import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Card,
  BlockStack,
  Text,
  Button,
  TextField,
  InlineStack,
  Banner,
  Spinner,
  ButtonGroup,
  FormLayout,
  Box,
  Badge,
  Divider,
  Icon,
  DropZone,
  Thumbnail,
  InlineError,
  RadioButton,
  Toast,
} from '@shopify/polaris';
import { AlertCircleIcon, EditIcon, LinkIcon, ImageIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import { Editor } from '@tinymce/tinymce-react';

// URL validation helper
const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

// Strip HTML tags for character counting
const stripHtml = (html: string): string => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// TinyMCE Editor Component
const WYSIWYGEditor = ({ 
  value, 
  onChange, 
  height = 400,
  placeholder = "Enter content here...",
  id,
  variant = 'full',
  apiKey
}: { 
  value: string; 
  onChange: (content: string) => void; 
  height?: number;
  placeholder?: string;
  id: string;
  variant?: 'full' | 'simple';
  apiKey?: string;
}) => {
  const editorRef = useRef<any>(null);

  // Simple toolbar for SEO fields
  const simpleToolbar = 'bold italic | link | removeformat';
  
  // Simplified toolbar for product description (matching Shopify native editor)
  const fullToolbar = 'bold italic underline | alignleft aligncenter alignright | bullist numlist | link | removeformat';

  const toolbar = variant === 'simple' ? simpleToolbar : fullToolbar;
  
  // Configure plugins based on variant
  const plugins = variant === 'simple' 
    ? ['link', 'paste', 'wordcount']
    : ['link', 'lists', 'paste', 'wordcount'];

  return (
    <Box borderColor="border" borderWidth="025" borderRadius="200">
      <Editor
        id={id}
        apiKey={apiKey}
        onInit={(_evt, editor) => editorRef.current = editor}
        value={value}
        init={{
          height: height,
          menubar: false,
          plugins: plugins,
          toolbar: toolbar,
          placeholder: placeholder,
          content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; }',
          paste_as_text: variant === 'simple',
          branding: false,
          resize: false,
          statusbar: true,
          elementpath: false,
          wordcount: {
            countHTML: false,
            countCharacters: true,
            showWordCount: false,
            showCharCount: true,
          },
          // Restrict formatting for SEO fields
          ...(variant === 'simple' && {
            formats: {
              bold: { inline: 'strong' },
              italic: { inline: 'em' },
            },
            valid_elements: 'strong,em,a[href|target|title]',
            extended_valid_elements: '',
          }),
        }}
        onEditorChange={(content) => {
          onChange(content);
        }}
      />
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
  tinymceApiKey?: string;
}

export default function StepAIDescription({ formData, onChange, onNext, onBack, tinymceApiKey }: StepAIDescriptionProps) {
  const [inputMethod, setInputMethod] = useState<'manual' | 'url' | 'context'>('context');
  const [productUrl, setProductUrl] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [contextImages, setContextImages] = useState<File[]>([]);
  const [keywords, setKeywords] = useState({ primary: '', secondary: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string; code?: string } | null>(null);
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState<string>('');
  const [showKeywordToast, setShowKeywordToast] = useState(false);
  
  // Check if any content exists
  const hasExistingContent = formData.description || formData.seoTitle || formData.seoDescription;

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
    // Show toast if no keywords provided
    if (!keywords.primary && !keywords.secondary) {
      setShowKeywordToast(true);
    }

    setIsGenerating(true);
    setError(null);
    setScrapingProgress('');

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
        shopSettings: {
          ...shopSettings,
          businessType: shopSettings?.businessType || 'retailer'
        },
      };

      // Show progress for URL scraping
      if (inputMethod === 'url') {
        setScrapingProgress('Analyzing URL...');
      }

      const response = await fetch('/api/shopify/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error types
        const errorData = result as { error: string; details?: string; code?: string };
        setError({
          message: errorData.error || 'Failed to generate description',
          details: errorData.details,
          code: errorData.code
        });
        return;
      }
      
      onChange({
        description: result.description,
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription,
      });

      setHasGeneratedContent(true);
      setScrapingProgress('');
    } catch (err) {
      setError({
        message: 'Network error. Please check your connection and try again.',
        details: err instanceof Error ? err.message : 'Unknown error occurred'
      });
    } finally {
      setIsGenerating(false);
      setScrapingProgress('');
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
            <ButtonGroup variant="segmented">
              <Button
                pressed={inputMethod === 'context'}
                onClick={() => setInputMethod('context')}
                icon={ImageIcon}
              >
                Generate from text/images
              </Button>
              <Button
                pressed={inputMethod === 'url'}
                onClick={() => setInputMethod('url')}
                icon={LinkIcon}
              >
                Generate from URL
              </Button>
              <Button
                pressed={inputMethod === 'manual'}
                onClick={() => setInputMethod('manual')}
                icon={EditIcon}
              >
                Write manually
              </Button>
            </ButtonGroup>
          </BlockStack>

          {/* SEO Keywords */}
          {inputMethod !== 'manual' && (
            <BlockStack gap="400">
              <Divider />
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
          )}

          {/* Description Perspective from Settings */}
          {inputMethod !== 'manual' && (
            <BlockStack gap="400">
              <Divider />
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">Description Perspective</Text>
                {shopSettings?.businessType ? (
                  <InlineStack gap="200" align="start">
                    <Badge tone="info">
                      Description Perspective: {shopSettings.businessType === 'manufacturer' ? 'Product Creator' : 'Retailer'}
                    </Badge>
                  </InlineStack>
                ) : (
                  <Banner tone="warning">
                    <Text as="p">
                      No description perspective selected. Please go to AI Description Settings to choose whether you create products or sell products from other brands. This will improve the quality of generated descriptions.
                    </Text>
                  </Banner>
                )}
              </BlockStack>
            </BlockStack>
          )}

          {/* Conditional Input Fields */}
          {inputMethod === 'url' && (
            <BlockStack gap="400">
              <Divider />
              <TextField
                label="Product URL"
                value={productUrl}
                onChange={setProductUrl}
                placeholder="https://example.com/product-page"
                helpText="Enter the URL of the product from manufacturer or supplier"
                autoComplete="off"
              />
              {productUrl && !isValidUrl(productUrl) && (
                <InlineError 
                  message="Please enter a valid URL starting with http:// or https://" 
                  fieldID="productUrl" 
                />
              )}
            </BlockStack>
          )}

          {inputMethod === 'context' && (
            <BlockStack gap="400">
              <Divider />
              <TextField
                label="What makes this product special?"
                value={additionalContext}
                onChange={setAdditionalContext}
                multiline={4}
                helpText="Include unique features, materials, benefits, or anything that should be highlighted in the description"
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
            <BlockStack gap="400">
              <Divider />
              <Box>
                <Button
                variant="primary"
                onClick={handleGenerate}
                loading={isGenerating}
                disabled={
                  isGenerating ||
                  (inputMethod === 'url' && (!productUrl || !isValidUrl(productUrl)))
                }
              >
                Generate Description
              </Button>
              </Box>
            </BlockStack>
          )}

          {/* Progress indicator */}
          {scrapingProgress && (
            <Banner tone="info">
              <InlineStack gap="200" align="center">
                <Spinner accessibilityLabel="Loading" size="small" />
                <Text as="p">{scrapingProgress}</Text>
              </InlineStack>
            </Banner>
          )}

          {/* Error display */}
          {error && (
            <Banner tone="critical">
              <BlockStack gap="200">
                <InlineStack gap="200" align="center">
                  <Icon source={AlertCircleIcon} />
                  <Text as="p" fontWeight="semibold">{error.message}</Text>
                </InlineStack>
                {error.details && (
                  <Text as="p" variant="bodySm">{error.details}</Text>
                )}
                {error.code === 'INVALID_URL' && (
                  <Text as="p" variant="bodySm">
                    Tip: Make sure the URL starts with http:// or https:// and points to a product page.
                  </Text>
                )}
                {error.code === 'TIMEOUT' && (
                  <Text as="p" variant="bodySm">
                    Tip: Some websites are slow to load. Try waiting a moment and generating again.
                  </Text>
                )}
              </BlockStack>
            </Banner>
          )}

          {/* Show editors only after method selection or generation */}
          {inputMethod === 'manual' && (
            <>
              <Divider />
              <Banner tone="info">
                <Text as="p">You've chosen to write the description manually. Use the editors below to craft your product description and SEO content.</Text>
              </Banner>
            </>
          )}
          
          {(inputMethod === 'manual' || hasGeneratedContent || hasExistingContent) && (
            <>
              <Divider />
              
              {/* Description Editor */}
              <BlockStack gap="400">
                <Text variant="headingSm" as="h3">Product Description</Text>
                <WYSIWYGEditor
                  id="product-description"
                  value={formData.description}
                  onChange={(content) => onChange({ description: content })}
                  height={400}
                  placeholder="Enter your compelling product description here..."
                  variant="full"
                  apiKey={tinymceApiKey}
                />
              </BlockStack>

              {/* SEO Title Editor */}
              <BlockStack gap="400">
                <TextField
                  label="SEO Title"
                  value={formData.seoTitle}
                  onChange={(value) => onChange({ seoTitle: value })}
                  placeholder="Enter SEO optimized title..."
                  helpText="Maximum 60 characters for optimal search engine display"
                  autoComplete="off"
                  maxLength={60}
                />
                <Text variant="bodySm" as="p" tone={formData.seoTitle.length > 60 ? 'critical' : 'subdued'}>
                  {formData.seoTitle.length}/60 characters
                </Text>
              </BlockStack>

              {/* SEO Description Editor */}
              <BlockStack gap="400">
                <TextField
                  label="SEO Meta Description"
                  value={formData.seoDescription}
                  onChange={(value) => onChange({ seoDescription: value })}
                  placeholder="Enter SEO meta description..."
                  helpText="Maximum 155 characters for optimal search engine display"
                  autoComplete="off"
                  maxLength={155}
                  multiline={2}
                />
                <Text variant="bodySm" as="p" tone={formData.seoDescription.length > 155 ? 'critical' : 'subdued'}>
                  {formData.seoDescription.length}/155 characters
                </Text>
              </BlockStack>
            </>
          )}

          <InlineStack gap="300" align="end">
            <Button onClick={onBack}>Back</Button>
            <Button
              variant="primary"
              onClick={onNext}
              disabled={!formData.description}
            >
              Next
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>
      
      {showKeywordToast && (
        <Toast
          content="Consider adding a primary keyword to help improve the AI-generated description quality. You can continue without one if preferred."
          onDismiss={() => setShowKeywordToast(false)}
          duration={5000}
        />
      )}
    </>
  );
}