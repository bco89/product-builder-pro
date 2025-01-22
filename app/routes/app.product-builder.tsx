import React, { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  ProgressBar,
  BlockStack,
  Toast,
  Banner
} from '@shopify/polaris';
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from '../shopify.server';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge-react';
import type { PricingData } from './product-builder/FormContext';

// Step Components
import StepVendorType from './product-builder/steps/StepVendorType';
import StepProductDetails from './product-builder/steps/StepProductDetails';
import StepVariants from './product-builder/steps/StepVariants';
import StepSKUBarcode from './product-builder/steps/StepSKUBarcode';
import StepPricing from './product-builder/steps/StepPricing';
import StepTags from './product-builder/steps/StepTags';
import StepReview from './product-builder/steps/StepReview';

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
    query {
      shop {
        myshopifyDomain
      }
    }`
  );
  const shopData = await response.json();
  
  return json({
    shop: shopData.data.shop.myshopifyDomain,
    apiKey: process.env.SHOPIFY_API_KEY
  });
};

export default function ProductBuilder() {
  const { shop, apiKey } = useLoaderData<{ shop: string; apiKey: string }>();
  const app = useAppBridge();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorBanner, setErrorBanner] = useState('');
  const [formData, setFormData] = useState({
    vendor: '',
    productType: '',
    category: null as { id: string; name: string; } | null,
    googleCategory: '',
    title: '',
    description: '',
    images: [] as File[],
    options: [] as Array<{ name: string; values: string[] }>,
    variants: [] as any[],
    skus: [] as string[],
    barcodes: [] as string[],
    pricing: [] as PricingData[],
    currency: 'USD',
    tags: [] as string[]
  });

  const steps = [
    { title: 'Vendor & Type', component: StepVendorType },
    { title: 'Product Details', component: StepProductDetails },
    { title: 'Variants', component: StepVariants },
    { title: 'SKU & Barcode', component: StepSKUBarcode },
    { title: 'Pricing', component: StepPricing },
    { title: 'Tags', component: StepTags },
    { title: 'Review', component: StepReview }
  ];

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setErrorBanner('');
    try {
      console.log('Submitting product data:', formData);
      const response = await fetch('/api/shopify/create-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      setToastMessage('Product created successfully!');
      
      // Navigate to the product in Shopify Admin
      const productId = data.id.replace('gid://shopify/Product/', '');
      const adminUrl = `https://${shop}/admin/products/${productId}`;
      window.open(adminUrl, '_top');
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', {
        message: errorMessage,
        formData: JSON.stringify(formData, null, 2)
      });
      setErrorBanner(errorMessage);
      setToastMessage('Failed to create product. See error details above.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, shop]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
    setErrorBanner('');
  }, []);

  const handleUpdateForm = useCallback((updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setErrorBanner('');
  }, []);

  const renderStep = () => {
    if (currentStep === steps.length - 1) {
      return (
        <StepReview
          formData={formData}
          onSubmit={handleSubmit}
          onEdit={handleStepChange}
          onBack={() => handleStepChange(currentStep - 1)}
          isSubmitting={isSubmitting}
        />
      );
    }

    const StepComponent = steps[currentStep].component;
    return (
      <StepComponent
        formData={formData}
        onChange={handleUpdateForm}
        onNext={() => handleStepChange(currentStep + 1)}
        onBack={() => handleStepChange(currentStep - 1)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    );
  };

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {errorBanner && (
              <Banner
                title="Error Creating Product"
                tone="critical"
                onDismiss={() => setErrorBanner('')}
              >
                <p>{errorBanner}</p>
              </Banner>
            )}
            
            <ProgressBar
              progress={(currentStep / (steps.length - 1)) * 100}
              size="small"
            />
            
            {renderStep()}
          </BlockStack>
        </Layout.Section>
      </Layout>
      {toastMessage && (
        <Toast
          content={toastMessage}
          onDismiss={() => setToastMessage('')}
          duration={4000}
        />
      )}
    </Page>
  );
} 