import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface SKUValidationResult {
  available: boolean;
  conflictingProduct?: {
    id: string;
    title: string;
    handle: string;
  };
}

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const sku = url.searchParams.get('sku');

  if (!sku) {
    return json({ error: 'SKU parameter is required' }, { status: 400 });
  }

  try {
    const query = `#graphql
      query checkProductSKU($sku: String!) {
        products(first: 50, query: $sku) {
          edges {
            node {
              id
              title
              handle
              variants(first: 50) {
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

    const response = await admin.graphql(query, {
      variables: { sku: `sku:'${sku}'` }
    });

    const data = await response.json();
    const products = data.data.products.edges;
    
    // Check for exact SKU match
    for (const productEdge of products) {
      const product = productEdge.node;
      const hasMatchingSku = product.variants.edges.some((variantEdge: any) => 
        variantEdge.node.sku === sku
      );
      
      if (hasMatchingSku) {
        const result: SKUValidationResult = {
          available: false,
          conflictingProduct: {
            id: product.id,
            title: product.title,
            handle: product.handle
          }
        };
        return json(result);
      }
    }

    // No conflicts found
    const result: SKUValidationResult = {
      available: true
    };
    return json(result);

  } catch (error) {
    console.error('Error validating SKU:', error);
    return json(
      { error: 'Failed to validate SKU' },
      { status: 500 }
    );
  }
}; 