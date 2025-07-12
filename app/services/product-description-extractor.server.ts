/**
 * Product Description Data Extractor for Product Builder Pro
 * Uses Firecrawl's advanced scraping capabilities and LLM extraction
 * to extract comprehensive product information for AI-powered description generation
 */

import type FirecrawlApp from '@mendable/firecrawl-js';
import { logger } from './logger.server';
import { saveExtractedData } from './prompt-logger.server';

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
 * LLM extraction schema focused on description-relevant data
 */
export const DESCRIPTION_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    // Product Identity
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
    
    // Core Product Information for Descriptions
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
    
    // Construction & Materials
    materials: {
      type: "array",
      items: { type: "string" },
      description: "Materials used in construction (fabric, foam, fiberglass, etc.)"
    },
    construction: {
      type: "object",
      properties: {
        method: { type: "string", description: "How the product is made/constructed" },
        details: { 
          type: "array", 
          items: { type: "string" },
          description: "Specific construction details and techniques"
        },
        quality: { type: "string", description: "Quality indicators or certifications" }
      }
    },
    
    // Technical Specifications for Description Context
    specifications: {
      type: "object",
      properties: {
        dimensions: {
          type: "object",
          properties: {
            length: { type: "string" },
            width: { type: "string" }, 
            height: { type: "string" },
            thickness: { type: "string" },
            volume: { type: "string" }
          }
        },
        performance: {
          type: "object",
          properties: {
            level: { type: "string", description: "Skill level (beginner, intermediate, advanced)" },
            conditions: { type: "string", description: "Ideal conditions for use" },
            capacity: { type: "string", description: "Weight capacity or size recommendations" }
          }
        },
        technical: {
          type: "array",
          items: { type: "string" },
          description: "Technical specifications that add value to the description"
        }
      }
    },
    
    // Product Variants & Options
    variants: {
      type: "array",
      items: {
        type: "object", 
        properties: {
          optionName: {
            type: "string",
            description: "Variant option name (e.g., 'Size', 'Color', 'Style')"
          },
          availableValues: {
            type: "array",
            items: { type: "string" },
            description: "Available values for this option"
          },
          description: {
            type: "string",
            description: "Any additional context about this variant option"
          }
        }
      },
      description: "Product options like sizes, colors, materials, styles"
    },
    
    // Size & Fit Information
    sizeChart: {
      type: "object",
      properties: {
        available: { type: "boolean", description: "Whether size chart information was found" },
        measurements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              size: { type: "string" },
              measurements: { type: "object" },
              recommendations: { type: "string" }
            }
          }
        },
        fitNotes: { 
          type: "string", 
          description: "General fit notes, sizing recommendations, or fit guide information" 
        }
      }
    },
    
    // Target Audience & Use Cases
    targetAudience: {
      type: "string",
      description: "Who this product is designed for (beginners, pros, specific demographics)"
    },
    useCases: {
      type: "array",
      items: { type: "string" },
      description: "Different ways or scenarios where this product would be used"
    },
    
    // Care & Maintenance
    careInstructions: {
      type: "array",
      items: { type: "string" },
      description: "Care, maintenance, or storage instructions"
    },
    
    // Technology & Innovation
    technologies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" }
        }
      },
      description: "Proprietary technologies, innovations, or unique design elements"
    },
    
    // Awards & Recognition
    awards: {
      type: "array",
      items: { type: "string" },
      description: "Awards, certifications, or recognition this product has received"
    }
  },
  required: ["productTitle", "keyFeatures", "detailedDescription"]
};

export interface ExtractedDescriptionData {
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
}

/**
 * Extract product information for description generation
 * @param {string} url - Product page URL to scrape
 * @param {Object} firecrawlClient - Initialized Firecrawl client
 * @returns {Object} Structured product data for description generation
 */
