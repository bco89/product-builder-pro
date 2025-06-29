import React, { useState, useCallback, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  ProgressBar,
  BlockStack,
  Toast,
  Banner,
  Badge,
  InlineStack,
  Text,
  Button,
  Spinner
} from '@shopify/polaris';
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from '../shopify.server';
import { useAppBridge } from '@shopify/app-bridge-react';
import type { PricingData } from './product-builder/FormContext';

// Step Components
import StepVendorType from './product-builder/steps/StepVendorType';
import StepProductDetails from './product-builder/steps/StepProductDetails';
import StepVariants from './product-builder/steps/StepVariants';
import StepSKUBarcode from './product-builder/steps/StepSKUBarcode';
import StepPricing from './product-builder/steps/StepPricing';
import StepTags from './product-builder/steps/StepTags';
import StepReview from './product-builder/steps/StepReview';
import StepVariantDecision from './product-builder/steps/StepVariantDecision';
import StepFinalReview from './product-builder/steps/StepFinalReview';
import StepSuccess from './product-builder/steps/StepSuccess';

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [hasVariants, setHasVariants] = useState<boolean | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [shouldShowOptionsForm, setShouldShowOptionsForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    vendor: '',
    productType: '',
    category: null as { id: string; name: string; } | null,
    googleCategory: '',
    title: '',
    description: '',
    handle: '',
    images: [] as File[],
    addImagesLater: false,
    options: [] as Array<{ name: string; values: string[] }>,
    variants: [] as any[],
    skus: [] as string[],
    barcodes: [] as string[],
    pricing: [] as PricingData[],
    currency: 'USD',
    tags: [] as string[]
  });

  // Define steps based on whether product has variants
  const getSteps = () => {
    if (hasVariants === null) {
      // Initial flow - we don't know yet if there will be variants
      return [
        { title: 'Vendor & Type', component: StepVendorType, phase: 1 },
        { title: 'Product Details', component: StepProductDetails, phase: 1 },
        { title: 'Tags', component: StepTags, phase: 1 },
        { title: 'Variants?', component: StepVariantDecision, phase: 1 }
      ];
    } else if (hasVariants === false) {
      // No variants flow
      return [
        { title: 'Vendor & Type', component: StepVendorType, phase: 1 },
        { title: 'Product Details', component: StepProductDetails, phase: 1 },
        { title: 'Tags', component: StepTags, phase: 1 },
        { title: 'Pricing', component: StepPricing, phase: 1 },
        { title: 'SKU & Barcode', component: StepSKUBarcode, phase: 1 },
        { title: 'Review', component: StepReview, phase: 1 }
      ];
    } else {
      // Has variants flow - split into two phases
      if (!productId) {
        // Phase 1: Before product creation
        return [
          { title: 'Vendor & Type', component: StepVendorType, phase: 1 },
          { title: 'Product Details', component: StepProductDetails, phase: 1 },
          { title: 'Tags', component: StepTags, phase: 1 },
          { title: 'Pricing', component: StepPricing, phase: 1 }
        ];
      } else {
        // Phase 2: After product creation - removed variant pricing step
        return [
          { title: 'Variants', component: StepVariants, phase: 2 },
          { title: 'SKU & Barcode', component: StepSKUBarcode, phase: 2 },
          { title: 'Review', component: StepFinalReview, phase: 2 }
        ];
      }
    }
  };

  const steps = getSteps();

  // Handle variant decision
  const handleVariantDecision = useCallback((hasVariantsDecision: boolean) => {
    setHasVariants(hasVariantsDecision);
    if (hasVariantsDecision) {
      // Continue to Initial Pricing step (which will be step 3 after hasVariants is set)
      setCurrentStep(3);
      setShouldShowOptionsForm(true); // Set flag to show options form later
    } else {
      // Continue to pricing for non-variant flow (which will be step 3 after hasVariants is set)
      setCurrentStep(3);
    }
  }, []);

  // Create product mid-flow for variant products
  const createProductMidFlow = useCallback(async () => {
    setIsCreatingProduct(true);
    setErrorBanner('');
    
    try {
      const response = await fetch('/api/shopify/create-product-basic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          handle: formData.handle,
          vendor: formData.vendor,
          productType: formData.productType,
          tags: formData.tags,
          category: formData.category,
          // Include initial pricing for default variant
          pricing: formData.pricing[0] || { price: '0.00' }
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      setProductId(data.id);
      setToastMessage('Product created! Now configure variants...');
      setCurrentStep(0); // Reset to first step of phase 2
      
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorBanner(errorMessage);
    } finally {
      setIsCreatingProduct(false);
    }
  }, [formData]);

  // Handle final submission (for products with variants)
  const handleFinalSubmit = useCallback(async () => {
    if (!productId) return;
    
    setIsSubmitting(true);
    setErrorBanner('');
    
    try {
      const response = await fetch('/api/shopify/update-product-variants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          options: formData.options,
          skus: formData.skus,
          barcodes: formData.barcodes,
          pricing: formData.pricing
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product variants');
      }

      setToastMessage('Product variants updated successfully!');
      setHasUnsavedChanges(false);
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Error updating variants:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorBanner(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [productId, formData, shop]);

  // Original submit handler for non-variant products
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
      setHasUnsavedChanges(false);
      setProductId(data.id);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorBanner(errorMessage);
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
    setHasUnsavedChanges(true);
  }, []);

  const handleNext = useCallback(() => {
    // Check if we need to create product mid-flow
    if (hasVariants && !productId && currentStep === steps.length - 1) {
      createProductMidFlow();
    } else {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, hasVariants, productId, steps.length, createProductMidFlow]);

  const renderStep = () => {
    const StepComponent = steps[currentStep].component;
    
    // Special handling for variant decision step
    if (StepComponent === StepVariantDecision) {
      return (
        <StepVariantDecision
          onDecision={handleVariantDecision}
          onBack={() => handleStepChange(currentStep - 1)}
        />
      );
    }
    
    // Special handling for final review (products with variants)
    if (StepComponent === StepFinalReview) {
      return (
        <StepFinalReview
          formData={formData}
          productId={productId}
          onSubmit={handleFinalSubmit}
          onEdit={handleStepChange}
          onBack={() => handleStepChange(currentStep - 1)}
          isSubmitting={isSubmitting}
        />
      );
    }
    
    // Regular review step (products without variants)
    if (StepComponent === StepReview) {
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

    // All other steps
    const props: any = {
      formData,
      onChange: handleUpdateForm,
      onNext: handleNext,
      onBack: () => handleStepChange(currentStep - 1),
      productId,
    };

    // Add shouldShowOptionsForm only for StepVariants
    if (StepComponent === StepVariants) {
      props.shouldShowOptionsForm = shouldShowOptionsForm;
    }

    return <StepComponent {...props} />;
  };

  // Show loading state when creating product mid-flow
  if (isCreatingProduct) {
    return (
      <Page title="Creating Product...">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400" align="center">
                <Spinner size="large" />
                <Text variant="headingMd" as="h2">Creating your product...</Text>
                <Text as="p">Please wait while we set up your product for variant configuration.</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  // Show success page after finalizing variants or creating product
  if (showSuccess && productId) {
    const variantCount = hasVariants === false ? 1 : formData.options.reduce((acc, option) => acc * option.values.length, 1);
    return (
      <Page title="Success!">
        <Layout>
          <Layout.Section>
            <StepSuccess 
              productId={productId} 
              shop={shop} 
              variantCount={variantCount}
            />
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const getPageTitle = () => {
    if (productId) {
      return "Configure Product Variants";
    }
    return "Create A New Product with Product Builder Pro";
  };

  const getPageSubtitle = () => {
    if (productId) {
      return "Add variants to your product";
    }
    return "A step by step process for product data you know is right";
  };

  const showPrimaryAction = () => {
    // Only show for non-variant products on review step
    return hasVariants === false && currentStep === steps.length - 1;
  };

  return (
    <Page
      title={getPageTitle()}
      subtitle={getPageSubtitle()}
      compactTitle
      primaryAction={showPrimaryAction() ? {
        content: 'Create Product',
        disabled: isSubmitting,
        loading: isSubmitting,
        onAction: handleSubmit,
      } : undefined}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: () => navigate('/app'),
        }
      ]}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="600">
            {errorBanner && (
              <Banner
                title="Error"
                tone="critical"
                onDismiss={() => setErrorBanner('')}
              >
                <p>{errorBanner}</p>
              </Banner>
            )}
            
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">
                      {productId ? `Phase 2: Variant Configuration` : `Progress`}
                    </Text>
                    {productId && (
                      <Badge tone="success">Product Created</Badge>
                    )}
                  </InlineStack>
                  <ProgressBar
                    progress={(currentStep / (steps.length - 1)) * 100}
                    size="small"
                  />
                </BlockStack>
                
                <InlineStack gap="200" wrap>
                  {steps.map((step, index) => (
                    <Badge
                      key={`${step.phase}-${index}`}
                      tone={index === currentStep ? 'info' : index < currentStep ? 'success' : undefined}
                    >
                      {`${index + 1}. ${step.title}`}
                    </Badge>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>
            
            {renderStep()}
          </BlockStack>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                {productId ? "Variant Configuration Help" : "Product Builder Help"}
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  {productId ? 
                    "Now configure the variants for your product:" :
                    "Follow these steps to create a new product:"
                  }
                </Text>
                <ol style={{ paddingLeft: '20px' }}>
                  {productId ? (
                    <>
                      <li>Add product options (size, color, etc.)</li>
                      <li>Assign SKUs and barcodes to variants</li>
                      <li>Set pricing for each variant</li>
                      <li>Review and finalize</li>
                    </>
                  ) : (
                    <>
                      <li>Select vendor and product type</li>
                      <li>Add product details</li>
                      <li>Add tags for organization</li>
                      <li>Choose variant configuration</li>
                      {hasVariants === false && (
                        <>
                          <li>Set pricing information</li>
                          <li>Add SKU and barcode</li>
                          <li>Review and create</li>
                        </>
                      )}
                    </>
                  )}
                </ol>
              </BlockStack>
            </BlockStack>
          </Card>
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