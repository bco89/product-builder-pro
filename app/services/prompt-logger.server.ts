/**
 * Utility for logging prompts and extracted data to files
 */

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { logger } from './logger.server';

/**
 * Sanitize a product name to be used as a filename
 */
function sanitizeFilename(productName: string): string {
  return productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Get a unique filename by adding incremental numbers if needed
 */
async function getUniqueFilename(directory: string, baseName: string, extension: string): Promise<string> {
  let filename = `${baseName}.${extension}`;
  let counter = 1;
  
  while (existsSync(path.join(directory, filename))) {
    filename = `${baseName}-${counter}.${extension}`;
    counter++;
  }
  
  return filename;
}

/**
 * Save extracted Firecrawl data
 */
export async function saveExtractedData(
  productTitle: string,
  data: any,
  metadata?: any
): Promise<void> {
  try {
    const baseDir = path.join(process.cwd(), 'Prompts Used', 'extracted-data-from-firecrawl');
    logger.info('Attempting to save extracted data', { 
      productTitle, 
      baseDir,
      cwd: process.cwd() 
    });
    
    const sanitizedName = sanitizeFilename(productTitle);
    logger.info('Sanitized filename', { original: productTitle, sanitized: sanitizedName });
    
    // Save JSON file
    const jsonFilename = await getUniqueFilename(baseDir, sanitizedName, 'json');
    const jsonPath = path.join(baseDir, jsonFilename);
    
    const jsonContent = {
      timestamp: new Date().toISOString(),
      productTitle,
      extractedData: data,
      metadata,
    };
    
    await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2));
    logger.info(`Saved extracted data JSON to: ${jsonFilename}`);
    
    // Save Markdown file
    const mdFilename = await getUniqueFilename(baseDir, sanitizedName, 'md');
    const mdPath = path.join(baseDir, mdFilename);
    
    const mdContent = `# Extracted Data: ${productTitle}

**Date:** ${new Date().toISOString()}

## Product Information

**Title:** ${data.productTitle || 'Not extracted'}
**Brand/Vendor:** ${data.brandVendor || 'Not extracted'}
**Category:** ${data.productCategory || 'Not extracted'}

## Key Features
${data.keyFeatures?.length > 0 ? data.keyFeatures.map((f: string) => `- ${f}`).join('\n') : 'No features extracted'}

## Benefits
${data.benefits?.length > 0 ? data.benefits.map((b: string) => `- ${b}`).join('\n') : 'No benefits extracted'}

## Detailed Description
${data.detailedDescription || 'No detailed description extracted'}

## Materials
${data.materials?.length > 0 ? data.materials.map((m: string) => `- ${m}`).join('\n') : 'No materials extracted'}

## Variants/Options
${data.variants?.length > 0 ? data.variants.map((v: any) => `- **${v.optionName}:** ${v.availableValues.join(', ')}`).join('\n') : 'No variants extracted'}

## Target Audience
${data.targetAudience || 'Not specified'}

## Use Cases
${data.useCases?.length > 0 ? data.useCases.map((u: string) => `- ${u}`).join('\n') : 'No use cases extracted'}

## Technologies
${data.technologies?.length > 0 ? data.technologies.map((t: any) => `- **${t.name}**${t.description ? `: ${t.description}` : ''}`).join('\n') : 'No technologies extracted'}

## Care Instructions
${data.careInstructions?.length > 0 ? data.careInstructions.map((c: string) => `- ${c}`).join('\n') : 'No care instructions extracted'}

## Size Chart
**Available:** ${data.sizeChart?.available ? 'Yes' : 'No'}
${data.sizeChart?.fitNotes ? `**Fit Notes:** ${data.sizeChart.fitNotes}` : ''}

## Raw Metadata
\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`
`;
    
    await fs.writeFile(mdPath, mdContent);
    logger.info(`Saved extracted data Markdown to: ${mdFilename}`);
    
  } catch (error) {
    logger.error('Failed to save extracted data', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      productTitle,
      cwd: process.cwd()
    });
  }
}

/**
 * Save LLM prompt data
 */
export async function saveLLMPrompt(
  productTitle: string,
  systemPrompt: string,
  userPrompt: string,
  scrapedDataSection?: string
): Promise<void> {
  try {
    const baseDir = path.join(process.cwd(), 'Prompts Used', 'prompts-for-product-description');
    logger.info('Attempting to save LLM prompt', { 
      productTitle, 
      baseDir,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      cwd: process.cwd() 
    });
    
    const sanitizedName = sanitizeFilename(productTitle);
    
    // Save JSON file
    const jsonFilename = await getUniqueFilename(baseDir, sanitizedName, 'json');
    const jsonPath = path.join(baseDir, jsonFilename);
    
    const jsonContent = {
      timestamp: new Date().toISOString(),
      productTitle,
      systemPrompt,
      userPrompt,
      scrapedDataSection,
      promptLength: {
        system: systemPrompt.length,
        user: userPrompt.length,
        total: systemPrompt.length + userPrompt.length
      }
    };
    
    await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2));
    logger.info(`Saved LLM prompt JSON to: ${jsonFilename}`);
    
    // Save Markdown file
    const mdFilename = await getUniqueFilename(baseDir, sanitizedName, 'md');
    const mdPath = path.join(baseDir, mdFilename);
    
    const mdContent = `# LLM Prompt: ${productTitle}

**Date:** ${new Date().toISOString()}
**Total Prompt Length:** ${systemPrompt.length + userPrompt.length} characters

## System Prompt
\`\`\`
${systemPrompt}
\`\`\`

## User Prompt
\`\`\`
${userPrompt}
\`\`\`

${scrapedDataSection ? `## Scraped Data Section (Extracted from User Prompt)
\`\`\`
${scrapedDataSection}
\`\`\`
` : ''}

## Prompt Statistics
- System Prompt Length: ${systemPrompt.length} characters
- User Prompt Length: ${userPrompt.length} characters
- Total Length: ${systemPrompt.length + userPrompt.length} characters
`;
    
    await fs.writeFile(mdPath, mdContent);
    logger.info(`Saved LLM prompt Markdown to: ${mdFilename}`);
    
  } catch (error) {
    logger.error('Failed to save LLM prompt', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      productTitle,
      cwd: process.cwd()
    });
  }
}