import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { logger } from "../services/logger.server.ts";
import { smartSort } from "../utils/smartSort";

function generateVariantCombinations(options: any[]): string[][] {
  const cartesian = (...arrays: string[][]): string[][] => {
    return arrays.reduce<string[][]>(
      (results, array) => 
        results
          .map(result => array.map(value => [...result, value]))
          .reduce((subResults, array) => [...subResults, ...array], []),
      [[]]
    );
  };

  // Sort option values before generating combinations
  const optionValues = options.map(option => smartSort(option.values));
  return cartesian(...optionValues);
}

export const action = async ({ request }: { request: Request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin } = await authenticateAdmin(request);
  const { productId, options, skus, barcodes, pricing, weight, weightUnit } = await request.json();

  try {
    logger.info("Updating product with variants:", { productId, options });

    // Check if this is a non-variant product (no options)
    if (!options || options.length === 0) {
      logger.info("Updating non-variant product with SKU and barcode");
      
      // Get the default variant ID for non-variant products
      const variantResponse = await admin.graphql(
        `#graphql
        query getProductVariants($productId: ID!) {
          product(id: $productId) {
            variants(first: 1) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }`,
        {
          variables: { productId }
        }
      );

      const variantData = await variantResponse.json();
      const defaultVariantId = variantData.data?.product?.variants?.edges?.[0]?.node?.id;

      if (defaultVariantId) {
        // Update the default variant with SKU, barcode, and pricing
        const updateResponse = await admin.graphql(
          `#graphql
          mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              productVariants {
                id
                sku
                barcode
                price
                compareAtPrice
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              productId: productId,
              variants: [{
                id: defaultVariantId,
                price: pricing[0]?.price || "0.00",
                compareAtPrice: pricing[0]?.compareAtPrice || undefined,
                barcode: barcodes[0] || "",
                inventoryItem: {
                  tracked: true,
                  sku: skus[0] || "",
                  cost: pricing[0]?.cost || undefined,
                  ...(weight && weightUnit && {
                    measurement: {
                      weight: {
                        value: weight,
                        unit: weightUnit
                      }
                    }
                  })
                }
              }]
            }
          }
        );

        const updateResponseJson = await updateResponse.json();
        logger.debug("Non-variant update response:", JSON.stringify(updateResponseJson, null, 2));

        if (updateResponseJson.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
          logger.error("Error updating non-variant product:", updateResponseJson.data.productVariantsBulkUpdate.userErrors);
          return json(
            { error: updateResponseJson.data.productVariantsBulkUpdate.userErrors[0].message },
            { status: 400 }
          );
        }

        return json({ 
          success: true,
          variants: updateResponseJson.data?.productVariantsBulkUpdate?.productVariants || []
        });
      } else {
        return json({ error: "Could not find default variant for non-variant product" }, { status: 400 });
      }
    }

    // Step 1: Create product options first (for variant products)
    logger.info("Creating product options");
    const optionsInput = options.map((option: any, index: number) => ({
      name: option.name,
      position: index + 1,
      values: smartSort(option.values).map((value: string) => ({ name: value }))
    }));

    const optionsResponse = await admin.graphql(
      `#graphql
      mutation productOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!) {
        productOptionsCreate(productId: $productId, options: $options) {
          product {
            id
            options {
              id
              name
              position
              optionValues {
                id
                name
              }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  selectedOptions {
                    name
                    value
                  }
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
          productId: productId,
          options: optionsInput
        }
      }
    );

    const optionsResponseJson = await optionsResponse.json();
    logger.debug("Options creation response:", JSON.stringify(optionsResponseJson, null, 2));

    if (optionsResponseJson.data?.productOptionsCreate?.userErrors?.length > 0) {
      logger.error("Error creating options:", optionsResponseJson.data.productOptionsCreate.userErrors);
      return json(
        { error: optionsResponseJson.data.productOptionsCreate.userErrors[0].message },
        { status: 400 }
      );
    }

    // Get existing variants after options are created
    const existingVariants = optionsResponseJson.data?.productOptionsCreate?.product?.variants?.edges || [];
    
    // Step 2: Generate all variant combinations
    const variantCombinations = generateVariantCombinations(options);
    const basePricing = pricing[0] || { price: "0.00" };
    
    // Step 3: Update existing variants and create new ones
    const variantsToUpdate: any[] = [];
    const variantsToCreate: any[] = [];
    
    variantCombinations.forEach((combination: string[], index: number) => {
      // Check if this combination already exists
      const existingVariant = existingVariants.find((edge: any) => {
        const variant = edge.node;
        return combination.every((value, optionIndex) => {
          const optionName = options[optionIndex].name;
          return variant.selectedOptions.some((opt: any) => 
            opt.name === optionName && opt.value === value
          );
        });
      });
      
      if (existingVariant) {
        // Update existing variant
        variantsToUpdate.push({
          id: existingVariant.node.id,
          price: pricing[index]?.price || basePricing.price || "0.00",
          compareAtPrice: pricing[index]?.compareAtPrice || basePricing.compareAtPrice || undefined,
          barcode: barcodes[index] || "",
          inventoryItem: {
            tracked: true,
            sku: skus[index] || "",
            cost: pricing[index]?.cost || basePricing.cost || undefined,
            ...(weight && weightUnit && {
              measurement: {
                weight: {
                  value: weight,
                  unit: weightUnit
                }
              }
            })
          }
        });
      } else {
        // Create new variant
        variantsToCreate.push({
          optionValues: combination.map((value: string, optionIndex: number) => ({
            optionName: options[optionIndex].name,
            name: value
          })),
          price: pricing[index]?.price || basePricing.price || "0.00",
          compareAtPrice: pricing[index]?.compareAtPrice || basePricing.compareAtPrice || undefined,
          barcode: barcodes[index] || "",
          inventoryItem: {
            tracked: true,
            sku: skus[index] || "",
            cost: pricing[index]?.cost || basePricing.cost || undefined,
            ...(weight && weightUnit && {
              measurement: {
                weight: {
                  value: weight,
                  unit: weightUnit
                }
              }
            })
          }
        });
      }
    });
    
    // Update existing variants if any
    if (variantsToUpdate.length > 0) {
      logger.debug("Updating existing variants:", JSON.stringify(variantsToUpdate, null, 2));
      
      const updateResponse = await admin.graphql(
        `#graphql
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              title
              price
              sku
              barcode
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            productId: productId,
            variants: variantsToUpdate
          }
        }
      );
      
      const updateResponseJson = await updateResponse.json();
      logger.debug("Variant update response:", JSON.stringify(updateResponseJson, null, 2));
      
      if (updateResponseJson.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
        logger.error("Error updating variants:", updateResponseJson.data.productVariantsBulkUpdate.userErrors);
        return json(
          { error: updateResponseJson.data.productVariantsBulkUpdate.userErrors[0].message },
          { status: 400 }
        );
      }
    }
    
    // Create new variants if any
    let createdVariants = [];
    if (variantsToCreate.length > 0) {
      logger.debug("Creating new variants:", JSON.stringify(variantsToCreate, null, 2));
      
      const createResponse = await admin.graphql(
        `#graphql
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants {
              id
              title
              price
              sku
              barcode
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            productId: productId,
            variants: variantsToCreate
          }
        }
      );
      
      const createResponseJson = await createResponse.json();
      logger.debug("Variant creation response:", JSON.stringify(createResponseJson, null, 2));
      
      if (createResponseJson.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
        logger.error("Variant creation errors:", createResponseJson.data.productVariantsBulkCreate.userErrors);
        return json(
          { error: createResponseJson.data.productVariantsBulkCreate.userErrors[0].message },
          { status: 400 }
        );
      }
      
      createdVariants = createResponseJson.data?.productVariantsBulkCreate?.productVariants || [];
    }

    return json({ 
      success: true,
      variants: [...(variantsToUpdate.map(v => ({ id: v.id }))), ...createdVariants]
    });
  } catch (error) {
    logger.error("Failed to update product variants:", error);
    if (error instanceof Error) {
      logger.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return json(
        { error: `Failed to update product variants: ${error.message}` },
        { status: 500 }
      );
    }
    return json(
      { error: "Failed to update product variants: Unknown error" },
      { status: 500 }
    );
  }
}; 