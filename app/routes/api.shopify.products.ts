import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { CacheService } from "../services/cacheService";
import type { VendorsData } from "../types/shopify";

interface ProductCategory {
  id: string;
  name: string;
}

interface ProductOption {
  name: string;
  values: string[];
}

interface ProductNode {
  id?: string;
  title?: string;
  description?: string;
  handle?: string;
  vendor: string;
  productType: string;
  category: ProductCategory | null;
  options: ProductOption[];
  tags: string[];
  featuredImage?: {
    url: string;
    altText?: string;
  };
  seo?: {
    title?: string;
    description?: string;
  };
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
    let totalCount = 0;
    let page = 1;
    let limit = 20;

    switch (queryType) {
      case 'vendors':
        // First, get the shop domain
        const shopResponse = await admin.graphql(
          `#graphql
          query {
            shop {
              myshopifyDomain
            }
          }`
        );
        const shopData = await shopResponse.json();
        
        // Check for errors in shop query
        if (shopData.errors) {
          console.error('GraphQL errors in shop query:', shopData.errors);
          throw new Error('Failed to get shop domain');
        }
        
        const shop = shopData.data.shop.myshopifyDomain;
        
        // Try to get cached vendors first
        const cachedVendors = await CacheService.get<VendorsData>(shop, 'vendors');
        
        if (cachedVendors && cachedVendors.vendors) {
          // Return cached data
          return json({
            vendors: cachedVendors.vendors,
            totalVendors: cachedVendors.totalVendors,
            fromCache: true,
            cacheAge: Date.now() - (cachedVendors.lastUpdated || 0)
          });
        }
        
        // If no cached data, fetch fresh data
        // Use dedicated productVendors query for efficient vendor fetching
        const allVendors: string[] = [];
        let hasNextPage = true;
        let cursor: string | null = null;
        
        // Fetch all vendors with pagination
        while (hasNextPage) {
          const vendorQuery = `#graphql
            query getVendors($first: Int!, $after: String) {
              productVendors(first: $first, after: $after) {
                edges
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }`;
          
          const vendorResponse = await admin.graphql(vendorQuery, { 
            variables: { 
              first: 1000, // Max page size for productVendors
              after: cursor 
            } 
          });
          const vendorData = await vendorResponse.json();
          
          // Check for GraphQL errors
          if (vendorData.errors) {
            console.error('GraphQL errors:', vendorData.errors);
            throw new Error('GraphQL query failed: ' + vendorData.errors.map((e: any) => e.message).join(', '));
          }
          
          if (vendorData.data?.productVendors?.edges) {
            // edges is an array of strings for StringConnection
            vendorData.data.productVendors.edges.forEach((vendor: string) => {
              if (vendor) {
                allVendors.push(vendor);
              }
            });
            
            hasNextPage = vendorData.data.productVendors.pageInfo.hasNextPage;
            cursor = vendorData.data.productVendors.pageInfo.endCursor;
          } else {
            hasNextPage = false;
          }
        }
        
        // Sort vendors alphabetically
        const sortedVendors = allVendors.sort((a, b) => a.localeCompare(b));
        
        // Cache the result
        const vendorsData: VendorsData = {
          vendors: sortedVendors,
          totalVendors: sortedVendors.length,
          lastUpdated: Date.now()
        };
        await CacheService.set(shop, 'vendors', vendorsData);
        
        return json({ 
          vendors: sortedVendors,
          totalVendors: sortedVendors.length,
          fromCache: false
        });

      case 'productTypes':
        if (!vendor || vendor === 'all') {
          // Fetch all product types
          graphqlQuery = `#graphql
            query getAllProductTypes {
              products(first: 250) {
                edges {
                  node {
                    productType
                  }
                }
              }
            }`;
        } else {
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
        }
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

      case 'list':
      default:
        // Fetch all products for the improve descriptions page
        const searchQuery = url.searchParams.get('query') || '';
        const filters = url.searchParams.get('filters') || '';
        const vendors = url.searchParams.get('vendors') || '';
        const productTypes = url.searchParams.get('productTypes') || '';
        page = parseInt(url.searchParams.get('page') || '1');
        limit = parseInt(url.searchParams.get('limit') || '20');
        
        let queryString = '';
        if (searchQuery) {
          queryString = searchQuery;
        }
        
        // Add filter conditions
        if (filters) {
          const filterArray = filters.split(',');
          if (filterArray.includes('has_description')) {
            queryString += queryString ? ' AND ' : '';
            queryString += 'description:*';
          }
          if (filterArray.includes('no_description')) {
            queryString += queryString ? ' AND ' : '';
            queryString += 'NOT description:*';
          }
        }
        
        // Add vendor filters
        if (vendors) {
          const vendorArray = vendors.split(',');
          if (vendorArray.length === 1) {
            queryString += queryString ? ' AND ' : '';
            queryString += `vendor:"${vendorArray[0]}"`;
          } else if (vendorArray.length > 1) {
            queryString += queryString ? ' AND ' : '';
            queryString += `(${vendorArray.map(v => `vendor:"${v}"`).join(' OR ')})`;
          }
        }
        
        // Add product type filters
        if (productTypes) {
          const typeArray = productTypes.split(',');
          if (typeArray.length === 1) {
            queryString += queryString ? ' AND ' : '';
            queryString += `product_type:"${typeArray[0]}"`;
          } else if (typeArray.length > 1) {
            queryString += queryString ? ' AND ' : '';
            queryString += `(${typeArray.map(t => `product_type:"${t}"`).join(' OR ')})`;
          }
        }
        
        // First get total count for pagination
        const countQuery = `#graphql
          query getProductCount($query: String) {
            productsCount(query: $query) {
              count
            }
          }`;
        
        const countResponse = await admin.graphql(countQuery, { 
          variables: queryString ? { query: queryString } : {} 
        });
        const countData = await countResponse.json();
        totalCount = countData.data?.productsCount?.count || 0;
        
        // Calculate cursor for pagination (simple offset-based approach)
        const offset = (page - 1) * limit;
        
        graphqlQuery = `#graphql
          query getProducts($query: String, $first: Int!) {
            products(first: $first, query: $query) {
              edges {
                node {
                  id
                  title
                  description
                  handle
                  productType
                  vendor
                  featuredImage {
                    url
                    altText
                  }
                  seo {
                    title
                    description
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }`;
        
        // Fetch more than needed to handle offset
        const fetchLimit = offset + limit + 1;
        variables = { 
          first: Math.min(fetchLimit, 250), // Shopify max is 250
          ...(queryString ? { query: queryString } : {})
        };
        break;
    }

