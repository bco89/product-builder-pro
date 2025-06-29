import { createContext, useContext, ReactNode } from 'react';

export interface PricingData {
  price: string;
  compareAtPrice: string;
  cost: string;
}

export interface FormData {
  vendor: string;
  productType: string;
  category: {
    id: string;
    name: string;
  } | null;
  title: string;
  description: string;
  handle: string;
  images: File[];
  addImagesLater: boolean;
  tags: string[];
  options: Array<{ name: string; values: string[] }>;
  pricing: PricingData[];
}

interface FormContextType {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
}

interface FormProviderProps {
  children: ReactNode;
  value: FormContextType;
}

export function FormProvider({ children, value }: FormProviderProps) {
  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
} 