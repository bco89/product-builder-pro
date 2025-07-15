import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Sanitize a product name to be used as a filename
 */
export function sanitizeFilename(productName: string): string {
  return productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Get a unique filename by adding incremental numbers if needed
 */
export async function getUniqueFilename(directory: string, baseName: string, extension: string): Promise<string> {
  let filename = `${baseName}.${extension}`;
  let counter = 1;
  
  while (existsSync(path.join(directory, filename))) {
    filename = `${baseName}-${counter}.${extension}`;
    counter++;
  }
  
  return filename;
}

/**
 * Format extracted data as markdown
 */
export function formatExtractedDataAsMarkdown(productTitle: string, data: any, metadata?: any): string {
  return `# Extracted Data: ${productTitle}

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
}

/**
 * Format prompt data as markdown
 */
export function formatPromptAsMarkdown(
  productTitle: string, 
  systemPrompt: string, 
  userPrompt: string, 
  scrapedDataSection?: string
): string {
  return `# LLM Prompt: ${productTitle}

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
}