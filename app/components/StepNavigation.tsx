import React from 'react';
import { InlineStack, Button } from '@shopify/polaris';

interface StepNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  nextVariant?: 'primary' | 'plain' | 'tertiary';
  showBack?: boolean;
  align?: 'start' | 'center' | 'end';
}

/**
 * Reusable navigation component for product builder steps
 */
export function StepNavigation({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Next",
  nextDisabled = false,
  nextLoading = false,
  nextVariant = 'primary',
  showBack = true,
  align = 'end'
}: StepNavigationProps) {
  return (
    <InlineStack align={align} gap="300">
      {showBack && onBack && (
        <Button onClick={onBack}>
          {backLabel}
        </Button>
      )}
      {onNext && (
        <Button
          variant={nextVariant}
          onClick={onNext}
          disabled={nextDisabled}
          loading={nextLoading}
        >
          {nextLabel}
        </Button>
      )}
    </InlineStack>
  );
}