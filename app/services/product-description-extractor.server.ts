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
  metadata?: Record<string, any>;
  error?: string;
  note?: string;
  extractionMethod?: 'extract';
  extractedJson?: any; // Raw JSON data from Firecrawl extract endpoint
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
        metadata: {},
        extractionMethod: 'extract', // Correct method name
        extractedJson: extractedData // Pass through raw JSON data - this is all we need!
      };
    } else {
      // No fallback - extraction failed
      logger.error('Firecrawl extract endpoint failed to return data');
      return {
        success: false,
        error: 'Failed to extract product data from URL',
        data: undefined
      };
    }

  } catch (error) {
    logger.error('\n=== FIRECRAWL EXTRACTION ERROR ===');
    logger.error('Error details:', error);
    
    // No fallback - just return error
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: undefined
    };
  }
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
      metadata: extractionResult.metadata,
      note: extractionResult.note,
      extractedJson: extractionResult.extractedJson,
      extractionMethod: extractionResult.extractionMethod
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