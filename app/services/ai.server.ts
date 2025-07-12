import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { prisma } from '../db.server';
import { logger } from './logger.server';
import { getProductTypePrompt, getProductTypeConfig } from './prompts/product-type-prompts';
import { formatProductDescription } from './prompts/formatting';
import { getProductTypeCustomer } from './prompts/product-type-customers';
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
      // If no API key is configured, we'll use a mock implementation
      this.provider = 'anthropic';
      logger.warn('No AI API key configured - using mock implementation');
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
        // Mock implementation
        response = this.getMockCategorization(params);
      }

      return this.parseCategorization(response);
    } catch (error) {
      logger.error('Product categorization failed:', error);
      // Fallback to mock response
      return this.parseCategorization(this.getMockCategorization(params));
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
      // Default fallback
      return {
        productType: 'Home & Garden',
        confidence: 0.5,
        reasoning: 'Unable to determine category with high confidence'
      };
    }
  }

  private getMockCategorization(params: ProductCategorizationParams): string {
    // Simple keyword-based categorization for mock
    const title = params.productTitle.toLowerCase();
    const description = (params.productDescription || '').toLowerCase();
    const combined = `${title} ${description}`;

    if (combined.match(/shirt|dress|pants|shoe|jacket|clothing|wear/)) {
      return JSON.stringify({
        productType: 'Apparel',
        confidence: 0.9,
        reasoning: 'Product title/description contains apparel-related keywords'
      });
    } else if (combined.match(/phone|computer|laptop|tablet|electronic|tech|gadget/)) {
      return JSON.stringify({
        productType: 'Electronics',
        confidence: 0.9,
        reasoning: 'Product contains electronics-related keywords'
      });
    } else if (combined.match(/beauty|cosmetic|makeup|skincare|lotion|cream/)) {
      return JSON.stringify({
        productType: 'Beauty',
        confidence: 0.9,
        reasoning: 'Product contains beauty-related keywords'
      });
    } else if (combined.match(/food|drink|beverage|snack|meal|edible/)) {
      return JSON.stringify({
        productType: 'Food & Beverage',
        confidence: 0.9,
        reasoning: 'Product contains food/beverage-related keywords'
      });
    } else if (combined.match(/sport|fitness|exercise|outdoor|camping|hiking/)) {
      return JSON.stringify({
        productType: 'Sports & Outdoors',
        confidence: 0.85,
        reasoning: 'Product contains sports/outdoor-related keywords'
      });
    } else if (combined.match(/toy|game|play|puzzle|child|kid/)) {
      return JSON.stringify({
        productType: 'Toys & Games',
        confidence: 0.85,
        reasoning: 'Product contains toy/game-related keywords'
      });
    } else if (combined.match(/jewelry|jewellery|necklace|ring|bracelet|watch/)) {
      return JSON.stringify({
        productType: 'Jewelry & Accessories',
        confidence: 0.9,
        reasoning: 'Product contains jewelry-related keywords'
      });
    } else if (combined.match(/health|wellness|vitamin|supplement|medical/)) {
      return JSON.stringify({
        productType: 'Health & Wellness',
        confidence: 0.85,
        reasoning: 'Product contains health-related keywords'
      });
    } else if (combined.match(/pet|dog|cat|animal|bird|fish/)) {
      return JSON.stringify({
        productType: 'Pet Supplies',
        confidence: 0.9,
        reasoning: 'Product contains pet-related keywords'
      });
    } else if (combined.match(/office|school|pen|pencil|desk|paper|stationery/)) {
      return JSON.stringify({
        productType: 'Office & School Supplies',
        confidence: 0.85,
        reasoning: 'Product contains office/school-related keywords'
      });
    } else if (combined.match(/car|auto|vehicle|motor|engine|tire/)) {
      return JSON.stringify({
        productType: 'Automotive',
        confidence: 0.9,
        reasoning: 'Product contains automotive-related keywords'
      });
    } else {
      return JSON.stringify({
        productType: 'Home & Garden',
        confidence: 0.6,
        reasoning: 'Default category when specific type cannot be determined'
      });
    }
  }

  async generateProductDescription(params: AIGenerationParams): Promise<AIGenerationResult> {
    // If productType is not provided or is generic, categorize first
    let productType = params.productType;
    if (!productType || productType === 'Other' || productType === 'General') {
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
      }
    }

    const systemPrompt = getProductTypePrompt(productType);
    const userPrompt = this.buildUserPrompt({ ...params, productType });

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
        // Mock implementation for development
        response = this.getMockResponse(params);
      }

      // Log the generation
      await prisma.AIGenerationLog.create({
        data: {
          shop: params.shop,
          generationType: 'description',
          prompt: userPrompt,
          response,
        }
      });

      return this.parseAIResponse(response);
    } catch (error) {
      logger.error('AI generation failed:', error);
      // Return mock response on error for development
      return this.parseAIResponse(this.getMockResponse(params));
    }
  }

  private buildUserPrompt(params: AIGenerationParams): string {
    const config = getProductTypeConfig(params.productType);
    const settings = params.shopSettings || {};
    const price = params.pricing?.price ? parseFloat(params.pricing.price) : 0;
    
    // Determine template complexity based on product type and price
    const useDetailedTemplate = config.templateType === 'technical' || 
      (config.priceThreshold && price > config.priceThreshold);
    
    // Build customer avatar combining store settings and product type
    const customerAvatar = this.buildCustomerAvatar(settings, config, params.productType);
    
    return `
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
${params.scrapedData ? `- Scraped Information: ${JSON.stringify(params.scrapedData)}` : ''}
${params.imageAnalysis ? `- Visual Analysis: ${params.imageAnalysis}` : ''}

IMPORTANT INSTRUCTIONS:
1. Use ${useDetailedTemplate ? 'TECHNICAL' : 'LIFESTYLE'} template structure
2. ${config.includeBestFor ? 'Include "Best For" section with 2-3 specific user types' : 'Use "You\'ll love this because..." framing'}
3. Customer journey focus areas: ${config.customerJourneySteps.join(' → ')}
4. Primary keyword "${params.keywords[0]}" MUST appear in the H2 headline and 2-3 times naturally
5. ${params.additionalContext?.includes('size chart') || (typeof params.scrapedData === 'string' && params.scrapedData.includes('size')) || (params.scrapedData?.rawContent && params.scrapedData.rawContent.includes('size')) ? 'INCLUDE the size chart as a formatted table at the end' : 'No size chart needed'}
6. Write for someone at step 1 of the journey: "${config.customerJourneySteps[0]}"

TEMPLATE STRUCTURE TO FOLLOW:
${this.getTemplateStructure(config, useDetailedTemplate)}

Format as JSON with these exact keys:
{
  "description": "Complete HTML formatted description following the template",
  "seoTitle": "SEO title (max 60 chars) with primary keyword",
  "seoDescription": "Meta description (max 155 chars) with compelling action"
}
`;
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

  private getTemplateStructure(config: ProductTypeConfig, detailed: boolean): string {
    if (config.templateType === 'lifestyle' || !detailed) {
      return `
<h2><strong>[Compelling headline with primary keyword and emotional benefit]</strong></h2>
<p>[Opening paragraph addressing the primary desire/pain point - make them FEEL something]</p>

<h3><strong>You'll Love This Because:</strong></h3>
<ul>
  <li><strong>[Benefit 1]:</strong> [How it improves their life]</li>
  <li><strong>[Benefit 2]:</strong> [Emotional/practical outcome]</li>
  <li><strong>[Benefit 3]:</strong> [Social/aspirational benefit]</li>
  <li><strong>[Benefit 4]:</strong> [Practical feature as benefit]</li>
</ul>

<p>[Lifestyle integration paragraph - paint a picture of them using/wearing it]</p>

<h3><strong>The Details:</strong></h3>
<p>[Key features and specifications written conversationally]</p>

[IF SIZE CHART PROVIDED: Include formatted table here]
`;
    } else {
      return `
<h2><strong>[Headline with primary keyword and key benefit/solution]</strong></h2>
<p>[Opening addressing the problem this solves]</p>

<h3><strong>This ${config.templateType === 'technical' ? 'Product' : 'Gear'} Is Best For:</strong></h3>
<ul>
  <li><strong>[User Type 1]:</strong> [Specific use case and why it's perfect]</li>
  <li><strong>[User Type 2]:</strong> [Different use case and benefits]</li>
  <li><strong>[User Type 3]:</strong> [Another scenario and advantages]</li>
</ul>

<h3><strong>Key Features & Benefits:</strong></h3>
<ul>
  <li><strong>[Feature 1]:</strong> [Technical detail + user benefit]</li>
  <li><strong>[Feature 2]:</strong> [Specification + real-world application]</li>
  <li><strong>[Feature 3]:</strong> [Compatibility/requirement + convenience]</li>
  <li><strong>[Feature 4]:</strong> [Quality aspect + long-term value]</li>
</ul>

<h3><strong>Specifications:</strong></h3>
<p>[Detailed technical information organized clearly]</p>

[IF SIZE/SPEC TABLE PROVIDED: Include formatted table here]
`;
    }
  }

  private parseAIResponse(response: string): AIGenerationResult {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return {
        description: formatProductDescription(parsed.description),
        seoTitle: parsed.seoTitle.substring(0, 60),
        seoDescription: parsed.seoDescription.substring(0, 155),
      };
    } catch (error) {
      // Fallback parsing if not valid JSON
      logger.error('Failed to parse AI response as JSON:', error);
      
      // Try to extract content from the response
      const descriptionMatch = response.match(/"description":\s*"([^"]+)"/);
      const seoTitleMatch = response.match(/"seoTitle":\s*"([^"]+)"/);
      const seoDescriptionMatch = response.match(/"seoDescription":\s*"([^"]+)"/);
      
      return {
        description: descriptionMatch ? descriptionMatch[1] : response,
        seoTitle: seoTitleMatch ? seoTitleMatch[1].substring(0, 60) : '',
        seoDescription: seoDescriptionMatch ? seoDescriptionMatch[1].substring(0, 155) : '',
      };
    }
  }

  private getMockResponse(params: AIGenerationParams): string {
    const keyword = params.keywords[0] || params.productTitle;
    const config = getProductTypeConfig(params.productType);
    const price = params.pricing?.price ? parseFloat(params.pricing.price) : 0;
    const useDetailedTemplate = config.templateType === 'technical' || 
      (config.priceThreshold && price > config.priceThreshold);

    let description: string;
    
    if (config.templateType === 'lifestyle' || !useDetailedTemplate) {
      description = `<h2><strong>Premium ${keyword} - Transform Your Daily Experience</strong></h2>
<p>Discover the ${params.productTitle} that elevates your everyday moments into something extraordinary. This exceptional ${keyword} combines thoughtful design with uncompromising quality to exceed your expectations.</p>

<h3><strong>You'll Love This Because:</strong></h3>
<ul>
  <li><strong>Instant Confidence:</strong> Feel amazing every time you use it</li>
  <li><strong>Effortless Style:</strong> Complements your unique personality perfectly</li>
  <li><strong>Lasting Quality:</strong> Built to be a favorite for years to come</li>
  <li><strong>Sustainable Choice:</strong> Eco-conscious materials you can feel good about</li>
</ul>

<p>Imagine starting each day with the confidence that comes from owning something truly special. This ${keyword} seamlessly integrates into your lifestyle, making every moment a little more extraordinary.</p>

<h3><strong>The Details:</strong></h3>
<p>Meticulously crafted with premium materials and attention to every detail. Features thoughtful design elements that enhance both form and function, ensuring you get the perfect blend of style and practicality.</p>`;
    } else {
      description = `<h2><strong>${keyword} - Professional-Grade Performance You Can Trust</strong></h2>
<p>Engineered to solve real problems with reliable, professional-grade performance. This ${params.productTitle} delivers the features and quality that serious users demand.</p>

<h3><strong>This Product Is Best For:</strong></h3>
<ul>
  <li><strong>Professionals:</strong> Who need reliable performance for daily use</li>
  <li><strong>Enthusiasts:</strong> Looking for advanced features and capabilities</li>
  <li><strong>Value Seekers:</strong> Who want long-term quality and performance</li>
</ul>

<h3><strong>Key Features & Benefits:</strong></h3>
<ul>
  <li><strong>Premium Build Quality:</strong> Durable construction ensures years of reliable use</li>
  <li><strong>Advanced Technology:</strong> Latest features for maximum efficiency and results</li>
  <li><strong>Universal Compatibility:</strong> Works seamlessly with your existing setup</li>
  <li><strong>Professional Support:</strong> Backed by comprehensive warranty and expert help</li>
</ul>

<h3><strong>Specifications:</strong></h3>
<p>Professional-grade components and materials throughout. Meets or exceeds industry standards for performance and reliability. Full technical specifications available upon request.</p>`;
    }

    return JSON.stringify({
      description,
      seoTitle: `${keyword} - Premium ${params.productType} | ${params.vendor}`,
      seoDescription: `Shop our ${keyword} - exceptional quality ${params.productType} with premium features. Free shipping available. Shop now and experience the difference!`
    });
  }
}