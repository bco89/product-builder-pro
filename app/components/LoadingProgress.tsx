import { useState, useEffect } from 'react';
import {
  BlockStack,
  Card,
  InlineStack,
  ProgressBar,
  SkeletonBodyText,
  SkeletonDisplayText,
  Spinner,
  Text,
  Icon,
  Box,
  Badge,
} from '@shopify/polaris';
import {
  MagicIcon,
  SearchIcon,
  ChartLineIcon,
  EditIcon,
  CheckIcon,
} from '@shopify/polaris-icons';

interface LoadingProgressProps {
  variant: 'ai-generation' | 'data-fetch' | 'stage-based';
  progress?: number; // 0-100
  messages?: string[]; // Rotating messages
  showSkeleton?: boolean; // Show skeleton preview
  estimatedTime?: number; // In seconds
  currentCount?: number; // For showing discovered items
  title?: string; // Optional title for the loading state
  // Stage-based progress props
  currentStage?: number; // 1-5
  stageProgress?: number; // 0-100 for current stage
  stageMessage?: string; // Custom message for current stage
  // Real-time data display props
  extractedFeatures?: string[]; // Product features found
  partialDescription?: string; // Description being generated
  partialSeoTitle?: string; // SEO title being generated
  partialSeoDescription?: string; // SEO description being generated
  showExtractedData?: boolean; // Show extracted data as it arrives
}

const defaultMessages = {
  'ai-generation': [
    "Analyzing product details...",
    "Crafting the perfect description...",
    "Optimizing for your keywords...",
    "Adding finishing touches...",
    "Almost ready to impress!"
  ],
  'data-fetch': [
    "Searching for the best options...",
    "Analyzing available data...",
    "Organizing results for you...",
    "Preparing your selections..."
  ],
  'stage-based': [
    "Processing your request...",
    "Working on it...",
    "Almost there..."
  ]
};

