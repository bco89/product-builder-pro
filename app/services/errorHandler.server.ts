/**
 * Centralized error handling service with retry logic and GraphQL error parsing
 */

import { json } from "@remix-run/node";
import { logger } from "./logger.server";
import { getErrorMessage } from "./errorMessages";
import type {
  ErrorCode,
  ErrorContext,
  ErrorResponse,
  GraphQLError,
  GraphQLErrorResponse,
  ParsedError,
  RetryOptions,
} from "../types/errors";
import {
  isRateLimitError,
  isTransientError,
  ErrorCode as EC,
} from "../types/errors";

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error, attempt) => {
    // Don't retry after max attempts
    if (attempt >= DEFAULT_RETRY_OPTIONS.maxRetries) return false;
    
    // Always retry rate limit and transient errors
    if (isRateLimitError(error) || isTransientError(error)) return true;
    
    // Don't retry client errors (4xx) except rate limiting
    const statusCode = error?.statusCode || error?.status;
    if (statusCode >= 400 && statusCode < 500) return false;
    
    return true;
  },
};

/**
 * Execute an operation with retry logic and exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
  context: ErrorContext = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      // Add attempt to context for logging
      const attemptContext = { ...context, attempt: attempt + 1 };
      
      // Log retry attempt if not first try
      if (attempt > 0) {
        logger.info(`Retrying operation after error`, attemptContext);
      }
      
      const startTime = Date.now();
      const result = await operation();
      
      // Log successful recovery if it was a retry
      if (attempt > 0) {
        logger.info(`Operation succeeded after ${attempt} retries`, {
          ...attemptContext,
          duration: Date.now() - startTime,
        });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Parse the error
      const parsedError = parseError(error);
      
      // Check if we should retry
      if (!opts.shouldRetry(error, attempt) || attempt === opts.maxRetries - 1) {
        logger.error(`Operation failed after ${attempt + 1} attempts`, error, {
          ...context,
          attempt: attempt + 1,
          errorCode: parsedError.code,
        });
        throw error;
      }
      
      // Calculate delay with exponential backoff
      let delay = opts.initialDelay * Math.pow(2, attempt);
      
      // Respect Retry-After header for rate limiting
      if (parsedError.retryAfter) {
        delay = parsedError.retryAfter * 1000; // Convert seconds to ms
      }
      
      // Cap the delay at maxDelay
      delay = Math.min(delay, opts.maxDelay);
      
      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        ...context,
        attempt: attempt + 1,
        nextAttempt: attempt + 2,
        delay,
        errorCode: parsedError.code,
        errorMessage: parsedError.message,
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw in the loop
  throw lastError;
}

/**
 * Parse various error types into a standardized format
 */
export function parseError(error: any): ParsedError {
  // Handle Response objects
  if (error instanceof Response) {
    return {
      message: error.statusText || 'Request failed',
      code: getErrorCodeFromStatus(error.status),
      statusCode: error.status,
      isRetryable: isTransientError({ statusCode: error.status }),
    };
  }
  
  // Handle GraphQL errors
  if (error?.errors && Array.isArray(error.errors)) {
    return parseGraphQLErrors(error.errors);
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      code: EC.UNKNOWN_ERROR,
      statusCode: 500,
      isRetryable: isTransientError(error),
      originalError: error,
    };
  }
  
  // Handle error-like objects
  if (error && typeof error === 'object') {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || error.error || 'Unknown error';
    
    return {
      message,
      code: getErrorCodeFromStatus(statusCode),
      statusCode,
      isRetryable: isRateLimitError(error) || isTransientError(error),
      retryAfter: error.retryAfter,
      originalError: error,
    };
  }
  
  // Fallback for unknown error types
  return {
    message: String(error),
    code: EC.UNKNOWN_ERROR,
    statusCode: 500,
    isRetryable: false,
    originalError: error,
  };
}

/**
 * Parse GraphQL errors array
 */
function parseGraphQLErrors(errors: GraphQLError[]): ParsedError {
  // Find the most relevant error
  const primaryError = errors[0];
  
  // Check for rate limiting
  const rateLimitError = errors.find(isRateLimitError);
  if (rateLimitError) {
    return {
      message: rateLimitError.message,
      code: EC.RATE_LIMITED,
      statusCode: 429,
      isRetryable: true,
      retryAfter: rateLimitError.retryAfter,
      originalError: errors,
    };
  }
  
  // Check for specific error codes
  const errorCode = primaryError.extensions?.code;
  const code = mapGraphQLErrorCode(errorCode);
  
  return {
    message: primaryError.message,
    code,
    statusCode: getStatusCodeFromErrorCode(code),
    isRetryable: isTransientError(primaryError),
    field: primaryError.path as string[],
    originalError: errors,
  };
}

