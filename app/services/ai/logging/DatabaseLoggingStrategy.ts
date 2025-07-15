import type { LoggingStrategy, PromptLogData, ExtractionLogData } from '../types';
import { prisma } from '../../../db.server';
import { logger } from '../../logger.server';

export class DatabaseLoggingStrategy implements LoggingStrategy {
  async log(data: PromptLogData): Promise<void> {
    try {
      // Extract shop from metadata or use default
      const shop = data.metadata?.shop || 'default';
      const productTitle = data.metadata?.productTitle || 'AI Generation';
      
      await prisma.lLMPromptLog.create({
        data: {
          shop,
          productTitle,
          systemPrompt: data.metadata?.systemPrompt || '',
          userPrompt: data.prompt,
          scrapedDataSection: data.response,
          promptLength: {
            system: (data.metadata?.systemPrompt || '').length,
            user: data.prompt.length,
            total: (data.metadata?.systemPrompt || '').length + data.prompt.length
          }
        }
      });
      
      logger.info('Saved LLM prompt to database', { 
        shop, 
        productTitle,
        model: data.model
      });
    } catch (error) {
      logger.error('Failed to save LLM prompt to database', { 
        error: error instanceof Error ? error.message : String(error),
        model: data.model
      });
      throw error;
    }
  }
  
  async logExtraction(data: ExtractionLogData): Promise<void> {
    try {
      const shop = data.extractedData?.shop || 'default';
      const productTitle = data.extractedData?.title || 'Extracted Product';
      
      await prisma.extractedDataLog.create({
        data: {
          shop,
          productTitle,
          extractedData: data.extractedData,
          metadata: {
            url: data.url,
            method: data.method,
            timestamp: data.timestamp
          }
        }
      });
      
      logger.info('Saved extracted data to database', { 
        shop, 
        productTitle,
        url: data.url 
      });
    } catch (error) {
      logger.error('Failed to save extracted data to database', { 
        error: error instanceof Error ? error.message : String(error),
        url: data.url
      });
      throw error;
    }
  }
}