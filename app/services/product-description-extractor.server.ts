/**
 * Product Description Data Extractor for Product Builder Pro
 * Uses Firecrawl's advanced Extract endpoint with FIRE-1 agent
 * to extract comprehensive product information for AI-powered description generation
 */

import type FirecrawlApp from '@mendable/firecrawl-js';
import type { ExtractResponse } from '@mendable/firecrawl-js';
import { logger } from './logger.server';
import { saveExtractedData } from './prompt-logger.server';
import { saveExtractedDataToDB } from './prompt-logger-db.server';

/**
 * Firecrawl configuration optimized for description-relevant content
 */
export const FIRECRAWL_SCRAPE_CONFIG = {
  formats: ["markdown", "html"] as const,
  onlyMainContent: true, // Focus on product content, exclude nav/footer
  includeTags: [
    "h1", "h2", "h3", "h4", "h5", "h6", // Headings
    "p", "div", "span", // Text content
    "ul", "ol", "li", // Lists (features, specs, etc.)
    "table", "tr", "td", "th", // Tables (size charts, specs)
    ".product", ".description", ".specs", ".features", // Common product classes
    ".variant", ".option", ".size", ".color", ".material", // Variant info
    ".benefits", ".technology", ".construction", // Key content areas
    ".size-chart", ".sizing", ".fit", // Size information
    "[data-product]", "[data-feature]", "[data-spec]" // Data attributes
  ],
  excludeTags: [
    "nav", "header", "footer", // Navigation elements
    ".nav", ".navigation", ".header", ".footer", // Common nav classes
    ".cookie", ".popup", ".modal", // Popup elements
    ".advertisement", ".ad", ".ads", // Ads
    ".social", ".share", ".comments", // Social elements
    ".price", ".pricing", ".cost", ".cart", ".buy", // Pricing elements
    "#nav", "#header", "#footer", "#sidebar", "#cart" // Common IDs to exclude
  ],
  waitFor: 2000, // Wait for dynamic content
  timeout: 30000
};

/**
 * Enhanced LLM extraction schema for comprehensive e-commerce product data
 */
export const DESCRIPTION_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    // Product Identity
    productName: {
      type: "string",
      description: "The exact product name/title as displayed on the page"
    },
    brand: {
      type: "string", 
      description: "Brand or manufacturer name"
    },
    model: {
      type: "string",
      description: "Product model number or name if available"
    },
    sku: {
      type: "string",
      description: "Product SKU or item number"
    },
    category: {
      type: "string",
      description: "Product category/type (e.g., 'Car Freshener', 'Running Shoes')"
    },
    
    // Product Descriptions
    shortDescription: {
      type: "string",
      description: "Brief product description or tagline (1-2 sentences)"
    },
    fullDescription: {
      type: "string",
      description: "Complete product description including all details from the page"
    },
    keySellingPoints: {
      type: "array",
      items: { type: "string" },
      description: "Top 3-5 unique selling points or key benefits"
    },
    
    // Features & Benefits (Structured)
    features: {
      type: "array",
      items: {
        type: "object",
        properties: {
          feature: { type: "string", description: "The feature itself" },
          benefit: { type: "string", description: "How this feature benefits the customer" }
        }
      },
      description: "Product features paired with their customer benefits"
    },
    
    // Technical Specifications
    technicalSpecs: {
      type: "object",
      description: "All technical specifications as key-value pairs"
    },
    dimensions: {
      type: "object",
      properties: {
        length: { type: "string" },
        width: { type: "string" },
        height: { type: "string" },
        depth: { type: "string" },
        diameter: { type: "string" },
        weight: { type: "string" },
        volume: { type: "string" }
      },
      description: "Product dimensions and measurements"
    },
    
    // Materials & Construction
    materials: {
      type: "array",
      items: { type: "string" },
      description: "Primary materials used (e.g., '100% cotton', 'stainless steel')"
    },
    constructionDetails: {
      type: "array",
      items: { type: "string" },
      description: "How the product is made, construction methods, quality details"
    },
    
    // Variants & Options
    availableColors: {
      type: "array",
      items: { type: "string" },
      description: "List of available colors"
    },
    availableSizes: {
      type: "array",
      items: { type: "string" },
      description: "List of available sizes"
    },
    variants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          optionType: { type: "string", description: "Type of variant (size, color, style, etc.)" },
          values: { type: "array", items: { type: "string" } },
          notes: { type: "string", description: "Additional notes about this variant" }
        }
      },
      description: "All product variants and options"
    },
    
    // Size & Fit Information
    sizeChart: {
      type: "object",
      properties: {
        available: { type: "boolean" },
        chartData: { type: "object", description: "Size chart measurements if available" },
        fitDescription: { type: "string", description: "How the product fits (true to size, runs large, etc.)" },
        sizingNotes: { type: "string", description: "Any additional sizing guidance" }
      }
    },
    
    // Usage & Care
    usageInstructions: {
      type: "array",
      items: { type: "string" },
      description: "How to use the product"
    },
    careInstructions: {
      type: "array",
      items: { type: "string" },
      description: "Care, maintenance, washing instructions"
    },
    compatibility: {
      type: "array",
      items: { type: "string" },
      description: "What this product works with or is compatible with"
    },
    
    // Target Audience & Use Cases
    idealFor: {
      type: "array",
      items: { type: "string" },
      description: "Who would benefit most from this product"
    },
    notSuitableFor: {
      type: "array",
      items: { type: "string" },
      description: "Who this product is NOT suitable for"
    },
    useCases: {
      type: "array",
      items: { type: "string" },
      description: "Specific scenarios or activities this product is perfect for"
    },
    
    // Additional Information
    warranty: {
      type: "string",
      description: "Warranty information if mentioned"
    },
    certifications: {
      type: "array",
      items: { type: "string" },
      description: "Any certifications, awards, or compliance standards"
    },
    inBox: {
      type: "array",
      items: { type: "string" },
      description: "What's included in the package"
    },
    technologies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" }
        }
      },
      description: "Proprietary technologies or special features"
    },
    
    // Unique Product Attributes
    uniqueAttributes: {
      type: "array",
      items: { type: "string" },
      description: "Any unique or standout features not captured elsewhere"
    }
  },
  required: ["productName", "features", "keySellingPoints"]
};

