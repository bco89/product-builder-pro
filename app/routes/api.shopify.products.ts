import { authenticate } from "../shopify.server";
import { errorResponse, successResponse, logApiRequest } from "../utils/api-response";

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
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const queryType = url.searchParams.get('type');
  const vendor = url.searchParams.get('vendor');
  const productType = url.searchParams.get('productType');

  logApiRequest("api.shopify.products", "GET", { 
    shop: session.shop,
    queryType,
    vendor,
    productType 
  });

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
          return successResponse({ productTypes: [] });
        }
        graphqlQuery = `#graphql
          query getProductTypesByVendor($query: String!) {
            products(first: 250, query: $query) {
              edges {
                node {
                  productType
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }`;
        // Fix the query syntax - use double quotes for exact matching
        variables = { query: `vendor:"${vendor}"` };
        break;

      case 'categories':
        if (!productType) {
          return successResponse({ categories: [] });
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
          return successResponse({ options: [] });
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

      case 'allOptions':
        // Fetch options from all product types (fallback when current type has no options)
        graphqlQuery = `#graphql
          query getAllOptions {
            products(first: 250) {
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
        break;

      case 'tags':
        if (!productType) {
          return successResponse({ tags: [] });
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

      case 'allTags':
        // Fetch tags from all products (for global tag selection)
        graphqlQuery = `#graphql
          query getAllTags {
            products(first: 250) {
              edges {
                node {
                  tags
                }
              }
            }
          }`;
        break;

      default:
        return errorResponse(
          new Error('Invalid query type'),
          'Invalid query type',
          { shop: session.shop, endpoint: 'api.shopify.products', queryType }
        );
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
        return successResponse({ vendors });

      case 'productTypes':
        const productTypes = [...new Set(
          data.data.products.edges
            .map(edge => edge.node.productType)
            .filter(Boolean)
        )].map(productType => ({
          productType,
        }));
        return successResponse({ productTypes });

      case 'categories':
        // Get all categories used by products of this type
        const categories = data.data.products.edges
          .map(edge => edge.node.category)
          .filter((cat): cat is ProductCategory => cat !== null);

        // Remove duplicates based on ID
        const uniqueCategories = Array.from(
          new Map(categories.map(cat => [cat.id, cat])).values()
        );

        return successResponse({ categories: uniqueCategories });

      case 'options':
        // Get all options used by products of this type
        const productTypeOptions = data.data.products.edges.flatMap(edge => edge.node.options);
        
        // Create a map to store unique options and their values
        const optionsMap = new Map<string, Set<string>>();
        
        productTypeOptions.forEach(option => {
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

        return successResponse({ options });

      case 'allOptions':
        // Get all options used by all products
        const allOptionsFromAllProducts = data.data.products.edges.flatMap(edge => edge.node.options);
        
        // Create a map to store unique options and their values
        const allOptionsMap = new Map<string, Set<string>>();
        
        allOptionsFromAllProducts.forEach(option => {
          if (!allOptionsMap.has(option.name)) {
            allOptionsMap.set(option.name, new Set());
          }
          option.values.forEach(value => {
            allOptionsMap.get(option.name)?.add(value);
          });
        });

        // Convert the map to the desired format and filter out generic options
        const allOptions = Array.from(allOptionsMap.entries())
          .filter(([name]) => 
            name.toLowerCase() !== 'title' && 
            name.toLowerCase() !== 'default title'
          )
          .map(([name, values]) => ({
            name,
            values: Array.from(values)
          }));

        return successResponse({ options: allOptions });

      case 'tags':
        // Get all tags used by products of this type
        const allTags = data.data.products.edges.flatMap(edge => edge.node.tags);
        
        // Remove duplicates and sort alphabetically
        const uniqueTags = [...new Set(allTags)].sort();

        return successResponse({ tags: uniqueTags });

      case 'allTags':
        // Get all tags used by all products
        const allTagsFromAllProducts = data.data.products.edges.flatMap(edge => edge.node.tags);
        
        // Remove duplicates and sort alphabetically
        const uniqueAllTags = [...new Set(allTagsFromAllProducts)].sort();

        return successResponse({ tags: uniqueAllTags });
    }

  } catch (error) {
    return errorResponse(
      error,
      `Failed to fetch ${queryType}`,
      { shop: session.shop, endpoint: "api.shopify.products", queryType }
    );
  }
}; 