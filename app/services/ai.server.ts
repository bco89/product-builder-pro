import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { prisma } from '../db.server';
import { logger } from './logger.server';
import { getProductTypePrompt } from './prompts/product-type-prompts';
import { formatProductDescription } from './prompts/formatting';

interface AIGenerationParams {
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
}

interface AIGenerationResult {
  description: string;
  seoTitle: string;
  seoDescription: string;
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

  async generateProductDescription(params: AIGenerationParams): Promise<AIGenerationResult> {
    const systemPrompt = getProductTypePrompt(params.productType);
    const userPrompt = this.buildUserPrompt(params);

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
      await prisma.aIGenerationLog.create({
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
    const settings = params.shopSettings || {};
    
    return `
Context about the store:
- Store Name: ${settings.storeName || params.shop}
- Location: ${settings.storeLocation || 'Not specified'}
- Unique Selling Points: ${settings.uniqueSellingPoints || 'Not specified'}
- Core Values: ${settings.coreValues || 'Not specified'}
- Brand Personality: ${settings.brandPersonality || 'Not specified'}

Target Customer Profile:
- Who They Are: ${settings.targetCustomer || 'Not specified'}
- Pain Points: ${settings.customerPainPoints || 'Not specified'}
- Desires: ${settings.customerDesires || 'Not specified'}
- Lifestyle: ${settings.lifestyleHabits || 'Not specified'}
- Aspirations: ${settings.aspirations || 'Not specified'}
- Buying Motivations: ${settings.buyingMotivations || 'Not specified'}

Product Information:
- Title: ${params.productTitle}
- Type: ${params.productType}
- Category: ${params.category}
- Vendor: ${params.vendor}
- Primary Keywords: ${params.keywords.join(', ')}
${params.additionalContext ? `- Additional Context: ${params.additionalContext}` : ''}
${params.scrapedData ? `- Scraped Product Info: ${JSON.stringify(params.scrapedData)}` : ''}
${params.imageAnalysis ? `- Visual Analysis: ${params.imageAnalysis}` : ''}

Create a compelling product description following the structure provided in the system prompt.
Ensure the primary keyword "${params.keywords[0]}" appears naturally in the headline and at least 2-3 times throughout the description.
${params.keywords[1] ? `Include the secondary keyword "${params.keywords[1]}" naturally 1-2 times.` : ''}

Format the response as JSON:
{
  "description": "HTML formatted description (300-500 words)",
  "seoTitle": "SEO title (max 60 chars, include primary keyword)",
  "seoDescription": "Meta description (max 155 chars, compelling CTA)"
}

Make the content optimized for both search engines and generative AI platforms (GEO - Generative Engine Optimization).
`;
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
    return JSON.stringify({
      description: `<h2>Premium ${keyword} - Exceptional Quality & Style</h2>
<p>Discover the perfect ${params.productTitle} that combines superior craftsmanship with modern design. This exceptional ${keyword} is meticulously designed to exceed your expectations.</p>
<h3>Why You'll Love It</h3>
<p>Experience the difference quality makes. Our ${keyword} transforms your daily routine into something special, delivering both functionality and style that lasts.</p>
<h3>Highlights</h3>
<ul>
<li>Premium quality materials ensure long-lasting durability</li>
<li>Thoughtfully designed for maximum comfort and usability</li>
<li>Versatile style complements any setting</li>
<li>Eco-friendly production methods</li>
<li>Backed by our satisfaction guarantee</li>
</ul>
<h3>Details & Specifications</h3>
<p>Crafted with attention to every detail, this ${params.productType} features high-quality construction and materials. Perfect for ${params.category} enthusiasts who appreciate excellence.</p>
<h3>Perfect For</h3>
<p>Whether you're treating yourself or searching for the ideal gift, this ${keyword} delivers on all fronts. Join thousands of satisfied customers who've made the switch to quality.</p>`,
      seoTitle: `${keyword} - Premium ${params.productType} | ${params.vendor}`,
      seoDescription: `Shop our ${keyword} - exceptional quality ${params.productType} with premium features. Free shipping available. Shop now and experience the difference!`
    });
  }
}