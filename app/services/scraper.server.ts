import FirecrawlApp from '@mendable/firecrawl-js';
import { logger } from './logger.server';

interface ScrapedProductData {
  title?: string;
  description?: string;
  features?: string[];
  specifications?: Record<string, string>;
  price?: string;
  images?: string[];
  rawContent?: string;
}

export class ProductScraperError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_URL' | 'API_ERROR' | 'TIMEOUT' | 'PARSING_ERROR' | 'NO_API_KEY',
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
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (apiKey) {
      this.firecrawl = new FirecrawlApp({ apiKey });
    } else {
      logger.warn('FIRECRAWL_API_KEY not configured - URL scraping will use mock data');
    }
  }

  async scrapeProductInfo(url: string): Promise<ScrapedProductData> {
    logger.info(`Scraping product info from: ${url}`);
    
    try {
      // Validate URL
      const validUrl = new URL(url);
      
      // Check if we have Firecrawl configured
      if (!this.firecrawl) {
        logger.warn('Using mock data - Firecrawl not configured');
        return this.getMockScrapedData(validUrl);
      }

      // Scrape with Firecrawl
      const scrapeResult = await this.firecrawl.scrapeUrl(url, {
        formats: ['markdown', 'html'],
        timeout: 30000, // 30 second timeout
        waitFor: 2000, // Wait 2 seconds for dynamic content
      });

      if (!scrapeResult.success) {
        throw new ProductScraperError(
          'Failed to scrape URL',
          'API_ERROR',
          scrapeResult.error
        );
      }

      // Extract product data from scraped content
      const extractedData = this.extractProductData(scrapeResult);
      
      return extractedData;
    } catch (error) {
      if (error instanceof ProductScraperError) {
        throw error;
      }
      
      if (error instanceof TypeError && error.message.includes('URL')) {
        throw new ProductScraperError(
          'Invalid URL format',
          'INVALID_URL',
          { url, error: error.message }
        );
      }

      logger.error('Failed to scrape product URL:', error);
      throw new ProductScraperError(
        'Failed to scrape product information',
        'API_ERROR',
        error
      );
    }
  }

  /**
   * Extract product data from Firecrawl scraped content
   */
  private extractProductData(scrapeResult: any): ScrapedProductData {
    const markdown = scrapeResult.markdown || '';
    const html = scrapeResult.html || '';
    
    const data: ScrapedProductData = {
      rawContent: markdown,
    };

    // Try to extract structured data if available
    if (scrapeResult.metadata) {
      data.title = scrapeResult.metadata.title || this.extractTitle(markdown);
      data.description = scrapeResult.metadata.description || this.extractDescription(markdown);
      data.images = scrapeResult.metadata.images || this.extractImages(html);
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