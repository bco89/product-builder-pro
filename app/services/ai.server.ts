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
          max_tokens: 1500,
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
          max_tokens: 1500,
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
              max_tokens: 1500,
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
              max_tokens: 1500,
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
- Price: ${price > 0 ? `$${price}` : 'Not specified'}
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
    return `- Store Name: ${settings.storeName || 'Not specified'}
- Location: ${settings.storeLocation || 'Not specified'}
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
- Pain Points: ${productTypeCustomer.painPoints.slice(0, 3).join(', ')}
- Desires: ${productTypeCustomer.desires.slice(0, 3).join(', ')}
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
## CONTENT CREATION PRINCIPLES

### SEO REQUIREMENTS (MANDATORY)
1. **First Line Rule**: Start with an H2 headline that naturally includes "${primaryKeyword}"
   - For lifestyle products: Create emotional connection in the headline
   - For technical products: Lead with the most impressive specification or capability
   - Make it compelling and specific to THIS ${productTerm}

2. **Keyword Optimization**:
   - Primary keyword "${primaryKeyword}": Use 3-5 times total (aim for 1-2% density)
     * MUST appear in the H2 headline
     * Include within the first 100 words
     * Use naturally throughout the content
     * Include in at least one H3 subheading
   - Secondary keywords: ${secondaryKeywords.length > 0 ? secondaryKeywords.map(k => `"${k}"`).join(', ') + ' - Use each 2-3 times naturally' : 'None provided'}

3. **Content Structure Guidelines**:
   ${config.templateType === 'lifestyle' ? `
   - Open with an emotional hook that connects with ${config.focusAreas.join(', ')}
   - Include a benefits-focused section that shows how this improves their life
   - Paint a picture of the customer using/experiencing the product
   - Keep technical details conversational and accessible
   ` : `
   - Lead with the problem this ${productTerm} solves
   - Include a "Best For" section with 2-3 specific use cases or user types
   - Balance technical specifications with real-world benefits
   - Provide clear, organized technical details
   `}

4. **Required Elements**:
   - An engaging H2 opening with the primary keyword
   - A compelling introduction (1-2 paragraphs) that addresses ${config.customerJourneySteps[0]}
   - Key benefits section (3-4 benefits minimum)
   - ${config.includeBestFor ? 'A "Best For" or "Perfect For" section with specific user scenarios' : 'A section explaining why customers will love this'}
   - Product details/specifications appropriate to the ${config.templateType} nature
   - ${this.checkForSizeChart(params) ? 'A size chart or sizing information section (REQUIRED - sizing data was found)' : ''}
   - Natural integration of keywords without stuffing

5. **Writing Style**:
   - Write naturally and conversationally
   - Focus on benefits over features
   - Use "you" language to connect with the reader
   - Keep paragraphs short (2-3 sentences)
   - Use bullet points for easy scanning
   - Include sensory details where appropriate

6. **Avoid**:
   - Generic descriptions that could apply to any ${productTerm}
   - Keyword stuffing or unnatural repetition
   - Empty marketing speak without substance
   - Technical jargon without explanation (for lifestyle products)
   - Overly casual language (for technical products)

Remember: Create a description that would make someone excited to buy THIS specific ${productTerm}, not just any ${productTerm}.
`;
  }

  private extractProductTerm(params: AIGenerationParams): string {
    // Extract a specific product term from the title or use product type
    const title = params.productTitle.toLowerCase();
    
    // Common product terms to look for
    const terms = ['shirt', 'pants', 'dress', 'jacket', 'shoes', 'watch', 'bag', 'phone', 'laptop', 
                   'tablet', 'camera', 'headphones', 'speaker', 'toy', 'game', 'supplement', 'cream',
                   'serum', 'tool', 'device', 'equipment', 'accessory', 'jewelry', 'furniture'];
    
    for (const term of terms) {
      if (title.includes(term)) {
        return term;
      }
    }
    
    // Fallback to product type
    return params.productType.toLowerCase();
  }

  private parseAIResponse(response: string): AIGenerationResult {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return {
        description: formatProductDescription(parsed.description),
        seoTitle: stripHTML(parsed.seoTitle).substring(0, 60),
        seoDescription: stripHTML(parsed.seoDescription).substring(0, 155),
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
        seoTitle: seoTitleMatch ? stripHTML(seoTitleMatch[1]).substring(0, 60) : '',
        seoDescription: seoDescriptionMatch ? stripHTML(seoDescriptionMatch[1]).substring(0, 155) : '',
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
      let formatted = 'SCRAPED PRODUCT INFORMATION:';
      
      if (data.productTitle) {
        formatted += `\n- Product Name: ${this.filterScrapedContent(data.productTitle)}`;
      }
      
      if (data.brandVendor) {
        formatted += `\n- Brand/Manufacturer: ${this.filterScrapedContent(data.brandVendor)}`;
      }
      
      if (data.keyFeatures && data.keyFeatures.length > 0) {
        formatted += `\n- Key Features:\n  ${data.keyFeatures.map((f: string) => `• ${f}`).join('\n  ')}`;
      }
      
      if (data.benefits && data.benefits.length > 0) {
        formatted += `\n- Benefits:\n  ${data.benefits.map((b: string) => `• ${b}`).join('\n  ')}`;
      }
      
      if (data.materials && data.materials.length > 0) {
        formatted += `\n- Materials: ${data.materials.join(', ')}`;
      }
      
      if (data.targetAudience) {
        formatted += `\n- Target Audience: ${data.targetAudience}`;
      }
      
      if (data.useCases && data.useCases.length > 0) {
        formatted += `\n- Use Cases: ${data.useCases.join(', ')}`;
      }
      
      if (data.variants && data.variants.length > 0) {
        formatted += `\n- Product Options:`;
        data.variants.forEach((v: any) => {
          formatted += `\n  • ${v.optionName}: ${v.availableValues.join(', ')}`;
        });
      }
      
      if (data.sizeChart && data.sizeChart.available) {
        formatted += `\n- Size Chart Available: Yes`;
        if (data.sizeChart.fitNotes) {
          formatted += `\n  Fit Notes: ${data.sizeChart.fitNotes}`;
        }
      }
      
      if (data.technologies && data.technologies.length > 0) {
        formatted += `\n- Technologies:`;
        data.technologies.forEach((t: any) => {
          formatted += `\n  • ${t.name}${t.description ? `: ${t.description}` : ''}`;
        });
      }
      
      if (data.careInstructions && data.careInstructions.length > 0) {
        formatted += `\n- Care Instructions:\n  ${data.careInstructions.map((c: string) => `• ${c}`).join('\n  ')}`;
      }
      
      if (data.awards && data.awards.length > 0) {
        formatted += `\n- Awards/Certifications: ${data.awards.join(', ')}`;
      }
      
      return formatted;
    }
    
    // Fallback to simple scraped data format
    if (typeof scrapedData === 'string') {
      return `SCRAPED PRODUCT INFORMATION:\n${this.filterScrapedContent(scrapedData)}`;
    }
    
    if (scrapedData.rawContent) {
      return `SCRAPED PRODUCT INFORMATION:\n${this.filterScrapedContent(scrapedData.rawContent)}`;
    }
    
    return `SCRAPED PRODUCT INFORMATION:\n${this.filterScrapedContent(JSON.stringify(scrapedData))}`;
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
          max_tokens: 500,
          temperature: 0.3,
        });
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: evaluationPrompt }],
          temperature: 0.3,
          max_tokens: 500,
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
          max_tokens: 1500,
          temperature: 0.5,
        });
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: alignmentPrompt }],
          temperature: 0.5,
          max_tokens: 1500,
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