export interface ExtractedDescriptionData {
  productName: string;
  brand?: string;
  model?: string;
  sku?: string;
  category?: string;
  shortDescription?: string;
  fullDescription?: string;
  keySellingPoints: string[];
  features: Array<{
    feature: string;
    benefit: string;
  }>;
  technicalSpecs?: Record<string, string>;
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
    depth?: string;
    diameter?: string;
    weight?: string;
    volume?: string;
  };
  materials: string[];
  constructionDetails: string[];
  availableColors: string[];
  availableSizes: string[];
  variants: Array<{
    optionType: string;
    values: string[];
    notes?: string;
  }>;
  sizeChart: {
    available: boolean;
    chartData?: Record<string, any>;
    fitDescription?: string;
    sizingNotes?: string;
  };
  usageInstructions: string[];
  careInstructions: string[];
  compatibility: string[];
  idealFor: string[];
  notSuitableFor: string[];
  useCases: string[];
  warranty?: string;
  certifications: string[];
  inBox: string[];
  technologies: Array<{
    name: string;
    description?: string;
  }>;
  uniqueAttributes: string[];
}

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedDescriptionData;
  rawContent?: {
    markdown?: string;
    html?: string;
  };
  metadata?: Record<string, any>;
  error?: string;
  note?: string;
  extractionMethod?: 'llm' | 'structured_data' | 'pattern' | 'fallback';
}

/**
 * Extract product information for description generation using Firecrawl's Extract endpoint
 * @param {string} url - Product page URL to extract from
 * @param {Object} firecrawlClient - Initialized Firecrawl client
 * @returns {Object} Structured product data for description generation
 */
// Extend Firecrawl type for retry count
type FirecrawlWithRetry = FirecrawlApp & { retryCount?: number };

