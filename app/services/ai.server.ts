import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { prisma } from '../db.server';
import { logger } from './logger.server';
import { getProductTypePrompt, getProductTypeConfig } from './prompts/product-type-prompts';
import { formatProductDescription, stripHTML } from './prompts/formatting';
import { getProductTypeCustomer } from './prompts/product-type-customers';
import { saveLLMPrompt } from './prompt-logger.server';
import { saveLLMPromptToDB } from './prompt-logger-db.server';
import type { ProductTypeConfig } from './prompts/product-type-prompts';
import type { ProductTypeCustomer } from './prompts/product-type-customers';

export interface AIGenerationParams {
  shop: string;
  productTitle: string;
  productType: string;
  category: string;
  vendor: string;
  keywords: string[];
  additionalContext?: string;
  shopSettings?: any;
  scrapedData?: any;
  pricing?: {
    price: string;
    compareAtPrice?: string;
  };
  progressCallback?: (progress: number, partialResults?: any) => void;
}

export interface AIGenerationResult {
  description: string;
  seoTitle: string;
  seoDescription: string;
  qualityMetrics?: QualityMetrics;
}

export interface QualityMetrics {
  seoScore: number;
  engagementScore: number;
  readabilityScore: number;
  completenessScore: number;
  overallScore: number;
  suggestions: string[];
}

export interface ProductCategorizationParams {
  productTitle: string;
  productDescription?: string;
  vendor?: string;
  tags?: string[];
}

export interface ProductCategorizationResult {
  productType: string;
  confidence: number;
  reasoning: string;
}

// Content filtering patterns to remove irrelevant data
const IRRELEVANT_PATTERNS = {
  pricing: [
    /\$[\d,]+\.?\d*/g,
    /price:?\s*[\d,]+/gi,
    /cost:?\s*[\d,]+/gi,
    /MSRP:?\s*[\d,]+/gi,
    /save\s+\$[\d,]+/gi,
    /\d+%\s+off/gi
  ],
  navigation: [
    /menu|nav|breadcrumb/i,
    /home\s*>\s*products/i,
    /categories|collections/i,
    /back to top/i,
    /search results/i
  ],
  promotional: [
    /sale|discount|offer|promo|deal/i,
    /limited time|act now|buy today/i,
    /free shipping|coupon|code/i,
    /ends\s+(soon|today|tonight)/i,
    /while supplies last/i
  ],
  recommendations: [
    /you may also like/i,
    /customers also bought/i,
    /related products/i,
    /recently viewed/i,
    /recommended for you/i,
    /similar items/i
  ],
  ui_elements: [
    /add to cart|buy now/i,
    /quantity|qty/i,
    /share|tweet|pin|facebook|instagram/i,
    /reviews? \(\d+\)/i,
    /write a review/i,
    /ask a question/i
  ],
  trust_badges: [
    /money back guarantee/i,
    /secure checkout/i,
    /trusted by \d+/i,
    /verified purchase/i
  ]
};

