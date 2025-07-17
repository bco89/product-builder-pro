import { useNavigate, useSearchParams } from "@remix-run/react";
import { useCallback } from "react";

/**
 * Custom hook that preserves essential Shopify embedded app query parameters
 * when navigating between routes.
 * 
 * Preserves: shop, host, embedded
 */
export function usePreservedParamsNavigate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  return useCallback((to: string, options?: { replace?: boolean }) => {
    // Preserve essential query parameters
    const preservedParams = new URLSearchParams();
    
    if (searchParams.has('shop')) {
      preservedParams.set('shop', searchParams.get('shop')!);
    }
    if (searchParams.has('host')) {
      preservedParams.set('host', searchParams.get('host')!);
    }
    if (searchParams.has('embedded')) {
      preservedParams.set('embedded', searchParams.get('embedded')!);
    }
    
    // Handle existing query parameters in the destination URL
    const [path, existingQuery] = to.split('?');
    const destParams = new URLSearchParams(existingQuery || '');
    
    // Merge preserved params with destination params
    preservedParams.forEach((value, key) => {
      if (!destParams.has(key)) {
        destParams.set(key, value);
      }
    });
    
    const finalUrl = destParams.toString() 
      ? `${path}?${destParams.toString()}`
      : path;
    
    navigate(finalUrl, options);
  }, [navigate, searchParams]);
}