export async function extractProductDescriptionData(
  url: string, 
  firecrawlClient: FirecrawlApp
): Promise<ExtractionResult> {
  // Cast to our extended type
  const client = firecrawlClient as FirecrawlWithRetry;
  
  // Initialize retry count for this instance
  if (!client.retryCount) {
    client.retryCount = 0;
  }
  
  try {
    logger.info('\n=== FIRECRAWL EXTRACTION START ===');
    logger.info('Extracting from URL', { url });
    logger.info('Using Firecrawl Extract endpoint with FIRE-1 agent');
    
    // Configure extraction for the extract endpoint
    const extractOptions = {
      prompt: `You are an expert e-commerce data extractor. Extract ONLY factual product information that would help create a compelling product description.
      
      Rules:
      1. Extract actual content from the page, not generic descriptions
      2. For features, pair each feature with its customer benefit
      3. Ignore all pricing, promotions, and sales information
      4. Skip navigation, UI elements, and marketing fluff
      5. Focus on specifications, materials, construction, and unique characteristics
      6. If size chart data exists, extract it completely
      7. Differentiate between what the product IS vs what it DOES
      
      Extract comprehensive product information including:
      - Product name, brand, model, SKU
      - Short tagline and full description
      - Features WITH their benefits (as feature/benefit pairs)
      - All technical specifications
      - Materials and construction methods
      - Available colors, sizes, and variants
      - Size chart and fit information
      - Usage and care instructions
      - Who it's ideal for and use cases
      - What's included in the package
      - Any unique technologies or innovations
      
      Extract ACTUAL content from the page. Be thorough but factual. Return clean, structured JSON data ready for AI processing.`,
      schema: DESCRIPTION_EXTRACTION_SCHEMA,
      agent: {
        model: 'FIRE-1'
      }
    };
    
    logger.info('Calling Firecrawl extract with FIRE-1 agent', {
      url,
      schemaFields: Object.keys(DESCRIPTION_EXTRACTION_SCHEMA.properties).length
    });
    
    const response = await client.extract([url], extractOptions) as ExtractResponse;

    // Log the raw Firecrawl response
    logger.info('\n--- RAW FIRECRAWL RESPONSE ---');
    logger.info('Response structure', {
      success: response?.success,
      hasData: !!response?.data,
      dataType: typeof response?.data
    });
    
    // Handle extract endpoint response structure
    if (response.success && response.data) {
      const extractedData = response.data;
      
      logger.info('\n--- SUCCESSFUL LLM EXTRACTION ---');
      logger.info('Extraction metrics', { 
        fieldsExtracted: Object.keys(extractedData).length,
        hasFeatures: !!extractedData.features?.length,
        hasSpecs: !!extractedData.technicalSpecs,
        hasSizeInfo: !!extractedData.sizeChart?.available
      });
      
      // Log sample of extracted data for debugging
      logger.info('Sample extracted data', {
        productName: extractedData.productName,
        featuresCount: extractedData.features?.length || 0,
        keySellingPoints: extractedData.keySellingPoints?.slice(0, 2)
      });
      
      return {
        success: true,
        data: cleanExtractedData(extractedData),
        rawContent: undefined, // Extract endpoint doesn't return raw content
        metadata: {},
        extractionMethod: 'llm'
      };
    } else {
      // Implement intelligent fallback strategies
      logger.warn('\n--- INTELLIGENT FALLBACK EXTRACTION ---');
      logger.warn('LLM extraction failed, trying alternative methods');
      
      // Strategy 1: Try simplified LLM extraction with smaller schema
      if (client.retryCount < 1) {
        try {
          client.retryCount++;
          logger.info('Attempting simplified LLM extraction');
          const simplifiedOptions = {
            prompt: `Extract only: product name, brand, 3-5 key features, materials, available sizes and colors. Be concise but accurate.`,
            agent: {
              model: 'FIRE-1'
            }
          };
          
          const simplifiedResponse = await client.extract([url], simplifiedOptions) as ExtractResponse;
          
          if (simplifiedResponse.success && simplifiedResponse.data) {
            return {
              success: true,
              data: cleanExtractedData(simplifiedResponse.data),
              rawContent: undefined,
              metadata: {},
              extractionMethod: 'llm'
            };
          }
        } catch (e) {
          logger.debug('Simplified LLM extraction failed', { error: e });
        }
      }
      
      // Strategy 2: Try scraping with basic Firecrawl and pattern extraction
      try {
        logger.info('Attempting basic scrape for pattern extraction');
        const scrapeResponse: any = await client.scrapeUrl(url, {
          formats: ["markdown", "html"] as const,
          onlyMainContent: true,
          waitFor: 2000,
          timeout: 30000
        });
        
        if (scrapeResponse && (scrapeResponse.markdown || scrapeResponse.html)) {
          // Try to extract structured data from HTML
          if (scrapeResponse.html) {
            try {
              const structuredData = await extractStructuredData(scrapeResponse.html);
              if (structuredData) {
                logger.info('Found structured data, using for extraction');
                const cleanedData = cleanExtractedData(structuredData);
                return {
                  success: true,
                  data: cleanedData,
                  rawContent: {
                    markdown: scrapeResponse.markdown,
                    html: scrapeResponse.html
                  },
                  metadata: scrapeResponse.metadata || {},
                  extractionMethod: 'structured_data'
                };
              }
            } catch (e) {
              logger.debug('Structured data extraction failed', { error: e });
            }
          }
          
          // Fall back to pattern-based extraction
          logger.info('Using pattern-based extraction on scraped content');
          const fallbackData = fallbackExtractDescriptionData(scrapeResponse);
          
          return {
            success: true,
            data: fallbackData,
            rawContent: {
              markdown: scrapeResponse.markdown,
              html: scrapeResponse.html
            },
            metadata: scrapeResponse.metadata || {},
            extractionMethod: 'pattern'
          };
        }
      } catch (scrapeError) {
        logger.error('Fallback scraping failed:', scrapeError);
      }
      
      // Final fallback: Return minimal data
      logger.error('All extraction methods failed, returning minimal data');
      return {
        success: true,
        data: {
          productName: '',
          keySellingPoints: [],
          features: [],
          materials: [],
          constructionDetails: [],
          availableColors: [],
          availableSizes: [],
          variants: [],
          sizeChart: { available: false },
          usageInstructions: [],
          careInstructions: [],
          compatibility: [],
          idealFor: [],
          notSuitableFor: [],
          useCases: [],
          certifications: [],
          inBox: [],
          technologies: [],
          uniqueAttributes: []
        },
        rawContent: undefined,
        metadata: {},
        extractionMethod: 'fallback',
        note: 'All extraction methods failed'
      };
    }

  } catch (error) {
    logger.error('\n=== FIRECRAWL EXTRACTION ERROR ===');
    logger.error('Error details:', error);
    
    // Try basic scraping as a last resort
    try {
      logger.info('Attempting basic scrape after extraction error');
      const client = firecrawlClient as FirecrawlWithRetry;
      const scrapeResponse: any = await client.scrapeUrl(url, {
        formats: ["markdown", "html"] as const,
        onlyMainContent: true,
        waitFor: 2000,
        timeout: 30000
      });
      
      if (scrapeResponse && (scrapeResponse.markdown || scrapeResponse.html)) {
        const fallbackData = fallbackExtractDescriptionData(scrapeResponse);
        return {
          success: true,
          data: fallbackData,
          rawContent: {
            markdown: scrapeResponse.markdown,
            html: scrapeResponse.html
          },
          metadata: scrapeResponse.metadata || {},
          extractionMethod: 'pattern',
          note: "Used fallback extraction after error"
        };
      }
    } catch (fallbackError) {
      logger.error('Fallback extraction also failed:', fallbackError);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: undefined
    };
  }
}

