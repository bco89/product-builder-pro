/**
 * User-friendly error message mappings
 */

import { ErrorCode } from "../types/errors";

/**
 * Map of error codes to user-friendly messages
 */
const errorMessages: Record<ErrorCode, string> = {
  // Authentication errors
  [ErrorCode.UNAUTHENTICATED]: "Please log in to continue",
  [ErrorCode.UNAUTHORIZED]: "You don't have permission to perform this action",
  [ErrorCode.SESSION_EXPIRED]: "Your session has expired. Please reload the page",
  
  // Rate limiting
  [ErrorCode.RATE_LIMITED]: "Too many requests. Please wait a moment and try again",
  [ErrorCode.QUOTA_EXCEEDED]: "API quota exceeded. Please try again later",
  
  // Validation errors
  [ErrorCode.VALIDATION_ERROR]: "Please check your input and try again",
  [ErrorCode.DUPLICATE_VALUE]: "This value already exists. Please use a different one",
  [ErrorCode.RESOURCE_NOT_FOUND]: "The requested item could not be found",
  
  // GraphQL specific
  [ErrorCode.GRAPHQL_ERROR]: "An error occurred while processing your request",
  [ErrorCode.USER_ERROR]: "Please correct the highlighted fields and try again",
  
  // Network/server errors
  [ErrorCode.NETWORK_ERROR]: "Connection error. Please check your internet connection",
  [ErrorCode.SERVER_ERROR]: "Server error. Please try again later",
  [ErrorCode.SERVICE_UNAVAILABLE]: "Service temporarily unavailable. Please try again in a few moments",
  
  // Generic
  [ErrorCode.UNKNOWN_ERROR]: "An unexpected error occurred. Please try again",
};

/**
 * Field-specific error message patterns
 */
const fieldErrorPatterns: Array<{
  pattern: RegExp;
  getMessage: (field: string, originalMessage: string) => string;
}> = [
  {
    pattern: /duplicate/i,
    getMessage: (field) => `This ${formatFieldName(field)} is already in use`,
  },
  {
    pattern: /required|blank|empty/i,
    getMessage: (field) => `${formatFieldName(field)} is required`,
  },
  {
    pattern: /invalid|format/i,
    getMessage: (field) => `${formatFieldName(field)} is invalid`,
  },
  {
    pattern: /too long|maximum/i,
    getMessage: (field) => `${formatFieldName(field)} is too long`,
  },
  {
    pattern: /too short|minimum/i,
    getMessage: (field) => `${formatFieldName(field)} is too short`,
  },
];

/**
 * Shopify-specific error message mappings
 */
const shopifyErrorPatterns: Array<{
  pattern: RegExp;
  message: string;
}> = [
  {
    pattern: /SKU.*already exists/i,
    message: "This SKU is already in use. Please choose a different one",
  },
  {
    pattern: /barcode.*already exists/i,
    message: "This barcode is already in use. Please choose a different one",
  },
  {
    pattern: /handle.*already exists/i,
    message: "This product URL is already in use. Please choose a different one",
  },
  {
    pattern: /media.*failed/i,
    message: "Failed to upload image. Please try a different image or try again later",
  },
  {
    pattern: /variant.*limit/i,
    message: "Maximum number of variants reached for this product",
  },
  {
    pattern: /inventory.*negative/i,
    message: "Inventory quantity cannot be negative",
  },
  {
    pattern: /price.*invalid/i,
    message: "Please enter a valid price",
  },
];

/**
 * Get user-friendly error message
 */
export function getErrorMessage(
  code: ErrorCode,
  originalMessage?: string,
  field?: string[]
): string {
  // Check for Shopify-specific patterns first
  if (originalMessage) {
    for (const { pattern, message } of shopifyErrorPatterns) {
      if (pattern.test(originalMessage)) {
        return message;
      }
    }
  }
  
  // If we have a field and original message, try field-specific patterns
  if (field && field.length > 0 && originalMessage) {
    const fieldName = field[field.length - 1]; // Get the last field in the path
    
    for (const { pattern, getMessage } of fieldErrorPatterns) {
      if (pattern.test(originalMessage)) {
        return getMessage(fieldName, originalMessage);
      }
    }
  }
  
  // Return the mapped message for the error code
  return errorMessages[code] || errorMessages[ErrorCode.UNKNOWN_ERROR];
}

/**
 * Format field name for display
 */
function formatFieldName(field: string): string {
  // Handle common field names
  const fieldMappings: Record<string, string> = {
    sku: 'SKU',
    barcode: 'Barcode',
    title: 'Product name',
    handle: 'Product URL',
    descriptionHtml: 'Description',
    vendor: 'Vendor',
    productType: 'Product type',
    tags: 'Tags',
    price: 'Price',
    compareAtPrice: 'Compare at price',
    weight: 'Weight',
    inventoryQuantity: 'Inventory quantity',
  };
  
  // Check for direct mapping
  if (fieldMappings[field]) {
    return fieldMappings[field];
  }
  
  // Convert camelCase to Title Case
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Get error message for network errors with context
 */
export function getNetworkErrorMessage(error: any): string {
  if (error?.code === 'ECONNREFUSED') {
    return "Unable to connect to Shopify. Please check your internet connection";
  }
  
  if (error?.code === 'ETIMEDOUT') {
    return "Request timed out. Please try again";
  }
  
  if (error?.code === 'ENOTFOUND') {
    return "Unable to reach Shopify servers. Please check your internet connection";
  }
  
  return errorMessages[ErrorCode.NETWORK_ERROR];
}