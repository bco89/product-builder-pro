import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server.ts";

interface TaxonomyCategory {
  id: string;
  name: string;
  fullName: string;
  level: number;
  isLeaf: boolean;
  isRoot?: boolean;
  parentId?: string;
  childrenIds?: string[];
}

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const productType = url.searchParams.get("productType");
  const parentId = url.searchParams.get("parentId");
  const search = url.searchParams.get("search");

  try {
    // If we're browsing hierarchy or searching, don't fetch suggested categories
    if (parentId || search) {
      const regularCategoriesResult = await fetchRegularCategories(admin, search || undefined, parentId || undefined);
      return json({ 
        categories: regularCategoriesResult.categories,
        suggestedCategories: []
      });
    }

    // Fetch suggested categories from existing products with same product type
    let suggestedCategories: TaxonomyCategory[] = [];
    if (productType) {
      suggestedCategories = await fetchSuggestedCategories(admin, productType);
    }

    // Fetch regular categories
    const regularCategoriesResult = await fetchRegularCategories(admin, search || undefined, parentId || undefined, productType || undefined);
    
    return json({ 
      categories: regularCategoriesResult.categories,
      suggestedCategories 
    });

  } catch (error) {
    logger.error("Failed to fetch taxonomy categories:", error);
    
    const fallbackCategories = [
      {
        id: "gid://shopify/TaxonomyCategory/aa-1",
        name: "Apparel & Accessories",
        fullName: "Apparel & Accessories",
        level: 0,
        isLeaf: false,
        isRoot: true,
        parentId: null,
        childrenIds: []
      },
      {
        id: "gid://shopify/TaxonomyCategory/aa-2",
        name: "Arts & Entertainment",
        fullName: "Arts & Entertainment", 
        level: 0,
        isLeaf: false,
        isRoot: true,
        parentId: null,
        childrenIds: []
      },
      {
        id: "gid://shopify/TaxonomyCategory/aa-3",
        name: "Baby & Toddler",
        fullName: "Baby & Toddler",
        level: 0,
        isLeaf: false,
        isRoot: true,
        parentId: null,
        childrenIds: []
      },
      {
        id: "gid://shopify/TaxonomyCategory/aa-4",
        name: "Business & Industrial",
        fullName: "Business & Industrial",
        level: 0,
        isLeaf: false,
        isRoot: true,
        parentId: null,
        childrenIds: []
      },
      {
        id: "gid://shopify/TaxonomyCategory/aa-5",
        name: "Cameras & Optics",
        fullName: "Cameras & Optics",
        level: 0,
        isLeaf: false,
        isRoot: true,
        parentId: null,
        childrenIds: []
      }
    ];
    
    return json({ 
      categories: fallbackCategories,
      suggestedCategories: []
    });
  }
};

async function fetchSuggestedCategories(admin: any, productType: string): Promise<TaxonomyCategory[]> {
  try {
    // Get products with the specified product type and their categories
    const productsQuery = `#graphql
      query GetProductsByType($query: String!) {
        products(first: 50, query: $query) {
          edges {
            node {
              id
              title
              productType
              category {
                id
                name
                fullName
              }
            }
          }
        }
      }
    `;

    const queryString = `product_type:"${productType}"`;
    
    const productsResponse = await admin.graphql(productsQuery, {
      variables: { query: queryString }
    });

    const productsData = await productsResponse.json();
    
    if (!productsData?.data?.products?.edges || productsData.data.products.edges.length === 0) {
      return [];
    }

    // Extract unique categories from existing products and create suggested categories directly
    const categoryMap = new Map<string, TaxonomyCategory>();

    productsData.data.products.edges.forEach((edge: any) => {
      if (edge.node.category) {
        const category = edge.node.category;
        
        // Create a TaxonomyCategory object from the product's category data
        categoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          fullName: category.fullName,
          level: 0, // We can't get this from product category data, so default to 0
          isLeaf: true, // Default to true since these are specific categories assigned to products
          isRoot: false,
          parentId: undefined,
          childrenIds: []
        });
      }
    });

    if (categoryMap.size === 0) {
      return [];
    }

    // Convert to array and sort
    const suggestedCategories = Array.from(categoryMap.values())
      .sort((a: TaxonomyCategory, b: TaxonomyCategory) => a.name.localeCompare(b.name));

    logger.info(`Found ${suggestedCategories.length} suggested categories for ${productType}`, {
      categories: suggestedCategories.map(cat => cat.name)
    });
    
    return suggestedCategories;

  } catch (error) {
    logger.error("Failed to fetch suggested categories:", error);
    return [];
  }
}

async function fetchRegularCategories(admin: any, search?: string, parentId?: string, productType?: string) {
  const query = `#graphql
    query GetCategories($search: String, $childrenOf: ID) {
      taxonomy {
        categories(
          first: 50
          search: $search
          childrenOf: $childrenOf
        ) {
          edges {
            node {
              id
              name
              fullName
              level
              isLeaf
              isRoot
              parentId
              childrenIds
            }
          }
        }
      }
    }
  `;

  const variables: { search?: string; childrenOf?: string } = {};
  if (search) {
    variables.search = search;
  }
  if (parentId) {
    variables.childrenOf = parentId;
  }

  const response = await admin.graphql(query, { variables });
  const data = await response.json();
  
  if (!data?.data?.taxonomy?.categories?.edges) {
    return { categories: [] };
  }

  const categories = data.data.taxonomy.categories.edges.map((edge: { node: TaxonomyCategory }) => ({
    id: edge.node.id,
    name: edge.node.name,
    fullName: edge.node.fullName,
    level: edge.node.level,
    isLeaf: edge.node.isLeaf,
    isRoot: edge.node.isRoot,
    parentId: edge.node.parentId,
    childrenIds: edge.node.childrenIds
  }));

  if (search) {
    return { categories };
  }

  let filteredCategories = categories;

  if (!parentId && productType) {
    const productTypeLower = productType.toLowerCase();
    const relevantCategories = categories.filter((cat: TaxonomyCategory) => {
      const nameMatch = cat.name.toLowerCase().includes(productTypeLower);
      const fullNameMatch = cat.fullName.toLowerCase().includes(productTypeLower);
      return nameMatch || fullNameMatch;
    });

    if (relevantCategories.length > 0) {
      filteredCategories = relevantCategories;
    } else {
      filteredCategories = categories.filter((cat: TaxonomyCategory) => cat.level <= 1);
    }
  }

  filteredCategories.sort((a: TaxonomyCategory, b: TaxonomyCategory) => {
    if (a.level !== b.level) {
      return a.level - b.level;
    }
    return a.name.localeCompare(b.name);
  });

  return { categories: filteredCategories };
} 