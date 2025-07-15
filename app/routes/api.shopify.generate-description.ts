import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { getAIService } from "../services/ai";
import { ProductScraperService, ProductScraperError } from "../services/scraper.server";
import { prisma } from "../db.server";
import { logger } from "../services/logger.server";
import type { ActionFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticateAdmin(request);
  const data = await request.json();

  try {
    let scrapedData = null;
    let imageAnalysis = null;

    // Scrape URL if provided
    if (data.method === 'url' && data.productUrl) {
      logger.info(`Attempting to scrape URL: ${data.productUrl}`, { shop: session.shop });
      
      try {
        const scraper = new ProductScraperService();
        scrapedData = await scraper.scrapeProductInfo(data.productUrl, session.shop);
        logger.info('URL scraping successful', { 
          shop: session.shop, 
          url: data.productUrl,
          hasData: !!scrapedData 
        });
      } catch (error) {
        if (error instanceof ProductScraperError) {
          logger.error('Product scraping failed', error, { 
            shop: session.shop, 
            url: data.productUrl,
            errorCode: error.code 
          });
          
          // Return specific error messages based on error type
          switch (error.code) {
            case 'INVALID_URL':
              return json({ 
                error: 'Invalid URL format. Please enter a valid product URL.',
                code: error.code,
                details: 'The URL you entered is not properly formatted. Please check and try again.'
              }, { status: 400 });
            
            case 'NO_API_KEY':
              return errorResponse(
                error,
                'URL analysis is currently unavailable. Please try the manual method or generate from context.',
                { shop: session.shop, endpoint: 'api.shopify.generate-description' }
              );
            
            case 'TIMEOUT':
              return errorResponse(
                error,
                'The website took too long to respond. Please try again.',
                { shop: session.shop, endpoint: 'api.shopify.generate-description' }
              );
            
            case 'API_ERROR':
              return errorResponse(
                error,
                'Unable to access the website. Please check if the URL is publicly accessible.',
                { shop: session.shop, endpoint: 'api.shopify.generate-description' }
              );
            
            case 'INITIALIZATION_ERROR':
              return errorResponse(
                error,
                'URL analysis service initialization failed. Please try again later.',
                { shop: session.shop, endpoint: 'api.shopify.generate-description' }
              );
            
            default:
              throw error;
          }
        }
        throw error;
      }
    }

    // Analyze images if available
    if (data.hasImages) {
      try {
        const ai = getAIService();
        // In a real implementation, we'd pass actual image files/URLs
        imageAnalysis = await ai.analyzeProductImages([]);
      } catch (error) {
        // Continue without image analysis
      }
    }

    // Get shop settings
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shop: session.shop }
    });

    // Generate description
    const ai = getAIService();
    const result = await ai.generateProductDescription({
      shop: session.shop,
      ...data,
      shopSettings,
      scrapedData,
      imageAnalysis,
    });

    logger.info('Description generation successful', { 
      shop: session.shop,
      method: data.method,
      hasScrapedData: !!scrapedData,
      hasImageAnalysis: !!imageAnalysis
    });

    return json(result);
  } catch (error) {
    logger.error('Generation error:', error, { shop: session.shop });
    
    // Check if it's an AI service error
    if (error instanceof Error && error.message.includes('API key')) {
      return json({ 
        error: 'AI service not configured. Please contact support.',
        code: 'AI_NOT_CONFIGURED',
        details: 'The AI description service is not properly configured.'
      }, { status: 503 });
    }
    
    return json({ 
      error: 'Failed to generate description. Please try again.',
      code: 'GENERATION_ERROR',
      details: 'An unexpected error occurred while generating the description.'
    }, { status: 500 });
  }
};