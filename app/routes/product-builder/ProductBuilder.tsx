import { useState } from 'react';
import { FormProvider } from './FormContext';
import type { FormData } from './FormContext';
import StepVendorType from './steps/StepVendorType';
import StepTags from './steps/StepTags';
import StepPricing from './steps/StepPricing';
// ... other imports

export default function ProductBuilder() {
  const [formData, setFormData] = useState<FormData>({
    vendor: '',
    productType: '',
    category: null,
    title: '',
    description: '',
    handle: '',
    images: [],
    addImagesLater: false,
    tags: [],
    options: [],
    pricing: [{
      price: '',
      compareAtPrice: '',
      cost: ''
    }]
  });

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <FormProvider value={{ formData, updateFormData }}>
      {/* Your existing stepper/form components */}
      <StepVendorType 
        formData={formData}
        onChange={updateFormData}
        onNext={() => {/* handle next */}}
        onBack={() => {/* handle back */}}
      />
      <StepTags 
        formData={formData}
        onChange={updateFormData}
        onNext={() => {/* handle next */}}
        onBack={() => {/* handle back */}}
      />
      <StepPricing
        formData={formData}
        onChange={updateFormData}
        onNext={() => {/* handle next */}}
        onBack={() => {/* handle back */}}
      />
    </FormProvider>
  );
} 