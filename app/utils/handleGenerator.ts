/**
 * Generates a URL-friendly handle from a product title
 * @param title - The product title to convert
 * @returns A handle suitable for Shopify products
 */
export function generateHandle(title: string): string {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters, keep alphanumeric, spaces, and hyphens
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, '');     // Remove leading and trailing hyphens
}

/**
 * Validates if a handle meets Shopify's requirements
 * @param handle - The handle to validate
 * @returns True if the handle is valid
 */
export function isValidHandle(handle: string): boolean {
  if (!handle) return false;
  
  // Handle must be lowercase alphanumeric with hyphens only
  const validPattern = /^[a-z0-9-]+$/;
  
  // Cannot start or end with hyphen
  const noLeadingTrailingHyphens = !/^-|-$/.test(handle);
  
  // Cannot have consecutive hyphens
  const noConsecutiveHyphens = !/-{2,}/.test(handle);
  
  return validPattern.test(handle) && noLeadingTrailingHyphens && noConsecutiveHyphens;
} 