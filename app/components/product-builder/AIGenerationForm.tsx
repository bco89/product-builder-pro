import { useState } from 'react';
import {
  BlockStack,
  Text,
  Button,
  TextField,
  InlineStack,
  Banner,
  ButtonGroup,
  FormLayout,
  Box,
  Divider,
  Icon,
  InlineError,
  Tooltip,
} from '@shopify/polaris';
import { EditIcon, LinkIcon, ImageIcon, InfoIcon } from '@shopify/polaris-icons';

// URL validation helper
const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

interface AIGenerationFormProps {
  onGenerate: (params: {
    method: 'manual' | 'url' | 'context';
    productUrl?: string;
    additionalContext?: string;
    keywords: { primary: string; secondary: string };
  }) => void;
  isGenerating: boolean;
  showManualOption?: boolean;
  onManualSelect?: () => void;
  defaultMethod?: 'manual' | 'url' | 'context';
  hideKeywords?: boolean;
}

export default function AIGenerationForm({
  onGenerate,
  isGenerating,
  showManualOption = true,
  onManualSelect,
  defaultMethod = 'context',
  hideKeywords = false,
}: AIGenerationFormProps) {
  const [inputMethod, setInputMethod] = useState<'manual' | 'url' | 'context'>(defaultMethod);
  const [productUrl, setProductUrl] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [keywords, setKeywords] = useState({ primary: '', secondary: '' });

  const handleGenerate = () => {
    onGenerate({
      method: inputMethod,
      productUrl: inputMethod === 'url' ? productUrl : undefined,
      additionalContext: inputMethod === 'context' ? additionalContext : undefined,
      keywords,
    });
  };

  const handleMethodChange = (method: 'manual' | 'url' | 'context') => {
    setInputMethod(method);
    if (method === 'manual' && onManualSelect) {
      onManualSelect();
    }
  };

  return (
    <BlockStack gap="500">
      {/* Input Method Selection */}
      <BlockStack gap="400">
        <Text variant="headingSm" as="h3">Choose Input Method</Text>
        <ButtonGroup variant="segmented">
          <Button
            pressed={inputMethod === 'context'}
            onClick={() => handleMethodChange('context')}
            icon={ImageIcon}
          >
            Generate from text
          </Button>
          <Button
            pressed={inputMethod === 'url'}
            onClick={() => handleMethodChange('url')}
            icon={LinkIcon}
          >
            Generate from URL
          </Button>
          {showManualOption && (
            <Button
              pressed={inputMethod === 'manual'}
              onClick={() => handleMethodChange('manual')}
              icon={EditIcon}
            >
              Write manually
            </Button>
          )}
        </ButtonGroup>
      </BlockStack>

      {inputMethod === 'manual' ? (
        <>
          <Divider />
          <Banner tone="info">
            <Text as="p">You've chosen to write the description manually. Use the editors below to craft your product description and SEO content.</Text>
          </Banner>
        </>
      ) : (
        <>
          {/* SEO Keywords */}
          {!hideKeywords && (
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
                label={
                  <InlineStack gap="100" align="start">
                    <Text as="span">Enter your existing product description and additional details</Text>
                    <Tooltip content="Paste your existing description plus any technical specs, materials, sizing information, or special features. The AI will reorganize and enhance this content to create a compelling, SEO-optimized product description.">
                      <Icon source={InfoIcon} tone="subdued" />
                    </Tooltip>
                  </InlineStack>
                }
                value={additionalContext}
                onChange={setAdditionalContext}
                multiline={4}
                helpText="Include unique features, materials, benefits, or anything that should be highlighted in the description"
                autoComplete="off"
              />
            </BlockStack>
          )}

          {/* Generate Button */}
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
        </>
      )}
    </BlockStack>
  );
}