import { useState } from 'react';
import {
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Banner,
  Box,
  Badge,
  Divider,
  Icon,
  Toast,
  Spinner,
  Tooltip,
} from '@shopify/polaris';
import { AlertCircleIcon, InfoIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import LoadingProgress from '../../../components/LoadingProgress';
import AIGenerationForm from '../../../components/product-builder/AIGenerationForm';
import DescriptionEditor from '../../../components/product-builder/DescriptionEditor';


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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string; code?: string } | null>(null);
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false);
  const [showKeywordToast, setShowKeywordToast] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isManualMode, setIsManualMode] = useState(false);
  
  // Check if any content exists
  const hasExistingContent = formData.description || formData.seoTitle || formData.seoDescription;

  // Fetch shop settings
  const { data: shopSettings, isLoading: isLoadingSettings, error: settingsError } = useQuery({
    queryKey: ['shopSettings'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/shop-settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleGenerate = async (params: {
    method: 'manual' | 'url' | 'context';
    productUrl?: string;
    additionalContext?: string;
    keywords: { primary: string; secondary: string };
  }) => {
    // Show toast if no keywords provided
    if (!params.keywords.primary && !params.keywords.secondary) {
      setShowKeywordToast(true);
    }

    setIsGenerating(true);
    setError(null);

    // Create AbortController for request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

    try {
      const payload = {
        method: params.method,
        productTitle: formData.title,
        productType: formData.productType,
        category: formData.category?.name || '',
        vendor: formData.vendor,
        keywords: [params.keywords.primary, params.keywords.secondary].filter(Boolean),
        productUrl: params.productUrl,
        additionalContext: params.additionalContext,
        hasImages: formData.images.length > 0,
        shopSettings: {
          businessType: 'retailer',
          storeName: '',
          storeLocation: '',
          uniqueSellingPoints: '',
          coreValues: '',
          brandPersonality: '',
          targetCustomerOverride: '',
          additionalCustomerInsights: '',
          excludedCustomerSegments: '',
          ...shopSettings
        },
      };

      // Show progress for URL scraping
      if (params.method === 'url') {
        setGenerationProgress(10);
      } else {
        setGenerationProgress(20);
      }

      const response = await fetch('/api/shopify/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // Clear timeout since request completed
      clearTimeout(timeoutId);
      
      // Update progress after fetch
      setGenerationProgress(50);

      // Validate response before parsing JSON
      if (!response.ok) {
        let errorData;
        try {
          // Check if response has content and is JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const text = await response.text();
            if (text.trim()) {
              errorData = JSON.parse(text);
            } else {
              throw new Error('Empty response from server');
            }
          } else {
            // Non-JSON response, likely an error page
            const text = await response.text();
            throw new Error(`Server returned ${response.status}: ${text.substring(0, 200)}`);
          }
        } catch (parseError) {
          setError({
            message: `Server error (${response.status}). Please try again.`,
            details: parseError instanceof Error ? parseError.message : 'Unable to parse server response',
            code: 'PARSE_ERROR'
          });
          return;
        }

        // Handle specific error types from properly parsed JSON
        setError({
          message: errorData.error || 'Failed to generate description',
          details: errorData.details,
          code: errorData.code
        });
        return;
      }

      // Parse successful response
      let result;
      try {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server did not return JSON data');
        }

        const text = await response.text();
        if (!text.trim()) {
          throw new Error('Server returned empty response');
        }

        result = JSON.parse(text);
      } catch (parseError) {
        setError({
          message: 'Invalid response from server. Please try again.',
          details: parseError instanceof Error ? parseError.message : 'Unable to parse server response',
          code: 'PARSE_ERROR'
        });
        return;
      }

      // Validate result structure
      if (!result || typeof result !== 'object') {
        setError({
          message: 'Invalid data received from server. Please try again.',
          details: 'Server response was not in the expected format',
          code: 'INVALID_RESPONSE'
        });
        return;
      }
      
      // Update progress before setting results
      setGenerationProgress(90);
      
      onChange({
        description: result.description || '',
        seoTitle: result.seoTitle || '',
        seoDescription: result.seoDescription || '',
      });

      setHasGeneratedContent(true);
      setGenerationProgress(100);
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error && err.name === 'AbortError') {
        setError({
          message: 'Request timed out. Please try again.',
          details: 'The request took too long to complete',
          code: 'TIMEOUT'
        });
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        setError({
          message: 'Network error. Please check your connection and try again.',
          details: 'Unable to connect to the server',
          code: 'NETWORK_ERROR'
        });
      } else {
        setError({
          message: 'An unexpected error occurred. Please try again.',
          details: err instanceof Error ? err.message : 'Unknown error occurred',
          code: 'UNKNOWN_ERROR'
        });
      }
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

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
          <InlineStack gap="400" align="space-between">
            <Text variant="headingMd" as="h2">AI-Powered Description Generation</Text>
            {!isManualMode && (
              <InlineStack gap="200" align="center">
                {isLoadingSettings ? (
                  <>
                    <Spinner accessibilityLabel="Loading settings" size="small" />
                    <Text as="p" variant="bodySm" tone="subdued">Loading...</Text>
                  </>
                ) : settingsError ? (
                  <Badge tone="warning">Default perspective</Badge>
                ) : shopSettings?.businessType ? (
                  <Badge tone="success">
                    {shopSettings.businessType === 'manufacturer' ? 'Product Creator' : 'Retailer'}
                  </Badge>
                ) : (
                  <>
                    <Text as="span" variant="bodySm" tone="subdued">No perspective</Text>
                    <Tooltip content="Please go to AI Description Settings to choose whether you create products or sell products from other brands. This will improve the quality of generated descriptions.">
                      <Icon source={InfoIcon} tone="subdued" />
                    </Tooltip>
                  </>
                )}
              </InlineStack>
            )}
          </InlineStack>

          {/* Show loading state when generating, otherwise show form */}
          {isGenerating ? (
            <LoadingProgress
              variant="ai-generation"
              progress={generationProgress}
              messages={[
                "🔍 Analyzing your product information...",
                "🎨 Creating engaging content...",
                "✍️ Writing compelling copy...",
                "🎯 Optimizing for search engines...",
                "✅ Adding final touches..."
              ]}
              showSkeleton={true}
              title="Generating AI Description"
              estimatedTime={20}
            />
          ) : (!hasGeneratedContent && !isManualMode) ? (
            <AIGenerationForm
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onManualSelect={() => {
                setIsManualMode(true);
                setHasGeneratedContent(false);
              }}
            />
          ) : isManualMode ? (
            <>
              <Divider />
              <DescriptionEditor
                description={formData.description}
                seoTitle={formData.seoTitle}
                seoDescription={formData.seoDescription}
                onChange={onChange}
                tinymceApiKey={tinymceApiKey}
              />
            </>
          ) : (
            <>
              <Divider />
              <DescriptionEditor
                description={formData.description}
                seoTitle={formData.seoTitle}
                seoDescription={formData.seoDescription}
                onChange={onChange}
                tinymceApiKey={tinymceApiKey}
              />
            </>
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