export class AIService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private provider: 'openai' | 'anthropic';

  constructor() {
    // Default to Claude/Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.provider = 'anthropic';
    } else if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.provider = 'openai';
    } else {
      throw new Error('No AI API key configured. Please set either ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable.');
    }
  }

  /**
   * Categorizes a product into one of the predefined product types
   * Uses minimal tokens by focusing only on categorization
   */
  async categorizeProduct(params: ProductCategorizationParams): Promise<ProductCategorizationResult> {
    // Simple, focused prompt for efficient categorization
    const systemPrompt = `You are a product categorization expert. Your task is to categorize products into EXACTLY one of these categories:
- Apparel
- Electronics
- Beauty
- Home & Garden
- Food & Beverage
- Sports & Outdoors
- Toys & Games
- Jewelry & Accessories
- Health & Wellness
- Pet Supplies
- Office & School Supplies
- Automotive

Respond with JSON only: {"productType": "Category", "confidence": 0.95, "reasoning": "Brief explanation"}`;

    const userPrompt = `Categorize this product:
Title: ${params.productTitle}
${params.productDescription ? `Description: ${params.productDescription}` : ''}
${params.vendor ? `Vendor: ${params.vendor}` : ''}
${params.tags?.length ? `Tags: ${params.tags.join(', ')}` : ''}
`;

    try {
      let response: string;
      
      if (this.provider === 'anthropic' && this.anthropic) {
        const completion = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt,
          max_tokens: 150, // Small limit for categorization
          temperature: 0.3, // Lower temperature for consistency
        });
        response = completion.content?.[0]?.type === 'text' && completion.content?.[0]?.text || '';
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 150,
        });
        response = completion.choices[0].message?.content || '';
      } else {
        throw new Error('AI provider not properly initialized');
      }

      return this.parseCategorization(response);
    } catch (error) {
      logger.error('Product categorization failed:', error);
      throw error;
    }
  }

  private parseCategorization(response: string): ProductCategorizationResult {
    try {
      const parsed = JSON.parse(response);
      return {
        productType: parsed.productType,
        confidence: parsed.confidence || 0.8,
        reasoning: parsed.reasoning || ''
      };
    } catch (error) {
      logger.error('Failed to parse categorization response:', error);
      // Default fallback - use generic type
      return {
        productType: 'General',
        confidence: 0.5,
        reasoning: 'Unable to determine category with high confidence'
      };
    }
  }

  /**
   * Estimate token count for a string (rough approximation)
   * @param text - The text to estimate tokens for
   * @returns Estimated token count
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's an overload error
        const isOverload = error?.status === 529 || 
                          error?.message?.includes('overloaded') ||
                          error?.error?.type === 'overloaded_error';
        
        if (isOverload && attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff
          logger.warn(`API overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If not overload or last attempt, throw
        throw error;
      }
    }
    
    throw lastError;
  }

  async generateProductDescription(params: AIGenerationParams): Promise<AIGenerationResult> {
    // Ensure keywords is always an array
    if (!params.keywords) {
      params.keywords = [];
    } else if (!Array.isArray(params.keywords)) {
      // If keywords is not an array for some reason, convert it
      params.keywords = [];
    }
    
    logger.info('\n=== AI DESCRIPTION GENERATION START ===');
    logger.info('Initial parameters', {
      shop: params.shop,
      title: params.productTitle,
      type: params.productType,
      hasScrapedData: !!params.scrapedData,
      hasEnhancedDescriptionData: !!params.scrapedData?.descriptionData
    });
    
    // Progress callback helper
    const updateProgress = (progress: number, partialResults?: any) => {
      if (params.progressCallback) {
        params.progressCallback(progress, partialResults);
      }
    };
    
    // Get the list of supported product types (must match product-type-customers.ts)
    const supportedProductTypes = [
      'Apparel', 'Electronics', 'Beauty', 'Home & Garden', 
      'Food & Beverage', 'Sports & Outdoors', 'Toys & Games', 
      'Jewelry & Accessories', 'Health & Wellness', 'Pet Supplies', 
      'Office & School Supplies', 'Automotive'
    ];
    
    // If productType is not provided, is generic, or not in our supported list, categorize first
    let productType = params.productType;
    const needsCategorization = !productType || 
                               productType === 'Other' || 
                               productType === 'General' ||
                               !supportedProductTypes.includes(productType);
    
    if (needsCategorization) {
      if (productType && !supportedProductTypes.includes(productType)) {
        logger.info(`Product type "${productType}" not in supported list, auto-categorizing...`);
      }
      
      const categorization = await this.categorizeProduct({
        productTitle: params.productTitle,
        productDescription: params.additionalContext,
        vendor: params.vendor,
        tags: params.keywords,
      });
      
      // Use categorized type if confidence is high enough
      if (categorization.confidence >= 0.7) {
        productType = categorization.productType;
        logger.info(`Auto-categorized product as: ${productType} (confidence: ${categorization.confidence})`);
      } else {
        // Low confidence - keep original productType which will use the default customer profile
        logger.info(`Low confidence categorization (${categorization.confidence}), keeping original type: ${productType}`);
      }
    }

    const systemPrompt = getProductTypePrompt(productType);
    const userPrompt = this.buildUserPrompt({ ...params, productType });
    
    // Token estimation and safety check
    const estimatedInputTokens = this.estimateTokens(systemPrompt + userPrompt);
    if (estimatedInputTokens > 20000) {
      logger.warn('⚠️ HIGH TOKEN USAGE WARNING', {
        estimatedInputTokens,
        estimatedCost: `$${(estimatedInputTokens * 0.003 / 1000).toFixed(2)} input + ~$${(8000 * 0.015 / 1000).toFixed(2)} output`,
        promptLength: userPrompt.length,
        systemPromptLength: systemPrompt.length
      });
    }
    
    // Save the prompts
    const scrapedDataSection = params.scrapedData ? this.formatScrapedDataForPrompt(params.scrapedData) : undefined;
    
    // In production, save to database; in dev, save to files
    if (process.env.NODE_ENV === 'production') {
      await saveLLMPromptToDB(
        params.shop,
        params.productTitle,
        systemPrompt,
        userPrompt,
        scrapedDataSection
      );
    } else {
      // Development - save to files
      await saveLLMPrompt(
        params.productTitle,
        systemPrompt,
        userPrompt,
        scrapedDataSection
      );
    }

    try {
      let response: string;
      
      // Update progress before API call
      updateProgress(20, { description: 'Preparing to generate content...', seoTitle: '', seoDescription: '' });
      
      if (this.provider === 'anthropic' && this.anthropic) {
        // Use Claude 3.5 Sonnet as specified
        const completion = await this.retryWithBackoff(async () => {
          updateProgress(30, { description: 'Connecting to AI service...', seoTitle: '', seoDescription: '' });
          return await this.anthropic!.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            messages: [{ role: 'user', content: userPrompt }],
            system: systemPrompt,
            max_tokens: 8000,  // Increased to prevent truncation of comprehensive descriptions
            temperature: 0.7,
          });
        });
        response = completion.content?.[0]?.type === 'text' && completion.content?.[0]?.text || '';
        updateProgress(60, { description: 'Content generated, processing...', seoTitle: '', seoDescription: '' }); // Progress after Anthropic API call
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 8000,  // Increased to prevent truncation of comprehensive descriptions
        });
        response = completion.choices[0].message?.content || '';
        updateProgress(60, { description: 'Content generated, processing...', seoTitle: '', seoDescription: '' }); // Progress after OpenAI API call
      } else {
        throw new Error('AI provider not properly initialized');
      }

      updateProgress(70); // Progress before logging
      
      // Log the generation
      await prisma.aIGenerationLog.create({
        data: {
          shop: params.shop,
          generationType: 'description',
          prompt: userPrompt,
          response,
        }
      });
      
      updateProgress(80); // Progress after logging

      let result = this.parseAIResponse(response);
      
      // Send partial results after initial generation
      updateProgress(85, {
        description: result.description,
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription
      });
      
      // Premium feature: Quality evaluation and auto-improvement
      // Commented out for MVP - reduces generation time by ~40 seconds
      /*
      // Phase 2: Quality evaluation
      const primaryKeyword = params.keywords?.[0] || '';
      const secondaryKeywords = params.keywords?.slice(1) || [];
      const metrics = await this.evaluateDescription(
        result.description,
        primaryKeyword,
        secondaryKeywords,
        productType
      );
      
      logger.info('Quality evaluation scores:', {
        seoScore: metrics.seoScore,
        engagementScore: metrics.engagementScore,
        readabilityScore: metrics.readabilityScore,
        completenessScore: metrics.completenessScore,
        overallScore: metrics.overallScore
      });
      
      // Phase 3: Auto-improvement if needed
      if (metrics.overallScore < 8 && metrics.suggestions.length > 0) {
        logger.info('Auto-improving description based on quality evaluation...');
        
        const improvementPrompt = `
Improve this product description based on these specific issues:
${metrics.suggestions.join('\n')}

Current description:
${result.description}

Requirements to maintain:
${primaryKeyword ? `- H2 with primary keyword "${primaryKeyword}" as first line
- Primary keyword used 3-5 times` : '- Clear and engaging H2 as first line'}
- Secondary keywords used 2-3 times each
- All existing content and structure
- All technical specifications

Improve the identified areas while keeping the same information.
Return as JSON with these exact keys:
{
  "description": "Improved HTML formatted description",
  "seoTitle": "${result.seoTitle}",
  "seoDescription": "${result.seoDescription}"
}`;

        try {
          let improvedResponse: string;
          
          if (this.provider === 'anthropic' && this.anthropic) {
            const completion = await this.anthropic.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              messages: [{ role: 'user', content: improvementPrompt }],
              system: systemPrompt,
              max_tokens: 6000,  // Increased to handle comprehensive improvements without truncation
              temperature: 0.6,
            });
            improvedResponse = completion.content[0].type === 'text' ? completion.content[0].text : '';
          } else if (this.provider === 'openai' && this.openai) {
            const completion = await this.openai.chat.completions.create({
              model: 'gpt-4',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: improvementPrompt }
              ],
              temperature: 0.6,
              max_tokens: 6000,  // Increased to handle comprehensive improvements without truncation
            });
            improvedResponse = completion.choices[0].message?.content || '';
          } else {
            throw new Error('AI provider not properly initialized');
          }
          
          const improvedResult = this.parseAIResponse(improvedResponse);
          result = improvedResult;
          logger.info('Description improved successfully');
        } catch (error) {
          logger.warn('Failed to auto-improve description:', { error: error instanceof Error ? error.message : String(error) });
        }
      }
      */
      
      // Phase 4: Brand voice alignment
      if (params.shopSettings) {
        logger.info('Applying brand voice alignment...');
        const alignedDescription = await this.alignBrandVoice(result.description, params.shopSettings);
        result.description = formatProductDescription(alignedDescription);
      }
      
      // Add quality metrics to result (disabled for MVP)
      // result.qualityMetrics = metrics;
      
      updateProgress(90); // Progress before final formatting
      
      logger.info('\n--- AI GENERATION RESULT ---');
      logger.info('Generated content summary', {
        descriptionLength: result.description.length,
        seoTitleLength: result.seoTitle.length,
        seoDescriptionLength: result.seoDescription.length,
        hasDescription: !!result.description,
        hasSeoTitle: !!result.seoTitle,
        hasSeoDescription: !!result.seoDescription
        // qualityScore: metrics.overallScore // Disabled for MVP
      });
      
      logger.info('=== AI DESCRIPTION GENERATION COMPLETE ===\n');
      
      updateProgress(100); // Complete
      
      return result;
    } catch (error) {
      logger.error('AI generation failed:', error);
      logger.error('=== AI DESCRIPTION GENERATION FAILED ===\n');
      throw error;
    }
  }

  private buildUserPrompt(params: AIGenerationParams): string {
    const config = getProductTypeConfig(params.productType);
    const settings = params.shopSettings || {};
    const price = params.pricing?.price ? parseFloat(params.pricing.price) : 0;
    
    // Determine template complexity based on product type and price
    const useDetailedTemplate = config.templateType === 'technical' || 
      (config.priceThreshold && price > config.priceThreshold) || false;
    
    // Build customer avatar combining store settings and product type
    const customerAvatar = this.buildCustomerAvatar(settings, config, params.productType);
    
    // Format scraped data for better AI comprehension
    const formattedScrapedData = this.formatScrapedDataForPrompt(params.scrapedData);
    const isJsonData = params.scrapedData?.extractedJson && params.scrapedData?.extractionMethod === 'extract';
    
    // Log what we're sending to the AI
    logger.info('\n=== AI PROMPT GENERATION ===');
    logger.info('AI Generation Parameters', {
      productTitle: params.productTitle,
      productType: params.productType,
      primaryKeyword: params.keywords?.[0] || '',
      hasScrapedData: !!params.scrapedData,
      hasEnhancedData: !!params.scrapedData?.descriptionData,
      extractionMethod: params.scrapedData?.extractionMethod,
      isJsonData: isJsonData,
      hasSizeInfo: this.checkForSizeChart(params),
      templateType: useDetailedTemplate ? 'TECHNICAL' : 'LIFESTYLE'
    });
    
    const fullPrompt = `
STORE CONTEXT:
${this.formatStoreContext(settings)}

CUSTOMER AVATAR FOR ${params.productType.toUpperCase()}:
${customerAvatar}

PRODUCT INFORMATION:
- Title: ${params.productTitle}
- Type: ${params.productType}
- Category: ${params.category}
- Vendor: ${params.vendor}
- Price: ${params.pricing?.price ? `$${params.pricing.price}` : 'Not specified'}
- Primary Keyword: ${params.keywords?.[0] || 'None'}
- Secondary Keywords: ${params.keywords?.slice(1).join(', ') || 'None'}
${params.additionalContext ? `- Additional Details: ${params.additionalContext}` : ''}
${formattedScrapedData ? (
  isJsonData ? 
  `\n## EXTRACTED PRODUCT DATA (JSON):\n\`\`\`json\n${formattedScrapedData}\n\`\`\`\n` :
  `\n${formattedScrapedData}`
) : ''}

