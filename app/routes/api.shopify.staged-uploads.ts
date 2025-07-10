import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server.ts";

interface StagedUploadInput {
  filename: string;
  mimeType: string;
  httpMethod: string;
  resource: string;
  fileSize?: string;
}

export const action = async ({ request }: { request: Request }): Promise<Response> => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin } = await authenticate.admin(request);
  const { files } = await request.json();

  try {
    logger.info("Creating staged uploads for files:", { fileCount: files.length });

    // Prepare input for staged uploads
    const input: StagedUploadInput[] = files.map((file: { filename: string; mimeType: string; fileSize: number }) => ({
      filename: file.filename,
      mimeType: file.mimeType,
      httpMethod: "POST",
      resource: "PRODUCT_IMAGE",
      ...(file.fileSize && { fileSize: file.fileSize.toString() })
    }));

    const response = await admin.graphql(
      `#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: { input }
      }
    );

    const responseJson = await response.json();
    logger.info("Staged uploads response:", { responseJson });

    if (responseJson.data?.stagedUploadsCreate?.userErrors?.length > 0) {
      logger.error("Staged upload errors:", undefined, { userErrors: responseJson.data.stagedUploadsCreate.userErrors });
      return json(
        { error: responseJson.data.stagedUploadsCreate.userErrors[0].message },
        { status: 400 }
      );
    }

    if (!responseJson.data?.stagedUploadsCreate?.stagedTargets) {
      logger.error("No staged targets in response");
      return json(
        { error: "Failed to create staged uploads" },
        { status: 500 }
      );
    }

    return json({
      stagedTargets: responseJson.data.stagedUploadsCreate.stagedTargets
    });
  } catch (error) {
    logger.error("Failed to create staged uploads:", error);
    return json(
      { error: error instanceof Error ? error.message : "Failed to create staged uploads" },
      { status: 500 }
    );
  }
};