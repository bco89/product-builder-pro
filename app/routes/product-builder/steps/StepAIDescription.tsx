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

// EventSource type declaration
declare global {
  interface Window {
    EventSource: typeof EventSource;
  }
}


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
  const [currentStage, setCurrentStage] = useState(1);
  const [stageProgress, setStageProgress] = useState(0);
  const [stageMessage, setStageMessage] = useState('');
  
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
    setCurrentStage(1);
    setStageProgress(0);
    setStageMessage('Analyzing product details');

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

      // Create EventSource for SSE
      const eventSource = new EventSource(`/api/shopify/generate-description-stream?data=${encodeURIComponent(JSON.stringify(payload))}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.error) {
          setError({
            message: data.message || 'Failed to generate description',
            details: data.details,
            code: data.code
          });
          eventSource.close();
          setIsGenerating(false);
          return;
        }
        
        if (data.completed) {
          onChange({
            description: data.result.description || '',
            seoTitle: data.result.seoTitle || '',
            seoDescription: data.result.seoDescription || '',
          });
          setHasGeneratedContent(true);
          eventSource.close();
          setIsGenerating(false);
          return;
        }
        
        // Update progress
        if (data.stage) {
          setCurrentStage(data.stage);
          setStageProgress(data.progress);
          setStageMessage(data.message);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setError({
          message: 'Connection lost. Please try again.',
          details: 'The connection to the server was interrupted',
          code: 'CONNECTION_ERROR'
        });
        eventSource.close();
        setIsGenerating(false);
      };

      // Error handling is done in the EventSource handlers above
    } catch (err) {
      setError({
        message: 'An unexpected error occurred. Please try again.',
        details: err instanceof Error ? err.message : 'Unknown error occurred',
        code: 'UNKNOWN_ERROR'
      });
      setIsGenerating(false);
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
              variant="stage-based"
              currentStage={currentStage}
              stageProgress={stageProgress}
              stageMessage={stageMessage}
              showSkeleton={true}
              title="Generating AI Description"
              estimatedTime={60}
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