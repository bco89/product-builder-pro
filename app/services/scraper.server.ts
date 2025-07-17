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

// Focused schema for extract endpoint
const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    productName: {
      type: "string",
      description: "The exact product name/title"
    },
    brand: {
      type: "string",
      description: "Brand or manufacturer name"
    },
    category: {
      type: "string",
      description: "Product category/type"
    },
    description: {
      type: "string",
      description: "Full product description from the page"
    },
    keyFeatures: {
      type: "array",
      items: { type: "string" },
      description: "Top 5-7 key features or selling points"
    },
    specifications: {
      type: "object",
      description: "Technical specifications as key-value pairs"
    },
    materials: {
      type: "array",
      items: { type: "string" },
      description: "Materials used in the product"
    },
    dimensions: {
      type: "object",
      properties: {
        length: { type: "string" },
        width: { type: "string" },
        height: { type: "string" },
        weight: { type: "string" }
      }
    },
    sizingInfo: {
      type: "object",
      properties: {
        availableSizes: {
          type: "array",
          items: { type: "string" }
        },
        sizeChartAvailable: { type: "boolean" },
        fitNotes: { type: "string" }
      }
    },
    variants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          options: { type: "array", items: { type: "string" } }
        }
      },
      description: "Product variants (colors, sizes, styles)"
    },
    useCases: {
      type: "array",
      items: { type: "string" },
      description: "What this product is best used for"
    },
    uniqueAttributes: {
      type: "array",
      items: { type: "string" },
      description: "Unique or standout features"
    }
  },
  required: ["productName", "keyFeatures"]
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
        // Use the extract method with our focused schema
        const extractResult = await (this.firecrawl as any).extract(url, {
          schema: EXTRACT_SCHEMA,
          prompt: `Extract comprehensive product information for creating an e-commerce product description. 
          Focus on: product name, brand, key features (5-7 most important), technical specifications, 
          materials, dimensions, all available sizes and colors, unique attributes.
          For sizing: check for size charts, available sizes, and fit information.
          Extract actual content from the page, not generic descriptions.`
        });

        const extractionTime = Date.now() - startTime;
        logger.info('Extract endpoint completed', {
          success: extractResult.success,
          hasData: !!extractResult.data,
          extractionTime
        });

        if (extractResult.success && extractResult.data) {
          // Convert extract data to our format
          const data = extractResult.data;
          return {
            title: data.productName,
            description: data.description,
            features: data.keyFeatures || [],
            specifications: data.specifications || {},
            // Pass through the raw extract data - this is all we need!
            extractedJson: extractResult.data,
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
        logger.error('Extract endpoint failed', { error: extractError });
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