IMPORTANT CONTEXT:
- Address customers at ANY stage of their ${params.productType} buying journey
- Journey stages for ${params.productType}: ${config.customerJourneySteps.join(' → ')}
- Create content that serves multiple journey stages simultaneously
- Content pillars for this ${params.productType}: ${config.focusAreas.join(', ')}
- Weave ALL focus areas throughout the description to address different customer priorities

${this.getContentPrinciples(config, params)}

Format as JSON with these exact keys:
{
  "description": "Complete HTML formatted description following the template",
  "seoTitle": "SEO title (max 60 chars) with primary keyword",
  "seoDescription": "Meta description (max 155 chars) with compelling action"
}
`;

    // Log the complete prompt being sent to AI
    logger.info('\n--- FULL AI PROMPT ---');
    logger.info('Prompt length', { characters: fullPrompt.length });
    
    // Log the scraped data section specifically
    if (formattedScrapedData) {
      logger.info('\n--- SCRAPED DATA SECTION FOR AI ---');
      logger.info('Scraped data formatted for AI', { 
        content: formattedScrapedData,
        length: formattedScrapedData.length 
      });
    }
    
    logger.info('=== END AI PROMPT GENERATION ===\n');
    
    return fullPrompt;
  }

  private formatStoreContext(settings: any): string {
    const businessType = settings.businessType || 'retailer';
    const perspectiveGuide = businessType === 'manufacturer' 
      ? 'Write in first person (we/our) as the product creator'
      : 'Write in third person (they/their) as a retailer showcasing this brand';
    
    return `- Store Name: ${settings.storeName || 'Not specified'}
