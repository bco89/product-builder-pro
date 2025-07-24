/**
 * Shared validation utilities for Product Builder Pro
 * Consolidates common validation logic to reduce code duplication
 */

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import type { ValidationResponse, BatchValidationResponse, ShopifyGraphQLResponse } from "../types/shopify";
import { VALIDATE_PRODUCT_HANDLE, VALIDATE_SKU, VALIDATE_BARCODE } from "../graphql";

// Validation patterns
const VALIDATION_PATTERNS = {
  handle: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  sku: /^[A-Za-z0-9_-]+$/,
  barcode: /^[0-9]+$/,
} as const;

// Error messages
const ERROR_MESSAGES = {
  handle: {
    invalid: "Handle must contain only lowercase letters, numbers, and hyphens",
    exists: "This handle is already in use",
  },
  sku: {
    invalid: "SKU must contain only letters, numbers, hyphens, and underscores",
    exists: "This SKU is already in use",
  },
  barcode: {
    invalid: "Barcode must contain only numbers",
    exists: "This barcode is already in use",
  },
} as const;

/**
 * Validates a product handle format
 */
export function isValidHandleFormat(handle: string): boolean {
  return VALIDATION_PATTERNS.handle.test(handle);
}

/**
 * Validates a SKU format
 */
export function isValidSkuFormat(sku: string): boolean {
  return VALIDATION_PATTERNS.sku.test(sku);
}

/**
 * Validates a barcode format
 */
export function isValidBarcodeFormat(barcode: string): boolean {
  return VALIDATION_PATTERNS.barcode.test(barcode);
}

/**
 * Check if a product handle exists in Shopify
 */
export async function checkHandleExists(
  admin: AdminApiContext,
  handle: string
): Promise<ValidationResponse> {
  if (!isValidHandleFormat(handle)) {
    return {
      isValid: false,
      message: ERROR_MESSAGES.handle.invalid,
    };
  }

  try {
    const response = await admin.graphql(VALIDATE_PRODUCT_HANDLE, {
      variables: { handle },
    });

    const result = await response.json() as ShopifyGraphQLResponse<{
      productByIdentifier: {
        id: string;
        title: string;
      } | null;
    }>;

    const existingProduct = result.data?.productByIdentifier;
    const exists = !!existingProduct;

    if (exists) {
      return {
        isValid: false,
        exists: true,
        message: ERROR_MESSAGES.handle.exists,
        conflictingProducts: [{
          id: existingProduct.id,
          title: existingProduct.title,
          handle: handle,
        }],
      };
    }

    return {
      isValid: true,
      exists: false,
    };
  } catch (error) {
    throw new Error(`Failed to validate handle: ${error}`);
  }
}

/**
 * Check if a SKU exists in Shopify
 */
export async function checkSkuExists(
  admin: AdminApiContext,
  sku: string,
  excludeProductId?: string
): Promise<ValidationResponse> {
  if (!isValidSkuFormat(sku)) {
    return {
      isValid: false,
      message: ERROR_MESSAGES.sku.invalid,
    };
  }

  try {
    const response = await admin.graphql(VALIDATE_SKU, {
      variables: { query: `sku:'${sku}'` },
    });

    const result = await response.json() as ShopifyGraphQLResponse<{
      productVariants: {
        edges: Array<{
          node: {
            id: string;
            sku: string;
            product: {
              id: string;
              title: string;
            };
          };
        }>;
      };
    }>;

    const variants = result.data?.productVariants.edges || [];
    const conflictingVariants = excludeProductId
      ? variants.filter(v => v.node.product.id !== excludeProductId)
      : variants;

    const exists = conflictingVariants.length > 0;

    if (exists) {
      return {
        isValid: false,
        exists: true,
        message: ERROR_MESSAGES.sku.exists,
        conflictingProducts: conflictingVariants.map(edge => ({
          id: edge.node.product.id,
          title: edge.node.product.title,
        })),
      };
    }

    return {
      isValid: true,
      exists: false,
    };
  } catch (error) {
    throw new Error(`Failed to validate SKU: ${error}`);
  }
}

/**
 * Check if a barcode exists in Shopify
 */
export async function checkBarcodeExists(
  admin: AdminApiContext,
  barcode: string,
  excludeProductId?: string
): Promise<ValidationResponse> {
  if (!isValidBarcodeFormat(barcode)) {
    return {
      isValid: false,
      message: ERROR_MESSAGES.barcode.invalid,
    };
  }

  try {
    const response = await admin.graphql(VALIDATE_BARCODE, {
      variables: { query: `barcode:'${barcode}'` },
    });

    const result = await response.json() as ShopifyGraphQLResponse<{
      productVariants: {
        edges: Array<{
          node: {
            id: string;
            barcode: string;
            product: {
              id: string;
              title: string;
              handle: string;
            };
          };
        }>;
      };
    }>;

    const variants = result.data?.productVariants.edges || [];
    const conflictingVariants = excludeProductId
      ? variants.filter(v => v.node.product.id !== excludeProductId)
      : variants;

    const exists = conflictingVariants.length > 0;

    if (exists) {
      return {
        isValid: false,
        exists: true,
        message: ERROR_MESSAGES.barcode.exists,
        conflictingProducts: conflictingVariants.map(edge => ({
          id: edge.node.product.id,
          title: edge.node.product.title,
        })),
      };
    }

    return {
      isValid: true,
      exists: false,
    };
  } catch (error) {
    throw new Error(`Failed to validate barcode: ${error}`);
  }
}

