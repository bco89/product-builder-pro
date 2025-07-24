import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { logger, Logger } from "../services/logger.server";
import { stripHTML } from "../services/prompts/formatting";
import type { CreateProductRequest } from "../types/shopify";
import { CREATE_PRODUCT_WITH_MEDIA, PRODUCT_VARIANTS_BULK_UPDATE } from "../graphql";
import { 
  retryWithBackoff, 
  parseGraphQLResponse, 
  errorResponse 
} from "../services/errorHandler.server";
import type { GraphQLErrorResponse } from "../types/errors";

export const action = async ({ request }: { request: Request }): Promise<Response> => {
  const requestId = Logger.generateRequestId();
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const auth = await authenticateAdmin(request);
  const { admin, session } = auth;
  const formData = await request.json() as CreateProductRequest & { 
    imageUrls?: string[];
    category?: { id: string; name: string; };
    pricing?: { price: string; };
    seoTitle?: string;
    seoDescription?: string;
  };

  const context = {
    operation: 'createProductBasic',
    shop: session.shop,
    requestId,
    productTitle: formData.title,
  };

  try {
    logger.info("Creating basic product:", { formData });

    // Prepare media input if images are provided
    const media = formData.imageUrls?.map((url, index) => ({
      mediaContentType: "IMAGE",
      originalSource: url,
      alt: `${formData.title} - Image ${index + 1}`
    })) || [];
    
    logger.info("Media input prepared:", { media });

    // Execute GraphQL mutation with retry logic
    const responseJson = await retryWithBackoff(
      async () => {
        const response = await admin.graphql(
          CREATE_PRODUCT_WITH_MEDIA,
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
                ...(formData.seoTitle || formData.seoDescription ? {
                  seo: {
                    ...(formData.seoTitle && { title: stripHTML(formData.seoTitle) }),
                    ...(formData.seoDescription && { description: stripHTML(formData.seoDescription) })
                  }
                } : {}),
              },
              media: media.length > 0 ? media : undefined
            }
          }
        );
        return await response.json();
      },
      {
        maxRetries: 3,
        shouldRetry: (error, attempt) => {
          // Don't retry validation errors
          if (error?.data?.productCreate?.userErrors?.length > 0) return false;
          // Use default retry logic for other errors
          return attempt < 3;
        }
      },
      context
    ) as GraphQLErrorResponse;
    logger.info("Product creation response:", { responseJson });
    
    // Check for errors using centralized parser
    const error = parseGraphQLResponse(responseJson);
    if (error) {
      return errorResponse(error, context);
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
      
      const updateResponseJson = await retryWithBackoff(
        async () => {
          const updateResponse = await admin.graphql(
            PRODUCT_VARIANTS_BULK_UPDATE,
            {
              variables: {
                productId: product.id,
                variants: [{
                  id: defaultVariantId,
                  price: formData.pricing?.price || "0.00"
                }]
              }
            }
          );
          return await updateResponse.json();
        },
        { maxRetries: 2 }, // Fewer retries for update
        { ...context, operation: 'updateDefaultVariantPricing' }
      ) as GraphQLErrorResponse;
      
      logger.info("Variant update response:", { updateResponseJson });
      
      // Check for errors in variant update
      const variantError = parseGraphQLResponse(updateResponseJson);
      if (variantError) {
        logger.warn("Failed to update variant pricing, but product was created", variantError);
        // Don't fail the whole operation if variant update fails
      }
    }

    return json({
      id: product.id,
      handle: product.handle,
      title: product.title
    });
  } catch (error) {
    return errorResponse(error, context);
  }
}; 