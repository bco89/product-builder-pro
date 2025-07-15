import { logger } from '../../logger.server';
import type { ImageAnalysisResult } from '../types';
import { PromptLogger } from '../logging/PromptLogger';
import { OpenAI } from 'openai';

export class ImageAnalyzer {
  private promptLogger: PromptLogger;
  private openai: OpenAI;
  
  constructor(promptLogger: PromptLogger, openai: OpenAI) {
    this.promptLogger = promptLogger;
    this.openai = openai;
  }
  
  /**
   * Analyze multiple product images and combine results
   */
  async analyzeProductImages(
    images: string[], 
    metadata?: Record<string, any>
  ): Promise<string> {
    logger.info(`Analyzing ${images.length} product images`);
    
    try {
      const analyses = await Promise.all(
        images.map((imageUrl, index) => this.analyzeSingleImage(imageUrl, index, metadata))
      );
      
      return this.combineAnalyses(analyses);
    } catch (error) {
      logger.error('Failed to analyze images', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return fallback analysis
      return 'Product images show high-quality details and professional presentation.';
    }
  }
  
  /**
   * Analyze a single image using OpenAI Vision
   */
  async analyzeSingleImage(
    imageUrl: string, 
    index: number,
    metadata?: Record<string, any>
  ): Promise<ImageAnalysisResult> {
    try {
      const prompt = this.getImageAnalysisPrompt(index);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 500
      });
      
      const response = completion.choices[0]?.message?.content || '{}';
      const analysis = JSON.parse(response) as ImageAnalysisResult;
      
      // Log the analysis
      await this.promptLogger.logPrompt({
        model: 'gpt-4-vision-preview',
        prompt: `Image ${index + 1} analysis: ${imageUrl}`,
        response,
        metadata: {
          ...metadata,
          imageUrl,
          imageIndex: index,
          analysisType: 'product-image'
        }
      });
      
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze single image', {
        error: error instanceof Error ? error.message : String(error),
        imageUrl,
        index
      });
      
      // Return mock analysis as fallback
      return this.getMockAnalysis(index);
    }
  }
  
  /**
   * Get the appropriate prompt based on image position
   */
  private getImageAnalysisPrompt(index: number): string {
    const prompts = [
      // Main product image
      `Analyze this product image and provide a JSON response with these fields:
      - description: A detailed description of what you see in the image
      - tags: An array of relevant product tags (e.g., materials, style, features)
      - confidence: Your confidence level (0-1) in the analysis
      
      Focus on: product features, quality indicators, design elements, and any visible text or branding.`,
      
      // Detail shot
      `Analyze this detail/close-up product image and provide a JSON response with these fields:
      - description: Focus on materials, textures, construction quality, and fine details
      - tags: An array of tags related to quality, materials, and craftsmanship
      - confidence: Your confidence level (0-1) in the analysis
      
      Emphasize: material quality, construction details, unique features, and finishing touches.`,
      
      // Lifestyle/context shot
      `Analyze this lifestyle/context product image and provide a JSON response with these fields:
      - description: Describe the product in use, the setting, and the overall impression
      - tags: An array of tags related to use cases, target audience, and lifestyle
      - confidence: Your confidence level (0-1) in the analysis
      
      Focus on: how the product is being used, who might use it, and the lifestyle it represents.`
    ];
    
    return prompts[index % prompts.length];
  }
  
  /**
   * Combine multiple image analyses into a comprehensive summary
   */
  private combineAnalyses(analyses: ImageAnalysisResult[]): string {
    const validAnalyses = analyses.filter(a => a.confidence > 0.5);
    
    if (validAnalyses.length === 0) {
      return 'Product images show professional quality and attention to detail.';
    }
    
    const allTags = [...new Set(validAnalyses.flatMap(a => a.tags))];
    const descriptions = validAnalyses.map(a => a.description).join(' ');
    const avgConfidence = validAnalyses.reduce((sum, a) => sum + a.confidence, 0) / validAnalyses.length;
    
    return `Visual Analysis Summary:
• Key Visual Elements: ${allTags.slice(0, 10).join(', ')}
• Image Quality: Professional product photography with ${avgConfidence > 0.8 ? 'excellent' : 'good'} clarity
• Visual Story: ${descriptions}
• Overall Impression: The images effectively showcase the product's quality, features, and intended use.`.trim();
  }
  
  /**
   * Get mock analysis when API fails
   */
  private getMockAnalysis(index: number): ImageAnalysisResult {
    const mockAnalyses: ImageAnalysisResult[] = [
      {
        description: 'Main product view showing overall design and key features',
        tags: ['professional', 'high-quality', 'detailed', 'product-focused'],
        confidence: 0.7
      },
      {
        description: 'Close-up view highlighting materials and construction quality',
        tags: ['detail-oriented', 'quality-materials', 'craftsmanship', 'texture'],
        confidence: 0.7
      },
      {
        description: 'Product shown in real-world context demonstrating practical use',
        tags: ['lifestyle', 'in-use', 'practical', 'relatable'],
        confidence: 0.7
      }
    ];
    
    return mockAnalyses[index % mockAnalyses.length];
  }
  
  /**
   * Extract visible text from images (OCR functionality)
   */
  async extractTextFromImages(
    images: string[],
    metadata?: Record<string, any>
  ): Promise<string[]> {
    const results: string[] = [];
    
    for (const imageUrl of images) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { 
                  type: 'text', 
                  text: 'Extract and return any visible text from this image. If no text is visible, return "No text found".' 
                },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          max_tokens: 200
        });
        
        const extractedText = completion.choices[0]?.message?.content || 'No text found';
        results.push(extractedText);
        
        // Log the extraction
        await this.promptLogger.logPrompt({
          model: 'gpt-4-vision-preview',
          prompt: 'Text extraction from image',
          response: extractedText,
          metadata: {
            ...metadata,
            imageUrl,
            extractionType: 'ocr'
          }
        });
      } catch (error) {
        logger.error('Failed to extract text from image', {
          error: error instanceof Error ? error.message : String(error),
          imageUrl
        });
        results.push('Text extraction failed');
      }
    }
    
    return results;
  }
}