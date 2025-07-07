import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server.ts";
import type { CreateProductRequest, ProductCreateResponse, ShopifyGraphQLResponse } from "../types/shopify";

export const action = async ({ request }: { request: Request }): Promise<Response> => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin } = await authenticate.admin(request);
  const formData: CreateProductRequest = await request.json();

  try {
    logger.info("Creating basic product:", { formData });

    const response = await admin.graphql<ShopifyGraphQLResponse<ProductCreateResponse>>(
      `#graphql
      mutation productCreate($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
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
          }
        }
      }
    );

    const responseJson = await response.json();
    logger.info("Product creation response:", { responseJson });
    
    if (responseJson.data?.productCreate?.userErrors?.length > 0) {
      logger.error("Product creation errors:", undefined, { userErrors: responseJson.data.productCreate.userErrors });
      return json(
        { error: responseJson.data.productCreate.userErrors[0].message },
        { status: 400 }
      );
    }

    if (!responseJson.data?.productCreate?.product) {
      logger.error("No product data in response");
      return json(
        { error: "Failed to create product: No product data returned" },
        { status: 500 }
      );
    }

    const product = responseJson.data.productCreate.product;
    const defaultVariantId = product.variants?.edges?.[0]?.node?.id;

    // Update default variant with initial pricing if provided
    if (defaultVariantId && formData.pricing) {
      logger.info("Updating default variant with pricing");
      const updateResponse = await admin.graphql(
        `#graphql
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              price
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
              price: formData.pricing.price || "0.00"
            }]
          }
        }
      );

      const updateResponseJson = await updateResponse.json();
      logger.info("Variant update response:", { updateResponseJson });
    }

    return json({
      id: product.id,
      handle: product.handle,
      title: product.title
    });
  } catch (error) {
    logger.error("Failed to create product:", error);
    if (error instanceof Error) {
      logger.error("Error details:", error);
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