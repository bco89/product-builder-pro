import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface ProductCategory {
  id: string;
  name: string;
}

interface ProductOption {
  name: string;
  values: string[];
}

interface ProductNode {
  vendor: string;
  productType: string;
  category: ProductCategory | null;
  options: ProductOption[];
  tags: string[];
}

interface ProductEdge {
  node: ProductNode;
}

interface ProductsData {
  data: {
    products: {
      edges: ProductEdge[];
    };
  };
}

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const queryType = url.searchParams.get('type');
  const vendor = url.searchParams.get('vendor');
  const productType = url.searchParams.get('productType');

  try {
    let graphqlQuery = '';
    let variables = {};

    switch (queryType) {
      case 'vendors':
        graphqlQuery = `#graphql
          query getVendors {
            products(first: 250) {
              edges {
                node {
                  vendor
                }
              }
            }
          }`;
        break;

      case 'productTypes':
        if (!vendor) {
          return json({ productTypes: [] });
        }
        graphqlQuery = `#graphql
          query getProductTypesByVendor($query: String!) {
            products(first: 250, query: $query) {
              edges {
                node {
                  productType
                }
              }
            }
          }`;
        variables = { query: `vendor:'${vendor}'` };
        break;

      case 'categories':
        if (!productType) {
          return json({ categories: [] });
        }
        graphqlQuery = `#graphql
          query getCategories($query: String!) {
            products(first: 250, query: $query) {
              edges {
                node {
                  category {
                    id
                    name
                  }
                }
              }
            }
          }`;
        variables = { query: `product_type:'${productType}'` };
        break;

      case 'options':
        if (!productType) {
          return json({ options: [] });
        }
        graphqlQuery = `#graphql
          query getOptions($query: String!) {
            products(first: 250, query: $query) {
              edges {
                node {
                  options {
                    name
                    values
                  }
                }
              }
            }
          }`;
        variables = { query: `product_type:'${productType}'` };
        break;

      case 'tags':
        if (!productType) {
          return json({ tags: [] });
        }
        graphqlQuery = `#graphql
          query getTags($query: String!) {
            products(first: 250, query: $query) {
              edges {
                node {
                  tags
                }
              }
            }
          }`;
        variables = { query: `product_type:'${productType}'` };
        break;

      default:
        return json({ error: 'Invalid query type' }, { status: 400 });
    }

    const response = await admin.graphql(graphqlQuery, { variables });
    const data = (await response.json()) as ProductsData;

    switch (queryType) {
      case 'vendors':
        const vendors = [...new Set(
          data.data.products.edges
            .map(edge => edge.node.vendor)
            .filter(Boolean)
        )];
        return json({ vendors });

      case 'productTypes':
        const productTypes = [...new Set(
          data.data.products.edges
            .map(edge => edge.node.productType)
            .filter(Boolean)
        )].map(productType => ({
          productType,
        }));
        return json({ productTypes });

      case 'categories':
        // Get all categories used by products of this type
        const categories = data.data.products.edges
          .map(edge => edge.node.category)
          .filter((cat): cat is ProductCategory => cat !== null);

        // Remove duplicates based on ID
        const uniqueCategories = Array.from(
          new Map(categories.map(cat => [cat.id, cat])).values()
        );

        return json({ categories: uniqueCategories });

      case 'options':
        // Get all options used by products of this type
        const allOptions = data.data.products.edges.flatMap(edge => edge.node.options);
        
        // Create a map to store unique options and their values
        const optionsMap = new Map<string, Set<string>>();
        
        allOptions.forEach(option => {
          if (!optionsMap.has(option.name)) {
            optionsMap.set(option.name, new Set());
          }
          option.values.forEach(value => {
            optionsMap.get(option.name)?.add(value);
          });
        });

        // Convert the map to the desired format
        const options = Array.from(optionsMap.entries()).map(([name, values]) => ({
          name,
          values: Array.from(values)
        }));

        return json({ options });

      case 'tags':
        // Get all tags used by products of this type
        const allTags = data.data.products.edges.flatMap(edge => edge.node.tags);
        
        // Remove duplicates and sort alphabetically
        const uniqueTags = [...new Set(allTags)].sort();

        return json({ tags: uniqueTags });
    }

  } catch (error) {
    console.error(`Failed to fetch ${queryType}:`, error);
    return json({ error: `Failed to fetch ${queryType}` }, { status: 500 });
  }
}; 