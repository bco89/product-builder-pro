import { type ActionFunctionArgs } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { AIService } from "../services/ai.server";
import { ProductScraperService, ProductScraperError } from "../services/scraper.server";
import { prisma } from "../db.server";
import { logger, Logger } from "../services/logger.server";
import { 
  retryWithBackoff, 
  parseGraphQLResponse, 
  errorResponse 
} from "../services/errorHandler.server";
import type { GraphQLErrorResponse } from "../types/errors";

export const action = async ({ request }: ActionFunctionArgs) => {
  const requestId = Logger.generateRequestId();
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
            
            // Simulate progress during long scraping operation
            let scrapingProgress = 10;
            const progressInterval = setInterval(() => {
              if (scrapingProgress < 80) {
                scrapingProgress += 5;
                const messages = [
                  "Connecting to website...",
                  "Analyzing page structure...",
                  "Extracting product details...",
                  "Processing product information...",
                  "Gathering specifications..."
                ];
                const messageIndex = Math.floor((scrapingProgress / 80) * messages.length);
                sendEvent({ 
                  stage: 2, 
                  progress: scrapingProgress, 
                  message: messages[Math.min(messageIndex, messages.length - 1)],
                  extractedFeatures 
                });
              }
            }, 2000); // Update every 2 seconds
            
            try {
              scrapedData = await scraper.extractProductInfo(data.productUrl, session.shop);
            } finally {
              clearInterval(progressInterval);
            }
            
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
            // Handle URL scraping error
            logger.error('URL scraping failed', error, { 
              shop: session.shop, 
              url: data.productUrl 
            });
            
            sendEvent({ 
              stage: 2, 
              progress: 100, 
              message: "Could not extract data from URL, using provided information",
              extractedFeatures,
              error: true 
            });
          }
        } else {
          // Stage 2: Reviewing context
          sendEvent({ 
            stage: 2, 
            progress: 100, 
            message: "Reviewing product context",
            extractedFeatures 
          });
        }

        // Stage 3: AI Description Generation
        sendEvent({ stage: 3, progress: 0, message: "Generating product description" });
        
        const aiService = new AIService();
        
        // Build context for AI
        const context = {
          productTitle: data.productTitle,
          productType: data.productType,
          vendor: data.vendor,
          category: data.category,
          tags: data.tags || [],
          features: extractedFeatures,
          scrapedData: scrapedData,
          tone: data.tone || 'professional',
          focusKeywords: data.focusKeywords || []
        };
        
        // Generate description
        const description = await aiService.generateProductDescription(
          context,
          session.shop
        );
        
        // Log the generation
        if (data.productId) {
          await prisma.promptLog.create({
            data: {
              shop: session.shop,
              productId: data.productId,
              prompt: JSON.stringify(context),
              response: description,
              model: "gpt-4",
              tokensUsed: 0, // Would need to get this from AI service
              responseTime: 0, // Would need to track this
            },
          });
        }
        
        sendEvent({ 
          stage: 3, 
          progress: 100, 
          message: "Description generated successfully",
          description,
          complete: true 
        });
        
        // Close the stream
        controller.close();
        
      } catch (error) {
        logger.error('Stream generation failed', error, { 
          shop: session.shop,
          requestId 
        });
        
        // Send error event
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        sendEvent({ 
          error: true, 
          message: errorMessage,
          complete: true 
        });
        
        controller.close();
      }
    }
  });

  return new Response(stream, { headers });
  } catch (error) {
    logger.error('Failed to create description stream', error, { requestId });
    return errorResponse(error, { requestId });
  }
};