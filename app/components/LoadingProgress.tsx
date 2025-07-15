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
} from '@shopify/polaris';
import {
  MagicIcon,
  SearchIcon,
  AnalyticsIcon,
  EditIcon,
  CheckIcon,
} from '@shopify/polaris-icons';

interface LoadingProgressProps {
  variant: 'ai-generation' | 'data-fetch' | 'simple';
  progress?: number; // 0-100
  messages?: string[]; // Rotating messages
  showSkeleton?: boolean; // Show skeleton preview
  estimatedTime?: number; // In seconds
  currentCount?: number; // For showing discovered items
  title?: string; // Optional title for the loading state
}

const defaultMessages = {
  'ai-generation': [
    "🔍 Analyzing product details...",
    "✨ Crafting the perfect description...",
    "🎯 Optimizing for your keywords...",
    "📝 Adding finishing touches...",
    "🚀 Almost ready to impress!"
  ],
  'data-fetch': [
    "🔍 Searching for the best options...",
    "📊 Analyzing available data...",
    "✨ Organizing results for you...",
    "🎁 Preparing your selections..."
  ],
  'simple': [
    "Loading...",
    "Just a moment...",
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
  title
}: LoadingProgressProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  
  const displayMessages = messages || defaultMessages[variant];
  const currentMessage = displayMessages[currentMessageIndex];
  
  // Rotate messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % displayMessages.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [displayMessages.length]);
  
  // Simulate progress if not provided
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
  
  const displayProgress = progress !== undefined ? progress : simulatedProgress;
  
  // Get icon based on progress
  const getProgressIcon = () => {
    if (displayProgress < 20) return SearchIcon;
    if (displayProgress < 40) return AnalyticsIcon;
    if (displayProgress < 60) return MagicIcon;
    if (displayProgress < 80) return EditIcon;
    return CheckIcon;
  };
  
  if (variant === 'simple') {
    return (
      <InlineStack gap="300" align="center">
        <Spinner accessibilityLabel="Loading" size="small" />
        <Text as="p" variant="bodyMd" tone="subdued">
          {currentMessage}
        </Text>
      </InlineStack>
    );
  }
  
  if (variant === 'data-fetch') {
    return (
      <InlineStack gap="300" align="center">
        <Spinner accessibilityLabel="Loading data" size="small" />
        <Text as="p" variant="bodyMd" tone="subdued">
          {currentMessage}
          {currentCount !== undefined && ` (${currentCount} found)`}
        </Text>
      </InlineStack>
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