import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { logger, Logger } from "../services/logger.server";
import { stripHTML } from "../services/prompts/formatting";
import type { ActionFunctionArgs } from "@remix-run/node";
import { UPDATE_PRODUCT_DESCRIPTION } from "../graphql";
import { 
  retryWithBackoff, 
  parseGraphQLResponse, 
  errorResponse 
} from "../services/errorHandler.server";
import type { GraphQLErrorResponse } from "../types/errors";

export const action = async ({ request }: ActionFunctionArgs) => {
  const requestId = Logger.generateRequestId();
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin, session } = await authenticateAdmin(request);
  const context = {
    operation: 'updateproductdescription',
    shop: session.shop,
    requestId,
  };
  const formData = await request.json();

  try {
    logger.info("Updating product description:", { productId: formData.productId });

    const response = await admin.graphql(
      UPDATE_PRODUCT_DESCRIPTION,
      {
        variables: {
          input: {
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
    return errorResponse(error, context);
  }
};