/**
 * Batch validate multiple SKUs
 */
export async function batchValidateSkus(
  admin: AdminApiContext,
  skus: string[],
  excludeProductId?: string
): Promise<BatchValidationResponse> {
  const results: BatchValidationResponse['results'] = {};

  // First, check format validity
  for (const sku of skus) {
    if (!sku) continue;
    
    if (!isValidSkuFormat(sku)) {
      results[sku] = {
        isValid: false,
        exists: false,
      };
    }
  }

  // Filter valid SKUs for existence check
  const validSkus = skus.filter(sku => sku && isValidSkuFormat(sku));
  
  if (validSkus.length === 0) {
    return { results };
  }

  // Build query for all valid SKUs
  const skuQuery = validSkus.map(sku => `sku:'${sku}'`).join(' OR ');
  
  const query = `#graphql
    query checkMultipleSkus($query: String!) {
      productVariants(first: 250, query: $query) {
        edges {
          node {
            id
            sku
            product {
              id
              title
            }
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(query, {
      variables: { query: skuQuery },
    });

    const result = await response.json() as ShopifyGraphQLResponse<{
      productVariants: {
        edges: Array<{
          node: {
            id: string;
            sku: string;
            product: {
              id: string;
              title: string;
            };
          };
        }>;
      };
    }>;

    const existingVariants = result.data?.productVariants.edges || [];

    // Initialize all valid SKUs as valid and not existing
    for (const sku of validSkus) {
      results[sku] = {
        isValid: true,
        exists: false,
      };
    }

    // Mark existing SKUs
    for (const edge of existingVariants) {
      const sku = edge.node.sku;
      if (sku && validSkus.includes(sku)) {
        const isOwnProduct = excludeProductId && edge.node.product.id === excludeProductId;
        
        if (!isOwnProduct) {
          results[sku] = {
            isValid: false,
            exists: true,
            productTitle: edge.node.product.title,
          };
        }
      }
    }

    return { results };
  } catch (error) {
    throw new Error(`Failed to batch validate SKUs: ${error}`);
  }
}

/**
 * Batch validate multiple barcodes
 */
export async function batchValidateBarcodes(
  admin: AdminApiContext,
  barcodes: string[],
  excludeProductId?: string
): Promise<BatchValidationResponse> {
  const results: BatchValidationResponse['results'] = {};

  // First, check format validity
  for (const barcode of barcodes) {
    if (!barcode) continue;
    
    if (!isValidBarcodeFormat(barcode)) {
      results[barcode] = {
        isValid: false,
        exists: false,
      };
    }
  }

  // Filter valid barcodes for existence check
  const validBarcodes = barcodes.filter(barcode => barcode && isValidBarcodeFormat(barcode));
  
  if (validBarcodes.length === 0) {
    return { results };
  }

  // Build query for all valid barcodes
  const barcodeQuery = validBarcodes.map(barcode => `barcode:'${barcode}'`).join(' OR ');
  
  const query = `#graphql
    query checkMultipleBarcodes($query: String!) {
      productVariants(first: 250, query: $query) {
        edges {
          node {
            id
            barcode
            product {
              id
              title
            }
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(query, {
      variables: { query: barcodeQuery },
    });

    const result = await response.json() as ShopifyGraphQLResponse<{
      productVariants: {
        edges: Array<{
          node: {
            id: string;
            barcode: string;
            product: {
              id: string;
              title: string;
            };
          };
        }>;
      };
    }>;

    const existingVariants = result.data?.productVariants.edges || [];

    // Initialize all valid barcodes as valid and not existing
    for (const barcode of validBarcodes) {
      results[barcode] = {
        isValid: true,
        exists: false,
      };
    }

    // Mark existing barcodes
    for (const edge of existingVariants) {
      const barcode = edge.node.barcode;
      if (barcode && validBarcodes.includes(barcode)) {
        const isOwnProduct = excludeProductId && edge.node.product.id === excludeProductId;
        
        if (!isOwnProduct) {
          results[barcode] = {
            isValid: false,
            exists: true,
            productTitle: edge.node.product.title,
          };
        }
      }
    }

    return { results };
  } catch (error) {
    throw new Error(`Failed to batch validate barcodes: ${error}`);
  }
}

/**
 * Generate unique handle suggestions based on a base handle
 */
export async function generateHandleSuggestions(
  admin: AdminApiContext,
  baseHandle: string,
  count: number = 3
): Promise<string[]> {
  const suggestions: string[] = [];
  const cleanHandle = baseHandle.replace(/-\d+$/, ''); // Remove existing number suffix
  
  for (let i = 1; i <= count * 2 && suggestions.length < count; i++) {
    const suggestion = `${cleanHandle}-${i}`;
    const validation = await checkHandleExists(admin, suggestion);
    
    if (validation.isValid && !validation.exists) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions;
}