import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { generateHandle } from "../utils/handleGenerator";
import { logger, Logger } from "../services/logger.server";
import { VALIDATE_PRODUCT_HANDLE } from "../graphql";
import { 
  retryWithBackoff, 
  parseGraphQLResponse, 
  errorResponse 
} from "../services/errorHandler.server";
import type { GraphQLErrorResponse } from "../types/errors";

export const loader = async ({ request }: { request: Request }): Promise<Response> => {
  const requestId = Logger.generateRequestId();
  const { admin, session } = await authenticateAdmin(request);
  const context = {
    operation: 'validatehandle',
    shop: session.shop,
    requestId,
  };
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');

  if (!handle) {
    return json({ error: 'Handle parameter is required' }, { status: 400 });
  }

  try {
    // Query Shopify to check if handle exists using productByIdentifier
    const response = await admin.graphql(VALIDATE_PRODUCT_HANDLE, {
      variables: { handle }
    });

    const result = await response.json();
    if (!result.data) {
      throw new Error('Invalid GraphQL response');
    }
    
    // productByIdentifier returns null if no product exists with that handle
    const existingProduct = result.data.productByIdentifier;
    
    const available = !existingProduct;
    
    let suggestions: string[] = [];
    if (!available) {
      // Generate alternative handles if the requested one is taken
      const baseHandle = handle.replace(/-\d+$/, ''); // Remove existing number suffix
      suggestions = [];
      
      for (let i = 1; i <= 5; i++) {
        const suggestion = `${baseHandle}-${i}`;
        
        // Check if this suggestion is also taken
        const suggestionResponse = await admin.graphql(VALIDATE_PRODUCT_HANDLE, {
          variables: { handle: suggestion }
        });
        
        const suggestionResult = await suggestionResponse.json();
        
        if (suggestionResult.data && !suggestionResult.data.productByIdentifier) {
          suggestions.push(suggestion);
          if (suggestions.length >= 3) break; // Limit to 3 suggestions
        }
      }
    }

    return json({
      available,
      handle,
      suggestions,
      ...(existingProduct && {
        conflictingProduct: {
          handle: handle,
          title: existingProduct.title || 'Unknown Product'
        }
      })
    });

  } catch (error) {
    return errorResponse(error, context);
  }
}; 