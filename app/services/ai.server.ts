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
  imageAnalysis?: string;
  shopSettings?: any;
  scrapedData?: any;
  pricing?: {
    price: string;
    compareAtPrice?: string;
  };
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
  imageAnalysis?: string;
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
${params.imageAnalysis ? `Visual: ${params.imageAnalysis}` : ''}`;

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
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
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

  async generateProductDescription(params: AIGenerationParams): Promise<AIGenerationResult> {
    logger.info('\n=== AI DESCRIPTION GENERATION START ===');
    logger.info('Initial parameters', {
      shop: params.shop,
      title: params.productTitle,
      type: params.productType,
      hasScrapedData: !!params.scrapedData,
      hasEnhancedDescriptionData: !!params.scrapedData?.descriptionData
    });
    
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
        imageAnalysis: params.imageAnalysis
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
      
      if (this.provider === 'anthropic' && this.anthropic) {
        // Use Claude 3.5 Sonnet as specified
        const completion = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt,
          max_tokens: 2500,  // Increased for more comprehensive descriptions
          temperature: 0.7,
        });
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2500,  // Increased for more comprehensive descriptions
        });
        response = completion.choices[0].message?.content || '';
      } else {
        throw new Error('AI provider not properly initialized');
      }

      // Log the generation
      await prisma.aIGenerationLog.create({
        data: {
          shop: params.shop,
          generationType: 'description',
          prompt: userPrompt,
          response,
        }
      });

      let result = this.parseAIResponse(response);
      
      // Phase 2: Quality evaluation
      const primaryKeyword = params.keywords[0];
      const secondaryKeywords = params.keywords.slice(1);
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
- H2 with primary keyword "${primaryKeyword}" as first line
- Primary keyword used 3-5 times
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
              max_tokens: 1500,  // Increased for comprehensive improvements
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
              max_tokens: 1500,  // Increased for comprehensive improvements
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
      
      // Phase 4: Brand voice alignment
      if (params.shopSettings) {
        logger.info('Applying brand voice alignment...');
        const alignedDescription = await this.alignBrandVoice(result.description, params.shopSettings);
        result.description = formatProductDescription(alignedDescription);
      }
      
      // Add quality metrics to result
      result.qualityMetrics = metrics;
      
      logger.info('\n--- AI GENERATION RESULT ---');
      logger.info('Generated content summary', {
        descriptionLength: result.description.length,
        seoTitleLength: result.seoTitle.length,
        seoDescriptionLength: result.seoDescription.length,
        hasDescription: !!result.description,
        hasSeoTitle: !!result.seoTitle,
        hasSeoDescription: !!result.seoDescription,
        qualityScore: metrics.overallScore
      });
      
      logger.info('=== AI DESCRIPTION GENERATION COMPLETE ===\n');
      
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
    
    // Log what we're sending to the AI
    logger.info('\n=== AI PROMPT GENERATION ===');
    logger.info('AI Generation Parameters', {
      productTitle: params.productTitle,
      productType: params.productType,
      primaryKeyword: params.keywords[0],
      hasScrapedData: !!params.scrapedData,
      hasEnhancedData: !!params.scrapedData?.descriptionData,
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
- Primary Keyword: ${params.keywords[0]}
- Secondary Keywords: ${params.keywords.slice(1).join(', ')}
${params.additionalContext ? `- Additional Details: ${params.additionalContext}` : ''}
${formattedScrapedData ? `\n${formattedScrapedData}` : ''}
${params.imageAnalysis ? `- Visual Analysis: ${params.imageAnalysis}` : ''}

IMPORTANT CONTEXT:
- Write for someone at step 1 of their journey: "${config.customerJourneySteps[0]}"
- Customer journey progression: ${config.customerJourneySteps.join(' → ')}
- Focus areas for this product type: ${config.focusAreas.join(', ')}

${this.getContentPrinciples(config, params)}

Format as JSON with these exact keys:
{
  "description": "Complete HTML formatted description following the template",
  "seoTitle": "SEO title (max 60 chars) with primary keyword",
  "seoDescription": "Meta description (max 155 chars) with compelling action"
}

CRITICAL HTML RULES:
- Each bullet point must be its own <li> element
- Never put multiple bullet points in one <li>
- Never include bullet characters (•, -, *) inside <li> elements
- Format lists as: <ul><li>Feature one</li><li>Feature two</li><li>Feature three</li></ul>
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
    // Combine generic product type customer with store-specific details
    const productTypeCustomer = this.getProductTypeCustomer(productType);
    
    // Use override if provided, otherwise use product type demographics
    const demographics = settings.targetCustomerOverride || productTypeCustomer.demographics;
    
    // Build the avatar with product-type defaults and any additional insights
    let avatar = `- Who: ${demographics}
