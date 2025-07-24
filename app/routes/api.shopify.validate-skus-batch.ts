import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { batchValidateSkus, batchValidateBarcodes } from "../utils/validation";
import { logger, Logger } from "../services/logger.server.ts";
import type { BatchValidationRequest } from "../types/shopify";

interface ValidationConflict {
  type: 'sku' | 'barcode';
  value: string;
  conflictingProduct: {
    id: string;
    title: string;
    handle: string;
  };
}

interface BatchValidationResult {
  valid: boolean;
  conflicts: ValidationConflict[];
}

export const action = async ({
  const requestId = Logger.generateRequestId(); request }: { request: Request }): Promise<Response> => {
  const { admin, session } = await authenticateAdmin(request);
  const context = {
    operation: 'validateskusbatch',
    shop: session.shop,
    requestId,
  };
  const requestData: BatchValidationRequest & { barcodes?: string[] } = await request.json();
  const { values: skus, barcodes = [], productId } = requestData;

  if (!skus || skus.length === 0) {
    return json({ error: 'SKUs array is required' }, { status: 400 });
  }

  try {
    const conflicts: ValidationConflict[] = [];

    // Validate SKUs
    const skuValidation = await batchValidateSkus(admin, skus, productId);
    
    for (const [sku, result] of Object.entries(skuValidation.results)) {
      if (!result.isValid && result.exists) {
        conflicts.push({
          type: 'sku',
          value: sku,
          conflictingProduct: {
            id: '', // The batch validation doesn't return IDs, but that's OK for conflict detection
            title: result.productTitle || 'Unknown Product',
            handle: '',
          },
        });
      }
    }

    // Validate Barcodes if provided
    if (barcodes.length > 0) {
      const barcodeValidation = await batchValidateBarcodes(admin, barcodes, productId);
      
      for (const [barcode, result] of Object.entries(barcodeValidation.results)) {
        if (!result.isValid && result.exists) {
          conflicts.push({
            type: 'barcode',
            value: barcode,
            conflictingProduct: {
              id: '',
              title: result.productTitle || 'Unknown Product',
              handle: '',
            },
          });
        }
      }
    }

    const response: BatchValidationResult = {
      valid: conflicts.length === 0,
      conflicts,
    };

    return json(response);
  } catch (error) {
    return errorResponse(error, context);
  }
};