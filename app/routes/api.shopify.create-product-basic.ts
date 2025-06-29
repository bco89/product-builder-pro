import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: { request: Request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin } = await authenticate.admin(request);
  const formData = await request.json();

  try {
    console.log("Creating basic product:", JSON.stringify(formData, null, 2));

    const response = await admin.graphql(
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
            vendor: formData.vendor,
            productType: formData.productType,
            tags: formData.tags,
            ...(formData.category && { category: formData.category.id }),
          }
        }
      }
    );

    const responseJson = await response.json();
    console.log("Product creation response:", JSON.stringify(responseJson, null, 2));
    
    if (responseJson.data?.productCreate?.userErrors?.length > 0) {
      console.error("Product creation errors:", responseJson.data.productCreate.userErrors);
      return json(
        { error: responseJson.data.productCreate.userErrors[0].message },
        { status: 400 }
      );
    }

    if (!responseJson.data?.productCreate?.product) {
      console.error("No product data in response");
      return json(
        { error: "Failed to create product: No product data returned" },
        { status: 500 }
      );
    }

    const product = responseJson.data.productCreate.product;
    const defaultVariantId = product.variants?.edges?.[0]?.node?.id;

    // Update default variant with initial pricing if provided
    if (defaultVariantId && formData.pricing) {
      console.log("Updating default variant with pricing");
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
      console.log("Variant update response:", JSON.stringify(updateResponseJson, null, 2));
    }

    return json({
      id: product.id,
      handle: product.handle,
      title: product.title
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