- Business Type: ${businessType === 'manufacturer' ? 'Product Creator/Manufacturer' : 'Retailer/Reseller'}
- Writing Perspective: ${perspectiveGuide}
- Unique Selling Points: ${settings.uniqueSellingPoints || 'Not specified'}
- Core Values: ${settings.coreValues || 'Not specified'}
- Brand Personality: ${settings.brandPersonality || 'Not specified'}`;
  }

  private buildCustomerAvatar(settings: any, config: ProductTypeConfig, productType: string): string {
    // Use product type customer profile
    const productTypeCustomer = this.getProductTypeCustomer(productType);
    
    // Build the avatar with product-type defaults
    const avatar = `- Who: ${productTypeCustomer.demographics}
- Pain Points: ${productTypeCustomer.painPoints.join(', ')}
- Desires: ${productTypeCustomer.desires.join(', ')}
- Shopping Behavior: ${productTypeCustomer.shoppingBehavior}
- Decision Factors: ${config.customerJourneySteps.join(', ')}
- Motivations: ${productTypeCustomer.motivations}
- Price Expectations: ${productTypeCustomer.priceExpectations}
- Brand Loyalty: ${productTypeCustomer.brandLoyalty}`;
    
    return avatar;
  }

  private getProductTypeCustomer(productType: string): ProductTypeCustomer {
    return getProductTypeCustomer(productType);
  }

  private getContentPrinciples(config: ProductTypeConfig, params: AIGenerationParams): string {
    const primaryKeyword = params.keywords?.[0] || '';
    const secondaryKeywords = params.keywords?.slice(1) || [];
    const productTerm = this.extractProductTerm(params);
    
    return `
## Your Creative Canvas

You're crafting a description for a ${productTerm} that will make shoppers stop scrolling and start imagining life with this product. Here's your creative framework:

### The Multi-Stage Opening Hook 🎯
Your H2 headline with "${primaryKeyword}" must appeal to customers at ANY journey stage:
${config.templateType === 'lifestyle' ? 
  `• Awareness stage: "Discover the ${primaryKeyword} Experience"
   • Consideration stage: "Why [Specific Benefit] Makes This ${primaryKeyword} Different"
   • Decision stage: "The ${primaryKeyword} That [Solves Specific Problem]"` : 
  `• Awareness stage: "Professional ${primaryKeyword} for [General Use Case]"
   • Consideration stage: "The ${primaryKeyword} with [Key Differentiator]"
   • Decision stage: "[Specific Spec] ${primaryKeyword} Built for [Specific Need]"`}

Choose an angle that naturally leads into content serving ALL stages.

### Natural Keyword Flow 🌊
Weave keywords like a conversation, not a checklist:
• "${primaryKeyword}" should appear 3-5 times total - once in your H2, once early on, then naturally throughout
${secondaryKeywords.length > 0 ? `• Sprinkle in ${secondaryKeywords.map(k => `"${k}"`).join(', ')} where they enhance the story (2-3 times each)` : ''}
• Use related terms and natural variations - think how real people search and speak

### The Layered Content Strategy 📖
Structure your description to serve customers at EVERY journey stage simultaneously:

**Opening Section** (Appeals to all stages):
• Awareness: What category benefit/problem does this solve?
• Consideration: What makes THIS one special?
• Decision: Why buy it right now?

**Progressive Information Layers**:
1. **Broad Benefits** (Top layer - everyone needs this)
   • Address universal desires related to ${config.focusAreas.join(', ')}
   • Paint the outcome/transformation
   
2. **Differentiating Features** (Middle layer - comparison shoppers)
   • Unique aspects that set it apart
   • Specific advantages over alternatives
   • Address common concerns/objections
   
3. **Decision Details** (Deep layer - ready-to-buy validation)
   • Technical specifications
   • Compatibility/sizing information
   • Care/maintenance/warranty
   • Social proof elements

${config.templateType === 'lifestyle' ? 
`Focus on emotional progression with practical support` : 
config.templateType === 'technical' ? 
`Lead with capabilities, support with real-world application` :
`Balance emotional appeal with logical validation throughout`}

### Essential Elements to Weave In ✨
While you have creative freedom, ensure your narrative includes:
• **The Multi-Stage Hook**: An opening that speaks to browsers, comparers, AND decision-makers
• **Journey-Aware Benefits**: Address ALL journey stages - ${config.customerJourneySteps.join(', ')}
• **Progressive Details**: Start broad (what), move to specific (how), end with technical (specs)
• **Focus Area Coverage**: Touch on ALL focus areas - ${config.focusAreas.join(', ')}
${config.includeBestFor ? `• **Perfect For**: 2-3 specific scenarios covering different use cases` : `• **Universal Appeal**: Show how different people benefit differently`}
${this.checkForSizeChart(params) ? `• **Size Information**: Include sizing details early for consideration-stage shoppers` : ''}
• **The Inclusive Close**: Motivate action while providing final validation

### Writing That Connects 💬
• Talk TO them, not AT them - use "you" naturally
• Short paragraphs that flow like thoughts
• Bullet points for easy scanning of features
• Bold for emphasis on key benefits
• Specific details over vague claims
• Sensory words that make it tangible

### HTML Formatting Rules 📝
IMPORTANT: Format lists correctly in HTML:
• Use <ul> and <li> tags for bullet lists
• Each bullet point must be its own <li> element
• Do NOT include bullet characters (•, -, *) in the content
• Example:
  CORRECT: <ul><li>First feature</li><li>Second feature</li></ul>
  WRONG: <ul><li>• First feature • Second feature</li></ul>

### Multi-Journey Content Examples 🌟
Here's how to address different journey stages within the SAME description:

**Example Opening (Pet Supplies)**:
"Give your furry friend the comfort they deserve with this premium pet bed that combines veterinarian-approved orthopedic support with machine-washable convenience."
- Awareness: "comfort they deserve" (emotional benefit)
- Consideration: "veterinarian-approved orthopedic" (differentiation)
- Decision: "machine-washable convenience" (practical validation)

