import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server.ts";
import type { CreateProductRequest } from "../types/shopify";

interface CreateMediaInput {
  alt?: string;
  mediaContentType: string;
  originalSource: string;
}

export const action = async ({ request }: { request: Request }): Promise<Response> => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin } = await authenticate.admin(request);
  const formData = await request.json() as CreateProductRequest & { 
    imageUrls?: string[];
    category?: { id: string; name: string; };
    pricing?: { price: string; };
  };

  try {
    logger.info("Creating basic product:", { formData });

    // Prepare media input if images are provided
    const media: CreateMediaInput[] = formData.imageUrls?.map((url, index) => ({
      mediaContentType: "IMAGE",
      originalSource: url,
      alt: `${formData.title} - Image ${index + 1}`
    })) || [];

    const response = await admin.graphql(
      `#graphql
      mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
        productCreate(product: $product, media: $media) {
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
          },
          ...(media.length > 0 && { media })
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