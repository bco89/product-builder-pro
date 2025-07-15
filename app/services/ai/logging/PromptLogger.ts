import type { PromptLogData, ExtractionLogData, LoggingStrategy } from '../types';
import { DatabaseLoggingStrategy } from './DatabaseLoggingStrategy';
import { FileLoggingStrategy } from './FileLoggingStrategy';

export class PromptLogger {
  private strategy: LoggingStrategy;
  
  constructor() {
    // Single place to decide logging strategy
    this.strategy = process.env.NODE_ENV === 'production' 
      ? new DatabaseLoggingStrategy() 
      : new FileLoggingStrategy();
  }
  
  async logPrompt(data: PromptLogData): Promise<void> {
    try {
      await this.strategy.log(data);
    } catch (error) {
      console.error('Failed to log prompt:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }
  
  async logExtraction(data: ExtractionLogData): Promise<void> {
    try {
      await this.strategy.logExtraction(data);
    } catch (error) {
      console.error('Failed to log extraction:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }
  
  // Convenience method for logging AI responses
  async logAIResponse(
    model: string, 
    prompt: string, 
    response: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logPrompt({
      model,
      prompt,
      response,
      metadata
    });
  }
  
  // Convenience method for logging errors
  async logError(
    model: string,
    prompt: string,
    error: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logPrompt({
      model,
      prompt,
      response: '',
      error,
      metadata
    });
  }
}