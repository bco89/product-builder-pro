import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { AIService } from "../services/ai.server";
import { ProductScraperService } from "../services/scraper.server";
import { ImageAnalysisService } from "../services/image-analysis.server";
import { prisma } from "../db.server";
import type { ActionFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const data = await request.json();

  try {
    let scrapedData = null;
    let imageAnalysis = null;

    // Scrape URL if provided
    if (data.method === 'url' && data.productUrl) {
      const scraper = new ProductScraperService();
      scrapedData = await scraper.scrapeProductInfo(data.productUrl);
    }

    // Analyze images if available
    if (data.hasImages) {
      const analyzer = new ImageAnalysisService();
      // In a real implementation, we'd pass actual image files/URLs
      imageAnalysis = await analyzer.analyzeProductImages([]);
    }

    // Get shop settings
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shop: session.shop }
    });

    // Generate description
    const ai = new AIService();
    const result = await ai.generateProductDescription({
      shop: session.shop,
      ...data,
      shopSettings,
      scrapedData,
      imageAnalysis,
    });

    return json(result);
  } catch (error) {
    console.error('Generation error:', error);
    return json({ error: 'Failed to generate description' }, { status: 500 });
  }
};