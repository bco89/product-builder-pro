import { BASE_SYSTEM_PROMPT } from './base-prompt';

export function getProductTypePrompt(productType: string): string {
  const prompts: Record<string, string> = {
    'Apparel': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for apparel:
      - Emphasize comfort, fit, and style
      - Include fabric composition and care instructions
      - Mention versatility and styling options
      - Address common sizing concerns
      - Highlight quality construction details
      - Use fashion-forward language that resonates with style-conscious shoppers
    `,
    
    'Electronics': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for electronics:
      - Balance technical specs with user benefits
      - Explain complex features in simple terms
      - Emphasize compatibility and ease of use
      - Include warranty/support information
      - Address common technical concerns
      - Focus on how the technology improves daily life
    `,
    
    'Beauty': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for beauty products:
      - Focus on results and transformation
      - Include key ingredients and their benefits
      - Address specific skin/hair concerns
      - Mention application tips
      - Emphasize safety and quality standards
      - Use language that builds trust and confidence
    `,
    
    'Home & Garden': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for home & garden:
      - Paint a picture of the improved living space
      - Include dimensions and assembly info
      - Emphasize durability and materials
      - Suggest complementary items
      - Address maintenance and care
      - Help customers visualize the product in their space
    `,
    
    'Food & Beverage': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for food & beverage:
      - Emphasize taste, quality, and freshness
      - Include nutritional benefits
      - Mention sourcing and production methods
      - Suggest serving ideas and pairings
      - Address dietary restrictions/preferences
      - Use sensory language that makes mouths water
    `,
    
    'Sports & Outdoors': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for sports & outdoors:
      - Focus on performance and durability
      - Mention weather resistance and materials
      - Include activity-specific benefits
      - Address safety features
      - Emphasize adventure and achievement
      - Connect with the customer's active lifestyle goals
    `,
    
    'Toys & Games': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for toys & games:
      - Emphasize fun, learning, and development
      - Include age recommendations clearly
      - Mention safety certifications
      - Describe gameplay or play patterns
      - Address parent concerns
      - Balance child appeal with parent approval
    `,
    
    'Jewelry & Accessories': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for jewelry & accessories:
      - Focus on craftsmanship and materials
      - Emphasize occasions and styling versatility
      - Include sizing and care information
      - Mention gift-giving appeal
      - Use aspirational language
      - Help customers envision wearing/using the item
    `,
    
    'Health & Wellness': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for health & wellness:
      - Focus on benefits and results
      - Include scientific backing when relevant
      - Address safety and quality standards
      - Mention usage instructions
      - Build trust through transparency
      - Connect with customer health goals
    `,
    
    'Pet Supplies': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for pet supplies:
      - Address both pet and owner benefits
      - Include size/breed recommendations
      - Mention safety and quality standards
      - Emphasize pet health and happiness
      - Address common pet owner concerns
      - Use warm, caring language
    `,
    
    'Office & School Supplies': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for office & school supplies:
      - Focus on productivity and organization
      - Mention durability for daily use
      - Include compatibility information
      - Address professional appearance
      - Emphasize value and functionality
      - Connect with work/study goals
    `,
    
    'Automotive': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for automotive:
      - Include compatibility information clearly
      - Focus on performance and reliability
      - Mention installation difficulty
      - Address safety and regulations
      - Include warranty information
      - Use technical terms appropriately
    `,
  };

  // Return the specific prompt if available, otherwise use the base prompt
  return prompts[productType] || BASE_SYSTEM_PROMPT;
}