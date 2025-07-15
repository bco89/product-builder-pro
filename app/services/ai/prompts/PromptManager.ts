import type { PromptTemplate } from '../types';

export class PromptManager {
  private templates: Map<string, PromptTemplate>;
  
  constructor() {
    this.templates = new Map();
    this.loadTemplates();
  }
  
  private loadTemplates(): void {
    // System prompts
    this.registerTemplate('system', {
      name: 'system',
      template: 'You are a professional product description writer.',
      variables: []
    });
    
    // User prompts for different description types
    this.registerTemplate('detailed-description', {
      name: 'detailed-description',
      template: 'Create a detailed product description for: {{productData}}',
      variables: ['productData', 'customerJourney']
    });
    
    this.registerTemplate('professional-description', {
      name: 'professional-description',
      template: 'Create a professional product description for: {{productData}}',
      variables: ['productData', 'customerJourney']
    });
    
    this.registerTemplate('fun-description', {
      name: 'fun-description',
      template: 'Create a fun and engaging product description for: {{productData}}',
      variables: ['productData', 'customerJourney']
    });
    
    // Product analysis prompt
    this.registerTemplate('product-analysis', {
      name: 'product-analysis',
      template: 'Analyze this product information: {{scrapedContent}}',
      variables: ['scrapedContent']
    });
  }
  
  registerTemplate(name: string, template: PromptTemplate): void {
    this.templates.set(name, template);
  }
  
  getTemplate(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }
  
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * Build a prompt by replacing template variables
   */
  buildPrompt(templateName: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }
    
    let prompt = template.template;
    
    // Replace variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      if (prompt.includes(placeholder)) {
        prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }
    
    return prompt;
  }
  
  /**
   * Get all available template names
   */
  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }
}