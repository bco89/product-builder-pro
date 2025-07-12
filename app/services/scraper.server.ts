import FirecrawlApp from '@mendable/firecrawl-js';
import { logger } from './logger.server';
import { extractForDescriptionGeneration } from './product-description-extractor.server';

interface ScrapedProductData {
  title?: string;
  description?: string;
  features?: string[];
  specifications?: Record<string, string>;
  price?: string;
  images?: string[];
  rawContent?: string;
  // Enhanced description-focused data
  descriptionData?: {
    productTitle: string;
    brandVendor?: string;
    productCategory?: string;
    keyFeatures: string[];
    benefits: string[];
    detailedDescription: string;
    materials: string[];
    construction: {
      method?: string;
      details: string[];
      quality?: string;
    };
    specifications: {
      dimensions: Record<string, string>;
      performance: {
        level?: string;
        conditions?: string;
        capacity?: string;
      };
      technical: string[];
    };
    variants: Array<{
      optionName: string;
      availableValues: string[];
      description?: string;
    }>;
    sizeChart: {
      available: boolean;
      measurements?: Array<{
        size: string;
        measurements: Record<string, any>;
        recommendations?: string;
      }>;
      fitNotes?: string;
    };
    targetAudience?: string;
    useCases: string[];
    careInstructions: string[];
    technologies: Array<{
      name: string;
      description?: string;
    }>;
    awards: string[];
  };
}

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

  async scrapeProductInfo(url: string): Promise<ScrapedProductData> {
    logger.info(`Scraping product info from: ${url}`);
    
    try {
      // Validate URL
      let validUrl: URL;
      try {
        validUrl = new URL(url);
        logger.info(`URL validated: ${validUrl.hostname}`);
      } catch (urlError) {
        logger.error('Invalid URL format:', urlError);
        throw new ProductScraperError(
          'Invalid URL format',
          'INVALID_URL',
          { url, error: urlError instanceof Error ? urlError.message : 'Invalid URL' }
        );
      }
      
      // Check if we have Firecrawl configured
      if (!this.firecrawl) {
        logger.warn('Firecrawl not initialized - checking environment');
        
        // In production, throw error for proper handling
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

      logger.info('Using enhanced description extraction with Firecrawl');
      
      // Try enhanced extraction first
      try {
        const extractionResult = await extractForDescriptionGeneration(url, this.firecrawl);
        
        if (extractionResult.success && extractionResult.data) {
          logger.info('Enhanced extraction successful', {
            hasDescriptionData: true,
            featuresCount: extractionResult.data.keyFeatures.length,
            benefitsCount: extractionResult.data.benefits.length,
            variantsCount: extractionResult.data.variants.length
          });
          
          // Return enhanced data structure
          const enhancedData: ScrapedProductData = {
            title: extractionResult.data.productTitle,
            description: extractionResult.data.detailedDescription,
            features: extractionResult.data.keyFeatures,
            specifications: {
              ...extractionResult.data.specifications.dimensions,
              ...Object.entries(extractionResult.data.specifications.performance)
                .filter(([_, value]) => value)
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value as string }), {})
            },
            rawContent: extractionResult.rawContent?.markdown,
            descriptionData: extractionResult.data
          };
          
          return enhancedData;
        }
        
        logger.warn('Enhanced extraction failed, falling back to basic scraping');
      } catch (enhancedError) {
        logger.warn('Enhanced extraction error, falling back to basic scraping', { error: enhancedError });
      }
      
      // Fallback to basic scraping
      logger.info('Calling Firecrawl scrapeUrl with basic parameters');
      
      let scrapeResult: any; // Use any to handle Firecrawl's variable response structure
      try {
        scrapeResult = await this.firecrawl.scrapeUrl(url, {
          formats: ['markdown', 'html'],
          timeout: 30000, // 30 second timeout
          waitFor: 2000, // Wait 2 seconds for dynamic content
        });
        
        logger.info('Firecrawl scrapeUrl completed, response received', {
          hasResponse: !!scrapeResult,
          responseType: typeof scrapeResult,
          hasSuccess: scrapeResult ? 'success' in scrapeResult : false
        });
      } catch (scrapeError) {
        logger.error('Firecrawl scrapeUrl threw error:', scrapeError);
        
        // Check for timeout
        if (scrapeError instanceof Error && scrapeError.message.includes('timeout')) {
          throw new ProductScraperError(
            'The website took too long to respond',
            'TIMEOUT',
            { url, error: scrapeError.message }
          );
        }
        
        throw new ProductScraperError(
          'Failed to connect to the website',
          'API_ERROR',
          { 
            url, 
            error: scrapeError instanceof Error ? scrapeError.message : 'Unknown error',
            errorType: scrapeError?.constructor?.name
          }
        );
      }

      // Check if scrape was successful - Firecrawl returns success directly on response
      // Note: success property might not exist on the response, check for content instead
      const hasContent = scrapeResult && (scrapeResult.markdown || scrapeResult.html || scrapeResult.data);
      
      if (!hasContent) {
        logger.error('Scrape returned no content:', {
          hasResult: !!scrapeResult,
          hasMarkdown: !!scrapeResult?.markdown,
          hasHtml: !!scrapeResult?.html,
          hasData: !!scrapeResult?.data,
          keys: scrapeResult ? Object.keys(scrapeResult).slice(0, 10) : []
        });
        
        throw new ProductScraperError(
          'Failed to scrape URL - no content returned',
          'API_ERROR',
          {
            error: 'No content found on the page',
            url
          }
        );
      }

      logger.info('Scrape successful, extracting product data');
      
      // Extract product data from scraped content
      const extractedData = this.extractProductData(scrapeResult);
      
      logger.info('Product data extracted successfully:', {
        hasTitle: !!extractedData.title,
        hasDescription: !!extractedData.description,
        featuresCount: extractedData.features?.length || 0,
        hasPrice: !!extractedData.price
      });
      
      return extractedData;
    } catch (error) {
      if (error instanceof ProductScraperError) {
        logger.error(`ProductScraperError [${error.code}]:`, error.message, error.details);
        throw error;
      }
      
      logger.error('Unexpected error in scrapeProductInfo:', error);
      throw new ProductScraperError(
        'Failed to scrape product information',
        'API_ERROR',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error?.constructor?.name,
          url
        }
      );
    }
  }

  /**
   * Extract product data from Firecrawl scraped content
   */
  private extractProductData(scrapeResult: any): ScrapedProductData {
    logger.info('Extracting product data from scrape result', {
      hasData: !!scrapeResult.data,
      dataKeys: scrapeResult.data ? Object.keys(scrapeResult.data) : [],
      hasMarkdown: !!scrapeResult.data?.markdown,
      hasHtml: !!scrapeResult.data?.html,
      hasMetadata: !!scrapeResult.data?.metadata,
      // Also check if content is directly on the response
      directMarkdown: !!scrapeResult.markdown,
      directHtml: !!scrapeResult.html,
      allKeys: Object.keys(scrapeResult)
    });
    
    // Firecrawl might return content directly on the response or nested in data
    const markdown = scrapeResult.markdown || scrapeResult.data?.markdown || '';
    const html = scrapeResult.html || scrapeResult.data?.html || '';
    const metadata = scrapeResult.metadata || scrapeResult.data?.metadata || {};
    
    logger.info('Content lengths', {
      markdownLength: markdown.length,
      htmlLength: html.length,
      metadataKeys: Object.keys(metadata)
    });
    
    const data: ScrapedProductData = {
      rawContent: markdown,
    };

    // Try to extract structured data if available
    if (metadata && Object.keys(metadata).length > 0) {
      data.title = metadata.title || this.extractTitle(markdown);
      data.description = metadata.description || this.extractDescription(markdown);
      
      // Handle different possible image formats in metadata
      if (metadata.image) {
        data.images = Array.isArray(metadata.image) ? metadata.image : [metadata.image];
      } else if (metadata.images) {
        data.images = Array.isArray(metadata.images) ? metadata.images : [metadata.images];
      } else {
        data.images = this.extractImages(html);
      }
    } else {
      // Fallback to content parsing
      data.title = this.extractTitle(markdown);
      data.description = this.extractDescription(markdown);
      data.images = this.extractImages(html);
    }

    // Extract additional product details
    data.features = this.extractFeatures(markdown);
    data.specifications = this.extractSpecifications(markdown);
    data.price = this.extractPrice(markdown);

    logger.info('Extracted data summary', {
      hasTitle: !!data.title,
      titleLength: data.title?.length || 0,
      hasDescription: !!data.description,
      descriptionLength: data.description?.length || 0,
      featuresCount: data.features?.length || 0,
      specificationsCount: Object.keys(data.specifications || {}).length,
      hasPrice: !!data.price,
      imagesCount: data.images?.length || 0
    });

    return data;
  }

  /**
   * Extract product title from content
   */
  private extractTitle(content: string): string | undefined {
    // Look for H1 heading
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) return h1Match[1].trim();

    // Look for first substantial line
    const lines = content.split('\n').filter(line => line.trim().length > 10);
    return lines[0]?.trim();
  }

  /**
   * Extract product description from content
   */
  private extractDescription(content: string): string | undefined {
    // Look for paragraphs after the title
    const paragraphs = content.match(/^(?!#|\*|-|\d+\.)(.{20,})$/gm);
    if (paragraphs && paragraphs.length > 0) {
      // Join first few paragraphs
      return paragraphs.slice(0, 3).join(' ').trim();
    }
    return undefined;
  }

  /**
   * Extract product features from content
   */
  private extractFeatures(content: string): string[] {
    const features: string[] = [];
    
    // Look for bullet points
    const bulletPoints = content.match(/^\s*[-*]\s+(.+)$/gm);
    if (bulletPoints) {
      features.push(...bulletPoints.map(point => 
        point.replace(/^\s*[-*]\s+/, '').trim()
      ).filter(f => f.length > 0 && f.length < 200));
    }

    // Look for numbered lists
    const numberedPoints = content.match(/^\s*\d+\.\s+(.+)$/gm);
    if (numberedPoints) {
      features.push(...numberedPoints.map(point => 
        point.replace(/^\s*\d+\.\s+/, '').trim()
      ).filter(f => f.length > 0 && f.length < 200));
    }

    return features.slice(0, 10); // Limit to 10 features
  }

  /**
   * Extract specifications from content
   */
  private extractSpecifications(content: string): Record<string, string> {
    const specs: Record<string, string> = {};
    
    // Look for key-value patterns like "Material: Cotton"
    const specMatches = content.match(/^([A-Za-z\s]+):\s*(.+)$/gm);
    if (specMatches) {
      specMatches.forEach(match => {
        const [key, value] = match.split(':').map(s => s.trim());
        if (key && value && key.length < 50 && value.length < 200) {
          specs[key] = value;
        }
      });
    }

    // Look for table-like content
    const tableRows = content.match(/\|([^|]+)\|([^|]+)\|/g);
    if (tableRows) {
      tableRows.forEach(row => {
        const cells = row.split('|').filter(cell => cell.trim());
        if (cells.length === 2) {
          const key = cells[0].trim();
          const value = cells[1].trim();
          if (key && value && !key.includes('-') && key.length < 50) {
            specs[key] = value;
          }
        }
      });
    }

    return specs;
  }

  /**
   * Extract price from content
   */
  private extractPrice(content: string): string | undefined {
    // Look for various price patterns
    const pricePatterns = [
      /\$\s*(\d+(?:[.,]\d{2})?)/,
      /USD\s*(\d+(?:[.,]\d{2})?)/i,
      /(?:price|cost):\s*\$?\s*(\d+(?:[.,]\d{2})?)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = content.match(pattern);
      if (match) {
        return `$${match[1]}`;
      }
    }

    return undefined;
  }

  /**
   * Extract image URLs from HTML content
   */
  private extractImages(html: string): string[] {
    const images: string[] = [];
    
    // Extract img src attributes
    const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    if (imgMatches) {
      imgMatches.forEach(imgTag => {
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
          const src = srcMatch[1];
          // Filter out common non-product images
          if (!src.includes('logo') && !src.includes('icon') && !src.includes('banner')) {
            images.push(src);
          }
        }
      });
    }

    return images.slice(0, 10); // Limit to 10 images
  }
  
  private getMockScrapedData(url: URL): ScrapedProductData {
    // Simulate different responses based on domain
    const domain = url.hostname.toLowerCase();
    
    if (domain.includes('amazon')) {
      return {
        title: 'Premium Product from Amazon',
        description: 'High-quality product with excellent reviews and fast shipping.',
        features: [
          'Premium quality materials',
          'Satisfaction guarantee',
          'Fast Prime shipping',
          'Thousands of positive reviews'
        ],
        specifications: {
          'Brand': 'Top Brand',
          'Material': 'Premium Quality',
          'Warranty': '1 Year'
        },
        price: '$49.99',
        images: ['https://example.com/product1.jpg', 'https://example.com/product2.jpg']
      };
    }
    
    if (domain.includes('etsy')) {
      return {
        title: 'Handcrafted Artisan Product',
        description: 'Beautiful handmade item crafted with love and attention to detail.',
        features: [
          'Handmade with care',
          'Unique design',
          'Eco-friendly materials',
          'Supports small business'
        ],
        specifications: {
          'Handmade': 'Yes',
          'Materials': 'Natural, sustainable',
          'Processing time': '3-5 days'
        },
        price: '$35.00',
        images: ['https://example.com/handmade1.jpg']
      };
    }
    
    // Default response
    return {
      title: 'Quality Product',
      description: 'Excellent product that meets all your needs.',
      features: [
        'High quality construction',
        'Great value for money',
        'Customer satisfaction guaranteed'
      ],
      specifications: {
        'Quality': 'Premium',
        'Value': 'Excellent'
      },
      price: '$29.99'
    };
  }
  
  /**
   * Extract structured data from a page
   * Parses JSON-LD, microdata, etc.
   */
  async extractStructuredData(htmlContent: string): Promise<any> {
    try {
      // Look for JSON-LD structured data
      const jsonLdMatch = htmlContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          if (jsonLd['@type'] === 'Product' || jsonLd.type === 'Product') {
            return jsonLd;
          }
        } catch (e) {
          logger.debug('Failed to parse JSON-LD', { error: e });
        }
      }
    } catch (error) {
      logger.debug('Error extracting structured data', { error });
    }
    
    return null;
  }
}