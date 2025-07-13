/**
 * Database-based prompt logger for production use
 */

import { prisma } from '../db.server';
import { logger } from './logger.server';

/**
 * Save extracted Firecrawl data to database
 */
export async function saveExtractedDataToDB(
  shop: string,
  productTitle: string,
  data: any,
  metadata?: any
): Promise<void> {
  try {
    await prisma.extractedDataLog.create({
      data: {
        shop,
        productTitle,
        extractedData: data,
        metadata: metadata || undefined,
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
 * Save LLM prompt data to database
 */
export async function saveLLMPromptToDB(
  shop: string,
  productTitle: string,
  systemPrompt: string,
  userPrompt: string,
  scrapedDataSection?: string
): Promise<void> {
  try {
    await prisma.lLMPromptLog.create({
      data: {
        shop,
        productTitle,
        systemPrompt,
        userPrompt,
        scrapedDataSection,
        promptLength: {
          system: systemPrompt.length,
          user: userPrompt.length,
          total: systemPrompt.length + userPrompt.length
        }
      }
    });
    
    logger.info('Saved LLM prompt to database', { 
      shop, 
      productTitle,
      totalLength: systemPrompt.length + userPrompt.length
    });
  } catch (error) {
    logger.error('Failed to save LLM prompt to database', { 
      error: error instanceof Error ? error.message : String(error),
      shop,
      productTitle
    });
  }
}

/**
 * Get recent extracted data logs
 */
export async function getRecentExtractedData(shop: string, limit: number = 10) {
  return prisma.extractedDataLog.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Get recent LLM prompt logs
 */
export async function getRecentLLMPrompts(shop: string, limit: number = 10) {
  return prisma.lLMPromptLog.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}