import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { generateHandle } from "../utils/handleGenerator";
import { logger } from "../services/logger.server.ts";
import type { ShopifyGraphQLResponse } from "../types/shopify";

interface ProductHandleQueryResponse {
  products: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
      };
    }>;
  };
}

export const loader = async ({ request }: { request: Request }): Promise<Response> => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');

  if (!handle) {
    return json({ error: 'Handle parameter is required' }, { status: 400 });
  }

  try {
    // Query Shopify to check if handle exists
    const graphqlQuery = `#graphql
      query checkProductHandle($handle: String!) {
        products(first: 1, query: $handle) {
          edges {
            node {
              id
              handle
              title
            }
          }
        }
      }`;

    const response = await admin.graphql<ShopifyGraphQLResponse<ProductHandleQueryResponse>>(graphqlQuery, {
      variables: { handle: `handle:'${handle}'` }
    });

    const result = await response.json();
    if (!result.data) {
      throw new Error('Invalid GraphQL response');
    }
    const data = result.data;
    const existingProducts = data.products.edges;
    
    const available = existingProducts.length === 0;
    
    let suggestions: string[] = [];
    if (!available) {
      // Generate alternative handles if the requested one is taken
      const baseHandle = handle.replace(/-\d+$/, ''); // Remove existing number suffix
      suggestions = [];
      
      for (let i = 1; i <= 5; i++) {
        const suggestion = `${baseHandle}-${i}`;
        
        // Check if this suggestion is also taken
        const suggestionResponse = await admin.graphql(graphqlQuery, {
          variables: { handle: `handle:'${suggestion}'` }
        });
        
        const suggestionResult = await suggestionResponse.json() as ShopifyGraphQLResponse<ProductHandleQueryResponse>;
        
        if (suggestionResult.data && suggestionResult.data.products.edges.length === 0) {
          suggestions.push(suggestion);
          if (suggestions.length >= 3) break; // Limit to 3 suggestions
        }
      }
    }

    return json({
      available,
      handle,
      suggestions,
      ...(existingProducts.length > 0 && {
        conflictingProduct: {
          handle: existingProducts[0].node.handle,
          title: existingProducts[0].node.title
        }
      })
    });

  } catch (error) {
    logger.error('Error validating product handle', error);
    return json(
      { error: 'Failed to validate product handle' },
      { status: 500 }
    );
  }
}; 