**Example Feature Section**:
Instead of: "Made with memory foam"
Multi-stage: "The pressure-relieving memory foam (awareness: benefit) outperforms standard beds (consideration: comparison) and maintains its shape for 5+ years (decision: durability)"

### Remember: One Description, All Customers 🎯
- Don't segment your description by journey stage
- Instead, layer information so each customer finds what they need
- Early content hooks everyone, deeper content validates purchases
- Address ALL ${config.focusAreas.length} focus areas: ${config.focusAreas.join(', ')}

Every sentence should serve multiple purposes - inform newcomers, differentiate for comparers, and validate for decision-makers.
`;
  }

  private extractProductTerm(params: AIGenerationParams): string {
    const title = params.productTitle.toLowerCase();
    const primaryKeyword = params.keywords?.[0]?.toLowerCase() || '';
    
    // First, check if the primary keyword is a specific product term
    // This often gives us compound terms like "electric scooter" or "performance sweatshirt"
    if (primaryKeyword && !['best', 'top', 'buy', 'sale', 'new'].includes(primaryKeyword)) {
      // Check if primary keyword appears in the title (validating it's relevant)
      if (title.includes(primaryKeyword) || primaryKeyword.split(' ').some(word => title.includes(word))) {
        return primaryKeyword;
      }
    }
    
    // Common product terms with their variations
    const productPatterns = [
      // Apparel
      { pattern: /\b(sweatshirt|hoodie|pullover)\b/, term: 'sweatshirt' },
      { pattern: /\b(t-shirt|tee|t shirt)\b/, term: 't-shirt' },
      { pattern: /\b(pants|trousers|jeans|chinos)\b/, term: 'pants' },
      { pattern: /\b(dress|gown|frock)\b/, term: 'dress' },
      { pattern: /\b(jacket|coat|blazer|parka|windbreaker)\b/, term: 'jacket' },
      { pattern: /\b(shoes|sneakers|boots|sandals|loafers|heels)\b/, term: 'shoes' },
      { pattern: /\b(shirt|blouse|top|polo|tunic)\b/, term: 'shirt' },
      { pattern: /\b(shorts|bermudas)\b/, term: 'shorts' },
      { pattern: /\b(sweater|cardigan|jumper)\b/, term: 'sweater' },
      { pattern: /\b(suit|tuxedo)\b/, term: 'suit' },
      { pattern: /\b(skirt|midi|mini|maxi)\b/, term: 'skirt' },
      { pattern: /\b(leggings|tights|stockings)\b/, term: 'leggings' },
      { pattern: /\b(underwear|briefs|boxers|lingerie|bra)\b/, term: 'underwear' },
      { pattern: /\b(socks|hosiery)\b/, term: 'socks' },
      { pattern: /\b(hat|cap|beanie|fedora)\b/, term: 'hat' },
      { pattern: /\b(scarf|scarves|shawl)\b/, term: 'scarf' },
      { pattern: /\b(gloves|mittens)\b/, term: 'gloves' },
      
      // Electronics
      { pattern: /\b(phone|smartphone|mobile|iphone|android)\b/, term: 'phone' },
      { pattern: /\b(laptop|notebook|computer|macbook|chromebook)\b/, term: 'laptop' },
      { pattern: /\b(tablet|ipad|surface)\b/, term: 'tablet' },
      { pattern: /\b(headphones|earbuds|earphones|airpods)\b/, term: 'headphones' },
      { pattern: /\b(speaker|speakers|soundbar)\b/, term: 'speaker' },
      { pattern: /\b(watch|smartwatch|fitness tracker)\b/, term: 'watch' },
      { pattern: /\b(camera|cam|webcam|gopro|dslr)\b/, term: 'camera' },
      { pattern: /\b(television|tv|monitor|display)\b/, term: 'TV' },
      { pattern: /\b(router|modem|network)\b/, term: 'router' },
      { pattern: /\b(keyboard|mouse|trackpad)\b/, term: 'accessory' },
      { pattern: /\b(charger|cable|adapter|power bank)\b/, term: 'charger' },
      { pattern: /\b(console|playstation|xbox|nintendo)\b/, term: 'gaming console' },
      { pattern: /\b(drone|quadcopter)\b/, term: 'drone' },
      { pattern: /\b(projector|beamer)\b/, term: 'projector' },
      
      // Beauty
      { pattern: /\b(cream|moisturizer|lotion|balm)\b/, term: 'cream' },
      { pattern: /\b(serum|treatment|essence|ampoule)\b/, term: 'serum' },
      { pattern: /\b(shampoo|conditioner|hair mask)\b/, term: 'hair product' },
      { pattern: /\b(makeup|foundation|concealer|primer)\b/, term: 'makeup' },
      { pattern: /\b(lipstick|lip gloss|lip balm)\b/, term: 'lip product' },
      { pattern: /\b(mascara|eyeliner|eyeshadow)\b/, term: 'eye makeup' },
      { pattern: /\b(cleanser|face wash|scrub|exfoliant)\b/, term: 'cleanser' },
      { pattern: /\b(toner|mist|spray)\b/, term: 'toner' },
      { pattern: /\b(mask|face mask|sheet mask)\b/, term: 'mask' },
      { pattern: /\b(sunscreen|spf|sun block)\b/, term: 'sunscreen' },
      { pattern: /\b(perfume|cologne|fragrance|eau de)\b/, term: 'fragrance' },
      { pattern: /\b(nail polish|nail care|manicure)\b/, term: 'nail product' },
      { pattern: /\b(brush|brushes|sponge|applicator)\b/, term: 'beauty tool' },
      
      // Home & Garden
      { pattern: /\b(chair|sofa|couch|recliner|ottoman)\b/, term: 'furniture' },
      { pattern: /\b(table|desk|console|stand)\b/, term: 'table' },
      { pattern: /\b(bed|mattress|frame|headboard)\b/, term: 'bed' },
      { pattern: /\b(lamp|light|lighting|chandelier|fixture)\b/, term: 'lamp' },
      { pattern: /\b(rug|carpet|mat|runner)\b/, term: 'rug' },
      { pattern: /\b(curtain|drapes|blinds|shade)\b/, term: 'window treatment' },
      { pattern: /\b(pillow|cushion|throw)\b/, term: 'pillow' },
      { pattern: /\b(blanket|duvet|comforter|quilt)\b/, term: 'blanket' },
      { pattern: /\b(vase|planter|pot|container)\b/, term: 'vase' },
      { pattern: /\b(mirror|frame|artwork|wall art)\b/, term: 'decor' },
      { pattern: /\b(shelf|shelving|bookcase|storage)\b/, term: 'shelf' },
      { pattern: /\b(cabinet|cupboard|wardrobe|dresser)\b/, term: 'cabinet' },
      { pattern: /\b(plant|flower|garden|seed)\b/, term: 'plant' },
      { pattern: /\b(tool|drill|hammer|screwdriver|wrench)\b/, term: 'tool' },
      
      // Food & Beverage
      { pattern: /\b(coffee|espresso|brew|roast)\b/, term: 'coffee' },
      { pattern: /\b(tea|chai|matcha|herbal)\b/, term: 'tea' },
      { pattern: /\b(chocolate|candy|sweet|confection)\b/, term: 'chocolate' },
      { pattern: /\b(snack|chips|crackers|popcorn)\b/, term: 'snack' },
      { pattern: /\b(sauce|dressing|condiment|spread)\b/, term: 'sauce' },
      { pattern: /\b(spice|seasoning|herb|blend)\b/, term: 'spice' },
      { pattern: /\b(oil|vinegar|cooking)\b/, term: 'cooking ingredient' },
      { pattern: /\b(honey|jam|preserve|spread)\b/, term: 'spread' },
      { pattern: /\b(protein|powder|shake|bar)\b/, term: 'protein product' },
      { pattern: /\b(beverage|drink|juice|soda)\b/, term: 'beverage' },
      { pattern: /\b(wine|beer|spirit|alcohol)\b/, term: 'alcohol' },
      { pattern: /\b(pasta|noodle|rice|grain)\b/, term: 'grain product' },
      
      // Sports & Outdoors
      { pattern: /\b(scooter|kickscooter|e-scooter)\b/, term: 'scooter' },
      { pattern: /\b(bike|bicycle|ebike|cycle)\b/, term: 'bike' },
      { pattern: /\b(skateboard|longboard|cruiser)\b/, term: 'skateboard' },
      { pattern: /\b(yoga|mat|block|strap)\b/, term: 'yoga gear' },
      { pattern: /\b(weights|dumbbell|barbell|kettlebell)\b/, term: 'weights' },
      { pattern: /\b(ball|basketball|football|soccer|tennis)\b/, term: 'ball' },
      { pattern: /\b(racket|racquet|paddle|bat)\b/, term: 'racket' },
      { pattern: /\b(tent|camping|sleeping bag|backpack)\b/, term: 'camping gear' },
      { pattern: /\b(fishing|rod|reel|tackle)\b/, term: 'fishing gear' },
      { pattern: /\b(golf|club|driver|putter)\b/, term: 'golf equipment' },
      { pattern: /\b(ski|snowboard|snow)\b/, term: 'winter sports gear' },
      { pattern: /\b(helmet|protective|pad|guard)\b/, term: 'protective gear' },
      
      // Toys & Games
      { pattern: /\b(toy|playset|figurine|action figure)\b/, term: 'toy' },
      { pattern: /\b(game|board game|card game)\b/, term: 'game' },
      { pattern: /\b(puzzle|jigsaw|brain teaser)\b/, term: 'puzzle' },
      { pattern: /\b(doll|barbie|plush|stuffed)\b/, term: 'doll' },
      { pattern: /\b(lego|blocks|building|construction)\b/, term: 'building toy' },
      { pattern: /\b(craft|art|coloring|drawing)\b/, term: 'craft kit' },
      { pattern: /\b(model|kit|train|car)\b/, term: 'model' },
      { pattern: /\b(educational|learning|stem)\b/, term: 'educational toy' },
      
      // Jewelry & Accessories
      { pattern: /\b(necklace|chain|pendant|choker)\b/, term: 'necklace' },
      { pattern: /\b(ring|band|engagement|wedding)\b/, term: 'ring' },
      { pattern: /\b(bracelet|bangle|cuff|anklet)\b/, term: 'bracelet' },
      { pattern: /\b(earring|stud|hoop|dangle)\b/, term: 'earrings' },
      { pattern: /\b(watch|timepiece)\b/, term: 'watch' },
      { pattern: /\b(bag|purse|handbag|clutch|tote)\b/, term: 'bag' },
      { pattern: /\b(wallet|cardholder|money clip)\b/, term: 'wallet' },
      { pattern: /\b(belt|buckle|strap)\b/, term: 'belt' },
      { pattern: /\b(sunglasses|eyewear|shades)\b/, term: 'sunglasses' },
      { pattern: /\b(tie|bowtie|necktie|cravat)\b/, term: 'tie' },
      
      // Health & Wellness
      { pattern: /\b(supplement|vitamin|mineral|multivitamin)\b/, term: 'supplement' },
      { pattern: /\b(protein|collagen|amino)\b/, term: 'protein supplement' },
      { pattern: /\b(medicine|medication|remedy|treatment)\b/, term: 'medicine' },
      { pattern: /\b(thermometer|blood pressure|glucose)\b/, term: 'health monitor' },
      { pattern: /\b(bandage|first aid|medical)\b/, term: 'first aid' },
      { pattern: /\b(essential oil|aromatherapy|diffuser)\b/, term: 'essential oil' },
      { pattern: /\b(massage|therapy|relief)\b/, term: 'therapy product' },
      { pattern: /\b(fitness|exercise|workout)\b/, term: 'fitness equipment' },
      
      // Pet Supplies
      { pattern: /\b(dog food|cat food|pet food|kibble)\b/, term: 'pet food' },
      { pattern: /\b(treat|treats|chew|bone)\b/, term: 'pet treat' },
      { pattern: /\b(toy|ball|rope|squeaky)\b/, term: 'pet toy' },
      { pattern: /\b(collar|leash|harness|lead)\b/, term: 'collar' },
      { pattern: /\b(bed|crate|kennel|carrier)\b/, term: 'pet bed' },
      { pattern: /\b(bowl|feeder|fountain|dish)\b/, term: 'pet bowl' },
      { pattern: /\b(grooming|brush|shampoo|nail)\b/, term: 'grooming tool' },
      { pattern: /\b(litter|litter box|scoop)\b/, term: 'litter' },
      
      // Office & School Supplies
      { pattern: /\b(pen|pencil|marker|highlighter)\b/, term: 'writing tool' },
      { pattern: /\b(notebook|notepad|journal|planner)\b/, term: 'notebook' },
      { pattern: /\b(binder|folder|organizer|file)\b/, term: 'organizer' },
      { pattern: /\b(desk|chair|lamp|accessory)\b/, term: 'office furniture' },
      { pattern: /\b(stapler|tape|scissors|glue)\b/, term: 'office tool' },
      { pattern: /\b(backpack|bag|case|pouch)\b/, term: 'bag' },
      { pattern: /\b(calculator|ruler|protractor)\b/, term: 'math tool' },
      { pattern: /\b(paper|printer|ink|toner)\b/, term: 'paper product' },
      
      // Automotive
      { pattern: /\b(tire|tires|wheel|rim)\b/, term: 'tire' },
      { pattern: /\b(oil|filter|fluid|coolant)\b/, term: 'fluid' },
      { pattern: /\b(battery|alternator|starter)\b/, term: 'battery' },
      { pattern: /\b(brake|pad|rotor|caliper)\b/, term: 'brake part' },
      { pattern: /\b(light|headlight|taillight|bulb)\b/, term: 'light' },
      { pattern: /\b(wiper|blade|windshield)\b/, term: 'wiper' },
      { pattern: /\b(seat|cover|mat|floor)\b/, term: 'interior accessory' },
      { pattern: /\b(tool|jack|wrench|gauge)\b/, term: 'auto tool' },
      
      // General fallback patterns
      { pattern: /\b(accessory|accessories)\b/, term: 'accessory' }
    ];
    
    // Check for compound terms in the title
    for (const { pattern, term } of productPatterns) {
      const match = title.match(pattern);
      if (match) {
        // Try to capture compound terms like "electric scooter" or "performance crew"
        const words = title.split(' ');
        const matchIndex = words.findIndex(word => pattern.test(word));
        if (matchIndex > 0) {
          const modifier = words[matchIndex - 1];
          // Check if the modifier is descriptive (not a brand or size)
          if (!/^(xs|s|m|l|xl|xxl|[0-9]+)$/.test(modifier) && modifier.length > 2) {
            return `${modifier} ${term}`;
          }
        }
        return term;
      }
    }
    
    // If no specific term found, return a more natural fallback
    const categoryMap: Record<string, string> = {
      'apparel': 'garment',
      'electronics': 'device',
      'beauty': 'product',
      'home & garden': 'item',
      'food & beverage': 'product',
      'sports & outdoors': 'gear',
      'toys & games': 'item',
      'jewelry & accessories': 'piece',
      'health & wellness': 'product',
      'pet supplies': 'product',
      'office & school supplies': 'item',
      'automotive': 'part'
    };
    
    const productTypeLower = params.productType.toLowerCase();
    return categoryMap[productTypeLower] || 'product';
  }

  private parseAIResponse(response: string): AIGenerationResult {
    // Handle null/undefined response
    if (!response) {
      logger.error('parseAIResponse received null/undefined response');
      return {
        description: '',
        seoTitle: '',
        seoDescription: ''
      };
    }
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return {
        description: formatProductDescription(parsed.description),
        seoTitle: stripHTML(parsed.seoTitle),  // No character limit enforcement
        seoDescription: stripHTML(parsed.seoDescription),  // No character limit enforcement
      };
    } catch (error) {
      // Fallback parsing if not valid JSON
      logger.error('Failed to parse AI response as JSON:', error);
      logger.error('Raw AI response for debugging:', response?.substring(0, 500) + '...' || 'No response');
      
      // Try to extract the JSON object first
      const jsonMatch = response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          // Attempt to parse the extracted JSON
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            description: formatProductDescription(parsed.description || ''),
            seoTitle: stripHTML(parsed.seoTitle || ''),
            seoDescription: stripHTML(parsed.seoDescription || ''),
          };
        } catch (jsonError) {
          logger.error('Failed to parse extracted JSON object:', jsonError);
        }
      }
      
      // Enhanced regex patterns that handle escaped characters
      // This pattern matches quoted strings including escaped quotes and backslashes
      const descriptionMatch = response?.match(/"description":\s*"((?:[^"\\]|\\.)*)"/);
      const seoTitleMatch = response?.match(/"seoTitle":\s*"((?:[^"\\]|\\.)*)"/);
      const seoDescriptionMatch = response?.match(/"seoDescription":\s*"((?:[^"\\]|\\.)*)"/);
      
      // Function to unescape JSON string content
      const unescapeJson = (str: string): string => {
        return str
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\b/g, '\b')
          .replace(/\\f/g, '\f');
      };
      
      return {
        description: descriptionMatch ? formatProductDescription(unescapeJson(descriptionMatch[1])) : response,
        seoTitle: seoTitleMatch ? stripHTML(unescapeJson(seoTitleMatch[1])) : '',
        seoDescription: seoDescriptionMatch ? stripHTML(unescapeJson(seoDescriptionMatch[1])) : '',
      };
    }
  }

  /**
   * Filter out irrelevant content from scraped data
   */
  private filterScrapedContent(content: string): string {
    if (!content) return content;
    
    let filtered = content;
    
    // Remove all irrelevant patterns
    Object.values(IRRELEVANT_PATTERNS).flat().forEach((pattern: RegExp) => {
      filtered = filtered.replace(pattern, '');
    });
    
    // Remove excessive whitespace
    filtered = filtered.replace(/\s+/g, ' ').trim();
    
    return filtered;
  }

  /**
   * Format scraped data for the AI prompt - JSON data only
   */
  private formatScrapedDataForPrompt(scrapedData: any): string {
    if (!scrapedData) return '';
    
    // Only accept clean JSON data from Firecrawl extract endpoint
    if (scrapedData.extractedJson && scrapedData.extractionMethod === 'extract') {
      logger.info('Using clean extracted JSON from Firecrawl extract endpoint');
      return JSON.stringify(scrapedData.extractedJson, null, 2);
    }
    
    // No fallback - if we don't have clean JSON, return empty
    logger.warn('No clean JSON data available from Firecrawl extract endpoint');
    return '';
  }
  
  /**
   * Check if size chart information is available
   */
  private checkForSizeChart(params: AIGenerationParams): boolean {
    // Check additional context
    const contextLower = params.additionalContext?.toLowerCase() || '';
    if (contextLower.includes('size') || contextLower.includes('sizing') || contextLower.includes('measurement')) {
      return true;
    }
    
    // Check enhanced description data (new format)
    if (params.scrapedData?.descriptionData) {
      const data = params.scrapedData.descriptionData;
      
      // Check multiple indicators
      if (data.sizeChart?.available === true) return true;
      if (data.availableSizes?.length > 0) return true;
      if (data.variants?.some((v: any) => v.optionName?.toLowerCase() === 'size')) return true;
      if (data.specifications?.dimensions && Object.keys(data.specifications.dimensions).length > 0) return true;
    }
    
    // Check scraped data for size information
    if (params.scrapedData?.extractedJson) {
      const data = params.scrapedData.extractedJson;
      // Check if we have size-related data in the JSON
      return !!(data.availableSizes?.length > 0 ||
                data.sizeChart?.available ||
                data.sizingInfo ||
                data.dimensions ||
                data.variants?.some((v: any) => v.type?.toLowerCase() === 'size'));
    }
    
    return false;
  }

  /**
   * Evaluate the quality of a generated description
   */
  private async evaluateDescription(
    description: string,
    primaryKeyword: string,
    secondaryKeywords: string[],
    productType: string
  ): Promise<QualityMetrics> {
    const evaluationPrompt = `
