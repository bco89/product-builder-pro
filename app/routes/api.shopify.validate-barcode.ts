import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { requestCache, RequestCache } from "../services/requestCache.server";
import { ShopDataService } from "../services/shopData.server";
import { logger } from "../services/logger.server";

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
      const query = `#graphql
        query checkProductBarcode($barcode: String!) {
          products(first: 50, query: $barcode) {
            edges {
              node {
                id
                title
                handle
                variants(first: 50) {
                  edges {
                    node {
                      barcode
                    }
                  }
                }
              }
            }
          }
        }`;

      const response = await admin.graphql(query, {
        variables: { barcode: `barcode:'${barcode}'` }
      });

      const data = await response.json();
      const products = data.data.products.edges;
      
      // Check for exact barcode match
      for (const productEdge of products) {
        const product = productEdge.node;
        const hasMatchingBarcode = product.variants.edges.some((variantEdge: any) => 
          variantEdge.node.barcode === barcode
        );
        
        if (hasMatchingBarcode) {
          const result: BarcodeValidationResult = {
            available: false,
            conflictingProduct: {
              id: product.id,
              title: product.title,
              handle: product.handle
            }
          };
          
          // Cache the result
          shopDataService.cacheValidationResult('barcode', barcode, result);
          
          return json(result);
        }
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