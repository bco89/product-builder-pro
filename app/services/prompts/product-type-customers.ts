export interface ProductTypeCustomer {
  demographics: string;
  painPoints: string[];
  desires: string[];
  shoppingBehavior: string;
  motivations: string;
  priceExpectations: string;
  brandLoyalty: string;
}

export function getProductTypeCustomer(productType: string): ProductTypeCustomer {
  const customers: Record<string, ProductTypeCustomer> = {
    'Apparel': {
      demographics: 'Style-conscious individuals aged 25-45 who value self-expression through fashion',
      painPoints: [
        'Finding clothes that fit well and look good',
        'Keeping up with trends without overspending',
        'Building a versatile wardrobe that works for multiple occasions',
        'Quality concerns with fast fashion',
        'Difficulty finding unique pieces that stand out'
      ],
      desires: [
        'To look and feel confident in any situation',
        'Express personal style authentically',
        'Get compliments and positive attention',
        'Build a sustainable, lasting wardrobe',
        'Feel put-together without effort'
      ],
      shoppingBehavior: 'Visual-first browsing, reads size reviews carefully, checks material composition, influenced by lifestyle imagery and social proof',
      motivations: 'Emotional purchase - how it makes them feel, social validation, self-expression',
      priceExpectations: 'Willing to pay more for quality basics, seeks deals on trendy items',
      brandLoyalty: 'Moderate - loyal to brands that fit well and align with values'
    },
    
    'Electronics': {
      demographics: 'Tech-savvy professionals and enthusiasts aged 20-50 seeking efficiency and innovation',
      painPoints: [
        'Compatibility with existing devices/systems',
        'Overwhelming technical specifications',
        'Fear of buying outdated technology',
        'Setup complexity and learning curves',
        'Reliability and longevity concerns'
      ],
      desires: [
        'Simplify life through smart technology',
        'Stay current with latest innovations',
        'Solve specific problems efficiently',
        'Get maximum value from investment',
        'Seamless integration with lifestyle'
      ],
      shoppingBehavior: 'Extensive research phase, compares detailed specs, reads expert reviews, watches video demos, checks compatibility carefully',
      motivations: 'Logical purchase - features vs price analysis, problem-solving capability, future-proofing',
      priceExpectations: 'Budget-conscious but willing to invest for quality and features',
      brandLoyalty: 'High - sticks with ecosystem (Apple, Samsung, etc.) for compatibility'
    },
    
    'Beauty': {
      demographics: 'Self-care enthusiasts aged 18-45 focused on wellness and appearance',
      painPoints: [
        'Finding products that work for their specific skin/hair type',
        'Ingredient concerns and sensitivities',
        'Overwhelming product choices',
        'Disappointment with product effectiveness',
        'Environmental and ethical concerns'
      ],
      desires: [
        'Achieve visible results and transformation',
        'Feel pampered and special',
        'Maintain healthy skin/hair long-term',
        'Simplify beauty routine',
        'Use clean, ethical products'
      ],
      shoppingBehavior: 'Ingredient-conscious, reads reviews from similar skin types, influenced by before/after photos, seeks samples when possible',
      motivations: 'Emotional and practical - self-care ritual, confidence boost, problem-solving',
      priceExpectations: 'Wide range - drugstore to luxury depending on product category',
      brandLoyalty: 'Very high once they find products that work'
    },
    
    'Home & Garden': {
      demographics: 'Homeowners and renters aged 25-60 creating their ideal living spaces',
      painPoints: [
        'Measuring and space planning uncertainties',
        'Coordinating with existing decor',
        'Assembly and installation concerns',
        'Quality vs price trade-offs',
        'Return difficulty for large items'
      ],
      desires: [
        'Create a beautiful, functional living space',
        'Express personal style through home decor',
        'Improve quality of life at home',
        'Impress guests and create welcoming atmosphere',
        'Invest in lasting quality'
      ],
      shoppingBehavior: 'Measures carefully, visualizes in space, reads assembly reviews, checks material quality, looks for real customer photos',
      motivations: 'Lifestyle improvement, pride in home, functionality meets aesthetics',
      priceExpectations: 'Invests in key pieces, seeks value on accessories',
      brandLoyalty: 'Moderate - more focused on style and quality than brand'
    },
    
    'Food & Beverage': {
      demographics: 'Food enthusiasts and health-conscious consumers across all ages',
      painPoints: [
        'Dietary restrictions and allergies',
        'Freshness and shelf life concerns',
        'Finding authentic or specialty items',
        'Balancing health with taste',
        'Cost of premium/organic options'
      ],
      desires: [
        'Enjoy delicious, high-quality food',
        'Maintain health and wellness goals',
        'Discover new flavors and experiences',
        'Share special moments with food',
        'Support sustainable/ethical practices'
      ],
      shoppingBehavior: 'Reads ingredient lists carefully, checks expiration dates, influenced by origin story, seeks recommendations from similar tastes',
      motivations: 'Sensory pleasure, health benefits, social sharing, ethical alignment',
      priceExpectations: 'Pays premium for specialty, organic, or artisanal items',
      brandLoyalty: 'High for trusted brands, but willing to try new options'
    },
    
    'Sports & Outdoors': {
      demographics: 'Active individuals aged 20-55 pursuing fitness and adventure goals',
      painPoints: [
        'Finding gear that performs in real conditions',
        'Sizing inconsistencies across brands',
        'Durability concerns with heavy use',
        'Weather/condition suitability',
        'Storage and portability'
      ],
      desires: [
        'Achieve fitness and adventure goals',
        'Stay safe and comfortable during activities',
        'Look good while being active',
        'Join a community of like-minded people',
        'Push personal boundaries'
      ],
      shoppingBehavior: 'Seeks peer recommendations, reads field-tested reviews, checks technical specs, considers multi-use functionality',
      motivations: 'Performance enhancement, safety, achievement, community belonging',
      priceExpectations: 'Invests in quality for safety and performance',
      brandLoyalty: 'Very high for trusted performance brands'
    },
    
    'Toys & Games': {
      demographics: 'Parents, grandparents, and gift-givers shopping for children aged 0-17',
      painPoints: [
        'Age-appropriateness confusion',
        'Safety and quality concerns',
        'Educational value vs entertainment',
        'Screen time alternatives',
        'Durability with active play'
      ],
      desires: [
        'See children happy and engaged',
        'Support learning and development',
        'Create memorable experiences',
        'Find screen-free entertainment',
        'Get good value for gift budget'
      ],
      shoppingBehavior: 'Checks age recommendations, reads safety reviews, seeks educational value, influenced by child interests and parent reviews',
      motivations: 'Child happiness, developmental benefits, peace of mind on safety',
      priceExpectations: 'Budget varies by occasion - everyday play vs special gifts',
      brandLoyalty: 'Trusts established toy brands for safety and quality'
    },
    
    'Jewelry & Accessories': {
      demographics: 'Gift givers and self-purchasers aged 25-65 marking special moments',
      painPoints: [
        'Sizing uncertainties for online purchases',
        'Quality concerns with metals and stones',
        'Style matching with wardrobe',
        'Care and maintenance requirements',
        'Gift selection pressure'
      ],
      desires: [
        'Mark special moments memorably',
        'Express personal style elegantly',
        'Give meaningful gifts',
        'Own pieces that last generations',
        'Feel special and valued'
      ],
      shoppingBehavior: 'Studies photos closely, reads about materials, checks return policies, seeks timeless over trendy for investment pieces',
      motivations: 'Emotional significance, self-expression, relationship milestones',
      priceExpectations: 'Wide range based on occasion and material',
      brandLoyalty: 'Values craftsmanship and service over brand names'
    },
    
    'Health & Wellness': {
      demographics: 'Health-conscious individuals aged 25-65 taking proactive approach to wellbeing',
      painPoints: [
        'Information overload on what actually works',
        'Quality and purity concerns',
        'Interaction with medications',
        'Dosage and usage confusion',
        'High cost of supplements'
      ],
      desires: [
        'Improve specific health conditions',
        'Maintain long-term wellness',
        'Have more energy and vitality',
        'Age gracefully and actively',
        'Avoid pharmaceutical dependencies'
      ],
      shoppingBehavior: 'Researches scientific backing, seeks third-party testing, reads ingredient labels, consults healthcare providers',
      motivations: 'Health improvement, prevention, quality of life enhancement',
      priceExpectations: 'Invests in quality and purity, seeks subscriptions for savings',
      brandLoyalty: 'Very high once trust is established'
    },
    
    'Pet Supplies': {
      demographics: 'Devoted pet parents across all ages treating pets as family members',
      painPoints: [
        'Finding products pets will actually use/eat',
        'Quality concerns affecting pet health',
        'Size and fit for specific breeds',
        'Durability with destructive pets',
        'Vet approval and safety'
      ],
      desires: [
        'Keep pets healthy and happy',
        'Show love through quality care',
        'Solve specific pet problems',
        'Make pet care easier',
        'Create lasting memories with pets'
      ],
      shoppingBehavior: 'Seeks vet recommendations, reads reviews from similar pet owners, prioritizes safety and quality over price',
      motivations: 'Pet health and happiness, emotional bond, problem-solving',
      priceExpectations: 'No expense spared for pet health, seeks value on toys/accessories',
      brandLoyalty: 'Extremely loyal to brands pets love'
    },
    
    'Office & School Supplies': {
      demographics: 'Students, professionals, and parents aged 15-60 seeking organization and productivity',
      painPoints: [
        'Durability for daily heavy use',
        'Organization system compatibility',
        'Professional appearance needs',
        'Budget constraints for quality',
        'Eco-friendly options availability'
      ],
      desires: [
        'Stay organized and productive',
        'Express professionalism',
        'Make work/study enjoyable',
        'Reduce stress through organization',
        'Support sustainable practices'
      ],
      shoppingBehavior: 'Compares unit prices, seeks bulk deals, reads durability reviews, considers aesthetic appeal',
      motivations: 'Productivity enhancement, professional image, academic success',
      priceExpectations: 'Value-focused with splurges on items used daily',
      brandLoyalty: 'Moderate - repurchases what works well'
    },
    
    'Automotive': {
      demographics: 'Vehicle owners and enthusiasts aged 25-65 maintaining and upgrading vehicles',
      painPoints: [
        'Compatibility with specific make/model/year',
        'Installation complexity',
        'Quality vs aftermarket concerns',
        'Finding trusted mechanics',
        'Cost of OEM parts'
      ],
      desires: [
        'Keep vehicle running reliably',
        'Enhance performance or appearance',
        'Save money on repairs',
        'Maintain vehicle value',
        'Express personality through vehicle'
      ],
      shoppingBehavior: 'Checks compatibility meticulously, seeks OEM alternatives, reads installation guides, values expert opinions',
      motivations: 'Safety, reliability, cost savings, pride in vehicle',
      priceExpectations: 'Balances quality with budget, invests in safety-critical parts',
      brandLoyalty: 'High for proven performance brands'
    }
  };
  
  // Default customer profile for any uncategorized products
  return customers[productType] || {
    demographics: 'Quality-conscious consumers seeking reliable products',
    painPoints: [
      'Finding products that deliver on promises',
      'Getting good value for money',
      'Avoiding buyer\'s remorse',
      'Comparing options effectively'
    ],
    desires: [
      'Own quality products that last',
      'Feel confident in purchase decisions',
      'Get excellent customer service',
      'Support reputable businesses'
    ],
    shoppingBehavior: 'Compares multiple options, reads reviews thoroughly, seeks recommendations',
    motivations: 'Value-driven purchase based on quality and reliability',
    priceExpectations: 'Seeks best value in category',
    brandLoyalty: 'Develops loyalty through positive experiences'
  };
}