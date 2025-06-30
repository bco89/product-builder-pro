import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface TaxonomyCategory {
  id: string;
  name: string;
  fullName: string;
  level: number;
  isLeaf: boolean;
}

export const loader = async ({ request }: { request: Request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const productType = url.searchParams.get("productType");

  if (!productType) {
    return json({ categories: [] });
  }

  try {
    // First, get the top-level categories from Shopify's taxonomy
    const response = await admin.graphql(
      `#graphql
      query getTaxonomyCategories {
        taxonomy {
          categories(first: 250) {
            edges {
              node {
                id
                name
                fullName
                level
                isLeaf
              }
            }
          }
        }
      }`
    );

    const data = await response.json();
    
    if (!data?.data?.taxonomy?.categories?.edges) {
      console.log("No taxonomy categories found");
      return json({ categories: [] });
    }

    // Map taxonomy categories to our interface
    const categories = data.data.taxonomy.categories.edges.map((edge: { node: TaxonomyCategory }) => ({
      id: edge.node.id,
      name: edge.node.name,
      fullName: edge.node.fullName,
      level: edge.node.level,
      isLeaf: edge.node.isLeaf
    }));

    // Filter categories that might be relevant to the product type
    // For now, return all categories but we could add smart filtering later
    let filteredCategories = categories;

    // Optionally filter by relevance to product type
    if (productType) {
      const productTypeLower = productType.toLowerCase();
      filteredCategories = categories.filter((cat: TaxonomyCategory) => {
        const nameMatch = cat.name.toLowerCase().includes(productTypeLower);
        const fullNameMatch = cat.fullName.toLowerCase().includes(productTypeLower);
        return nameMatch || fullNameMatch;
      });

      // If no specific matches found, return top-level categories (level 0 and 1)
      if (filteredCategories.length === 0) {
        filteredCategories = categories.filter((cat: TaxonomyCategory) => cat.level <= 1);
      }
    }

    // Sort by level (top-level first) then by name
    filteredCategories.sort((a: TaxonomyCategory, b: TaxonomyCategory) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.name.localeCompare(b.name);
    });

    return json({ categories: filteredCategories });
  } catch (error) {
    console.error("Failed to fetch taxonomy categories:", error);
    
    // Fallback: return some common categories if taxonomy fails
    const fallbackCategories = [
      {
        id: "gid://shopify/TaxonomyCategory/aa-1",
        name: "Apparel & Accessories",
        fullName: "Apparel & Accessories",
        level: 0,
        isLeaf: false
      },
      {
        id: "gid://shopify/TaxonomyCategory/aa-2",
        name: "Arts & Entertainment",
        fullName: "Arts & Entertainment", 
        level: 0,
        isLeaf: false
      },
      {
        id: "gid://shopify/TaxonomyCategory/aa-3",
        name: "Baby & Toddler",
        fullName: "Baby & Toddler",
        level: 0,
        isLeaf: false
      },
      {
        id: "gid://shopify/TaxonomyCategory/aa-4",
        name: "Business & Industrial",
        fullName: "Business & Industrial",
        level: 0,
        isLeaf: false
      },
      {
        id: "gid://shopify/TaxonomyCategory/aa-5",
        name: "Cameras & Optics",
        fullName: "Cameras & Optics",
        level: 0,
        isLeaf: false
      }
    ];
    
    return json({ categories: fallbackCategories });
  }
}; 