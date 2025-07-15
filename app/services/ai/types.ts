// Shared types for the unified AI service

export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
}

export interface PromptLogData {
  model: string;
  prompt: string;
  response: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface ExtractionLogData {
  url: string;
  extractedData: any;
  method: string;
  timestamp: Date;
  error?: string;
}

export interface AIServiceConfig {
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ExtractedProductData {
  title?: string;
  description?: string;
  features?: string[];
  imageUrls?: string[];
  specifications?: Record<string, string>;
  originalUrl?: string;
  confidence?: number;
  extractionMethod?: string;
}

export interface ImageAnalysisResult {
  description: string;
  tags: string[];
  confidence: number;
  error?: string;
}

export interface LoggingStrategy {
  log(data: PromptLogData): Promise<void>;
  logExtraction(data: ExtractionLogData): Promise<void>;
}