/**
 * Fallback extraction method using pattern matching
 * @param {Object} firecrawlResponse - Basic Firecrawl response
 * @returns {Object} Extracted product data for descriptions
 */
function fallbackExtractDescriptionData(firecrawlResponse: any): ExtractedDescriptionData {
  const markdown = firecrawlResponse.markdown || firecrawlResponse.data?.markdown || '';
  const metadata = firecrawlResponse.metadata || firecrawlResponse.data?.metadata || {};
  
  // Extract features and benefits separately first
  const extractedFeatures = extractFeatures(markdown);
  const extractedBenefits = extractBenefits(markdown);
  
  // Try to pair features with benefits
  const features = extractedFeatures.map((feature, index) => ({
    feature,
    benefit: extractedBenefits[index] || ''
  }));
  
  const descriptionData: ExtractedDescriptionData = {
    productName: metadata.ogTitle || metadata.title || extractTitle(markdown) || '',
    brand: extractBrand(markdown, metadata),
    model: undefined,
    sku: undefined,
    category: extractCategory(markdown),
    shortDescription: metadata.description || undefined,
    fullDescription: extractDetailedDescription(markdown, metadata),
    keySellingPoints: extractedFeatures.slice(0, 5), // Top 5 features as key selling points
    features,
    technicalSpecs: extractTechnicalSpecs(markdown),
    dimensions: extractDimensions(markdown),
    materials: extractMaterials(markdown),
    constructionDetails: extractConstructionDetails(markdown),
    availableColors: extractColors(markdown),
    availableSizes: extractSizes(markdown),
    variants: extractVariants(markdown),
    sizeChart: extractSizeChart(markdown),
    usageInstructions: [],
    careInstructions: extractCareInstructions(markdown),
    compatibility: [],
    idealFor: extractTargetAudience(markdown) ? [extractTargetAudience(markdown)!] : [],
    notSuitableFor: [],
    useCases: extractUseCases(markdown),
    warranty: extractWarranty(markdown),
    certifications: extractAwards(markdown),
    inBox: [],
    technologies: extractTechnologies(markdown),
    uniqueAttributes: []
  };

  return descriptionData;
}

