import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '../logger.server';
import { PromptLogger } from './logging/PromptLogger';
import { PromptManager } from './prompts/PromptManager';
import { ProductExtractor } from './extractors/ProductExtractor';
import { ImageAnalyzer } from './extractors/ImageAnalyzer';
import { prisma } from '../../db.server';
import type { AIServiceConfig, ExtractedProductData, ImageAnalysisResult } from './types';
import type FirecrawlApp from '@mendable/firecrawl-js';

// Re-export types for backward compatibility
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

export class AIService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private provider: 'openai' | 'anthropic';
  private promptLogger: PromptLogger;
  private promptManager: PromptManager;
  private productExtractor: ProductExtractor;
  private imageAnalyzer: ImageAnalyzer;
  private config: AIServiceConfig;
  
  constructor(config?: Partial<AIServiceConfig>) {
    // Initialize AI provider
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.provider = 'anthropic';
      this.config = {
        model: 'claude-3-5-sonnet-20241022',
        apiKey: process.env.ANTHROPIC_API_KEY,
        maxTokens: config?.maxTokens || 2500,
        temperature: config?.temperature || 0.7
      };
    } else if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.provider = 'openai';
      this.config = {
        model: config?.model || 'gpt-4',
        apiKey: process.env.OPENAI_API_KEY,
        maxTokens: config?.maxTokens || 2500,
        temperature: config?.temperature || 0.7
      };
    } else {
      throw new Error('No AI API key configured. Please set either ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable.');
    }
    
    this.promptLogger = new PromptLogger();
    this.promptManager = new PromptManager();
    this.productExtractor = new ProductExtractor(this.promptLogger);
    // Only initialize ImageAnalyzer if we have OpenAI
    if (this.openai) {
      this.imageAnalyzer = new ImageAnalyzer(this.promptLogger, this.openai);
    } else {
      // Create a dummy analyzer that throws if used
      this.imageAnalyzer = {
        analyzeProductImages: async () => {
          throw new Error('Image analysis requires OpenAI API key');
        }
      } as any;
    }
  }
  
  /**
   * Categorizes a product into one of the predefined product types
   */
  async categorizeProduct(params: ProductCategorizationParams): Promise<ProductCategorizationResult> {
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
          model: this.config.model,
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt,
          max_tokens: 150,
          temperature: 0.3,
        });
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: this.config.model,
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
      return {
        productType: 'General',
        confidence: 0.5,
        reasoning: 'Unable to determine category with high confidence'
      };
    }
  }
  
  /**
   * Main method for generating product descriptions (compatible with old API)
   */
  async generateProductDescription(params: AIGenerationParams): Promise<AIGenerationResult>;
  async generateProductDescription(
    productData: any,
    descriptionType: 'detailed' | 'professional' | 'fun',
    metadata?: Record<string, any>
  ): Promise<string>;
  async generateProductDescription(
    paramsOrData: AIGenerationParams | any,
    descriptionType?: 'detailed' | 'professional' | 'fun',
    metadata?: Record<string, any>
  ): Promise<string | AIGenerationResult> {
    // Check if this is the old API call pattern
    if ('shop' in paramsOrData && 'productTitle' in paramsOrData) {
      // Import legacy generator lazily to avoid circular dependencies
      const { LegacyDescriptionGenerator } = require('./legacy/LegacyDescriptionGenerator');
      const generator = new LegacyDescriptionGenerator(
        this.provider,
        this.anthropic,
        this.openai,
        this.promptLogger,
        this.config.model
      );
      return generator.generate(paramsOrData as AIGenerationParams);
    }
    
    // New simplified API
    const productData = paramsOrData;
    const descType = descriptionType || 'detailed';
    
    try {
      // Get system prompt
      const systemPrompt = this.promptManager.getTemplate('system')?.template || '';
      
      // Build user prompt based on type
      const templateName = `${descType}-description`;
      const userPrompt = this.promptManager.buildPrompt(templateName, {
        productData: JSON.stringify(productData, null, 2),
        customerJourney: metadata?.customerJourney || ''
      });
      
      logger.info('Generating product description', {
        descriptionType: descType,
        productTitle: productData.title,
        model: this.config.model
      });
      
      let response: string;
      
      if (this.provider === 'anthropic' && this.anthropic) {
        const completion = await this.anthropic.messages.create({
          model: this.config.model,
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt,
          max_tokens: this.config.maxTokens || 2500,
          temperature: this.config.temperature || 0.7
        });
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
      } else if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        });
        response = completion.choices[0]?.message?.content || '';
      } else {
        throw new Error('AI provider not properly initialized');
      }
      
      // Log the interaction
      await this.promptLogger.logPrompt({
        model: this.config.model,
        prompt: userPrompt,
        response,
        metadata: {
          ...metadata,
          systemPrompt,
          productTitle: productData.title,
          descriptionType: descType
        }
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to generate product description', {
        error: error instanceof Error ? error.message : String(error),
        descriptionType: descType,
        productTitle: productData.title
      });
      
      // Log the error
      await this.promptLogger.logError(
        this.config.model,
        'product-description-generation',
        error instanceof Error ? error.message : String(error),
        metadata
      );
      
      throw error;
    }
  }
  
  /**
   * Analyze product from scraped content
   */
  async analyzeProduct(
    scrapedContent: string,
    url: string,
    metadata?: Record<string, any>
  ): Promise<ExtractedProductData> {
    try {
      const prompt = this.promptManager.buildPrompt('product-analysis', {
        scrapedContent
      });
      
      logger.info('Analyzing product from scraped content', {
        url,
        contentLength: scrapedContent.length,
        model: this.config.model
      });
      
      if (!this.openai) {
        throw new Error('Product analysis requires OpenAI API key');
      }
      
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: this.config.maxTokens,
        temperature: 0.3, // Lower temperature for more consistent extraction
        response_format: { type: "json_object" }
      });
      
      const response = completion.choices[0]?.message?.content || '{}';
      const extractedData = JSON.parse(response) as ExtractedProductData;
      
      // Log the extraction
      await this.promptLogger.logExtraction({
        url,
        extractedData,
        method: 'openai-extraction',
        timestamp: new Date()
      });
      
      return {
        ...extractedData,
        originalUrl: url,
        extractionMethod: 'ai-analysis'
      };
    } catch (error) {
      logger.error('Failed to analyze product', {
        error: error instanceof Error ? error.message : String(error),
        url
      });
      
      // Log the error
      await this.promptLogger.logExtraction({
        url,
        extractedData: {},
        method: 'openai-extraction',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
  
  /**
   * Analyze image using OpenAI vision
   */
  async analyzeImage(
    imageUrl: string,
    metadata?: Record<string, any>
  ): Promise<ImageAnalysisResult> {
    try {
      logger.info('Analyzing image', {
        imageUrl,
        model: 'gpt-4-vision-preview'
      });
      
      if (!this.openai) {
        throw new Error('Image analysis requires OpenAI API key');
      }
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: 'Analyze this product image and provide a brief description, relevant tags, and identify the main product category. Return as JSON with fields: description, tags (array), and confidence (0-1).' 
              },
              { 
                type: 'image_url', 
                image_url: { url: imageUrl } 
              }
            ]
          }
        ],
        max_tokens: 1000
      });
      
      const response = completion.choices[0]?.message?.content || '{}';
      const analysis = JSON.parse(response) as ImageAnalysisResult;
      
      // Log the interaction
      await this.promptLogger.logPrompt({
        model: 'gpt-4-vision-preview',
        prompt: `Image analysis for: ${imageUrl}`,
        response,
        metadata: {
          ...metadata,
          imageUrl,
          analysisType: 'image'
        }
      });
      
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze image', {
        error: error instanceof Error ? error.message : String(error),
        imageUrl
      });
      
      return {
        description: 'Failed to analyze image',
        tags: [],
        confidence: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Extract product information for description generation (backward compatible)
   */
  async extractForDescriptionGeneration(
    url: string,
    firecrawlClient: FirecrawlApp,
    productTitle?: string,
    shop?: string
  ): Promise<{
    success: boolean;
    data?: any;
    rawContent?: any;
    metadata?: any;
    error?: string;
    note?: string;
  }> {
    try {
      const result = await this.productExtractor.extract(url, firecrawlClient, {
        productTitle,
        shop
      });
      
      // Save the extraction data based on environment
      if (process.env.NODE_ENV === 'production' && shop) {
        await this.saveExtractedDataToDB(shop, productTitle || result.title || 'Unknown Product', result);
      }
      
      // Transform to old format for backward compatibility
      return {
        success: true,
        data: result,
        rawContent: {
          markdown: result.description,
          html: ''
        },
        metadata: {}
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }
  
  /**
   * Analyze product images (compatible with old ImageAnalysisService)
   */
  async analyzeProductImages(images: File[] | string[]): Promise<string> {
    // Convert File[] to string[] URLs if needed
    const imageUrls = images.map(img => {
      if (typeof img === 'string') return img;
      // For File objects, we'd need to upload them first
      // This is a simplified implementation
      return ''; 
    }).filter(url => url);
    
    return this.imageAnalyzer.analyzeProductImages(imageUrls);
  }
  
  /**
   * Save extracted data to database
   */
  private async saveExtractedDataToDB(
    shop: string,
    productTitle: string,
    data: any
  ): Promise<void> {
    try {
      await prisma.extractedDataLog.create({
        data: {
          shop,
          productTitle,
          extractedData: data,
          metadata: data.metadata || undefined,
        }
      });
      
      logger.info('Saved extracted data to database', { shop, productTitle });
    } catch (error) {
      logger.error('Failed to save extracted data to database', { 
        error: error instanceof Error ? error.message : String(error),
        shop,
        productTitle
      });
    }
  }
  
  /**
   * Get recent extracted data logs
   */
  async getRecentExtractedData(shop: string, limit: number = 10) {
    return prisma.extractedDataLog.findMany({
      where: { shop },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
  
  /**
   * Get recent LLM prompt logs
   */
  async getRecentLLMPrompts(shop: string, limit: number = 10) {
    return prisma.lLMPromptLog.findMany({
      where: { shop },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
  
  /**
   * Get the prompt manager for external use
   */
  getPromptManager(): PromptManager {
    return this.promptManager;
  }
  
  /**
   * Get the logger for external use
   */
  getLogger(): PromptLogger {
    return this.promptLogger;
  }
  
  /**
   * Get the image analyzer for external use
   */
  getImageAnalyzer(): ImageAnalyzer {
    return this.imageAnalyzer;
  }
  
  /**
   * Get the product extractor for external use
   */
  getProductExtractor(): ProductExtractor {
    return this.productExtractor;
  }
}