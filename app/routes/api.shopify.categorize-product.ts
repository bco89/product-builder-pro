import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../services/auth.server";
import { getAIService } from "../services/ai";
import { logger } from "../services/logger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const productTitle = formData.get("productTitle")?.toString() || "";
  const productDescription = formData.get("productDescription")?.toString();
  const vendor = formData.get("vendor")?.toString();
  const tags = formData.get("tags")?.toString();
  const imageAnalysis = formData.get("imageAnalysis")?.toString();

  if (!productTitle) {
    return json({ error: "Product title is required" }, { status: 400 });
  }

  try {
    const aiService = getAIService();
    const categorization = await aiService.categorizeProduct({
      productTitle,
      productDescription,
      vendor,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      imageAnalysis
    });

    logger.info(`Product categorized for shop ${session.shop}:`, {
      productTitle,
      result: categorization
    });

    return json({ 
      success: true,
      ...categorization
    });
  } catch (error) {
    logger.error("Product categorization error:", error);
    return json({ 
      error: "Failed to categorize product",
      productType: "Home & Garden",
      confidence: 0.5,
      reasoning: "Error occurred during categorization"
    }, { status: 500 });
  }
};