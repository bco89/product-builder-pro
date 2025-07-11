import { BASE_SYSTEM_PROMPT } from './base-prompt';

export interface ProductTypeConfig {
  prompt: string;
  templateType: 'lifestyle' | 'technical' | 'hybrid';
  customerJourneySteps: string[];
  priceThreshold?: number; // Above this price, use more detailed template
  includeBestFor: boolean;
  focusAreas: string[];
}

export function getProductTypeConfig(productType: string): ProductTypeConfig {
  const configs: Record<string, ProductTypeConfig> = {
    'Apparel': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for apparel:
      - Lead with style and confidence benefits
      - Use "You'll love this because..." framing
      - Focus on how it makes the customer feel
      - Include fit, comfort, and versatility
      - Mention fabric and care only as supporting details
      - If size chart data is provided, ALWAYS include it at the end
      - Use aspirational, emotionally-driven language`,
      templateType: 'lifestyle',
      customerJourneySteps: ['Visual appeal', 'Fit confidence', 'Lifestyle integration'],
      includeBestFor: false,
      focusAreas: ['style', 'comfort', 'confidence', 'versatility']
    },
    
    'Electronics': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for electronics:
      - Lead with key benefit/problem solved
      - Use "Best For:" section for target users
      - Balance technical specs with user benefits
      - Include compatibility information prominently
      - Address common concerns upfront
      - For items over $50, include detailed specs
      - For items under $50, focus on core functionality`,
      templateType: 'technical',
      customerJourneySteps: ['Problem identification', 'Compatibility check', 'Feature comparison', 'Value assessment'],
      priceThreshold: 50,
      includeBestFor: true,
      focusAreas: ['functionality', 'compatibility', 'reliability', 'value']
    },
    
    'Beauty': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for beauty products:
      - Lead with transformation promise
      - Use "You'll see results..." framing
      - Focus on specific skin/hair concerns solved
      - Include key ingredients as trust builders
      - Mention application ritual and self-care
      - Address safety and ethical considerations
      - Use inclusive, confidence-boosting language`,
      templateType: 'lifestyle',
      customerJourneySteps: ['Problem recognition', 'Solution discovery', 'Trust building', 'Transformation vision'],
      includeBestFor: false,
      focusAreas: ['results', 'ingredients', 'self-care', 'confidence']
    },
    
    'Home & Garden': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for home & garden:
      - Lead with lifestyle transformation
      - Paint picture of improved living space
      - Include practical details (dimensions, assembly)
      - Focus on durability and quality of life
      - Suggest styling and placement ideas
      - For items over $100, emphasize investment value
      - Help visualize the product in their home`,
      templateType: 'hybrid',
      customerJourneySteps: ['Space visualization', 'Practical fit', 'Quality assessment', 'Lifestyle enhancement'],
      priceThreshold: 100,
      includeBestFor: false,
      focusAreas: ['transformation', 'quality', 'practicality', 'aesthetics']
    },
    
    'Food & Beverage': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for food & beverage:
      - Lead with taste experience and occasions
      - Use sensory language that creates craving
      - Include health benefits as supporting points
      - Mention sourcing story if compelling
      - Suggest pairings and serving ideas
      - Address dietary preferences clearly
      - Create urgency around freshness/availability`,
      templateType: 'lifestyle',
      customerJourneySteps: ['Craving creation', 'Quality validation', 'Usage inspiration', 'Purchase justification'],
      includeBestFor: false,
      focusAreas: ['taste', 'quality', 'health', 'experience']
    },
    
    'Sports & Outdoors': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for sports & outdoors:
      - Lead with performance benefits
      - Use "Best For:" section for skill levels/activities
      - Balance technical details with adventure appeal
      - Include size/fit information if applicable
      - Focus on durability and real-world use
      - Connect with achievement and adventure goals`,
      templateType: 'hybrid',
      customerJourneySteps: ['Activity match', 'Skill level fit', 'Feature evaluation', 'Durability assessment'],
      includeBestFor: true,
      focusAreas: ['performance', 'durability', 'adventure', 'achievement']
    },
    
    'Toys & Games': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for toys & games:
      - Lead with fun and engagement promise
      - Balance child excitement with parent values
      - Include age range and skill development
      - Emphasize safety and quality standards
      - Describe play patterns and longevity
      - Address screen-time concerns if relevant
      - Use dual-audience language`,
      templateType: 'hybrid',
      customerJourneySteps: ['Age appropriateness', 'Engagement potential', 'Educational value', 'Safety assurance'],
      includeBestFor: true,
      focusAreas: ['fun', 'learning', 'safety', 'quality']
    },
    
    'Jewelry & Accessories': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for jewelry & accessories:
      - Lead with emotional significance
      - Focus on moments and memories
      - Include craftsmanship story
      - Mention versatility and styling options
      - Address care and longevity
      - Use aspirational, gift-worthy language
      - For items over $200, emphasize heirloom quality`,
      templateType: 'lifestyle',
      customerJourneySteps: ['Emotional connection', 'Quality appreciation', 'Styling visualization', 'Investment justification'],
      priceThreshold: 200,
      includeBestFor: false,
      focusAreas: ['emotion', 'craftsmanship', 'versatility', 'significance']
    },
    
    'Health & Wellness': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for health & wellness:
      - Lead with specific health benefits
      - Use "Best For:" section for health goals
      - Include scientific backing tactfully
      - Focus on quality and purity
      - Address usage and dosage clearly
      - Build trust through transparency
      - Connect with wellness journey`,
      templateType: 'technical',
      customerJourneySteps: ['Need identification', 'Solution validation', 'Trust building', 'Usage planning'],
      includeBestFor: true,
      focusAreas: ['benefits', 'quality', 'trust', 'results']
    },
    
    'Pet Supplies': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for pet supplies:
      - Lead with pet happiness and health
      - Address both pet enjoyment and owner convenience
      - Include size/breed recommendations clearly
      - Focus on safety and quality materials
      - Mention durability for active pets
      - Use warm, caring pet-parent language
      - Connect with pet-owner bond`,
      templateType: 'hybrid',
      customerJourneySteps: ['Pet needs match', 'Safety verification', 'Quality assessment', 'Owner convenience'],
      includeBestFor: true,
      focusAreas: ['pet-happiness', 'safety', 'durability', 'convenience']
    },
    
    'Office & School Supplies': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for office & school supplies:
      - Lead with productivity benefits
      - Focus on organization and efficiency
      - Include durability for daily use
      - Mention compatibility with systems
      - Address professional appearance
      - For items over $30, emphasize long-term value
      - Connect with success goals`,
      templateType: 'technical',
      customerJourneySteps: ['Need identification', 'Feature evaluation', 'Durability check', 'Value assessment'],
      priceThreshold: 30,
      includeBestFor: false,
      focusAreas: ['productivity', 'organization', 'durability', 'professionalism']
    },
    
    'Automotive': {
      prompt: `${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for automotive:
      - Lead with compatibility and fitment
      - Use "Best For:" section for vehicle types
      - Include technical specs prominently
      - Focus on performance improvements
      - Mention installation difficulty level
      - Address warranty and support
      - Use precise technical language`,
      templateType: 'technical',
      customerJourneySteps: ['Compatibility check', 'Performance evaluation', 'Installation assessment', 'Value verification'],
      includeBestFor: true,
      focusAreas: ['compatibility', 'performance', 'reliability', 'installation']
    },
  };

  // Return the specific config if available, otherwise use a default config
  return configs[productType] || {
    prompt: BASE_SYSTEM_PROMPT,
    templateType: 'lifestyle',
    customerJourneySteps: ['Interest', 'Evaluation', 'Decision'],
    includeBestFor: false,
    focusAreas: ['quality', 'value', 'satisfaction']
  };
}

// For backward compatibility, keep the original function
export function getProductTypePrompt(productType: string): string {
  return getProductTypeConfig(productType).prompt;
}