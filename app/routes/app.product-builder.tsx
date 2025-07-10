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
  Spinner,
  Icon,
  Box
} from '@shopify/polaris';
import { CheckIcon, ClockIcon, AlertCircleIcon } from '@shopify/polaris-icons';
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from '../shopify.server';
import { useAppBridge } from '@shopify/app-bridge-react';
import type { PricingData } from './product-builder/FormContext';

// Step Components
import StepVendorType from './product-builder/steps/StepVendorType';
import StepProductDetails from './product-builder/steps/StepProductDetails';
import StepAIDescription from './product-builder/steps/StepAIDescription';
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
    seoTitle: '',
    seoDescription: '',
    handle: '',
    images: [] as File[],
    addImagesLater: false,
    weight: undefined as number | undefined,
    weightUnit: undefined as 'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS' | undefined,
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
        { title: 'AI Description', component: StepAIDescription, phase: 1 },
        { title: 'Tags', component: StepTags, phase: 1 },
        { title: 'Pricing', component: StepPricing, phase: 1 },
        { title: 'Variants?', component: StepVariantDecision, phase: 1 }
      ];
    } else if (hasVariants === false) {
      // No variants flow - CREATE PRODUCT AFTER PRICING (unified with variant flow)
      if (!productId) {
        // Phase 1: Before product creation - pricing already set, just create product
        return [
          { title: 'Vendor & Type', component: StepVendorType, phase: 1 },
          { title: 'Product Details', component: StepProductDetails, phase: 1 },
          { title: 'AI Description', component: StepAIDescription, phase: 1 },
          { title: 'Tags', component: StepTags, phase: 1 },
          { title: 'Pricing', component: StepPricing, phase: 1 },
          { title: 'Variants?', component: StepVariantDecision, phase: 1 }
          // Product creation happens after variant decision, then continues to phase 2
        ];
      } else {
        // Phase 2: After product creation
        return [
          { title: 'SKU & Barcode', component: StepSKUBarcode, phase: 2 },
          { title: 'Review', component: StepReview, phase: 2 }
        ];
      }
    } else {
      // Has variants flow - pricing already set, create product then configure variants
      if (!productId) {
        // Phase 1: Before product creation - pricing already set, just create product
        return [
          { title: 'Vendor & Type', component: StepVendorType, phase: 1 },
          { title: 'Product Details', component: StepProductDetails, phase: 1 },
          { title: 'AI Description', component: StepAIDescription, phase: 1 },
          { title: 'Tags', component: StepTags, phase: 1 },
          { title: 'Pricing', component: StepPricing, phase: 1 },
          { title: 'Variants?', component: StepVariantDecision, phase: 1 }
        ];
      } else {
        // Phase 2: After product creation
        return [
          { title: 'Variants', component: StepVariants, phase: 2 },
          { title: 'SKU & Barcode', component: StepSKUBarcode, phase: 2 },
          { title: 'Review', component: StepFinalReview, phase: 2 }
        ];
      }
    }
  };

  const steps = getSteps();

  // Enhanced progress information
  const getProgressInfo = () => {
    const totalSteps = steps.length;
    const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
    const currentPhase = productId ? 2 : 1;
    
    return {
      totalSteps,
      progressPercentage,
      currentPhase,
      stepTitle: steps[currentStep]?.title || 'Unknown Step'
    };
  };

  // Upload images to Shopify's CDN using staged upload
  const uploadImagesToShopify = async (files: File[]): Promise<string[]> => {
    if (!files || files.length === 0) return [];

    try {
      console.log('Starting image upload process for files:', files.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size
      })));

      // Step 1: Create staged upload targets
      const stagedResponse = await fetch('/api/shopify/staged-uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: files.map(file => ({
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size
          }))
        }),
      });

      if (!stagedResponse.ok) {
        const errorData = await stagedResponse.json();
        console.error('Staged upload creation failed:', errorData);
        throw new Error(errorData.error || 'Failed to create staged uploads');
      }

      const { stagedTargets } = await stagedResponse.json();
      console.log('Staged targets received:', stagedTargets);
      
      // Step 2: Upload files to staged URLs
      const uploadPromises = stagedTargets.map(async (target: any, index: number) => {
        const file = files[index];
        const formData = new FormData();
        
        // Add parameters from staged upload response
        target.parameters.forEach((param: { name: string; value: string }) => {
          formData.append(param.name, param.value);
        });
        
        // Add the file
        formData.append('file', file);
        
        // Upload to Shopify's CDN
        console.log(`Uploading ${file.name} to:`, target.url);
        const uploadResponse = await fetch(target.url, {
          method: 'POST',
          body: formData,
        });
        
        console.log(`Upload response for ${file.name}:`, uploadResponse.status, uploadResponse.statusText);
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`Upload failed for ${file.name}:`, errorText);
          throw new Error(`Failed to upload ${file.name}: ${uploadResponse.statusText}`);
        }
        
        console.log(`Successfully uploaded ${file.name}, resource URL:`, target.resourceUrl);
        
        return target.resourceUrl;
      });
      
      const urls = await Promise.all(uploadPromises);
      console.log('All uploads completed, resource URLs:', urls);
      
      // Wait to ensure uploads are processed by Shopify
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return urls;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  };

  // Create product mid-flow for both variant and non-variant products
  const createProductMidFlow = useCallback(async () => {
    setIsCreatingProduct(true);
    setErrorBanner('');
    
    try {
      // Upload images first if any
      let imageUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        imageUrls = await uploadImagesToShopify(formData.images);
      }

      const response = await fetch('/api/shopify/create-product-basic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          seoTitle: formData.seoTitle,
          seoDescription: formData.seoDescription,
          handle: formData.handle,
          vendor: formData.vendor,
          productType: formData.productType,
          tags: formData.tags,
          category: formData.category,
          // Include initial pricing for default variant
          pricing: formData.pricing[0] || { price: '0.00' },
          // Include uploaded image URLs
          imageUrls
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Product creation failed:', data);
        // Check if it's specifically a media error
        if (data.error && data.error.toLowerCase().includes('media')) {
          console.error('Media-specific error detected');
          // Try creating product without images
          console.log('Retrying product creation without images...');
          const retryResponse = await fetch('/api/shopify/create-product-basic', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: formData.title,
              description: formData.description,
              seoTitle: formData.seoTitle,
              seoDescription: formData.seoDescription,
              handle: formData.handle,
              vendor: formData.vendor,
              productType: formData.productType,
              tags: formData.tags,
              category: formData.category,
              pricing: formData.pricing[0] || { price: '0.00' },
              imageUrls: [] // No images
            }),
          });
          
          const retryData = await retryResponse.json();
          if (retryResponse.ok) {
            console.log('Product created successfully without images');
            setProductId(retryData.id);
            setCurrentStep(0);
            return;
          }
        }
        throw new Error(data.error || 'Failed to create product');
      }

      setProductId(data.id);
      
      setCurrentStep(0); // Reset to first step of phase 2
      
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorBanner(errorMessage);
    } finally {
      setIsCreatingProduct(false);
    }
  }, [formData, hasVariants, uploadImagesToShopify]);

  // Handle variant decision
  const handleVariantDecision = useCallback((hasVariantsDecision: boolean) => {
    setHasVariants(hasVariantsDecision);
    // After variant decision, trigger product creation since we now have all Phase 1 data
    // including pricing which was already set in the previous step
    createProductMidFlow();
  }, [createProductMidFlow]);

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
          pricing: formData.pricing,
          weight: formData.weight,
          weightUnit: formData.weightUnit
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

  // Submit handler for non-variant products (now finalizes instead of creates)
  const handleSubmit = useCallback(async () => {
    if (!productId) return;
    
    setIsSubmitting(true);
    setErrorBanner('');
    
    try {
      // Update the product with final SKU and barcode details
      const response = await fetch('/api/shopify/update-product-variants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          skus: formData.skus,
          barcodes: formData.barcodes,
          // For non-variant products, we don't update pricing or options
          options: [],
          pricing: formData.pricing,
          weight: formData.weight,
          weightUnit: formData.weightUnit
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to finalize product');
      }

      setToastMessage('Product finalized successfully!');
      setHasUnsavedChanges(false);
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Error finalizing product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorBanner(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [productId, formData]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
    setErrorBanner('');
  }, []);

  const handleUpdateForm = useCallback((updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setErrorBanner('');
    setHasUnsavedChanges(true);
  }, []);

  const handleBuildAnother = useCallback(() => {
    // Reset all form state
    setFormData({
      vendor: '',
      productType: '',
      category: null,
      googleCategory: '',
      title: '',
      description: '',
      handle: '',
      images: [],
      addImagesLater: false,
      weight: undefined,
      weightUnit: undefined,
      options: [],
      variants: [],
      skus: [],
      barcodes: [],
      pricing: [],
      currency: 'USD',
      tags: []
    });
    
    // Reset component state
    setCurrentStep(0);
    setIsSubmitting(false);
    setToastMessage('');
    setErrorBanner('');
    setHasUnsavedChanges(false);
    setProductId(null);
    setHasVariants(null);
    setIsCreatingProduct(false);
    setShouldShowOptionsForm(false);
    setShowSuccess(false);
  }, []);

  const handleNext = useCallback(() => {
    // Check if we need to create product mid-flow for BOTH variant and non-variant products
    if (!productId && currentStep === steps.length - 1) {
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
          formData={formData}
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
    const variantCount: number = hasVariants === false ? 1 : formData.options.reduce((acc, option) => acc * option.values.length, 1);
    return (
      <Page title="Success!">
        <Layout>
          <Layout.Section>
            <StepSuccess 
              productId={productId} 
              shop={shop} 
              variantCount={variantCount}
              onBuildAnother={handleBuildAnother}
              productTitle={formData.title}
            />
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const getPageTitle = () => {
    if (productId) {
      return hasVariants ? "Configure Product Variants" : "Finalize Product Details";
    }
    return "Create A New Product with Product Builder Pro";
  };

  const getPageSubtitle = () => {
    if (productId) {
      return hasVariants ? "Add variants to your product" : "Add final SKU and barcode details";
    }
    return "A step by step process for product data you know is right";
  };

  const showPrimaryAction = () => {
    // Never show primary action - users must use the button at the bottom of the review page
    return false;
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
          onAction: handleBuildAnother,
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
            
            {/* Enhanced Progress Indicator */}
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="300" align="space-between">
                  <Text variant="headingMd" as="h2">
                    {productId ? 'Phase 2: Variant Configuration' : 'Phase 1: Product Setup'}
                  </Text>
                  <Badge tone={productId ? 'attention' : 'info'}>
                    {`Step ${currentStep + 1} of ${steps.length}`}
                  </Badge>
                </InlineStack>
                
                <BlockStack gap="200">
                  <ProgressBar progress={getProgressInfo().progressPercentage} size="medium" />
                  <Text as="span" variant="bodyMd" tone="subdued">
                    Current: {getProgressInfo().stepTitle}
                  </Text>
                </BlockStack>
                

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
                    (hasVariants ? "Now configure the variants for your product:" : "Now finalize your product:") :
                    "Follow these steps to create a new product:"
                  }
                </Text>
                <ol style={{ paddingLeft: '20px' }}>
                  {productId ? (
                    <>
                      {hasVariants ? (
                        <>
                          <li>Add product options (size, color, etc.)</li>
                          <li>Assign SKUs and barcodes to variants</li>
                          <li>Set pricing for each variant</li>
                          <li>Review and finalize</li>
                        </>
                      ) : (
                        <>
                          <li>Add SKU and barcode</li>
                          <li>Review and finalize</li>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <li>Select vendor and product type</li>
                      <li>Add product details</li>
                      <li>Add tags for organization</li>
                      <li>Set pricing information</li>
                      <li>Choose variant configuration</li>
                      {hasVariants === false && (
                        <>
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