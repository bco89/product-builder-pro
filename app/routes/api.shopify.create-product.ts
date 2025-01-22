import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface ProductOption {
  name: string;
  values: string[];
}

interface FormData {
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  options: ProductOption[];
  pricing: Array<{
    price: string;
    compareAtPrice?: string;
  }>;
  skus: string[];
  barcodes: string[];
}

interface VariantEdge {
  node: {
    id: string;
    price: string;
    sku: string;
  };
}

interface UserError {
  field: string;
  message: string;
}

export const action = async ({ request }: { request: Request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin } = await authenticate.admin(request);
  const formData = await request.json() as FormData;

  try {
    console.log("Creating product with data:", JSON.stringify(formData, null, 2));

    // Create the product using Shopify's Admin API
    const response = await admin.graphql(
      `#graphql
      mutation productCreate($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            options {
              id
              name
              position
              optionValues {
                id
                name
                hasVariants
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  sku
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          product: {
            title: formData.title,
            descriptionHtml: formData.description,
            vendor: formData.vendor,
            productType: formData.productType,
            tags: formData.tags,
            productOptions: formData.options.map((opt: ProductOption) => ({
              name: opt.name,
              values: opt.values
            })),
            status: "ACTIVE",
          },
        },
      }
    );

    const responseJson = await response.json();
    console.log("Product creation response:", JSON.stringify(responseJson, null, 2));
    
    if (responseJson.data?.productCreate?.userErrors?.length > 0) {
      console.error("Product creation user errors:", responseJson.data.productCreate.userErrors);
      return json(
        { error: `Failed to create product: ${responseJson.data.productCreate.userErrors.map((e: UserError) => `${e.field} - ${e.message}`).join(", ")}` },
        { status: 400 }
      );
    }

    if (!responseJson.data?.productCreate?.product) {
      console.error("No product data in response:", responseJson);
      return json(
        { error: "Failed to create product: No product data returned" },
        { status: 500 }
      );
    }

    // After product is created, update variants with prices and SKUs if we have options
    const product = responseJson.data.productCreate.product;
    if (formData.options.length > 0) {
      // Generate all possible variant combinations
      const generateVariantCombinations = (options: ProductOption[]): string[][] => {
        const cartesian = (...arrays: string[][]): string[][] => {
          return arrays.reduce<string[][]>(
            (results, array) => 
              results
                .map(result => array.map(value => [...result, value]))
                .reduce((subResults, array) => [...subResults, ...array], []),
            [[]]
          );
        };

        const optionValues = options.map(option => option.values);
        return cartesian(...optionValues);
      };

      const variantCombinations = generateVariantCombinations(formData.options);
      const variantInputs = variantCombinations.map((combination, index) => ({
        options: combination,
        price: formData.pricing[index]?.price || "0.00",
        compareAtPrice: formData.pricing[index]?.compareAtPrice,
        sku: formData.skus[index] || "",
        barcode: formData.barcodes[index] || "",
        inventoryItem: {
          tracked: true
        }
      }));

      console.log("Creating variants with data:", JSON.stringify({
        productId: product.id,
        variants: variantInputs
      }, null, 2));

      const variantResponse = await admin.graphql(
        `#graphql
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants {
              id
              price
              sku
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            productId: product.id,
            variants: variantInputs.map(input => ({
              options: input.options.map(value => ({ value })),
              price: input.price,
              compareAtPrice: input.compareAtPrice,
              sku: input.sku,
              barcode: input.barcode,
              inventoryItem: input.inventoryItem
            }))
          },
        }
      );

      const variantResponseJson = await variantResponse.json();
      console.log("Variant creation response:", JSON.stringify(variantResponseJson, null, 2));
      
      if (variantResponseJson.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
        console.error("Variant creation errors:", variantResponseJson.data.productVariantsBulkCreate.userErrors);
        // Return the product even if variant creation had errors
        return json({
          ...responseJson.data.productCreate.product,
          variantErrors: variantResponseJson.data.productVariantsBulkCreate.userErrors
        });
      }
    }

    // Return the product data with any variants that were created
    return json({
      ...responseJson.data.productCreate.product,
      shopDomain: process.env.SHOPIFY_SHOP_DOMAIN || ''
    });
  } catch (error) {
    console.error("Failed to create product:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return json(
        { error: `Failed to create product: ${error.message}` },
        { status: 500 }
      );
    }
    return json(
      { error: "Failed to create product: Unknown error" },
      { status: 500 }
    );
  }
}; 