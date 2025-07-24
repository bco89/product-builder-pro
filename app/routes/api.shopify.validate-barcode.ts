import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { requestCache, RequestCache } from "../services/requestCache.server";
import { ShopDataService } from "../services/shopData.server";
import { logger } from "../services/logger.server";
import { VALIDATE_BARCODE } from "../graphql";

interface BarcodeValidationResult {
  available: boolean;
  conflictingProduct?: {
    id: string;
    title: string;
    handle: string;
  };
}

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticateAdmin(request);
  const url = new URL(request.url);
  const barcode = url.searchParams.get('barcode');

  if (!barcode) {
    return json({ error: 'Barcode parameter is required' }, { status: 400 });
  }

  try {
    // Get shop data service
    const shopDataService = ShopDataService.getInstance(request.headers.get('host') || '');
    
    // Check cache first
    const cachedResult = shopDataService.getCachedValidationResult('barcode', barcode);
    if (cachedResult) {
      logger.debug('Barcode validation cache hit', { barcode });
      return json(cachedResult);
    }
    
    // Generate cache key for request deduplication
    const cacheKey = RequestCache.generateKey('validate-barcode', { barcode });
    
    return await requestCache.deduplicate(cacheKey, async () => {
      const response = await admin.graphql(VALIDATE_BARCODE, {
        variables: { query: `barcode:'${barcode}'` }
      });

      const data = await response.json();
      const variants = data.data?.productVariants?.edges || [];
      
      // Check if any variant has this exact barcode
      const matchingVariant = variants.find((edge: any) => 
        edge.node.barcode === barcode
      );
      
      if (matchingVariant) {
        const result: BarcodeValidationResult = {
          available: false,
          conflictingProduct: {
            id: matchingVariant.node.product.id,
            title: matchingVariant.node.product.title,
            handle: matchingVariant.node.product.handle || ''
          }
        };
        
        // Cache the result
        shopDataService.cacheValidationResult('barcode', barcode, result);
        
        return json(result);
      }

      // No conflicts found
      const result: BarcodeValidationResult = {
        available: true
      };
      
      // Cache the result
      shopDataService.cacheValidationResult('barcode', barcode, result);
      
      return json(result);
    });

  } catch (error) {
    console.error('Error validating Barcode:', error);
    return json(
      { error: 'Failed to validate Barcode' },
      { status: 500 }
    );
  }
}; 