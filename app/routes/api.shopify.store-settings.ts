import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { logger, Logger } from "../services/logger.server";
import { GET_STORE_SETTINGS } from "../graphql";
import { 
  retryWithBackoff, 
  parseGraphQLResponse, 
  errorResponse 
} from "../services/errorHandler.server";
import type { GraphQLErrorResponse } from "../types/errors";

export const loader = async ({ request }: { request: Request }) => {
  const requestId = Logger.generateRequestId();
  const { admin, session } = await authenticateAdmin(request);
  const context = {
    operation: 'storesettings',
    shop: session.shop,
    requestId,
  };

  try {
    // Query the shop to get the default weight unit with retry logic
    const responseJson = await retryWithBackoff(
      async () => {
        const response = await admin.graphql(GET_STORE_SETTINGS);
        return await response.json();
      },
      { maxRetries: 2 },
      context
    ) as GraphQLErrorResponse;
    
    // Check for errors using centralized parser
    const error = parseGraphQLResponse(responseJson);
    if (error) {
      return errorResponse(error, context);
    }

    const shop = responseJson.data?.shop;
    
    return json({
      defaultWeightUnit: shop?.weightUnit || 'POUNDS',
      currencyCode: shop?.currencyCode,
      name: shop?.name,
      currencyFormats: shop?.currencyFormats
    });
  } catch (error) {
    return errorResponse(error, context);
  }
}; 