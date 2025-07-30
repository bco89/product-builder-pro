import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { checkSkuExists } from "../utils/validation";
import { logger } from "../services/logger.server.ts";
import { requestCache, RequestCache } from "../services/requestCache.server";
import { ShopDataService } from "../services/shopData.server";

export const loader = async ({ request }: { request: Request }): Promise<Response> => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const sku = url.searchParams.get('sku');
  const productId = url.searchParams.get('productId'); // Optional: exclude current product

  if (!sku) {
    return json({ error: 'SKU parameter is required' }, { status: 400 });
  }

  try {
    // Get shop data service
    const shopDataService = ShopDataService.getInstance(request.headers.get('host') || '');
    
    // Check cache first
    const cachedResult = shopDataService.getCachedValidationResult('sku', sku);
    if (cachedResult && (!productId || cachedResult.productId === productId)) {
      logger.debug('SKU validation cache hit', { sku });
      return json(cachedResult.response);
    }
    
    // Generate cache key for request deduplication
    const cacheKey = RequestCache.generateKey('validate-sku', { sku, productId: productId || '' });
    
    return await requestCache.deduplicate(cacheKey, async () => {
      const validation = await checkSkuExists(admin, sku, productId || undefined);
      
      // Transform to match existing API response format
      const response = {
        available: validation.isValid && !validation.exists,
        ...(validation.conflictingProducts && validation.conflictingProducts.length > 0 && {
          conflictingProduct: {
            id: validation.conflictingProducts[0].id,
            title: validation.conflictingProducts[0].title,
            handle: validation.conflictingProducts[0].handle || '',
          }
        }),
        ...(validation.message && { message: validation.message }),
      };
      
      // Cache the result
      shopDataService.cacheValidationResult('sku', sku, { response, productId });
      
      return json(response);
    });
  } catch (error) {
    logger.error('Error validating SKU', error, { sku });
    return json(
      { error: 'Failed to validate SKU' },
      { status: 500 }
    );
  }
};