export async function extractProductDescriptionData(
  url: string, 
  firecrawlClient: FirecrawlApp
): Promise<ExtractionResult> {
  try {
    logger.info('\n=== FIRECRAWL EXTRACTION START ===');
    logger.info('Extracting from URL', { url });
    logger.info('Using scrape config', { config: FIRECRAWL_SCRAPE_CONFIG });
    
    // Use Firecrawl's extract feature for structured data
    const response: any = await firecrawlClient.scrapeUrl(url, {
      ...FIRECRAWL_SCRAPE_CONFIG,
      extract: {
        schema: DESCRIPTION_EXTRACTION_SCHEMA,
        systemPrompt: `You are a product information extraction expert specializing in gathering data for AI-powered product description generation. 
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
        Prioritize information that would help someone understand what makes this product special and why they should choose it.`,
        prompt: `Extract comprehensive product information for description generation, including:
        
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
        Do not extract pricing information. Prioritize detailed explanations over simple bullet points.`
      }
    } as any); // Type assertion needed due to Firecrawl type definitions

    // Log the raw Firecrawl response
    logger.info('\n--- RAW FIRECRAWL RESPONSE ---');
    logger.info('Response structure', {
      keys: Object.keys(response || {}),
      hasMarkdown: !!response?.markdown,
      hasHtml: !!response?.html,
      hasExtract: !!(response?.extract || response?.data?.extract)
    });
    
    // Check if response has extract data
    const extractedData = (response as any).extract || (response as any).data?.extract;
    
    if (extractedData) {
      logger.info('\n--- EXTRACTED DATA FROM LLM ---');
      logger.info('LLM extracted data', { data: extractedData });
      
      return {
        success: true,
        data: cleanExtractedData(extractedData),
        rawContent: {
          markdown: response.markdown || (response as any).data?.markdown,
          html: response.html || (response as any).data?.html
        },
        metadata: response.metadata || (response as any).data?.metadata || {}
      };
    } else {
      // Fallback to basic extraction if LLM extraction didn't work
      logger.warn('\n--- FALLBACK EXTRACTION ---');
      logger.warn('No extract data found, falling back to basic extraction');
      
      // Log what content we have for fallback
      if (response?.markdown) {
        logger.info('Fallback content available', {
          markdownLength: response.markdown.length,
          markdownPreview: response.markdown.substring(0, 500) + '...'
        });
      }
      
      const fallbackData = fallbackExtractDescriptionData(response);
      
      return {
        success: true,
        data: fallbackData,
        rawContent: {
          markdown: response.markdown || (response as any).data?.markdown,
          html: response.html || (response as any).data?.html
        },
        metadata: response.metadata || (response as any).data?.metadata || {},
        note: "Used fallback extraction method"
      };
    }

  } catch (error) {
    logger.error('\n=== FIRECRAWL EXTRACTION ERROR ===');
    logger.error('Error details:', error);
    
    // Try fallback extraction if we have any response data
    if (error && typeof error === 'object' && 'response' in error) {
      try {
        const fallbackData = fallbackExtractDescriptionData((error as any).response);
        return {
          success: true,
          data: fallbackData,
          rawContent: (error as any).response,
          metadata: (error as any).response?.metadata || {},
          note: "Used fallback extraction after error"
        };
      } catch (fallbackError) {
        logger.error('Fallback extraction also failed:', fallbackError);
      }
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
  
  const descriptionData: ExtractedDescriptionData = {
    productTitle: metadata.ogTitle || metadata.title || extractTitle(markdown) || '',
    brandVendor: extractBrand(markdown, metadata),
    productCategory: extractCategory(markdown),
    keyFeatures: extractFeatures(markdown),
    benefits: extractBenefits(markdown),
    detailedDescription: extractDetailedDescription(markdown, metadata),
    materials: extractMaterials(markdown),
    construction: extractConstruction(markdown),
    specifications: extractSpecifications(markdown),
    variants: extractVariants(markdown),
    sizeChart: extractSizeChart(markdown),
    targetAudience: extractTargetAudience(markdown),
    useCases: extractUseCases(markdown),
    careInstructions: extractCareInstructions(markdown),
    technologies: extractTechnologies(markdown),
    awards: extractAwards(markdown)
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

function extractConstruction(markdown: string): ExtractedDescriptionData['construction'] {
  const construction: ExtractedDescriptionData['construction'] = {
    method: undefined,
    details: [],
    quality: undefined
  };
  
  const constructionMatch = markdown.match(/(?:Construction|How it's made)[\s\S]*?([^\n#]+)/i);
  if (constructionMatch) {
    construction.method = constructionMatch[1].trim();
  }
  
  return construction;
}

function extractSpecifications(markdown: string): ExtractedDescriptionData['specifications'] {
  const specs: ExtractedDescriptionData['specifications'] = {
    dimensions: {},
    performance: {},
    technical: []
  };
  
  // Extract dimensions
  const dimensionPatterns = [
    /Length[:]\s*([^\n]+)/i,
    /Width[:]\s*([^\n]+)/i,
    /Height[:]\s*([^\n]+)/i,
    /(\d+(?:\.\d+)?)\s*(?:inches|in|cm|mm|feet|ft)/gi
  ];
  
  for (const pattern of dimensionPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      specs.technical.push(match[0]);
    }
  }
  
  return specs;
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
      optionName: 'Size',
      availableValues: sizes,
      description: 'Available sizes'
    });
  }
  
  return variants;
}

function extractSizeChart(markdown: string): ExtractedDescriptionData['sizeChart'] {
  const sizeChart: ExtractedDescriptionData['sizeChart'] = {
    available: false,
    measurements: [],
    fitNotes: undefined
  };
  
  // Look for size chart indicators
  if (markdown.match(/size\s+chart|sizing\s+guide|fit\s+guide/i)) {
    sizeChart.available = true;
    
    const fitMatch = markdown.match(/(?:Fit|Sizing)[:]\s*([^\n]+)/i);
    if (fitMatch) {
      sizeChart.fitNotes = fitMatch[1].trim();
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
  return {
    // Product Identity
    productTitle: rawData.productTitle || '',
    brandVendor: rawData.brandVendor || undefined,
    productCategory: rawData.productCategory || undefined,
    
    // Core Description Elements
    keyFeatures: (rawData.keyFeatures || []).filter((f: any) => f && f.length > 10),
    benefits: (rawData.benefits || []).filter((b: any) => b && b.length > 15),
    detailedDescription: rawData.detailedDescription || '',
    
    // Materials & Construction
    materials: (rawData.materials || []).filter((m: any) => m && m.length > 2),
    construction: rawData.construction || { details: [] },
    
    // Technical Information
    specifications: rawData.specifications || { dimensions: {}, performance: {}, technical: [] },
    
    // Variants & Sizing
    variants: (rawData.variants || []).filter((v: any) => v.optionName && v.availableValues?.length > 0),
    sizeChart: rawData.sizeChart || { available: false },
    
    // Audience & Usage
    targetAudience: rawData.targetAudience || undefined,
    useCases: (rawData.useCases || []).filter((u: any) => u && u.length > 5),
    
    // Additional Context
    careInstructions: (rawData.careInstructions || []).filter((c: any) => c && c.length > 10),
    technologies: (rawData.technologies || []).filter((t: any) => t.name && t.name.length > 5),
    awards: (rawData.awards || []).filter((a: any) => a && a.length > 5)
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
  productTitle?: string
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
      productTitle: extractionResult.data.productTitle,
      brandVendor: extractionResult.data.brandVendor,
      category: extractionResult.data.productCategory,
      keyFeaturesCount: extractionResult.data.keyFeatures.length,
      benefitsCount: extractionResult.data.benefits.length,
      materialsCount: extractionResult.data.materials.length,
      variantsCount: extractionResult.data.variants.length,
      hasSizeChart: extractionResult.data.sizeChart.available,
      technologiesCount: extractionResult.data.technologies.length,
      useCasesCount: extractionResult.data.useCases.length
    });
    
    // Log a sample of the detailed content
    if (extractionResult.data.detailedDescription) {
      logger.info('Content preview', {
        descriptionPreview: extractionResult.data.detailedDescription.substring(0, 300) + '...',
        keyFeatures: extractionResult.data.keyFeatures.slice(0, 3),
        benefits: extractionResult.data.benefits.slice(0, 3)
      });
    }
    
    logger.info('\n=== EXTRACTION COMPLETE ===\n');
    
    // Save the extracted data to files
    if (extractionResult.data) {
      const titleForFile = productTitle || extractionResult.data.productTitle || 'unknown-product';
      await saveExtractedData(
        titleForFile,
        extractionResult.data,
        extractionResult.metadata
      );
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