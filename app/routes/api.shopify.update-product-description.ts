import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server";
import { stripHTML } from "../services/prompts/formatting";
import type { ActionFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin } = await authenticate.admin(request);
  const formData = await request.json();

  try {
    logger.info("Updating product description:", { productId: formData.productId });

    const response = await admin.graphql(
      `#graphql
      mutation productUpdate($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product {
            id
            title
            descriptionHtml
            seo {
              title
              description
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
            id: formData.productId,
            descriptionHtml: formData.description,
            ...(formData.seoTitle || formData.seoDescription ? {
              seo: {
                ...(formData.seoTitle && { title: stripHTML(formData.seoTitle) }),
                ...(formData.seoDescription && { description: stripHTML(formData.seoDescription) })
              }
            } : {}),
          }
        }
      }
    );

    const responseJson = await response.json();
    
    if (responseJson.errors) {
      logger.error("GraphQL errors:", responseJson.errors);
      return json(
        { error: responseJson.errors[0].message || 'GraphQL error occurred' },
        { status: 400 }
      );
    }
    
    if (responseJson.data?.productUpdate?.userErrors?.length > 0) {
      logger.error("Product update errors:", responseJson.data.productUpdate.userErrors);
      return json(
        { error: responseJson.data.productUpdate.userErrors[0].message },
        { status: 400 }
      );
    }

    if (!responseJson.data?.productUpdate?.product) {
      logger.error("No product data in response");
      return json(
        { error: "Failed to update product: No product data returned" },
        { status: 500 }
      );
    }

    return json({
      success: true,
      product: responseJson.data.productUpdate.product
    });
  } catch (error) {
    logger.error("Failed to update product description:", error);
    return json(
      { error: error instanceof Error ? error.message : "Failed to update product" },
      { status: 500 }
    );
  }
};