/**
 * Error types and interfaces for centralized error handling
 */

import type { ShopifyGraphQLError } from "./shopify";
import type { UserError } from "../graphql/types";

/**
 * Extended GraphQL error with additional context
 */
export interface GraphQLError extends ShopifyGraphQLError {
  statusCode?: number;
  requestId?: string;
  retryAfter?: number; // Seconds to wait before retry (from Retry-After header)
}

/**
 * Options for retry logic
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

/**
 * Context for error logging
 */
export interface ErrorContext {
  operation?: string;
  shop?: string;
  requestId?: string;
  userId?: string;
  variables?: Record<string, any>;
  attempt?: number;
  duration?: number;
  [key: string]: any;
}

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  error: {
    message: string;
    code?: ErrorCode;
    field?: string[];
    details?: any; // Only included in development
  };
  requestId?: string;
}

/**
 * Error codes for client-side handling
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHENTICATED = "UNAUTHENTICATED",
  UNAUTHORIZED = "UNAUTHORIZED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  
  // Rate limiting
  RATE_LIMITED = "RATE_LIMITED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  
  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  DUPLICATE_VALUE = "DUPLICATE_VALUE",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  
  // GraphQL specific
  GRAPHQL_ERROR = "GRAPHQL_ERROR",
  USER_ERROR = "USER_ERROR",
  
  // Network/server errors
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  
  // Generic
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

/**
 * Parsed error information
 */
export interface ParsedError {
  message: string;
  code: ErrorCode;
  statusCode: number;
  field?: string[];
  isRetryable: boolean;
  retryAfter?: number;
  originalError?: any;
}

/**
 * GraphQL response with errors
 */
export interface GraphQLErrorResponse {
  errors?: GraphQLError[];
  data?: {
    [key: string]: {
      userErrors?: UserError[];
      [key: string]: any;
    };
  };
}


/**
 * Type guard for rate limit errors
 */
export function isRateLimitError(error: any): boolean {
  if (error?.statusCode === 429) return true;
  if (error?.extensions?.code === 'THROTTLED') return true;
  if (error?.message?.toLowerCase().includes('rate limit')) return true;
  if (error?.message?.toLowerCase().includes('throttle')) return true;
  return false;
}

/**
 * Type guard for transient errors that should be retried
 */
export function isTransientError(error: any): boolean {
  const statusCode = error?.statusCode || error?.status;
  if ([500, 502, 503, 504].includes(statusCode)) return true;
  if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') return true;
  if (error?.message?.toLowerCase().includes('network')) return true;
  return false;
}