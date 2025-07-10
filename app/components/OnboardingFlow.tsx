import { useState } from 'react';
import {
  Modal,
  TextContainer,
  Button,
  BlockStack,
  ProgressBar,
  Text,
  Banner,
  Box,
} from '@shopify/polaris';
import { useNavigate } from '@remix-run/react';

interface OnboardingFlowProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingFlow({ open, onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  
  const steps = [
    {
      title: 'Welcome to AI-Powered Descriptions!',
      content: 'Generate compelling product descriptions that convert browsers into buyers. Our AI understands your brand voice and creates SEO-optimized content.',
      image: '🤖',
    },
    {
      title: 'Tell Us About Your Brand',
      content: 'Complete your settings to help AI understand your unique brand voice and target customers. The more details you provide, the better your descriptions will be.',
      image: '⚙️',
    },
    {
      title: 'Boost Your Sales',
      content: 'Well-crafted descriptions can increase conversion rates by up to 30%! Get started by setting up your brand profile.',
      image: '📈',
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      onComplete();
      navigate('/app/settings');
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onSkip}
      title="Get Started with AI Descriptions"
      primaryAction={{
        content: currentStep === steps.length - 1 ? 'Go to Settings' : 'Next',
        onAction: handleNext,
      }}
      secondaryActions={[
        {
          content: currentStep > 0 ? 'Previous' : 'Skip for now',
          onAction: currentStep > 0 ? handlePrevious : onSkip,
        }
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <ProgressBar progress={progress} size="small" />
          
          <Box paddingBlockStart="400">
            <TextContainer>
              <Box textAlign="center" paddingBlockEnd="400">
                <Text as="span" variant="heading2xl">
                  {steps[currentStep].image}
                </Text>
              </Box>
              
              <Text variant="headingMd" as="h2">
                {steps[currentStep].title}
              </Text>
              
              <Text as="p">{steps[currentStep].content}</Text>
            </TextContainer>
          </Box>
          
          {currentStep === 1 && (
            <Box paddingBlockStart="400">
              <Banner tone="info">
                <Text as="p">
                  Settings are optional but highly recommended for best results!
                </Text>
              </Banner>
            </Box>
          )}
          
          {currentStep === 2 && (
            <Box paddingBlockStart="400">
              <Banner tone="success">
                <Text as="p">
                  Your AI assistant is ready to help create amazing product descriptions!
                </Text>
              </Banner>
            </Box>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}