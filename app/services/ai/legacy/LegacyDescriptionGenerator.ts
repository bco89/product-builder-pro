import { logger } from '../../logger.server';
import { getProductTypePrompt, getProductTypeConfig } from '../../prompts/product-type-prompts';
import { formatProductDescription, stripHTML } from '../../prompts/formatting';
import { getProductTypeCustomer } from '../../prompts/product-type-customers';
import { prisma } from '../../../db.server';
import type { 
  AIGenerationParams, 
  AIGenerationResult, 
  QualityMetrics,
  ProductCategorizationParams
} from '../AIService';
import type { PromptLogger } from '../logging/PromptLogger';
import type { Anthropic } from '@anthropic-ai/sdk';
import type OpenAI from 'openai';

// Content filtering patterns
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
  ]
};

export class LegacyDescriptionGenerator {
  constructor(
    private provider: 'openai' | 'anthropic',
    private anthropic?: Anthropic,
    private openai?: OpenAI,
    private promptLogger?: PromptLogger,
    private model: string = 'gpt-4'
  ) {}
  
  async generate(params: AIGenerationParams): Promise<AIGenerationResult> {
    logger.info('\n=== AI DESCRIPTION GENERATION START ===');
    logger.info('Initial parameters', {
      shop: params.shop,
      title: params.productTitle,
      type: params.productType,
      hasScrapedData: !!params.scrapedData
    });
    
    // Check if categorization is needed
    const supportedProductTypes = [
      'Apparel', 'Electronics', 'Beauty', 'Home & Garden', 
      'Food & Beverage', 'Sports & Outdoors', 'Toys & Games', 
      'Jewelry & Accessories', 'Health & Wellness', 'Pet Supplies', 
      'Office & School Supplies', 'Automotive'
    ];
    
    let productType = params.productType;
    const needsCategorization = !productType || 
                               productType === 'Other' || 
                               productType === 'General' ||
                               !supportedProductTypes.includes(productType);
    
    if (needsCategorization) {
      // Note: categorization should be done by the parent service
      productType = params.productType || 'General';
    }

    const systemPrompt = getProductTypePrompt(productType);
    const userPrompt = this.buildUserPrompt({ ...params, productType });
    
    // Log prompts
    const scrapedDataSection = params.scrapedData ? 
      this.formatScrapedDataForPrompt(params.scrapedData) : undefined;
    
    await this.promptLogger?.logPrompt({
      model: this.model,
      prompt: userPrompt,
      response: '', // Will be filled later
      metadata: {
        systemPrompt,
        productTitle: params.productTitle,
        shop: params.shop,
        scrapedDataSection
      }
    });

    try {
      let response: string;
      
      logger.info('Sending request to AI provider', {
        provider: this.provider,
        model: this.model,
        promptLength: userPrompt.length,
        systemPromptLength: systemPrompt.length
      });
      
      if (this.provider === 'anthropic' && this.anthropic) {
        try {
          const completion = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            messages: [{ role: 'user', content: userPrompt }],
            system: systemPrompt,
            max_tokens: 2500,
            temperature: 0.7,
          });
          response = completion.content[0].type === 'text' ? completion.content[0].text : '';
          logger.info('Received response from Anthropic', { 
            responseLength: response.length,
            contentType: completion.content[0].type 
          });
        } catch (anthropicError) {
          logger.error('Anthropic API error:', {
            error: anthropicError instanceof Error ? anthropicError.message : String(anthropicError),
            stack: anthropicError instanceof Error ? anthropicError.stack : undefined
          });
          throw new Error(`Anthropic API error: ${anthropicError instanceof Error ? anthropicError.message : 'Unknown error'}`);
        }
      } else if (this.provider === 'openai' && this.openai) {
        try {
          const completion = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2500,
          });
          response = completion.choices[0].message?.content || '';
          logger.info('Received response from OpenAI', { responseLength: response.length });
        } catch (openaiError) {
          logger.error('OpenAI API error:', {
            error: openaiError instanceof Error ? openaiError.message : String(openaiError),
            stack: openaiError instanceof Error ? openaiError.stack : undefined
          });
          throw new Error(`OpenAI API error: ${openaiError instanceof Error ? openaiError.message : 'Unknown error'}`);
        }
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
      
      // Quality evaluation
      const primaryKeyword = params.keywords?.[0] || '';
      const secondaryKeywords = params.keywords?.slice(1) || [];
      const metrics = await this.evaluateDescription(
        result.description,
        primaryKeyword,
        secondaryKeywords,
        productType
      );
      
      logger.info('Quality evaluation scores:', metrics);
      
      // Auto-improvement if needed
      if (metrics.overallScore < 8 && metrics.suggestions.length > 0) {
        logger.info('Auto-improving description...');
        
        const improvedResult = await this.improveDescription(
          result,
          metrics,
          primaryKeyword,
          systemPrompt
        );
        
        if (improvedResult) {
          result = improvedResult;
        }
      }
      
      // Brand voice alignment
      if (params.shopSettings) {
        logger.info('Applying brand voice alignment...');
        const alignedDescription = await this.alignBrandVoice(
          result.description, 
          params.shopSettings
        );
        result.description = formatProductDescription(alignedDescription);
      }
      
      result.qualityMetrics = metrics;
      
      logger.info('=== AI DESCRIPTION GENERATION COMPLETE ===\n');
      
      return result;
    } catch (error) {
      logger.error('AI generation failed:', error);
      throw error;
    }
  }
  
  private buildUserPrompt(params: AIGenerationParams): string {
    const config = getProductTypeConfig(params.productType);
    const settings = params.shopSettings || {};
    const price = params.pricing?.price ? parseFloat(params.pricing.price) : 0;
    
    const useDetailedTemplate = config.templateType === 'technical' || 
      (config.priceThreshold && price > config.priceThreshold) || false;
    
    const customerAvatar = this.buildCustomerAvatar(settings, config, params.productType);
    const formattedScrapedData = this.formatScrapedDataForPrompt(params.scrapedData);
    
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
- Primary Keyword: ${params.keywords?.[0] || 'Not specified'}
- Secondary Keywords: ${params.keywords?.slice(1).join(', ') || 'None'}
${params.additionalContext ? `- Additional Details: ${params.additionalContext}` : ''}
${formattedScrapedData ? `\n${formattedScrapedData}` : ''}
${params.imageAnalysis ? `- Visual Analysis: ${params.imageAnalysis}` : ''}

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

CRITICAL HTML RULES:
- Each bullet point must be its own <li> element
- Never put multiple bullet points in one <li>
- Never include bullet characters (•, -, *) inside <li> elements
- Format lists as: <ul><li>Feature one</li><li>Feature two</li><li>Feature three</li></ul>
`;

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
  
  private buildCustomerAvatar(settings: any, config: any, productType: string): string {
    const productTypeCustomer = getProductTypeCustomer(productType);
    const demographics = settings.targetCustomerOverride || productTypeCustomer.demographics;
    
    let avatar = `- Who: ${demographics}
- Pain Points: ${productTypeCustomer.painPoints.join(', ')}
- Desires: ${productTypeCustomer.desires.join(', ')}
- Shopping Behavior: ${productTypeCustomer.shoppingBehavior}
- Decision Factors: ${config.customerJourneySteps.join(', ')}
- Motivations: ${productTypeCustomer.motivations}
- Price Expectations: ${productTypeCustomer.priceExpectations}
- Brand Loyalty: ${productTypeCustomer.brandLoyalty}`;

    if (settings.additionalCustomerInsights) {
      avatar += `\n- Additional Insights: ${settings.additionalCustomerInsights}`;
    }
    
    if (settings.excludedCustomerSegments) {
      avatar += `\n- NOT for: ${settings.excludedCustomerSegments}`;
    }
    
    return avatar;
  }
  
  private getContentPrinciples(config: any, params: AIGenerationParams): string {
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
`;
  }
  
  private extractProductTerm(params: AIGenerationParams): string {
    const title = params.productTitle.toLowerCase();
    const primaryKeyword = params.keywords?.[0]?.toLowerCase() || '';
    
    if (primaryKeyword && !['best', 'top', 'buy', 'sale', 'new'].includes(primaryKeyword)) {
      if (title.includes(primaryKeyword) || primaryKeyword.split(' ').some(word => title.includes(word))) {
        return primaryKeyword;
      }
    }
    
    // Default to product type
    return params.productType.toLowerCase();
  }
  
  private formatScrapedDataForPrompt(scrapedData: any): string {
    if (!scrapedData) return '';
    
    if (scrapedData.descriptionData) {
      const data = scrapedData.descriptionData;
      let formatted = '## 📊 PRODUCT RESEARCH DATA\n';
      formatted += '*Use this information to create an authentic, detailed description:*\n';
      
      if (data.keyFeatures && data.keyFeatures.length > 0) {
        formatted += `\n### 💡 Key Features to Highlight\n${data.keyFeatures.map((f: string) => `• ${f}`).join('\n')}`;
      }
      
      if (data.benefits && data.benefits.length > 0) {
        formatted += `\n\n### ✨ Customer Benefits\n${data.benefits.map((b: string) => `• ${b}`).join('\n')}`;
      }
      
      return formatted;
    }
    
    const filteredContent = typeof scrapedData === 'string' 
      ? this.filterScrapedContent(scrapedData)
      : this.filterScrapedContent(scrapedData.rawContent || JSON.stringify(scrapedData));
    
    return `## 📊 PRODUCT RESEARCH DATA\n${filteredContent}`;
  }
  
  private filterScrapedContent(content: string): string {
    if (!content) return content;
    
    let filtered = content;
    
    Object.values(IRRELEVANT_PATTERNS).flat().forEach((pattern: RegExp) => {
      filtered = filtered.replace(pattern, '');
    });
    
    filtered = filtered.replace(/\s+/g, ' ').trim();
    
    return filtered;
  }
  
  private parseAIResponse(response: string): AIGenerationResult {
    try {
      // First attempt: direct JSON parse
      const parsed = JSON.parse(response);
      return {
        description: formatProductDescription(parsed.description),
        seoTitle: stripHTML(parsed.seoTitle),
        seoDescription: stripHTML(parsed.seoDescription),
      };
    } catch (error) {
      logger.error('Failed to parse AI response as JSON, attempting fallback parsing:', {
        error: error instanceof Error ? error.message : String(error),
        responseSnippet: response.substring(0, 200)
      });
      
      // Second attempt: extract JSON from markdown code blocks
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return {
            description: formatProductDescription(parsed.description),
            seoTitle: stripHTML(parsed.seoTitle),
            seoDescription: stripHTML(parsed.seoDescription),
          };
        } catch (e) {
          logger.error('Failed to parse extracted JSON:', e);
        }
      }
      
      // Third attempt: improved regex with multiline support
      const descriptionMatch = response.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
      const seoTitleMatch = response.match(/"seoTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const seoDescriptionMatch = response.match(/"seoDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      
      if (descriptionMatch || seoTitleMatch || seoDescriptionMatch) {
        // Unescape JSON strings
        const unescapeJson = (str: string) => {
          return str.replace(/\\"/g, '"')
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\\\/g, '\\');
        };
        
        return {
          description: descriptionMatch ? formatProductDescription(unescapeJson(descriptionMatch[1])) : '',
          seoTitle: seoTitleMatch ? stripHTML(unescapeJson(seoTitleMatch[1])) : '',
          seoDescription: seoDescriptionMatch ? stripHTML(unescapeJson(seoDescriptionMatch[1])) : '',
        };
      }
      
      // Final fallback: return error message
      logger.error('Could not parse AI response in any format');
      return {
        description: '<p>Failed to generate description. Please try again.</p>',
        seoTitle: 'Product',
        seoDescription: 'Product description',
      };
    }
  }
  
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
- Appropriate hook for product type
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
          max_tokens: 2000,
          temperature: 0.3,
        });
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: evaluationPrompt }],
          temperature: 0.3,
          max_tokens: 2000,
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
      logger.warn('Failed to evaluate description quality:', error);
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
  
  private async improveDescription(
    result: AIGenerationResult,
    metrics: QualityMetrics,
    primaryKeyword: string,
    systemPrompt: string
  ): Promise<AIGenerationResult | null> {
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
          model: this.model,
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
      
      return this.parseAIResponse(improvedResponse);
    } catch (error) {
      logger.warn('Failed to auto-improve description:', error);
      return null;
    }
  }
  
  private async alignBrandVoice(
    description: string,
    shopSettings: any
  ): Promise<string> {
    if (!shopSettings.brandPersonality && !shopSettings.coreValues) {
      return description;
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
          max_tokens: 4000,
          temperature: 0.5,
        });
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: alignmentPrompt }],
          temperature: 0.5,
          max_tokens: 4000,
        });
        response = completion.choices[0].message?.content || '';
      } else {
        throw new Error('AI provider not properly initialized');
      }

      return response;
    } catch (error) {
      logger.warn('Failed to align brand voice:', error);
      return description;
    }
  }
}