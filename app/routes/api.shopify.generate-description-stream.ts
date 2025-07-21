import { type ActionFunctionArgs } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { AIService } from "../services/ai.server";
import { ProductScraperService, ProductScraperError } from "../services/scraper.server";
import { prisma } from "../db.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticateAdmin(request);
    
    // Get parameters from request body
    const data = await request.json();

  // Set up SSE headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Helper to send SSE events
      const sendEvent = (eventData: any) => {
        const message = `data: ${JSON.stringify(eventData)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        let scrapedData = null;

        // Stage 1: Analyzing product details (0-100%)
        sendEvent({ stage: 1, progress: 0, message: "Analyzing product details" });
        await new Promise(resolve => setTimeout(resolve, 100));
        sendEvent({ stage: 1, progress: 50, message: "Analyzing product details" });
        await new Promise(resolve => setTimeout(resolve, 100));
        sendEvent({ stage: 1, progress: 100, message: "Analyzing product details" });

        // Stage 2: URL scraping or context review (0-100%)
        if (data.method === 'url' && data.productUrl) {
          sendEvent({ stage: 2, progress: 0, message: "Gathering additional product info from URL" });
          
          try {
            const scraper = new ProductScraperService();
            
            // Progress updates during scraping
            sendEvent({ stage: 2, progress: 20, message: "Gathering additional product info from URL" });
            
            scrapedData = await scraper.extractProductInfo(data.productUrl, session.shop);
            
            sendEvent({ stage: 2, progress: 100, message: "Gathering additional product info from URL" });
            
            logger.info('URL extraction successful using extract endpoint', { 
              shop: session.shop, 
              url: data.productUrl,
              hasData: !!scrapedData,
              extractionMethod: scrapedData?.extractionMethod
            });
          } catch (error) {
            if (error instanceof ProductScraperError) {
              logger.error('Product scraping failed', error, { 
                shop: session.shop, 
                url: data.productUrl,
                errorCode: error.code 
              });
              
              // Send error event with safe property access
              const errorDetails = typeof error.details === 'object' && error.details 
                ? (error.details.message || error.details.error || JSON.stringify(error.details))
                : error.message || 'Unable to extract product information from the URL';
                
              sendEvent({ 
                error: true, 
                message: error.message || 'Failed to scrape URL',
                code: error.code || 'SCRAPING_ERROR',
                details: errorDetails
              });
              controller.close();
              return;
            }
            throw error;
          }
        } else {
          // Manual or context method
          sendEvent({ stage: 2, progress: 0, message: "Reviewing provided product info" });
          await new Promise(resolve => setTimeout(resolve, 300));
          sendEvent({ stage: 2, progress: 50, message: "Reviewing provided product info" });
          await new Promise(resolve => setTimeout(resolve, 300));
          sendEvent({ stage: 2, progress: 100, message: "Reviewing provided product info" });
        }

        // Stage 3: Structuring the product info (0-100%)
        sendEvent({ stage: 3, progress: 0, message: "Structuring the product info for best results" });
        
        // Image analysis removed - not being used in the process
        sendEvent({ stage: 3, progress: 50, message: "Structuring the product info for best results" });

        // Get shop settings
        const shopSettings = await prisma.shopSettings.findUnique({
          where: { shop: session.shop }
        });
        
        sendEvent({ stage: 3, progress: 100, message: "Structuring the product info for best results" });

        // Stage 4: AI Generation (0-100%)
        sendEvent({ stage: 4, progress: 0, message: "Product description being generated" });
        
        const ai = new AIService();
        
        // Create progress callback for AI service
        const aiProgressCallback = (progress: number) => {
          sendEvent({ stage: 4, progress, message: "Product description being generated" });
        };
        
        const result = await ai.generateProductDescription({
          shop: session.shop,
          ...data,
          shopSettings,
          scrapedData,
          progressCallback: aiProgressCallback
        });

        sendEvent({ stage: 4, progress: 100, message: "Product description being generated" });

        // Stage 5: Formatting (0-100%)
        sendEvent({ stage: 5, progress: 0, message: "Formatting product description for readability and best SEO results" });
        await new Promise(resolve => setTimeout(resolve, 200));
        sendEvent({ stage: 5, progress: 50, message: "Formatting product description for readability and best SEO results" });
        await new Promise(resolve => setTimeout(resolve, 200));
        sendEvent({ stage: 5, progress: 100, message: "Formatting product description for readability and best SEO results" });

        // Send completion event with results
        sendEvent({ 
          completed: true, 
          result: {
            description: result.description,
            seoTitle: result.seoTitle,
            seoDescription: result.seoDescription
          }
        });

        logger.info('Description generation successful via SSE', { 
          shop: session.shop,
          method: data.method,
          hasScrapedData: !!scrapedData,
          hasImageAnalysis: false
        });

      } catch (error) {
        logger.error('Generation error:', error, { shop: session.shop });
        
        // Send error event
        sendEvent({ 
          error: true, 
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          code: 'GENERATION_ERROR'
        });
      } finally {
        // Close the stream
        controller.close();
      }
    }
  });

  return new Response(stream, { headers });
  } catch (error) {
    logger.error('SSE endpoint error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};