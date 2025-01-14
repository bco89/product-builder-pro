import { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  ProgressBar,
  BlockStack
} from '@shopify/polaris';
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from '../shopify.server';

// Step Components
import StepVendorType from './product-builder/steps/StepVendorType';
import StepProductDetails from './product-builder/steps/StepProductDetails';
import StepVariants from './product-builder/steps/StepVariants';
import StepSKUBarcode from './product-builder/steps/StepSKUBarcode';
import StepPricing from './product-builder/steps/StepPricing';
import StepTags from './product-builder/steps/StepTags';
import StepReview from './product-builder/steps/StepReview';

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  return json({
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY
  });
};

export default function ProductBuilder() {
  const { shop, apiKey } = useLoaderData();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    vendor: '',
    productType: '',
    title: '',
    description: '',
    images: [],
    options: [],
    variants: [],
    skus: [],
    barcodes: [],
    pricing: [],
    currency: 'USD',
    tags: []
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

  const handleStepChange = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Page>
      <BlockStack gap="500">
        <ProgressBar progress={progress} />
        
        <Layout>
          <Layout.Section>
            <CurrentStepComponent 
              formData={formData}
              onChange={handleStepChange}
              onNext={() => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))}
              onBack={() => setCurrentStep(prev => Math.max(prev - 1, 0))}
            />
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
} 