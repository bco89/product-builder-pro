import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface CollectionNode {
  id: string;
  title: string;
  description: string | null;
}

interface Category {
  id: string;
  title: string;
  description: string | null;
}

interface ProductNode {
  collections: {
    edges: Array<{
      node: CollectionNode;
    }>;
  };
}

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const productType = url.searchParams.get("productType");

  if (!productType) {
    return json({ categories: [] });
  }

  try {
    const response = await admin.graphql(
      `#graphql
      query getCategories($productType: String!) {
        products(first: 250, query: $productType) {
          edges {
            node {
              collections(first: 10) {
                edges {
                  node {
                    id
                    title
                    description
                  }
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          productType: `product_type:'${productType}'`
        }
      }
    );

    const data = await response.json();
    const categories = data.data.products.edges.flatMap((edge: { node: ProductNode }) => 
      edge.node.collections.edges.map(collectionEdge => ({
        id: collectionEdge.node.id,
        title: collectionEdge.node.title,
        description: collectionEdge.node.description
      }))
    );

    // Remove duplicates based on ID
    const uniqueCategories = Array.from(
      new Map(categories.map((item: Category) => [item.id, item])).values()
    );

    return json({ categories: uniqueCategories });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return json({ categories: [] });
  }
}; 