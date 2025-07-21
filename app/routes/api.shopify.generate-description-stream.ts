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

        // Stage 1: Analyzing product details
        sendEvent({ stage: 1, progress: 0, message: "Analyzing product details" });
        
        // Extract initial product features from provided data
        const extractedFeatures: string[] = [];
        if (data.productType) extractedFeatures.push(data.productType);
        if (data.vendor) extractedFeatures.push(`Brand: ${data.vendor}`);
        if (data.category) extractedFeatures.push(`Category: ${data.category}`);
        if (data.hasImages) extractedFeatures.push(`${data.hasImages} product images`);
        
        sendEvent({ 
          stage: 1, 
          progress: 100, 
          message: "Product analysis complete",
          extractedFeatures 
        });

        // Stage 2: URL scraping or context review
        if (data.method === 'url' && data.productUrl) {
          sendEvent({ stage: 2, progress: 0, message: "Connecting to product URL" });
          
          try {
            const scraper = new ProductScraperService();
            
            sendEvent({ stage: 2, progress: 20, message: "Extracting product information from URL" });
            
            scrapedData = await scraper.extractProductInfo(data.productUrl, session.shop);
            
            // Extract additional features from scraped data
            if (scrapedData) {
              if (scrapedData.title && scrapedData.title !== data.productTitle) {
                extractedFeatures.push(`Original title: ${scrapedData.title}`);
              }
              if (scrapedData.price) {
                extractedFeatures.push(`Price: ${scrapedData.price}`);
              }
              if (scrapedData.features && Array.isArray(scrapedData.features)) {
                extractedFeatures.push(...scrapedData.features.slice(0, 5));
              }
              if (scrapedData.specifications) {
                const specCount = Object.keys(scrapedData.specifications).length;
                extractedFeatures.push(`${specCount} specifications found`);
              }
            }
            
            sendEvent({ 
              stage: 2, 
              progress: 100, 
              message: `Successfully extracted data from ${new URL(data.productUrl).hostname}`,
              extractedFeatures 
            });
            
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
          sendEvent({ stage: 2, progress: 0, message: "Processing product information" });
          
          // Add context-based features
          if (data.additionalContext) {
            extractedFeatures.push("Custom context provided");
            const contextWords = data.additionalContext.split(' ').length;
            extractedFeatures.push(`${contextWords} words of context`);
          }
          
          if (data.keywords && data.keywords.length > 0) {
            data.keywords.forEach((keyword: string) => {
              if (keyword) extractedFeatures.push(`Keyword: ${keyword}`);
            });
          }
          
          sendEvent({ 
            stage: 2, 
            progress: 100, 
            message: "Product information processed",
            extractedFeatures 
          });
        }

        // Stage 3: Preparing AI generation
        sendEvent({ stage: 3, progress: 0, message: "Preparing AI generation parameters" });
        
        // Get shop settings
        const shopSettings = await prisma.shopSettings.findUnique({
          where: { shop: session.shop }
        });
        
        if (shopSettings) {
          if (shopSettings.businessType) {
            extractedFeatures.push(`Perspective: ${shopSettings.businessType === 'manufacturer' ? 'Product Creator' : 'Retailer'}`);
          }
          if (shopSettings.targetCustomerOverride) {
            extractedFeatures.push("Custom target audience defined");
          }
        }
        
        sendEvent({ 
          stage: 3, 
          progress: 100, 
          message: "AI generation ready",
          extractedFeatures 
        });

        // Stage 4: AI Generation
        sendEvent({ 
          stage: 4, 
          progress: 0, 
          message: "Starting AI generation",
          extractedFeatures 
        });
        
        const ai = new AIService();
        
        // Create progress callback for AI service with partial results
        let partialDescription = '';
        let partialSeoTitle = '';
        let partialSeoDescription = '';
        
        const aiProgressCallback = (progress: number, partialResults?: any) => {
          if (partialResults) {
            if (partialResults.description) partialDescription = partialResults.description;
            if (partialResults.seoTitle) partialSeoTitle = partialResults.seoTitle;
            if (partialResults.seoDescription) partialSeoDescription = partialResults.seoDescription;
          }
          
          sendEvent({ 
            stage: 4, 
            progress, 
            message: progress < 30 ? "Generating product description..." : 
                     progress < 60 ? "Creating SEO-optimized title..." : 
                     progress < 90 ? "Writing meta description..." : 
                     "Finalizing content...",
            extractedFeatures,
            partialDescription,
            partialSeoTitle,
            partialSeoDescription
          });
        };
        
        const result = await ai.generateProductDescription({
          shop: session.shop,
          ...data,
          shopSettings,
          scrapedData,
          progressCallback: aiProgressCallback
        });

        sendEvent({ 
          stage: 4, 
          progress: 100, 
          message: "AI generation complete",
          extractedFeatures,
          partialDescription: result.description,
          partialSeoTitle: result.seoTitle,
          partialSeoDescription: result.seoDescription
        });

        // Stage 5: Final optimization
        sendEvent({ 
          stage: 5, 
          progress: 0, 
          message: "Optimizing content for best results",
          extractedFeatures,
          partialDescription: result.description,
          partialSeoTitle: result.seoTitle,
          partialSeoDescription: result.seoDescription
        });
        
        // Quick final checks
        const wordCount = result.description.split(' ').length;
        extractedFeatures.push(`${wordCount} words generated`);
        
        sendEvent({ 
          stage: 5, 
          progress: 100, 
          message: "Content optimization complete",
          extractedFeatures,
          partialDescription: result.description,
          partialSeoTitle: result.seoTitle,
          partialSeoDescription: result.seoDescription
        });

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