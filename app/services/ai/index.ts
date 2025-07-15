// Main export for the unified AI service

export { AIService } from './AIService';
export { PromptLogger } from './logging/PromptLogger';
export { PromptManager } from './prompts/PromptManager';
export { ProductExtractor } from './extractors/ProductExtractor';
export { ImageAnalyzer } from './extractors/ImageAnalyzer';

// Export types
export type {
  PromptTemplate,
  PromptLogData,
  ExtractionLogData,
  AIServiceConfig,
  ExtractedProductData,
  ImageAnalysisResult,
  LoggingStrategy
} from './types';

// Export types from AIService for backward compatibility
export type {
  AIGenerationParams,
  AIGenerationResult,
  QualityMetrics,
  ProductCategorizationParams,
  ProductCategorizationResult
} from './AIService';

// Export extraction function for backward compatibility
export const extractForDescriptionGeneration = async (
  url: string, 
  firecrawlClient: any,
  productTitle?: string,
  shop?: string
): Promise<{
  success: boolean;
  data?: any;
  rawContent?: any;
  metadata?: any;
  error?: string;
  note?: string;
}> => {
  const service = getAIService();
  return service.extractForDescriptionGeneration(url, firecrawlClient, productTitle, shop);
};

// Create singleton instance for convenience
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

// Backward compatibility exports
export const getRecentExtractedData = async (shop: string, limit?: number) => {
  const service = getAIService();
  return service.getRecentExtractedData(shop, limit);
};

export const getRecentLLMPrompts = async (shop: string, limit?: number) => {
  const service = getAIService();
  return service.getRecentLLMPrompts(shop, limit);
};