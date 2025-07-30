import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { logger, Logger } from "../services/logger.server";
import { STAGED_UPLOADS_CREATE } from "../graphql";
import { errorResponse } from "../services/errorHandler.server";

interface StagedUploadInput {
  filename: string;
  mimeType: string;
  httpMethod: string;
  resource: string;
  fileSize?: string;
}

export const action = async ({ request }: { request: Request }): Promise<Response> => {
  const requestId = Logger.generateRequestId();
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin, session } = await authenticateAdmin(request);
  const context = {
    operation: 'stageduploads',
    shop: session.shop,
    requestId,
  };
  const { files } = await request.json();

  try {
    logger.info("Creating staged uploads for files:", { fileCount: files.length });

    // Prepare input for staged uploads
    const input: StagedUploadInput[] = files.map((file: { filename: string; mimeType: string; fileSize: number }) => ({
      filename: file.filename,
      mimeType: file.mimeType,
      httpMethod: "POST",
      resource: "IMAGE", // Changed from PRODUCT_IMAGE to IMAGE
      ...(file.fileSize && { fileSize: file.fileSize.toString() })
    }));

    const response = await admin.graphql(
      STAGED_UPLOADS_CREATE,
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
    return errorResponse(error, context);
  }
};