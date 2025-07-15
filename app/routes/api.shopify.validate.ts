import type { ActionFunction } from "@remix-run/node";
import { authenticate } from "~/services/auth.server";
import { errorResponse, successResponse, logApiRequest } from "~/utils/api-response";
import { 
  checkSkuExists, 
  checkBarcodeExists, 
  checkHandleExists,
  batchValidateSkus,
  batchValidateBarcodes,
  isValidSkuFormat,
  isValidBarcodeFormat,
  isValidHandleFormat,
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
        if (!isValidSkuFormat(value)) {
          return successResponse<ValidationResponse>({
            isValid: false,
            error: 'SKU must contain only letters, numbers, hyphens, and underscores'
          });
        }

        // Check existence
        const existsResult = await checkSkuExists(admin, value, productId);
        return successResponse<ValidationResponse>(existsResult);
      }

      case 'barcode': {
        if (!value) {
          return errorResponse(
            new Error("Barcode value is required"),
            "Barcode value is required",
            { shop, endpoint: "api.shopify.validate" }
          );
        }

        // Check format first
        if (!isValidBarcodeFormat(value)) {
          return successResponse<ValidationResponse>({
            isValid: false,
            error: 'Barcode must contain only numbers'
          });
        }

        // Check existence
        const existsResult = await checkBarcodeExists(admin, value, productId);
        return successResponse<ValidationResponse>(existsResult);
      }

      case 'handle': {
        if (!value) {
          return errorResponse(
            new Error("Handle value is required"),
            "Handle value is required",
            { shop, endpoint: "api.shopify.validate" }
          );
        }

        // Check format
        if (!isValidHandleFormat(value)) {
          return successResponse<ValidationResponse>({
            isValid: false,
            error: 'Handle must contain only lowercase letters, numbers, and hyphens',
            suggestions: await generateHandleSuggestions(admin, value)
          });
        }

        // Check existence
        const existsResult = await checkHandleExists(admin, value, productId);
        if (!existsResult.isValid && !existsResult.error) {
          return successResponse<ValidationResponse>({
            ...existsResult,
            suggestions: await generateHandleSuggestions(admin, value)
          });
        }

        return successResponse<ValidationResponse>(existsResult);
      }

      case 'sku-batch': {
        if (!values || !Array.isArray(values)) {
          return errorResponse(
            new Error("SKU values array is required"),
            "SKU values array is required",
            { shop, endpoint: "api.shopify.validate" }
          );
        }

        const results = await batchValidateSkus(admin, values, productId);
        const hasErrors = results.some(r => !r.isValid);
        
        return successResponse<BatchValidationResponse>({ results, hasErrors });
      }

      case 'barcode-batch': {
        if (!values || !Array.isArray(values)) {
          return errorResponse(
            new Error("Barcode values array is required"),
            "Barcode values array is required",
            { shop, endpoint: "api.shopify.validate" }
          );
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