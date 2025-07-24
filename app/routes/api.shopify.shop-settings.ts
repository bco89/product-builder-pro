import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { prisma } from "../db.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { 
  retryWithBackoff, 
  parseGraphQLResponse, 
  errorResponse 
} from "../services/errorHandler.server";
import type { GraphQLErrorResponse } from "../types/errors";

export const loader = async ({
  const requestId = Logger.generateRequestId(); request }: LoaderFunctionArgs) => {
  const { session } = await authenticateAdmin(request);
  
  const settings = await prisma.shopSettings.findUnique({
    where: { shop: session.shop }
  });

  // Return settings with default values if they don't exist
  const defaultSettings = {
    businessType: 'retailer',
    storeName: '',
    uniqueSellingPoints: '',
    coreValues: '',
    brandPersonality: '',
  };

  return json(settings ? { ...defaultSettings, ...settings } : defaultSettings);
};