- Pain Points: ${productTypeCustomer.painPoints.join(', ')}
- Desires: ${productTypeCustomer.desires.join(', ')}
- Shopping Behavior: ${productTypeCustomer.shoppingBehavior}
- Decision Factors: ${config.customerJourneySteps.join(', ')}
- Motivations: ${productTypeCustomer.motivations}
- Price Expectations: ${productTypeCustomer.priceExpectations}
- Brand Loyalty: ${productTypeCustomer.brandLoyalty}`;

    // Add additional insights if provided
    if (settings.additionalCustomerInsights) {
      avatar += `\n- Additional Insights: ${settings.additionalCustomerInsights}`;
    }
    
    // Add excluded segments if provided
    if (settings.excludedCustomerSegments) {
      avatar += `\n- NOT for: ${settings.excludedCustomerSegments}`;
    }
    
    return avatar;
  }

  private getProductTypeCustomer(productType: string): ProductTypeCustomer {
    return getProductTypeCustomer(productType);
  }

  private getContentPrinciples(config: ProductTypeConfig, params: AIGenerationParams): string {
    const primaryKeyword = params.keywords[0];
    const secondaryKeywords = params.keywords.slice(1);
    const productTerm = this.extractProductTerm(params);
    
    return `
## Your Creative Canvas

You're crafting a description for a ${productTerm} that will make shoppers stop scrolling and start imagining life with this product. Here's your creative framework:

### The Opening That Hooks 🎯
Your first line is an H2 headline featuring "${primaryKeyword}" - but make it irresistible:
${config.templateType === 'lifestyle' ? 
  `• Tap into emotion: "Transform Your ${primaryKeyword} Experience"
   • Promise a feeling: "The ${primaryKeyword} That Makes Every Day Better"
   • Spark curiosity: "Why This ${primaryKeyword} Changes Everything"` : 
  `• Lead with power: "The ${primaryKeyword} Built for [Impressive Spec]"
   • Solve problems: "Finally, a ${primaryKeyword} That Actually [Solution]"
   • Show expertise: "Professional-Grade ${primaryKeyword} for [Use Case]"`}

### Natural Keyword Flow 🌊
Weave keywords like a conversation, not a checklist:
• "${primaryKeyword}" should appear 3-5 times total - once in your H2, once early on, then naturally throughout
${secondaryKeywords.length > 0 ? `• Sprinkle in ${secondaryKeywords.map(k => `"${k}"`).join(', ')} where they enhance the story (2-3 times each)` : ''}
• Use related terms and natural variations - think how real people search and speak

### The Story Arc for ${config.templateType === 'lifestyle' ? 'Lifestyle Connection' : config.templateType === 'technical' ? 'Technical Excellence' : 'Balanced Appeal'} 📖
${config.templateType === 'lifestyle' ? `
Paint the picture of transformation:
• Start with their current struggle or desire around ${config.focusAreas.join(', ')}
• Show how this ${productTerm} bridges that gap
• Let them feel the joy/confidence/ease of owning it
• Make features come alive through benefits
• Close with an inspiring vision of their improved life` : 
config.templateType === 'technical' ? `
Build trust through expertise:
• Identify the specific problem this ${productTerm} solves
• Showcase standout specs that matter for real use
• Include "Best For" scenarios - who needs this and why
• Balance impressive numbers with practical benefits
• Demonstrate value through performance and reliability` :
`Bridge emotion and logic:
• Open with the transformation this enables
• Support desire with solid specifications
• Show both who will love it AND why it performs
• Mix lifestyle benefits with technical confidence
• Appeal to both heart and mind`}