    const response = await admin.graphql(graphqlQuery, { variables });
    const data = (await response.json()) as ProductsData;

    switch (queryType) {
      case 'vendors':
        // Already handled above with early return
        break;

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

        return json({ options });

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

        return json({ options: allOptions });

      case 'tags':
        // Get all tags used by products of this type
        const allTags = data.data.products.edges.flatMap(edge => edge.node.tags);
        
        // Remove duplicates and sort alphabetically
        const uniqueTags = [...new Set(allTags)].sort();

        return json({ tags: uniqueTags });

      case 'allTags':
        // Get all tags used by all products
        const allTagsFromAllProducts = data.data.products.edges.flatMap(edge => edge.node.tags);
        
        // Remove duplicates and sort alphabetically
        const uniqueAllTags = [...new Set(allTagsFromAllProducts)].sort();

        return json({ tags: uniqueAllTags });

      case 'list':
      default:
        // Return the paginated product list for the improve descriptions page
        const allProducts = data.data.products.edges.map(edge => edge.node);
        
        // Apply offset-based pagination
        const offset = (page - 1) * limit;
        const paginatedProducts = allProducts.slice(offset, offset + limit);
        
        return json({ 
          products: paginatedProducts,
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        });
    }

  } catch (error) {
    console.error(`Failed to fetch ${queryType}:`, error);
    return json({ error: `Failed to fetch ${queryType}` }, { status: 500 });
  }
}; 