import { useQuery } from '@tanstack/react-query';
import { useFormContext } from '../routes/product-builder/FormContext';

export function useVendor() {
  const { formData } = useFormContext();
  return { vendor: formData.vendor || 'Default Vendor' };
} 