export default function LoadingProgress({
  variant,
  progress,
  messages,
  showSkeleton = false,
  estimatedTime,
  currentCount,
  title,
  currentStage,
  stageProgress,
  stageMessage,
  extractedFeatures,
  partialDescription,
  partialSeoTitle,
  partialSeoDescription,
  showExtractedData = false
}: LoadingProgressProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const displayMessages = messages || defaultMessages[variant];
  const currentMessage = displayMessages?.[currentMessageIndex] || '';
  
  // Rotate messages every 2 seconds (only for ai-generation variant)
  useEffect(() => {
    if (variant === 'ai-generation' && displayMessages && displayMessages.length > 0) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % displayMessages.length);
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [displayMessages, variant]);
  
  // Simulate progress if not provided (only for non-stage-based variants)
  useEffect(() => {
    if (progress === undefined && variant === 'ai-generation') {
      const interval = setInterval(() => {
        setSimulatedProgress((prev) => {
          if (prev >= 90) return prev; // Stop at 90% until real completion
          return prev + Math.random() * 10;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [progress, variant]);
  
  // Smooth animation for stage-based progress
  useEffect(() => {
    if (variant === 'stage-based' && stageProgress !== undefined) {
      // If actual progress is available, animate towards it
      const targetProgress = stageProgress;
      
      // If we're stuck at the same progress for too long, simulate gradual increase
      if (animatedProgress < targetProgress) {
        // Animate towards actual progress
        const interval = setInterval(() => {
          setAnimatedProgress(prev => {
            const increment = (targetProgress - prev) * 0.1; // Smooth easing
            const newProgress = prev + Math.max(0.5, increment); // Minimum increment
            return newProgress >= targetProgress ? targetProgress : newProgress;
          });
        }, 100);
        
        return () => clearInterval(interval);
      } else if (animatedProgress === targetProgress && targetProgress < 90) {
        // If stuck at same value, slowly increment up to 90% of stage
        const interval = setInterval(() => {
          setAnimatedProgress(prev => {
            if (prev >= 90) return prev;
            return prev + 0.5; // Slow increment
          });
        }, 200);
        
        return () => clearInterval(interval);
      }
    }
  }, [variant, stageProgress, animatedProgress]);
  
  // Reset animated progress when stage changes
  useEffect(() => {
    if (variant === 'stage-based' && currentStage) {
      setAnimatedProgress(0);
    }
  }, [variant, currentStage]);
  
  const displayProgress = variant === 'stage-based' 
    ? animatedProgress 
    : (progress !== undefined ? progress : simulatedProgress);
  
  // Get icon based on progress (not used for stage-based variant)
  const getProgressIcon = () => {
    if (displayProgress < 20) return SearchIcon;
    if (displayProgress < 40) return ChartLineIcon;
    if (displayProgress < 60) return MagicIcon;
    if (displayProgress < 80) return EditIcon;
    return CheckIcon;
  };
  
  if (variant === 'data-fetch') {
    return (
      <InlineStack gap="300" align="center">
        <Spinner accessibilityLabel="Loading data" size="small" />
        <Text as="p" variant="bodyMd" tone="subdued">
          {displayMessages?.[0] || currentMessage}
          {currentCount !== undefined && ` (${currentCount} found)`}
        </Text>
      </InlineStack>
    );
  }
  
  // Stage-based variant for AI generation
  if (variant === 'stage-based') {
    return (
      <Card>
        <BlockStack gap="500">
          {title && (
            <Text variant="headingMd" as="h3">{title}</Text>
          )}
          
          <BlockStack gap="300">
            <ProgressBar 
              progress={displayProgress} 
              size="small" 
              tone="primary"
            />
            
            <InlineStack gap="200" align="center">
              <Text as="p" variant="bodyMd" tone="subdued">
                {stageMessage || `Stage ${currentStage || 1} of 5`}
              </Text>
            </InlineStack>
            
            {estimatedTime && (
              <Text as="p" variant="bodySm" tone="subdued">
                Estimated time remaining: {Math.max(1, Math.ceil(estimatedTime * (1 - displayProgress / 100)))} seconds
              </Text>
            )}
          </BlockStack>
          
          {showExtractedData && extractedFeatures && extractedFeatures.length > 0 && (
            <Box borderColor="border" borderWidth="025" borderRadius="200" padding="400" background="bg-surface-secondary">
              <BlockStack gap="300">
                <Text variant="bodySm" as="p" fontWeight="semibold">
                  Discovered Product Features ({extractedFeatures.length})
                </Text>
                <InlineStack gap="200" wrap>
                  {extractedFeatures.map((feature, index) => (
                    <Badge key={index} tone="info">{feature}</Badge>
                  ))}
                </InlineStack>
              </BlockStack>
            </Box>
          )}
          
          {showSkeleton && (
            <BlockStack gap="400">
              <Box borderColor="border" borderWidth="025" borderRadius="200" padding="400">
                <BlockStack gap="400">
                  {partialDescription ? (
                    <>
                      <Text variant="headingMd" as="h4">Product Description</Text>
                      <Text as="p" variant="bodyMd">{partialDescription}</Text>
                      {!partialDescription.includes('.') && <SkeletonBodyText lines={2} />}
                    </>
                  ) : (
                    <>
                      <SkeletonDisplayText size="medium" />
                      <SkeletonBodyText lines={3} />
                    </>
                  )}
                </BlockStack>
              </Box>
              
              <BlockStack gap="300">
                <Box>
                  <Text variant="bodySm" as="p" fontWeight="semibold">
                    SEO Title Preview
                  </Text>
                  <Box paddingBlockStart="200">
                    {partialSeoTitle ? (
                      <Text as="p" variant="bodyMd">{partialSeoTitle}</Text>
                    ) : (
                      <SkeletonDisplayText size="small" />
                    )}
                  </Box>
                </Box>
                
                <Box>
                  <Text variant="bodySm" as="p" fontWeight="semibold">
                    SEO Description Preview
                  </Text>
                  <Box paddingBlockStart="200">
                    {partialSeoDescription ? (
                      <Text as="p" variant="bodySm">{partialSeoDescription}</Text>
                    ) : (
                      <SkeletonBodyText lines={2} />
                    )}
                  </Box>
                </Box>
              </BlockStack>
            </BlockStack>
          )}
        </BlockStack>
      </Card>
    );
  }
  
  // AI Generation variant with full skeleton preview
  return (
    <Card>
      <BlockStack gap="500">
        {title && (
          <Text variant="headingMd" as="h3">{title}</Text>
        )}
        
        <BlockStack gap="300">
          <ProgressBar 
            progress={displayProgress} 
            size="small" 
            tone="primary"
          />
          
          <InlineStack gap="200" align="center">
            <Icon source={getProgressIcon()} tone="base" />
            <Text as="p" variant="bodyMd" tone="subdued">
              {currentMessage}
            </Text>
          </InlineStack>
          
          {estimatedTime && (
            <Text as="p" variant="bodySm" tone="subdued">
              Estimated time: {Math.ceil(estimatedTime)} seconds
            </Text>
          )}
        </BlockStack>
        
        {showSkeleton && (
          <BlockStack gap="400">
            <Box borderColor="border" borderWidth="025" borderRadius="200" padding="400">
              <BlockStack gap="400">
                <SkeletonDisplayText size="medium" />
                <SkeletonBodyText lines={3} />
              </BlockStack>
            </Box>
            
            <BlockStack gap="300">
              <Box>
                <Text variant="bodySm" as="p" fontWeight="semibold">
                  SEO Title Preview
                </Text>
                <Box paddingBlockStart="200">
                  <SkeletonDisplayText size="small" />
                </Box>
              </Box>
              
              <Box>
                <Text variant="bodySm" as="p" fontWeight="semibold">
                  SEO Description Preview
                </Text>
                <Box paddingBlockStart="200">
                  <SkeletonBodyText lines={2} />
                </Box>
              </Box>
            </BlockStack>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}