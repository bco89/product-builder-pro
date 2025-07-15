import type FirecrawlApp from '@mendable/firecrawl-js';
import { logger } from '../../logger.server';
import type { ExtractedProductData } from '../types';
import { PromptLogger } from '../logging/PromptLogger';

/**
 * Firecrawl configuration optimized for description-relevant content
 */
export const FIRECRAWL_SCRAPE_CONFIG = {
  formats: ["markdown", "html"] as const,
  onlyMainContent: true,
  includeTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "div", "span",
    "ul", "ol", "li",
    "table", "tr", "td", "th",
    ".product", ".description", ".specs", ".features",
    ".variant", ".option", ".size", ".color", ".material",
    ".benefits", ".technology", ".construction",
    ".size-chart", ".sizing", ".fit",
    "[data-product]", "[data-feature]", "[data-spec]"
  ],
  excludeTags: [
    "nav", "header", "footer",
    ".nav", ".navigation", ".header", ".footer",
    ".cookie", ".popup", ".modal",
    ".advertisement", ".ad", ".ads",
    ".social", ".share", ".comments",
    ".price", ".pricing", ".cost", ".cart", ".buy",
    "#nav", "#header", "#footer", "#sidebar", "#cart"
  ],
  waitFor: 2000,
  timeout: 30000
};

/**
 * LLM extraction schema focused on description-relevant data
 */
export const DESCRIPTION_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    productTitle: {
      type: "string",
      description: "The main product title/name as it appears on the page"
    },
    brandVendor: {
      type: "string", 
      description: "Brand or manufacturer name"
    },
    productCategory: {
      type: "string",
      description: "Product category/type (e.g., 'Wakesurf Board', 'Athletic Apparel')"
    },
    keyFeatures: {
      type: "array",
      items: { type: "string" },
      description: "Primary product features and technologies that make this product unique"
    },
    benefits: {
      type: "array",
      items: { type: "string" },
      description: "Customer benefits and value propositions (what problems it solves)"
    },
    detailedDescription: {
      type: "string",
      description: "Comprehensive product description from the page, including all relevant details"
    },
    materials: {
      type: "array",
      items: { type: "string" },
      description: "Materials used in construction"
    },
    specifications: {
      type: "object",
      properties: {
        dimensions: { type: "object" },
        performance: { type: "object" },
        technical: { type: "array", items: { type: "string" } }
      }
    },
    variants: {
      type: "array",
      items: {
        type: "object", 
        properties: {
          optionName: { type: "string" },
          availableValues: { type: "array", items: { type: "string" } },
          description: { type: "string" }
        }
      }
    },
    targetAudience: {
      type: "string",
      description: "Who this product is designed for"
    },
    useCases: {
      type: "array",
      items: { type: "string" },
      description: "Different ways or scenarios where this product would be used"
    },
    technologies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" }
        }
      }
    }
  },
  required: ["productTitle", "keyFeatures", "detailedDescription"]
};

export class ProductExtractor {
  private promptLogger: PromptLogger;
  
  constructor(promptLogger: PromptLogger) {
    this.promptLogger = promptLogger;
  }
  