// Helper functions for fallback extraction
function extractTitle(markdown: string): string {
  const titleMatch = markdown.match(/^#\s*(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : '';
}

function extractBrand(markdown: string, metadata: any): string | undefined {
  const brandPatterns = [
    /(?:Brand|Vendor|Manufacturer)[:]\s*([^\n]+)/i,
    /by\s+([A-Z][a-zA-Z\s&]+)(?:\s|$)/,
    metadata.author
  ];
  
  for (const pattern of brandPatterns) {
    if (typeof pattern === 'string' && pattern) {
      return pattern;
    } else if (pattern instanceof RegExp) {
      const match = markdown.match(pattern);
      if (match) return match[1].trim();
    }
  }
  return undefined;
}

function extractCategory(markdown: string): string | undefined {
  const categoryPatterns = [
    /Category[:]\s*([^\n]+)/i,
    /Product Type[:]\s*([^\n]+)/i,
    /([A-Z\s]+(?:BOARD|APPAREL|GEAR|EQUIPMENT))/i
  ];
  
  for (const pattern of categoryPatterns) {
    const match = markdown.match(pattern);
    if (match) return match[1].trim();
  }
  return undefined;
}

function extractFeatures(markdown: string): string[] {
  const features: string[] = [];
  const featurePatterns = [
    /(?:Features|Key Features|Highlights)[\s\S]*?([*•-][\s\S]*?)(?=\n\n|#|$)/i,
    /[*•-]\s*([^\n]+)/g
  ];
  
  for (const pattern of featurePatterns) {
    const matches = markdown.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 10) { // Filter out short items
        features.push(match[1].replace(/^[*•-]\s*/, '').trim());
      }
    }
    if (features.length > 0) break;
  }
  
  return features;
}

function extractBenefits(markdown: string): string[] {
  const benefits: string[] = [];
  const benefitPatterns = [
    /(?:Benefits|Why Choose|Advantages)[\s\S]*?([*•-][\s\S]*?)(?=\n\n|#|$)/i,
    /(?:provides|delivers|ensures|guarantees)\s+([^.]+)/gi
  ];
  
  for (const pattern of benefitPatterns) {
    const matches = markdown.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 15) {
        benefits.push(match[1].trim());
      }
    }
  }
  
  return benefits;
}