Evaluate this product description across key quality metrics:

DESCRIPTION:
${description}

PRIMARY KEYWORD: ${primaryKeyword}
SECONDARY KEYWORDS: ${secondaryKeywords.join(', ')}
PRODUCT TYPE: ${productType}

Score each metric 1-10 and provide specific feedback:

1. SEO SCORE
- Does it start with H2 containing primary keyword?
- Primary keyword density (should be 1-2%, appearing 3-5 times)
- Secondary keyword usage (each should appear 2-3 times)
- Proper header hierarchy (H2, H3s)
- Natural keyword usage (not stuffed)

2. ENGAGEMENT SCORE
- Appropriate hook for product type (emotional for lifestyle, technical for specs-focused)
- Benefit-focused content
- Power words and sensory language where appropriate
- Clear value proposition

3. READABILITY SCORE
- Short paragraphs (2-3 sentences)
- Bullet points for features
- Active voice usage
- Conversational tone where appropriate
- Technical clarity for spec-heavy products

4. COMPLETENESS SCORE
- All HTML tags properly closed
- No truncated sections
- Includes all key product info
- Contains required sections (Benefits, Features)
- Size chart included if sizing info was available

Return JSON with scores and specific improvement suggestions:
{
  "seoScore": 0-10,
  "engagementScore": 0-10,
  "readabilityScore": 0-10,
  "completenessScore": 0-10,
  "overallScore": 0-10,
  "suggestions": ["specific improvements needed"]
}`;

    try {
      let response: string;
      
      if (this.provider === 'anthropic' && this.anthropic) {
        const completion = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: evaluationPrompt }],
          max_tokens: 2000,  // Increased for detailed evaluation feedback
          temperature: 0.3,
        });
        response = completion.content?.[0]?.type === 'text' && completion.content?.[0]?.text || '';
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: evaluationPrompt }],
          temperature: 0.3,
          max_tokens: 2000,  // Increased for detailed evaluation feedback
        });
        response = completion.choices[0].message?.content || '';
      } else {
        throw new Error('AI provider not properly initialized');
      }

      const parsed = JSON.parse(response);
      return {
        seoScore: parsed.seoScore || 7,
        engagementScore: parsed.engagementScore || 7,
        readabilityScore: parsed.readabilityScore || 7,
        completenessScore: parsed.completenessScore || 7,
        overallScore: parsed.overallScore || 7,
        suggestions: parsed.suggestions || []
      };
    } catch (error) {
      logger.warn('Failed to evaluate description quality:', { error: error instanceof Error ? error.message : String(error) });
      // Return default scores if evaluation fails
      return {
        seoScore: 7,
        engagementScore: 7,
        readabilityScore: 7,
        completenessScore: 7,
        overallScore: 7,
        suggestions: []
      };
    }
  }

  /**
   * Apply brand voice alignment to the description
   */
  private async alignBrandVoice(
    description: string,
    shopSettings: any
  ): Promise<string> {
    if (!shopSettings.brandPersonality && !shopSettings.coreValues) {
      return description; // No brand settings to align with
    }

    const alignmentPrompt = `