  /**
   * Extract product information using Firecrawl
   */
  async extract(
    url: string, 
    firecrawlClient: FirecrawlApp,
    metadata?: Record<string, any>
  ): Promise<ExtractedProductData> {
    try {
      logger.info('Starting product extraction', { url });
      
      // Use Firecrawl's extract feature
      const response: any = await firecrawlClient.scrapeUrl(url, {
        ...FIRECRAWL_SCRAPE_CONFIG,
        extract: {
          schema: DESCRIPTION_EXTRACTION_SCHEMA,
          systemPrompt: this.getSystemPrompt(),
          prompt: this.getUserPrompt()
        }
      } as any);
      
      // Get extracted data
      const extractedData = response.extract || response.data?.extract;
      
      if (extractedData) {
        logger.info('Successfully extracted product data using LLM');
        
        const cleanedData = this.cleanExtractedData(extractedData);
        
        // Log the extraction
        await this.promptLogger.logExtraction({
          url,
          extractedData: cleanedData,
          method: 'firecrawl-llm-extraction',
          timestamp: new Date()
        });
        
        return {
          ...cleanedData,
          originalUrl: url,
          extractionMethod: 'llm-extraction'
        };
      } else {
        // Fallback extraction
        logger.warn('LLM extraction failed, using fallback method');
        
        const fallbackData = this.fallbackExtract(response);
        
        // Log the extraction
        await this.promptLogger.logExtraction({
          url,
          extractedData: fallbackData,
          method: 'fallback-extraction',
          timestamp: new Date()
        });
        
        return {
          ...fallbackData,
          originalUrl: url,
          extractionMethod: 'fallback'
        };
      }
    } catch (error) {
      logger.error('Product extraction failed', { 
        error: error instanceof Error ? error.message : String(error),
        url 
      });
      
      // Log the error
      await this.promptLogger.logExtraction({
        url,
        extractedData: {},
        method: 'extraction-error',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
  
  private getSystemPrompt(): string {
    return `You are a product information extraction expert specializing in gathering data for AI-powered product description generation. 
    Your goal is to extract comprehensive product information that will help create compelling, accurate, and detailed product descriptions.
    
    Focus on extracting:
    - Detailed features and benefits (not just bullet points, but explanatory content)
    - Materials, construction methods, and quality indicators
    - Technical specifications that customers care about
    - Size charts and fit information
    - Target audience and use case information
    - Unique technologies or innovations
    - Care instructions and maintenance info
    
    Ignore pricing information completely - focus only on product characteristics, features, and descriptive content.
    Prioritize information that would help someone understand what makes this product special and why they should choose it.`;
  }
  
  private getUserPrompt(): string {
    return `Extract comprehensive product information for description generation, including:
    
    1. Product identity (title, brand, category)
    2. Detailed features and benefits (what makes it special)
    3. Materials and construction details
    4. Technical specifications and dimensions
    5. Available variants/options with descriptions
    6. Size chart and fit information
    7. Target audience and use cases
    8. Technologies, innovations, or unique design elements
    9. Care and maintenance instructions
    10. Awards or certifications
    
    Focus on extracting rich, descriptive content that would help create compelling product descriptions.
    Do not extract pricing information. Prioritize detailed explanations over simple bullet points.`;
  }
  
  private cleanExtractedData(rawData: any): ExtractedProductData {
    return {
      title: rawData.productTitle || '',
      description: rawData.detailedDescription || '',
      features: (rawData.keyFeatures || []).filter((f: any) => f && f.length > 10),
      imageUrls: rawData.images || [],
      specifications: rawData.specifications || {},
      confidence: rawData.confidence || 0.8,
      extractionMethod: 'llm'
    };
  }
  
  private fallbackExtract(response: any): ExtractedProductData {
    const markdown = response.markdown || response.data?.markdown || '';
    const metadata = response.metadata || response.data?.metadata || {};
    
    return {
      title: this.extractTitle(markdown, metadata),
      description: this.extractDescription(markdown, metadata),
      features: this.extractFeatures(markdown),
      imageUrls: [],
      specifications: this.extractSpecifications(markdown),
      confidence: 0.5,
      extractionMethod: 'pattern-matching'
    };
  }
  
  private extractTitle(markdown: string, metadata: any): string {
    const titleMatch = markdown.match(/^#\s*(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : metadata.title || 'Unknown Product';
  }
  
  private extractDescription(markdown: string, metadata: any): string {
    const descPatterns = [
      /([A-Z][^#]*?(?:designed|engineered|crafted|features|made|built)[^#]*?\.)/,
      /Description[:]\s*([^\n#]+)/i
    ];
    
    for (const pattern of descPatterns) {
      const match = markdown.match(pattern);
      if (match && match[1].length > 50) {
        return match[1].trim();
      }
    }
    
    return metadata.description || '';
  }
  
  private extractFeatures(markdown: string): string[] {
    const features: string[] = [];
    const featurePatterns = [
      /(?:Features|Key Features|Highlights)[\s\S]*?([*•-][\s\S]*?)(?=\n\n|#|$)/i,
      /[*•-]\s*([^\n]+)/g
    ];
    
    for (const pattern of featurePatterns) {
      const matches = markdown.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 10) {
          features.push(match[1].replace(/^[*•-]\s*/, '').trim());
        }
      }
      if (features.length > 0) break;
    }
    
    return features;
  }
  
  private extractSpecifications(markdown: string): Record<string, string> {
    const specs: Record<string, string> = {};
    
    // Extract dimensions
    const dimensionMatches = markdown.matchAll(/(\w+)[:]\s*(\d+(?:\.\d+)?)\s*(?:inches|in|cm|mm|feet|ft)/gi);
    for (const match of dimensionMatches) {
      specs[match[1].toLowerCase()] = match[0];
    }
    
    return specs;
  }
}