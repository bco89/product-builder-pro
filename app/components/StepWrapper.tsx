import { Card, FormLayout, Text, InlineStack, Button } from '@shopify/polaris';

interface StepWrapperProps {
  title: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  isNextDisabled?: boolean;
  nextLabel?: string;
}

export function StepWrapper({
  title,
  children,
  onNext,
  onBack,
  isNextDisabled = false,
  nextLabel = 'Next'
}: StepWrapperProps) {
  return (
    <Card>
      <FormLayout>
        <Text variant="headingMd" as="h2">{title}</Text>
        
        {children}

        <InlineStack gap="300" align="end">
          <Button onClick={onBack}>Back</Button>
          <Button 
            variant="primary"
            onClick={onNext}
            disabled={isNextDisabled}
          >
            {nextLabel}
          </Button>
        </InlineStack>
      </FormLayout>
    </Card>
  );
} 