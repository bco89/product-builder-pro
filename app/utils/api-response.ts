import { json } from "@remix-run/node";
import { logger } from "../services/logger.server";

interface ErrorResponse {
  error: string;
  code?: string;
  details?: string;
}


/**
 * Standardized error response handler for API routes
 */
export function errorResponse(
  error: unknown, 
  defaultMessage: string = "An unexpected error occurred",
  context?: { shop?: string; endpoint?: string }
): ReturnType<typeof json> {
  // Log the error
  if (context?.endpoint) {
    logger.error(`API Error [${context.endpoint}]:`, error, context);
  } else {
    logger.error("API Error:", error, context);
  }

  // Handle known error types
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('API key') || error.message.includes('not configured')) {
      return json<ErrorResponse>({
        error: 'Service not configured. Please contact support.',
        code: 'SERVICE_NOT_CONFIGURED',
        details: 'The requested service is not properly configured.'
      }, { status: 503 });
    }

    if (error.message.includes('Invalid') || error.message.includes('validation')) {
      return json<ErrorResponse>({
        error: error.message,
        code: 'VALIDATION_ERROR',
        details: 'The provided data failed validation.'
      }, { status: 400 });
    }

    if (error.message.includes('not found')) {
      return json<ErrorResponse>({
        error: error.message,
        code: 'NOT_FOUND',
        details: 'The requested resource was not found.'
      }, { status: 404 });
    }

    // Generic error with message
    return json<ErrorResponse>({
      error: error.message || defaultMessage,
      code: 'ERROR',
      details: defaultMessage
    }, { status: 500 });
  }

  // Unknown error type
  return json<ErrorResponse>({
    error: defaultMessage,
    code: 'UNKNOWN_ERROR',
    details: 'An unexpected error occurred. Please try again.'
  }, { status: 500 });
}

/**
 * Standardized success response for API routes
 */
export function successResponse<T>(data: T, status: number = 200): ReturnType<typeof json> {
  return json({ ...data, success: true } as T & { success: true }, { status });
}

/**
 * Log API request details
 */
export function logApiRequest(
  endpoint: string, 
  method: string, 
  context?: { shop?: string; [key: string]: any }
): void {
  logger.info(`API Request [${method} ${endpoint}]`, context);
}

/**
 * Log API error with context
 */
export function logApiError(
  endpoint: string,
  error: unknown,
  context?: { shop?: string; [key: string]: any }
): void {
  logger.error(`API Error [${endpoint}]:`, error, { ...context, endpoint });
}