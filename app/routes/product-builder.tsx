import { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  ProgressBar,
  Button,
  Banner,
  Frame,
  Loading,
  Toast
} from '@shopify/polaris';
import { useNavigate } from '@remix-run/react';
import { authenticate } from '../shopify.server';

// Step Components (we'll create these next)
import StepVendorType from './product-builder/steps/StepVendorType';
import StepProductDetails from './product-builder/steps/StepProductDetails';
import StepVariants from './product-builder/steps/StepVariants';
import StepSKUBarcode from './product-builder/steps/StepSKUBarcode';
import StepPricing from './product-builder/steps/StepPricing';
import StepTags from './product-builder/steps/StepTags';
import StepReview from './product-builder/steps/StepReview';

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function ProductBuilder() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);

  const [formData, setFormData] = useState({
    // Basic product info
    vendor: '',
    productType: '',
    title: '',
    description: '',
    images: [],

    // Variants and options
    options: [], // e.g., [{name: 'Size', values: ['S', 'M', 'L']}]
    variants: [], // Will be generated based on options

    // SKUs and inventory
    skus: [], // One per variant
    barcodes: [], // One per variant

    // Pricing
    prices: [], // One per variant
    costs: [], // One per variant

    // Tags and categorization
    tags: [],
  });

  const steps = [
    {
      id: 'vendor-type',
      title: 'Vendor & Type',
      description: 'Select from existing vendors and product types',
      component: StepVendorType,
    },
    {
      id: 'product-details',
      title: 'Product Details',
      description: 'Enter product information and upload images',
      component: StepProductDetails,
    },
    {
      id: 'variants',
      title: 'Variants',
      description: 'Configure product variants and options',
      component: StepVariants,
    },
    {
      id: 'sku-barcode',
      title: 'SKU & Barcode',
      description: 'Assign SKUs and barcodes to variants',
      component: StepSKUBarcode,
    },
    {
      id: 'pricing',
      title: 'Pricing',
      description: 'Set costs and prices for variants',
      component: StepPricing,
    },
    {
      id: 'tags',
      title: 'Tags',
      description: 'Add tags from existing store tags',
      component: StepTags,
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Review and create product',
      component: StepReview,
    },
  ];

  const handleUpdateFormData = useCallback((updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/products/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create product');
      }

      setToastMessage({
        content: 'Product created successfully!',
        error: false,
      });

      // Navigate to the product page or list
      navigate('/products');

    } catch (error) {
      setErrorBanner({
        title: 'Failed to create product',
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, navigate]);

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <Frame>
      {isLoading && <Loading />}
      <Page
        title="Create New Product"
        breadcrumbs={[{ content: 'Products', url: '/products' }]}
      >
        <Layout>
          <Layout.Section>
            {errorBanner && (
              <Banner
                title={errorBanner.title}
                status="critical"
                onDismiss={() => setErrorBanner(null)}
              >
                <p>{errorBanner.message}</p>
              </Banner>
            )}

            <div style={{ marginBottom: '16px' }}>
              <ProgressBar
                progress={(currentStep / (steps.length - 1)) * 100}
                size="small"
              />
            </div>

            <CurrentStepComponent
              formData={formData}
              onChange={handleUpdateFormData}
            />

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <Button
                onClick={handleBack}
                disabled={currentStep === 0 || isLoading}
              >
                Back
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  primary
                  onClick={handleNext}
                  disabled={isLoading}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  primary
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  Create Product
                </Button>
              )}
            </div>
          </Layout.Section>

          <Layout.Section secondary>
            <div style={{ position: 'sticky', top: '20px' }}>
              {/* Step information panel */}
              <p><strong>{steps[currentStep].title}</strong></p>
              <p>{steps[currentStep].description}</p>
            </div>
          </Layout.Section>
        </Layout>

        {toastMessage && (
          <Toast
            content={toastMessage.content}
            error={toastMessage.error}
            onDismiss={() => setToastMessage(null)}
            duration={4500}
          />
        )}
      </Page>
    </Frame>
  );
} 