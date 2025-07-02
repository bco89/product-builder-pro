import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface BatchValidationRequest {
  skus: string[];
  barcodes?: string[];
}

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

export const action = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);
  const { skus, barcodes = [] }: BatchValidationRequest = await request.json();

  if (!skus || skus.length === 0) {
    return json({ error: 'SKUs array is required' }, { status: 400 });
  }

  try {
    const conflicts: ValidationConflict[] = [];

    // Validate SKUs
    if (skus.length > 0) {
      const skuQueryString = skus.filter(Boolean).map(sku => `sku:${sku}`).join(' OR ');
      
      if (skuQueryString) {
        const skuQuery = `#graphql
          query checkProductSKUs($query: String!) {
            products(first: 250, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                  variants(first: 250) {
                    edges {
                      node {
                        sku
                      }
                    }
                  }
                }
              }
            }
          }`;

        const skuResponse = await admin.graphql(skuQuery, {
          variables: { query: skuQueryString }
        });

        const skuData = await skuResponse.json();
        const skuProducts = skuData.data.products.edges;

        // Check for conflicts
        for (const productEdge of skuProducts) {
          const product = productEdge.node;
          for (const variantEdge of product.variants.edges) {
            const variantSku = variantEdge.node.sku;
            if (variantSku && skus.includes(variantSku)) {
              conflicts.push({
                type: 'sku',
                value: variantSku,
                conflictingProduct: {
                  id: product.id,
                  title: product.title,
                  handle: product.handle
                }
              });
            }
          }
        }
      }
    }

    // Validate Barcodes
    if (barcodes.length > 0) {
      const barcodeQueryString = barcodes.filter(Boolean).map(barcode => `barcode:${barcode}`).join(' OR ');
      
      if (barcodeQueryString) {
        const barcodeQuery = `#graphql
          query checkProductBarcodes($query: String!) {
            products(first: 250, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                  variants(first: 250) {
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

        const barcodeResponse = await admin.graphql(barcodeQuery, {
          variables: { query: barcodeQueryString }
        });

        const barcodeData = await barcodeResponse.json();
        const barcodeProducts = barcodeData.data.products.edges;

        // Check for conflicts
        for (const productEdge of barcodeProducts) {
          const product = productEdge.node;
          for (const variantEdge of product.variants.edges) {
            const variantBarcode = variantEdge.node.barcode;
            if (variantBarcode && barcodes.includes(variantBarcode)) {
              conflicts.push({
                type: 'barcode',
                value: variantBarcode,
                conflictingProduct: {
                  id: product.id,
                  title: product.title,
                  handle: product.handle
                }
              });
            }
          }
        }
      }
    }

    const result: BatchValidationResult = {
      valid: conflicts.length === 0,
      conflicts
    };

    return json(result);

  } catch (error) {
    console.error('Error validating SKUs/Barcodes batch:', error);
    return json(
      { error: 'Failed to validate SKUs/Barcodes' },
      { status: 500 }
    );
  }
}; 