/**
 * Parse GraphQL response for errors (including userErrors)
 */
export function parseGraphQLResponse(response: GraphQLErrorResponse): ParsedError | null {
  // Check for top-level errors
  if (response.errors && response.errors.length > 0) {
    return parseGraphQLErrors(response.errors);
  }
  
  // Check for user errors in mutations
  if (response.data) {
    for (const key in response.data) {
      const operation = response.data[key];
      if (operation?.userErrors && operation.userErrors.length > 0) {
        const userError = operation.userErrors[0];
        return {
          message: userError.message,
          code: EC.USER_ERROR,
          statusCode: 400,
          field: userError.field || undefined,
          isRetryable: false,
          originalError: operation.userErrors,
        };
      }
    }
  }
  
  return null;
}

/**
 * Create a JSON response with error
 */
export function errorResponse(
  error: any,
  context: ErrorContext = {}
): Response {
  const parsedError = parseError(error);
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Log the error
  logger.error(parsedError.message, error, {
    ...context,
    errorCode: parsedError.code,
    statusCode: parsedError.statusCode,
  });
  
  // Get user-friendly message
  const userMessage = getErrorMessage(parsedError.code, parsedError.message);
  
  const response: ErrorResponse = {
    error: {
      message: userMessage,
      code: parsedError.code,
      field: parsedError.field,
      // Include details only in development
      details: isDevelopment ? parsedError.originalError : undefined,
    },
    requestId: context.requestId,
  };
  
  return json(response, { status: parsedError.statusCode });
}

/**
 * Map GraphQL error codes to our error codes
 */
function mapGraphQLErrorCode(code?: string): ErrorCode {
  if (!code) return EC.GRAPHQL_ERROR;
  
  switch (code) {
    case 'THROTTLED':
      return EC.RATE_LIMITED;
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
      return EC.UNAUTHORIZED;
    case 'NOT_FOUND':
      return EC.RESOURCE_NOT_FOUND;
    case 'INVALID':
    case 'ARGUMENT_ERROR':
      return EC.VALIDATION_ERROR;
    case 'INTERNAL_SERVER_ERROR':
      return EC.SERVER_ERROR;
    default:
      return EC.GRAPHQL_ERROR;
  }
}

/**
 * Get error code from HTTP status
 */
function getErrorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 401:
      return EC.UNAUTHENTICATED;
    case 403:
      return EC.UNAUTHORIZED;
    case 404:
      return EC.RESOURCE_NOT_FOUND;
    case 429:
      return EC.RATE_LIMITED;
    case 400:
      return EC.VALIDATION_ERROR;
    case 500:
    case 502:
    case 503:
    case 504:
      return EC.SERVER_ERROR;
    default:
      return EC.UNKNOWN_ERROR;
  }
}

/**
 * Get HTTP status code from error code
 */
function getStatusCodeFromErrorCode(code: ErrorCode): number {
  switch (code) {
    case EC.UNAUTHENTICATED:
    case EC.SESSION_EXPIRED:
      return 401;
    case EC.UNAUTHORIZED:
      return 403;
    case EC.RESOURCE_NOT_FOUND:
      return 404;
    case EC.RATE_LIMITED:
    case EC.QUOTA_EXCEEDED:
      return 429;
    case EC.VALIDATION_ERROR:
    case EC.DUPLICATE_VALUE:
    case EC.USER_ERROR:
      return 400;
    case EC.SERVER_ERROR:
    case EC.SERVICE_UNAVAILABLE:
      return 503;
    case EC.NETWORK_ERROR:
      return 502;
    default:
      return 500;
  }
}

/**
 * Extract Retry-After header value from error
 */
export function getRetryAfter(error: any): number | undefined {
  // Check for explicit retryAfter property
  if (error?.retryAfter) return error.retryAfter;
  
  // Check Response headers
  if (error instanceof Response) {
    const retryAfter = error.headers.get('Retry-After');
    if (retryAfter) {
      // Parse as seconds (could be number or date)
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? undefined : seconds;
    }
  }
  
  // Check for Shopify-specific rate limit info
  if (error?.extensions?.cost) {
    const { requestedQueryCost, throttleStatus } = error.extensions.cost;
    if (throttleStatus?.currentlyAvailable < requestedQueryCost) {
      // Estimate based on restore rate (usually 50/second for Shopify)
      const needed = requestedQueryCost - throttleStatus.currentlyAvailable;
      return Math.ceil(needed / 50);
    }
  }
  
  return undefined;
}