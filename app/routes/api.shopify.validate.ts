import type { ActionFunction } from "@remix-run/node";
import { authenticate } from "~/services/auth.server";
import { errorResponse, successResponse, logApiRequest } from "~/utils/api-response";
import { 
  checkSkuExists, 
  checkBarcodeExists, 
  checkHandleExists,
  batchValidateSkus,
  batchValidateBarcodes,
  validateSkuFormat,
  validateBarcodeFormat,
  validateHandleFormat,
  generateHandleSuggestions
} from "~/utils/validation";
import type { ValidationResponse, BatchValidationResponse } from "~/types";

type ValidationType = 'sku' | 'barcode' | 'handle' | 'sku-batch' | 'barcode-batch';

interface ValidationRequest {
  type: ValidationType;
  value?: string;
  values?: string[];
  productId?: string;
}

export const action: ActionFunction = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  logApiRequest("api.shopify.validate", "POST", { shop });

  try {
    const body: ValidationRequest = await request.json();
    const { type, value, values, productId } = body;

    switch (type) {
      case 'sku': {
        if (!value) {
          return errorResponse(
            new Error("SKU value is required"),
            "SKU value is required",
            { shop, endpoint: "api.shopify.validate" }
          );
        }

        // Check format first
        const formatValidation = validateSkuFormat(value);
        if (!formatValidation.isValid) {
          return successResponse<ValidationResponse>(formatValidation);
        }

        // Check existence
        const existsResult = await checkSkuExists(admin, value, productId);
        return successResponse<ValidationResponse>(existsResult);
      }

      case 'barcode': {
        if (!value) {
          return json<ValidationResponse>({ 
            isValid: false, 
            error: "Barcode value is required" 
          }, { status: 400 });
        }

        // Check format first
        const formatValidation = validateBarcodeFormat(value);
        if (!formatValidation.isValid) {
          return successResponse<ValidationResponse>(formatValidation);
        }

        // Check existence
        const existsResult = await checkBarcodeExists(admin, value, productId);
        return successResponse<ValidationResponse>(existsResult);
      }

      case 'handle': {
        if (!value) {
          return json<ValidationResponse>({ 
            isValid: false, 
            error: "Handle value is required" 
          }, { status: 400 });
        }

        // Check format
        const formatValidation = validateHandleFormat(value);
        if (!formatValidation.isValid) {
          return json<ValidationResponse>({
            ...formatValidation,
            suggestions: generateHandleSuggestions(value)
          });
        }

        // Check existence
        const existsResult = await checkHandleExists(admin, value, productId);
        if (!existsResult.isValid && !existsResult.error) {
          return json<ValidationResponse>({
            ...existsResult,
            suggestions: generateHandleSuggestions(value)
          });
        }

        return successResponse<ValidationResponse>(existsResult);
      }

      case 'sku-batch': {
        if (!values || !Array.isArray(values)) {
          return json<BatchValidationResponse>({ 
            results: [], 
            hasErrors: true 
          }, { status: 400 });
        }

        const results = await batchValidateSkus(admin, values, productId);
        const hasErrors = results.some(r => !r.isValid);
        
        return successResponse<BatchValidationResponse>({ results, hasErrors });
      }

      case 'barcode-batch': {
        if (!values || !Array.isArray(values)) {
          return json<BatchValidationResponse>({ 
            results: [], 
            hasErrors: true 
          }, { status: 400 });
        }

        const results = await batchValidateBarcodes(admin, values, productId);
        const hasErrors = results.some(r => !r.isValid);
        
        return successResponse<BatchValidationResponse>({ results, hasErrors });
      }

      default:
        return errorResponse(
          new Error(`Invalid validation type: ${type}`),
          `Invalid validation type: ${type}`,
          { shop, endpoint: "api.shopify.validate" }
        );
    }
  } catch (error) {
    return errorResponse(
      error,
      "An error occurred during validation",
      { shop, endpoint: "api.shopify.validate" }
    );
  }
};