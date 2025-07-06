import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface ProductOption {
  name: string;
  values: string[];
}

interface FormData {
  title: string;
  description: string;
  handle?: string;
  vendor: string;
  productType: string;
  tags: string[];
  options: ProductOption[];
  pricing: Array<{
    price: string;
    compareAtPrice?: string;
    cost?: string;
  }>;
  skus: string[];
  barcodes: string[];
  category?: {
    id: string;
    name: string;
  };
  weight?: number;
  weightUnit?: 'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS';
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

function generateVariantCombinations(options: ProductOption[]): string[][] {
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
}

export const action = async ({ request }: { request: Request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin } = await authenticate.admin(request);
  const formData = await request.json() as FormData;

  try {
    console.log("Creating product with data:", JSON.stringify(formData, null, 2));

    const response = await admin.graphql(
      `#graphql
      mutation productCreate($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            descriptionHtml
            vendor
            productType
            status
            tags
            variants(first: 1) {
              edges {
                node {
                  id
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
            handle: formData.handle,
            vendor: formData.vendor,
            productType: formData.productType,
            tags: formData.tags,
            status: "DRAFT",
            ...(formData.category && { category: formData.category.id }),
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

    const product = responseJson.data.productCreate.product;
    
    if (formData.options.length === 0) {
      // Get the default variant that was automatically created
      const defaultVariantId = product.variants?.edges?.[0]?.node?.id;
      
      if (defaultVariantId) {
        // Update the default variant with SKU, barcode, and pricing
        const variantResponse = await admin.graphql(
          `#graphql
          mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              productVariants {
                id
                price
                sku
                barcode
                compareAtPrice
                inventoryItem {
                  tracked
                  sku
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
              productId: product.id,
              variants: [{
                id: defaultVariantId,
                price: formData.pricing[0]?.price || "0.00",
                compareAtPrice: formData.pricing[0]?.compareAtPrice,
                barcode: formData.barcodes[0] || "",
                inventoryItem: {
                  tracked: true,
                  sku: formData.skus[0] || "",
                  cost: formData.pricing[0]?.cost || undefined,
                  ...(formData.weight && formData.weightUnit && {
                    measurement: {
                      weight: {
                        value: formData.weight,
                        unit: formData.weightUnit
                      }
                    }
                  })
                }
              }]
            },
          }
        );

        const variantResponseJson = await variantResponse.json();
        console.log("Single variant update response:", JSON.stringify(variantResponseJson, null, 2));
        
        if (variantResponseJson.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
          console.error("Variant update errors:", variantResponseJson.data.productVariantsBulkUpdate.userErrors);
          return json(
            { error: `Failed to update product variant: ${variantResponseJson.data.productVariantsBulkUpdate.userErrors[0].message}` },
            { status: 400 }
          );
        }
      }
    } else {
      const variantCombinations = generateVariantCombinations(formData.options);
      const variantInputs = variantCombinations.map((combination: string[], index: number) => ({
        optionValues: combination.map((value: string, optionIndex: number) => ({
          optionName: formData.options[optionIndex].name,
          name: value
        })),
        price: formData.pricing[index]?.price || "0.00",
        compareAtPrice: formData.pricing[index]?.compareAtPrice,
        barcode: formData.barcodes[index] || "",
        inventoryItem: {
          tracked: true,
          sku: formData.skus[index] || "",
          cost: formData.pricing[index]?.cost || undefined,
          ...(formData.weight && formData.weightUnit && {
            measurement: {
              weight: {
                value: formData.weight,
                unit: formData.weightUnit
              }
            }
          })
        }
      }));

      const variantResponse = await admin.graphql(
        `#graphql
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants {
              id
              price
              sku
              barcode
              compareAtPrice
              inventoryItem {
                tracked
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
            productId: product.id,
            variants: variantInputs
          },
        }
      );

      const variantResponseJson = await variantResponse.json();
      console.log("Variant creation response:", JSON.stringify(variantResponseJson, null, 2));
      
      if (variantResponseJson.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
        console.error("Variant creation errors:", variantResponseJson.data.productVariantsBulkCreate.userErrors);
        return json(
          { error: `Failed to create product variants: ${variantResponseJson.data.productVariantsBulkCreate.userErrors[0].message}` },
          { status: 400 }
        );
      }
    }

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