Adjust this product description to match the brand voice:

BRAND CONTEXT:
- Store Name: ${shopSettings.storeName || 'Not specified'}
- Brand Personality: ${shopSettings.brandPersonality || 'Not specified'}
- Core Values: ${shopSettings.coreValues || 'Not specified'}

CURRENT DESCRIPTION:
${description}

Adjust the tone and language to match the brand personality while keeping:
- All content and structure
- All SEO elements and keyword usage
- All technical specifications
- All HTML formatting

Return only the adjusted description.`;

    try {
      let response: string;
      
      if (this.provider === 'anthropic' && this.anthropic) {
        const completion = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: alignmentPrompt }],
          max_tokens: 4000,  // Increased for comprehensive voice alignment
          temperature: 0.5,
        });
        response = completion.content?.[0]?.type === 'text' && completion.content?.[0]?.text || '';
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: alignmentPrompt }],
          temperature: 0.5,
          max_tokens: 4000,  // Increased for comprehensive voice alignment
        });
        response = completion.choices[0].message?.content || '';
      } else {
        throw new Error('AI provider not properly initialized');
      }

      return response;
    } catch (error) {
      logger.warn('Failed to align brand voice:', { error: error instanceof Error ? error.message : String(error) });
      return description; // Return original if alignment fails
    }
  }
}