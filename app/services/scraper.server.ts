import FirecrawlApp from '@mendable/firecrawl-js';
import { logger } from './logger.server';

interface ScrapedProductData {
  title?: string;
  description?: string;
  features?: string[];
  specifications?: Record<string, string>;
  price?: string;
  images?: string[];
  // Raw extracted JSON data from Firecrawl extract endpoint
  extractedJson?: any;
  // Extraction metadata
  extractionMethod?: 'extract';
  extractionTime?: number;
}

// Schema matching your provided format
const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          brand: {
            type: "string"
          },
          title: {
            type: "string"
          },
          description: {
            type: "string"
          },
          size_charts: {
            type: "string"
          },
          materials: {
            type: "string"
          },
          unique_features: {
            type: "string"
          },
          best_for: {
            type: "string"
          },
          other_information: {
            type: "string"
          }
        },
        required: [
          "brand",
          "title",
          "description",
          "size_charts"
        ]
      }
    }
  },
  required: [
    "products"
  ]
};

export class ProductScraperError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_URL' | 'API_ERROR' | 'TIMEOUT' | 'PARSING_ERROR' | 'NO_API_KEY' | 'INITIALIZATION_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'ProductScraperError';
  }
}

/**
 * Service for scraping product information from URLs using Firecrawl
 */
export class ProductScraperService {
  private firecrawl: FirecrawlApp | null = null;

  constructor() {
    logger.info('ProductScraperService constructor called');
    
    const apiKey = process.env.FIRECRAWL_API_KEY;
    logger.info('FIRECRAWL_API_KEY environment variable exists:', !!apiKey);
    
    if (apiKey) {
      try {
        // Ensure API key has proper prefix
        const formattedApiKey = apiKey.startsWith('fc-') ? apiKey : `fc-${apiKey}`;
        logger.info('Initializing FirecrawlApp with API key (prefix check):', formattedApiKey.substring(0, 6) + '...');
        
        this.firecrawl = new FirecrawlApp({ apiKey: formattedApiKey });
        logger.info('FirecrawlApp initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize FirecrawlApp:', error);
        this.firecrawl = null;
      }
    } else {
      logger.warn('FIRECRAWL_API_KEY not configured - URL scraping will be unavailable');
    }
  }

  /**
   * Extract product information using Firecrawl's extract endpoint
   * More efficient and accurate than scraping
   */
  async extractProductInfo(url: string, shop?: string): Promise<ScrapedProductData> {
    logger.info(`Extracting product info using extract endpoint from: ${url}`);
    
    try {
      // Validate URL
      const validUrl = new URL(url);
      logger.info(`URL validated: ${validUrl.hostname}`);
      
      // Check if we have Firecrawl configured
      if (!this.firecrawl) {
        logger.warn('Firecrawl not initialized - checking environment');
        throw new ProductScraperError(
          'URL analysis service is temporarily unavailable',
          'NO_API_KEY',
          { 
            message: 'The Firecrawl service is not properly configured',
            environment: process.env.NODE_ENV,
            hasApiKey: !!process.env.FIRECRAWL_API_KEY
          }
        );
      }

      const startTime = Date.now();
      logger.info('Using Firecrawl extract endpoint with focused schema');
      
      try {
        // Use the extract method with array of URLs as per Firecrawl docs
        const extractResult = await (this.firecrawl as any).extract([url], {
          prompt: "Extract comprehensive product information from this page. Focus on: brand, product title, full description, size charts (if available), materials used, unique features that differentiate this product, what this product is best used for, and any other important product information.",
          schema: EXTRACT_SCHEMA,
          agent: {
            model: 'FIRE-1'
          }
        });

        const extractionTime = Date.now() - startTime;
        logger.info('Extract endpoint completed', {
          success: extractResult.success,
          hasData: !!extractResult.data,
          dataStructure: extractResult.data ? Object.keys(extractResult.data) : [],
          extractionTime
        });
        
        // Log the actual response structure for debugging
        if (extractResult.data) {
          logger.info('Extract response data structure:', {
            hasProducts: !!extractResult.data.products,
            productsCount: extractResult.data.products?.length || 0,
            firstProductKeys: extractResult.data.products?.[0] ? Object.keys(extractResult.data.products[0]) : []
          });
        }

        if (extractResult.success && extractResult.data && extractResult.data.products && extractResult.data.products.length > 0) {
          // Get the first product from the array
          const product = extractResult.data.products[0];
          
          // Convert to our format
          return {
            title: product.title,
            description: product.description,
            features: product.unique_features ? product.unique_features.split('\n').filter((f: string) => f.trim()) : [],
            specifications: {
              materials: product.materials,
              sizeChart: product.size_charts,
              bestFor: product.best_for
            },
            // Pass through the raw extract data
            extractedJson: product,
            extractionMethod: 'extract',
            extractionTime
          };
        }

        // If extract fails, throw error - no fallback
        throw new ProductScraperError(
          'Failed to extract product data from URL',
          'API_ERROR',
          {
            message: 'Firecrawl extract endpoint did not return data',
            url
          }
        );
        
      } catch (extractError) {
        logger.error('Extract endpoint failed', { 
          error: extractError,
          errorMessage: extractError instanceof Error ? extractError.message : 'Unknown error',
          errorStack: extractError instanceof Error ? extractError.stack : undefined,
          url 
        });
        
        // Check for specific error types
        if (extractError instanceof Error) {
          if (extractError.message.includes('401') || extractError.message.includes('Unauthorized')) {
            throw new ProductScraperError(
              'Invalid API key or authentication failed',
              'API_ERROR',
              {
                error: 'Authentication failed. Please check your Firecrawl API key.',
                url
              }
            );
          } else if (extractError.message.includes('403') || extractError.message.includes('Forbidden')) {
            throw new ProductScraperError(
              'Access denied to the target website',
              'API_ERROR',
              {
                error: 'The website is blocking access. It may have anti-scraping measures.',
                url
              }
            );
          } else if (extractError.message.includes('404')) {
            throw new ProductScraperError(
              'Product page not found',
              'API_ERROR',
              {
                error: 'The URL does not exist or has been moved.',
                url
              }
            );
          } else if (extractError.message.includes('timeout') || extractError.message.includes('ETIMEDOUT')) {
            throw new ProductScraperError(
              'Request timed out',
              'TIMEOUT',
              {
                error: 'The website took too long to respond.',
                url
              }
            );
          }
        }
        
        throw new ProductScraperError(
          'Failed to extract product data from URL',
          'API_ERROR',
          {
            error: extractError instanceof Error ? extractError.message : 'Unknown error',
            url
          }
        );
      }
      
    } catch (error) {
      if (error instanceof ProductScraperError) {
        throw error;
      }
      
      logger.error('Unexpected error in extractProductInfo:', error);
      throw new ProductScraperError(
        'Failed to extract product information',
        'API_ERROR',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          url
        }
      );
    }
  }

}