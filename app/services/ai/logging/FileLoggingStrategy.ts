import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { LoggingStrategy, PromptLogData, ExtractionLogData } from '../types';
import { logger } from '../../logger.server';
import { 
  sanitizeFilename, 
  getUniqueFilename, 
  formatExtractedDataAsMarkdown,
  formatPromptAsMarkdown 
} from '../utils/logging-utils';

export class FileLoggingStrategy implements LoggingStrategy {
  async log(data: PromptLogData): Promise<void> {
    try {
      const productTitle = data.metadata?.productTitle || 'AI Generation';
      const systemPrompt = data.metadata?.systemPrompt || '';
      const baseDir = path.join(process.cwd(), 'Prompts Used', 'prompts-for-product-description');
      
      logger.info('Attempting to save LLM prompt', { 
        productTitle, 
        baseDir,
        model: data.model
      });
      
      const sanitizedName = sanitizeFilename(productTitle);
      
      // Ensure directory exists
      await fs.mkdir(baseDir, { recursive: true });
      
      // Save JSON file
      const jsonFilename = await getUniqueFilename(baseDir, sanitizedName, 'json');
      const jsonPath = path.join(baseDir, jsonFilename);
      
      const jsonContent = {
        timestamp: new Date().toISOString(),
        productTitle,
        model: data.model,
        systemPrompt,
        userPrompt: data.prompt,
        response: data.response,
        error: data.error,
        metadata: data.metadata,
        promptLength: {
          system: systemPrompt.length,
          user: data.prompt.length,
          total: systemPrompt.length + data.prompt.length
        }
      };
      
      await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2));
      logger.info(`Saved LLM prompt JSON to: ${jsonFilename}`);
      
      // Save Markdown file
      const mdFilename = await getUniqueFilename(baseDir, sanitizedName, 'md');
      const mdPath = path.join(baseDir, mdFilename);
      const mdContent = formatPromptAsMarkdown(productTitle, systemPrompt, data.prompt, data.response);
      
      await fs.writeFile(mdPath, mdContent);
      logger.info(`Saved LLM prompt Markdown to: ${mdFilename}`);
      
    } catch (error) {
      logger.error('Failed to save LLM prompt', { 
        error: error instanceof Error ? error.message : String(error),
        model: data.model
      });
      throw error;
    }
  }
  
  async logExtraction(data: ExtractionLogData): Promise<void> {
    try {
      const productTitle = data.extractedData?.title || 'Extracted Product';
      const baseDir = path.join(process.cwd(), 'Prompts Used', 'extracted-data-from-firecrawl');
      
      logger.info('Attempting to save extracted data', { 
        productTitle, 
        baseDir,
        url: data.url
      });
      
      const sanitizedName = sanitizeFilename(productTitle);
      
      // Ensure directory exists
      await fs.mkdir(baseDir, { recursive: true });
      
      // Save JSON file
      const jsonFilename = await getUniqueFilename(baseDir, sanitizedName, 'json');
      const jsonPath = path.join(baseDir, jsonFilename);
      
      const jsonContent = {
        timestamp: data.timestamp.toISOString(),
        productTitle,
        extractedData: data.extractedData,
        metadata: {
          url: data.url,
          method: data.method,
          error: data.error
        }
      };
      
      await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2));
      logger.info(`Saved extracted data JSON to: ${jsonFilename}`);
      
      // Save Markdown file
      const mdFilename = await getUniqueFilename(baseDir, sanitizedName, 'md');
      const mdPath = path.join(baseDir, mdFilename);
      const mdContent = formatExtractedDataAsMarkdown(productTitle, data.extractedData, jsonContent.metadata);
      
      await fs.writeFile(mdPath, mdContent);
      logger.info(`Saved extracted data Markdown to: ${mdFilename}`);
      
    } catch (error) {
      logger.error('Failed to save extracted data', { 
        error: error instanceof Error ? error.message : String(error),
        url: data.url
      });
      throw error;
    }
  }
}