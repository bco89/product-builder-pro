import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
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