function extractDetailedDescription(markdown: string, metadata: any): string {
  // Look for substantial paragraphs that describe the product
  const descPatterns = [
    /([A-Z][^#]*?(?:designed|engineered|crafted|features|made|built)[^#]*?\.)/,
    /Description[:]\s*([^\n#]+)/i,
    metadata.description
  ];
  
  for (const pattern of descPatterns) {
    if (typeof pattern === 'string' && pattern && pattern.length > 50) {
      return pattern;
    } else if (pattern instanceof RegExp) {
      const match = markdown.match(pattern);
      if (match && match[1].length > 50) {
        return match[1].trim();
      }
    }
  }
  
  return '';
}

function extractMaterials(markdown: string): string[] {
  const materials: string[] = [];
  const materialPatterns = [
    /(?:Materials|Construction|Made from)[:]\s*([^\n]+)/i,
    /(foam|fiberglass|carbon|epoxy|polyurethane|nylon|polyester|cotton|wool|leather|aluminum|steel|plastic)/gi
  ];
  
  for (const pattern of materialPatterns) {
    const matches = markdown.matchAll(pattern);
    for (const match of matches) {
      materials.push(match[1] || match[0]);
    }
  }
  
  return [...new Set(materials)]; // Remove duplicates
}

function extractConstructionDetails(markdown: string): string[] {
  const details: string[] = [];
  
  // Look for construction-related content
  const constructionMatch = markdown.match(/(?:Construction|How it's made|Built with|Made from)[\s\S]*?([^\n#]+)/gi);
  if (constructionMatch) {
    constructionMatch.forEach(match => {
      const detail = match.replace(/^.*?:/, '').trim();
      if (detail.length > 10) details.push(detail);
    });
  }
  
  return details;
}

function extractTechnicalSpecs(markdown: string): Record<string, string> {
  const specs: Record<string, string> = {};
  
  // Look for key-value patterns
  const specMatches = markdown.matchAll(/^([A-Za-z\s]+):\s*(.+)$/gm);
  for (const match of specMatches) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key && value && key.length < 50 && value.length < 200) {
      specs[key] = value;
    }
  }
  
  return specs;
}

function extractDimensions(markdown: string): ExtractedDescriptionData['dimensions'] {
  const dimensions: ExtractedDescriptionData['dimensions'] = {};
  
  // Extract specific dimensions
  const patterns = {
    length: /Length[:]\s*([^\n]+)/i,
    width: /Width[:]\s*([^\n]+)/i,
    height: /Height[:]\s*([^\n]+)/i,
    depth: /Depth[:]\s*([^\n]+)/i,
    diameter: /Diameter[:]\s*([^\n]+)/i,
    weight: /Weight[:]\s*([^\n]+)/i,
    volume: /Volume[:]\s*([^\n]+)/i
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = markdown.match(pattern);
    if (match) {
      dimensions[key as keyof typeof dimensions] = match[1].trim();
    }
  }
  
  return dimensions;
}

function extractColors(markdown: string): string[] {
  const colors: string[] = [];
  
  // Look for color patterns
  const colorMatch = markdown.match(/(?:Colors?|Colours?|Available in)[:]?\s*([^\n]+)/i);
  if (colorMatch) {
    const colorText = colorMatch[1];
    // Split by common delimiters
    const colorList = colorText.split(/[,;/]|\band\b/i);
    colors.push(...colorList.map(c => c.trim()).filter(c => c.length > 0));
  }
  
  return colors;
}

function extractSizes(markdown: string): string[] {
  const sizes: string[] = [];
  
  // Look for size patterns
  const sizePatterns = [
    /Sizes?[:]\s*([^\n]+)/i,
    /Available sizes?[:]\s*([^\n]+)/i,
    /(XS|S|M|L|XL|XXL|XXXL|\d+)/g
  ];
  
  for (const pattern of sizePatterns) {
    const matches = markdown.matchAll(pattern);
    for (const match of matches) {
      const size = match[1] || match[0];
      if (size && !sizes.includes(size)) {
        sizes.push(size);
      }
    }
  }
  
  return sizes;
}

function extractWarranty(markdown: string): string | undefined {
  const warrantyMatch = markdown.match(/(?:Warranty|Guarantee)[:]?\s*([^\n]+)/i);
  return warrantyMatch ? warrantyMatch[1].trim() : undefined;
}

/**
 * Extract structured data from HTML (JSON-LD, microdata)
 */
async function extractStructuredData(html: string): Promise<any> {
  try {
    // Look for JSON-LD structured data
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    
    for (const match of jsonLdMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        
        // Check if it's a Product schema
        if (jsonData['@type'] === 'Product' || jsonData.type === 'Product') {
          logger.info('Found Product JSON-LD data');
          
          // Map JSON-LD to our schema
          return {
            productName: jsonData.name,
            brand: jsonData.brand?.name || jsonData.manufacturer?.name,
            model: jsonData.model || jsonData.mpn,
            sku: jsonData.sku,
            shortDescription: jsonData.description,
            features: jsonData.additionalProperty?.map((p: any) => ({
              feature: p.name,
              benefit: p.value
            })) || [],
            technicalSpecs: jsonData.additionalProperty?.reduce((acc: any, p: any) => {
              acc[p.name] = p.value;
              return acc;
            }, {}) || {},
            materials: jsonData.material ? [jsonData.material] : [],
            ...(jsonData.offers && {
              warranty: jsonData.offers.warranty
            })
          };
        }
      } catch (e) {
        logger.debug('Failed to parse JSON-LD', { error: e });
      }
    }
    
    // Look for microdata
    const microdataMatch = html.match(/itemtype=["']https?:\/\/schema\.org\/Product["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    if (microdataMatch) {
      logger.info('Found Product microdata');
      // Extract microdata properties (simplified)
      const productData: any = {};
      
      const propMatches = microdataMatch[1].matchAll(/itemprop=["']([^"']+)["'][^>]*>([^<]+)</gi);
      for (const propMatch of propMatches) {
        productData[propMatch[1]] = propMatch[2].trim();
      }
      
      return {
        productName: productData.name,
        brand: productData.brand,
        shortDescription: productData.description,
        features: [],
        materials: productData.material ? [productData.material] : []
      };
    }
  } catch (error) {
    logger.debug('Error extracting structured data', { error });
  }
  
  return null;
}

function extractVariants(markdown: string): ExtractedDescriptionData['variants'] {
  const variants: ExtractedDescriptionData['variants'] = [];
  
  // Look for size options
  const sizeMatches = markdown.matchAll(/(\d+(?:\.\d+)?(?:"|'|"))\\s*(?:Available|sizes?)/gi);
  const sizes: string[] = [];
  for (const match of sizeMatches) {
    sizes.push(match[1].replace(/[""']/g, '"'));
  }
  
  if (sizes.length > 0) {
    variants.push({
      optionType: 'Size',
      values: sizes,
      notes: 'Available sizes'
    });
  }
  
  return variants;
}

function extractSizeChart(markdown: string): ExtractedDescriptionData['sizeChart'] {
  const sizeChart: ExtractedDescriptionData['sizeChart'] = {
    available: false,
    chartData: undefined,
    fitDescription: undefined,
    sizingNotes: undefined
  };
  
  // Look for size chart indicators
  if (markdown.match(/size\s+chart|sizing\s+guide|fit\s+guide/i)) {
    sizeChart.available = true;
    
    const fitMatch = markdown.match(/(?:Fit|Sizing)[:]\s*([^\n]+)/i);
    if (fitMatch) {
      sizeChart.fitDescription = fitMatch[1].trim();
    }
  }
  
  return sizeChart;
}

function extractTargetAudience(markdown: string): string | undefined {
  const audiencePatterns = [
    /(beginner|intermediate|advanced|professional|expert)/i,
    /(?:designed for|perfect for|ideal for)\s+([^\n.]+)/i
  ];
  
  for (const pattern of audiencePatterns) {
    const match = markdown.match(pattern);
    if (match) return match[1] || match[0];
  }
  
  return undefined;
}

function extractUseCases(markdown: string): string[] {
  const useCases: string[] = [];
  const useCasePatterns = [
    /(?:Use for|Perfect for|Ideal for|Great for)[:]\s*([^\n]+)/gi,
    /(?:surfing|wakesurfing|watersports|training|competition|recreation)/gi
  ];
  
  for (const pattern of useCasePatterns) {
    const matches = markdown.matchAll(pattern);
    for (const match of matches) {
      useCases.push(match[1] || match[0]);
    }
  }
  
  return [...new Set(useCases)];
}

function extractCareInstructions(markdown: string): string[] {
  const care: string[] = [];
  const careMatch = markdown.match(/(?:Care|Maintenance|Cleaning)[\s\S]*?([*•-][\s\S]*?)(?=\n\n|#|$)/i);
  if (careMatch) {
    const careItems = careMatch[1].match(/[*•-]\s*([^\n]+)/g);
    if (careItems) {
      care.push(...careItems.map(item => item.replace(/^[*•-]\s*/, '').trim()));
    }
  }
  
  return care;
}

function extractTechnologies(markdown: string): ExtractedDescriptionData['technologies'] {
  const technologies: ExtractedDescriptionData['technologies'] = [];
  const techPatterns = [
    /([A-Z][A-Za-z\s]+(?:Technology|System|Design|Construction))/g,
    /(?:featuring|includes|uses)\s+([A-Z][^.]+(?:technology|system|design))/gi
  ];
  
  for (const pattern of techPatterns) {
    const matches = markdown.matchAll(pattern);
    for (const match of matches) {
      technologies.push({
        name: match[1].trim(),
        description: undefined
      });
    }
  }
  
  return technologies;
}

function extractAwards(markdown: string): string[] {
  const awards: string[] = [];
  const awardPatterns = [
    /(?:Award|Winner|Certified|Approved)[:]\s*([^\n]+)/gi,
    /(award|winner|certified|approved|recognition)/gi
  ];
  
  for (const pattern of awardPatterns) {
    const matches = markdown.matchAll(pattern);
    for (const match of matches) {
      awards.push(match[1] || match[0]);
    }
  }
  
  return [...new Set(awards)];
}

/**
 * Clean and organize extracted data for optimal description generation
 * @param {Object} rawData - Raw extracted data
 * @returns {Object} Cleaned and organized data
 */
export function cleanExtractedData(rawData: any): ExtractedDescriptionData {
  // Handle both old and new field names for backward compatibility
  const productName = rawData.productName || rawData.productTitle || '';
  const brand = rawData.brand || rawData.brandVendor || undefined;
  const category = rawData.category || rawData.productCategory || undefined;
  
  return {
    // Product Identity
    productName,
    brand,
    model: rawData.model || undefined,
    sku: rawData.sku || undefined,
    category,
    
    // Descriptions
    shortDescription: rawData.shortDescription || undefined,
    fullDescription: rawData.fullDescription || rawData.detailedDescription || undefined,
    keySellingPoints: (rawData.keySellingPoints || rawData.keyFeatures || []).filter((p: any) => p && p.length > 10),
    
    // Features & Benefits
    features: rawData.features?.length > 0 ? rawData.features : 
      // Convert old format to new format if needed
      (rawData.keyFeatures || []).map((f: string) => ({
        feature: f,
        benefit: (rawData.benefits && rawData.benefits[0]) || ''
      })).filter((f: any) => f.feature),
    
    // Technical Specifications
    technicalSpecs: rawData.technicalSpecs || rawData.specifications?.technical || undefined,
    dimensions: rawData.dimensions || rawData.specifications?.dimensions || undefined,
    
    // Materials & Construction
    materials: (rawData.materials || []).filter((m: any) => m && m.length > 2),
    constructionDetails: rawData.constructionDetails || rawData.construction?.details || [],
    
    // Variants
    availableColors: rawData.availableColors || [],
    availableSizes: rawData.availableSizes || [],
    variants: (rawData.variants || []).map((v: any) => ({
      optionType: v.optionType || v.optionName || '',
      values: v.values || v.availableValues || [],
      notes: v.notes || v.description || undefined
    })).filter((v: any) => v.optionType && v.values.length > 0),
    
    // Size Chart
    sizeChart: {
      available: rawData.sizeChart?.available || false,
      chartData: rawData.sizeChart?.chartData || rawData.sizeChart?.measurements || undefined,
      fitDescription: rawData.sizeChart?.fitDescription || rawData.sizeChart?.fitNotes || undefined,
      sizingNotes: rawData.sizeChart?.sizingNotes || undefined
    },
    
    // Usage & Care
    usageInstructions: rawData.usageInstructions || [],
    careInstructions: (rawData.careInstructions || []).filter((c: any) => c && c.length > 10),
    compatibility: rawData.compatibility || [],
    
    // Target Audience
    idealFor: rawData.idealFor || (rawData.targetAudience ? [rawData.targetAudience] : []),
    notSuitableFor: rawData.notSuitableFor || [],
    useCases: (rawData.useCases || []).filter((u: any) => u && u.length > 5),
    
    // Additional Information
    warranty: rawData.warranty || undefined,
    certifications: rawData.certifications || rawData.awards || [],
    inBox: rawData.inBox || [],
    technologies: (rawData.technologies || []).filter((t: any) => t.name && t.name.length > 5),
    uniqueAttributes: rawData.uniqueAttributes || []
  };
}

/**
 * Main extraction function optimized for description generation
 * @param {string} url - Product page URL
 * @param {Object} firecrawlClient - Firecrawl client instance
 * @param {string} productTitle - Product title for file naming
 * @returns {Object} Extraction result optimized for description generation
 */
export async function extractForDescriptionGeneration(
  url: string, 
  firecrawlClient: FirecrawlApp,
  productTitle?: string,
  shop?: string
): Promise<ExtractionResult> {
  try {
    logger.info('\n=== PRODUCT DESCRIPTION EXTRACTION ===');
    logger.info(`Starting extraction from URL: ${url}`);
    
    // Extract with Firecrawl
    const extractionResult = await extractProductDescriptionData(url, firecrawlClient);
    
    if (!extractionResult.success || !extractionResult.data) {
      throw new Error(extractionResult.error || 'Extraction failed');
    }

    // Log the final cleaned data that will be sent to AI
    logger.info('\n--- FINAL CLEANED DATA FOR AI ---');
    logger.info('Extraction summary', {
      productName: extractionResult.data.productName,
      brand: extractionResult.data.brand,
      category: extractionResult.data.category,
      featuresCount: extractionResult.data.features.length,
      keySellingPointsCount: extractionResult.data.keySellingPoints.length,
      materialsCount: extractionResult.data.materials.length,
      variantsCount: extractionResult.data.variants.length,
      hasSizeChart: extractionResult.data.sizeChart.available,
      technologiesCount: extractionResult.data.technologies.length,
      useCasesCount: extractionResult.data.useCases.length
    });
    
    // Log a sample of the detailed content
    if (extractionResult.data.fullDescription) {
      logger.info('Content preview', {
        descriptionPreview: extractionResult.data.fullDescription.substring(0, 300) + '...',
        features: extractionResult.data.features.slice(0, 3),
        keySellingPoints: extractionResult.data.keySellingPoints.slice(0, 3)
      });
    }
    
    logger.info('\n=== EXTRACTION COMPLETE ===\n');
    
    // Save the extracted data
    if (extractionResult.data) {
      const titleForFile = productTitle || extractionResult.data.productName || 'unknown-product';
      
      // In production, save to database; in dev, save to files
      if (process.env.NODE_ENV === 'production' && shop) {
        await saveExtractedDataToDB(
          shop,
          titleForFile,
          extractionResult.data,
          extractionResult.metadata
        );
      } else {
        // Development or no shop provided - save to files
        await saveExtractedData(
          titleForFile,
          extractionResult.data,
          extractionResult.metadata
        );
      }
    }

    return {
      success: true,
      data: extractionResult.data,
      rawContent: extractionResult.rawContent,
      metadata: extractionResult.metadata,
      note: extractionResult.note
    };

  } catch (error) {
    logger.error('Product description extraction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: undefined
    };
  }
}