### Essential Elements to Weave In ✨
While you have creative freedom, ensure your narrative includes:
• **The Hook**: An emotional or technical opening that addresses "${config.customerJourneySteps[0]}"
• **Key Benefits**: 3-4 ways this ${productTerm} improves life (not just features!)
• **Trust Builders**: Specific details on materials, quality, specifications
${config.includeBestFor ? `• **Perfect For**: 2-3 specific scenarios or people who need this` : `• **Why They'll Love It**: Connect to their values and lifestyle`}
${this.checkForSizeChart(params) ? `• **Size Information**: Include the sizing details provided - shoppers need this!` : ''}
• **The Close**: Leave them feeling this was made for them

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

### What Makes This ${productTerm} Special? 🌟
Focus on what sets THIS particular ${productTerm} apart:
${config.focusAreas.map(area => `• ${area.charAt(0).toUpperCase() + area.slice(1)}: How does it excel here?`).join('\n')}

Remember: You're not just describing features - you're showing someone their life with this ${productTerm}. Make them feel it, want it, and trust it.

Every word should either create desire or justify the purchase. Ideally both.
`;
  }

  private extractProductTerm(params: AIGenerationParams): string {
    const title = params.productTitle.toLowerCase();
    const primaryKeyword = params.keywords[0]?.toLowerCase() || '';
    
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
      
      // Try to extract content from the response
      const descriptionMatch = response.match(/"description":\s*"([^"]+)"/);
      const seoTitleMatch = response.match(/"seoTitle":\s*"([^"]+)"/);
      const seoDescriptionMatch = response.match(/"seoDescription":\s*"([^"]+)"/);
      
      return {
        description: descriptionMatch ? formatProductDescription(descriptionMatch[1]) : response,
        seoTitle: seoTitleMatch ? stripHTML(seoTitleMatch[1]) : '',
        seoDescription: seoDescriptionMatch ? stripHTML(seoDescriptionMatch[1]) : '',
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
   * Format scraped data for the AI prompt
   */
  private formatScrapedDataForPrompt(scrapedData: any): string {
    if (!scrapedData) return '';
    
    // Check if we have enhanced description data
    if (scrapedData.descriptionData) {
      const data = scrapedData.descriptionData;
      let formatted = '## 📊 PRODUCT RESEARCH DATA\n';
      formatted += '*Use this information to create an authentic, detailed description:*\n';
      
      // Priority 1: Core Product Information
      formatted += '\n### 🎯 Core Product Details';
      
      if (data.productTitle) {
        formatted += `\n**Official Product Name**: ${this.filterScrapedContent(data.productTitle)}`;
      }
      
      if (data.brandVendor) {
        formatted += `\n**Brand**: ${this.filterScrapedContent(data.brandVendor)}`;
      }
      
      // Priority 2: Key Features & Benefits (most important for descriptions)
      if (data.keyFeatures && data.keyFeatures.length > 0) {
        formatted += `\n\n### 💡 Key Features to Highlight\n${data.keyFeatures.map((f: string) => `• ${f}`).join('\n')}`;
      }
      
      if (data.benefits && data.benefits.length > 0) {
        formatted += `\n\n### ✨ Customer Benefits (Transform these into compelling copy)\n${data.benefits.map((b: string) => `• ${b}`).join('\n')}`;
      }
      
      // Priority 3: Technical Details
      if (data.materials && data.materials.length > 0) {
        formatted += `\n\n### 🔧 Materials & Construction\n• ${data.materials.join('\n• ')}`;
      }
      
      if (data.technologies && data.technologies.length > 0) {
        formatted += `\n\n### 💻 Technologies & Innovations`;
        data.technologies.forEach((t: any) => {
          formatted += `\n• **${t.name}**${t.description ? `: ${t.description}` : ''}`;
        });
      }
      
      // Priority 4: Size Information (CRITICAL if available)
      if (data.sizeChart && data.sizeChart.available) {
        formatted += `\n\n### 📏 SIZE INFORMATION (MUST INCLUDE IN DESCRIPTION)`;
        formatted += `\n**Size Chart Available**: Yes`;
        if (data.sizeChart.fitNotes) {
          formatted += `\n**Fit Notes**: ${data.sizeChart.fitNotes}`;
        }
        if (data.sizeChart.measurements) {
          formatted += `\n**Measurements**: Include the size chart provided`;
        }
      }
      
      // Priority 5: Usage & Audience
      if (data.targetAudience) {
        formatted += `\n\n### 👥 Target Audience\n${data.targetAudience}`;
      }
      
      if (data.useCases && data.useCases.length > 0) {
        formatted += `\n\n### 🎯 Perfect For (Use Cases)\n• ${data.useCases.join('\n• ')}`;
      }
      
      // Priority 6: Additional Details
      if (data.variants && data.variants.length > 0) {
        formatted += `\n\n### 🎨 Available Options`;
        data.variants.forEach((v: any) => {
          formatted += `\n• **${v.optionName}**: ${v.availableValues.join(', ')}`;
        });
      }
      
      if (data.careInstructions && data.careInstructions.length > 0) {
        formatted += `\n\n### 🧼 Care Instructions\n${data.careInstructions.map((c: string) => `• ${c}`).join('\n')}`;
      }
      
      if (data.awards && data.awards.length > 0) {
        formatted += `\n\n### 🏆 Awards & Certifications\n• ${data.awards.join('\n• ')}`;
      }
      
      formatted += '\n\n---\n*Remember: Use this data to inform your description, but write in your own engaging style. Don\'t just copy - transform this into compelling sales copy!*';
      
      return formatted;
    }
    
    // Fallback for unstructured scraped data
    const filteredContent = typeof scrapedData === 'string' 
      ? this.filterScrapedContent(scrapedData)
      : this.filterScrapedContent(scrapedData.rawContent || JSON.stringify(scrapedData));
    
    // Try to extract key information from unstructured content
    let formatted = '## 📊 PRODUCT RESEARCH DATA\n';
    formatted += '*Extracted from product page - use relevant details to create your description:*\n\n';
    
    // Look for common patterns in the content
    const content = filteredContent.toLowerCase();
    
    // Extract potential features (look for bullet points or feature indicators)
    const featurePatterns = [
      /features?:([^.]+)\./gi,
      /•\s*([^•\n]+)/g,
      /[-*]\s*([^-*\n]+)/g
    ];
    
    let features: string[] = [];
    featurePatterns.forEach(pattern => {
      const matches = filteredContent.match(pattern);
      if (matches) {
        features = features.concat(matches.map(m => m.replace(/^[•\-*]\s*/, '').trim()));
      }
    });
    
    if (features.length > 0) {
      formatted += '### Key Information Found:\n';
      features.forEach(f => {
        if (f.length > 10) {  // Only filter out very short fragments
          formatted += `• ${f}\n`;
        }
      });
    }
    
    // Look for size/dimension information
    if (content.includes('size') || content.includes('dimension') || content.includes('measurement')) {
      formatted += '\n### ⚠️ SIZE INFORMATION DETECTED\nMake sure to include any sizing details found in the source data.\n';
    }
    
    // Add the raw content for reference
    formatted += '\n### Raw Content for Reference:\n```\n';
    formatted += filteredContent;  // Include all content - no truncation
    formatted += '\n```';
    
    return formatted;
  }
  
  /**
   * Check if size chart information is available
   */
  private checkForSizeChart(params: AIGenerationParams): boolean {
    // Check additional context
    if (params.additionalContext?.includes('size chart')) return true;
    
    // Check raw scraped content
    if (typeof params.scrapedData === 'string' && params.scrapedData.includes('size')) return true;
    if (params.scrapedData?.rawContent && params.scrapedData.rawContent.includes('size')) return true;
    
    // Check enhanced description data
    if (params.scrapedData?.descriptionData?.sizeChart?.available === true) return true;
    
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
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
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
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
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