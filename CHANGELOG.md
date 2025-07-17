# @shopify/shopify-app-template-remix

## 2025.01.17

### Fixed Firecrawl Extract API Integration

- **Updated Firecrawl Extract Implementation**:
  - Fixed API call to match Firecrawl documentation format (URLs as array)
  - Updated schema to match provided format with `products` array structure
  - Added `agent: { model: 'FIRE-1' }` parameter for better extraction
  - Enhanced error handling with specific error type detection (401, 403, 404, timeout)
  - Added detailed logging for debugging API responses
  - **Schema Changes**:
    - Changed from flat product object to `products` array format
    - Updated field names to match: `title`, `brand`, `description`, `size_charts`, `materials`, `unique_features`, `best_for`, `other_information`
    - Required fields: `brand`, `title`, `description`, `size_charts`
  - **Error Handling Improvements**:
    - Better error messages for authentication failures
    - Specific handling for blocked access (anti-scraping)
    - Clear feedback for missing pages or timeouts
    - Enhanced logging of error details for troubleshooting

### Complete Removal of Fallback Logic for Clean JSON-Only Processing

- **Removed ALL Fallback Mechanisms to Ensure JSON-Only Data**:
  - Fixed critical issue where raw webpage content could still reach LLM through various fallback paths
  - **Removed from `scraper.server.ts`**:
    - Deleted `scrapeProductInfo` method completely
    - Deleted `extractProductData` and all helper extraction methods
    - Removed `rawContent` field from ScrapedProductData interface
    - Updated `extractionMethod` to only allow 'extract' value
  - **Removed from `product-description-extractor.server.ts`**:
    - Deleted all pattern-based extraction methods
    - Deleted simplified LLM extraction fallback
    - Removed `rawContent` from ExtractionResult interface
    - Updated extraction to return error when extract endpoint fails
  - **Simplified `ai.server.ts`**:
    - `formatScrapedDataForPrompt` now only accepts JSON data from extract endpoint
    - Removed all fallback formatting logic
    - Returns empty string if no clean JSON is available
    - Updated `checkForSizeChart` to only check extractedJson data
  - **Updated `api.shopify.generate-description.ts`**:
    - Removed scrapeProductInfo fallback attempt
    - Only uses extractProductInfo method
  - **Benefits**:
    - Guarantees NO non-JSON data can ever reach the LLM prompt
    - Eliminates all navigation, UI elements, and irrelevant content
    - Ensures consistent, structured data for AI processing
    - Reduces token usage and improves description quality

### Fixed Firecrawl Extract Data Processing

- **Resolved Issue with Raw Content in AI Prompts**:
  - Fixed critical issue where entire raw webpage content was being passed to LLM along with clean extracted JSON
  - Updated `formatScrapedDataForPrompt` in `ai.server.ts` to exclusively use clean JSON from Firecrawl extract endpoint
  - Modified `extractProductInfo` in `scraper.server.ts` to exclude `rawContent` and `descriptionData` when `extractedJson` is available
  - Updated `extractForDescriptionGeneration` to prevent raw content from being included with extracted JSON
  - Fixed extraction method label from 'llm' to 'extract' for proper identification
  
- **Benefits of the Fix**:
  - Significantly reduced token usage by sending only relevant product data
  - Eliminated irrelevant content (navigation, footers, UI elements) from AI prompts
  - Improved AI description quality by providing focused, structured data
  - Lower API costs due to smaller, more efficient prompts
  - Better performance with faster response times

### Fixed AI Description Truncation & Enhanced Token Limits

- **Fixed Product Description Truncation Issue**:
  - Resolved critical bug where product descriptions were being truncated at escape sequences (e.g., `59\"`)
  - Updated `parseAIResponse` method in `ai.server.ts` with enhanced JSON parsing
  - Added regex pattern that properly handles escaped characters: `/"description":\s*"((?:[^"\\]|\\.)*)"/`
  - Implemented JSON unescape function to handle all standard escape sequences (`\"`, `\\`, `\n`, etc.)
  - Added secondary fallback that extracts and parses JSON objects separately
  - Enhanced error logging to capture raw AI responses for debugging

- **Increased AI Generation Token Limits**:
  - Initial description generation: increased from 2,500 to **8,000 tokens**
  - Auto-improvement phase: increased from 1,500 to **6,000 tokens**
  - Removed 1,000 character limit on scraped data context
  - Added token estimation with warnings for requests exceeding 20,000 input tokens
  - Ensures complete product descriptions without artificial truncation
  - Cost remains minimal (~$0.12-0.30 per description) while preventing truncation

- **Enhanced Firecrawl Integration**:
  - Migrated from `scrapeUrl` to more powerful `extract` endpoint with FIRE-1 agent
  - Better handling of complex websites and dynamic content
  - Improved extraction reliability with multiple fallback strategies
  - Comprehensive error handling for various failure scenarios

These changes ensure that product descriptions with measurements, special characters, and extensive content are fully captured and displayed without truncation, significantly improving the quality of AI-generated descriptions.

## 2025.01.15

### Enhanced Loading States with Polaris Components

- **Created Reusable LoadingProgress Component**:
  - Built with native Polaris components (ProgressBar, SkeletonBodyText, SkeletonDisplayText)
  - Three variants: 'ai-generation' for full-screen loading, 'data-fetch' for inline loading, and 'simple' for basic operations
  - Features rotating messages that change every 2 seconds to keep users engaged
  - Shows skeleton previews during AI generation to indicate what content is being created
  - Simulates progress animation when actual progress data is unavailable
  - Dynamic icons that change based on progress percentage

- **Improved AI Description Generation Loading Experience**:
  - Replaced static "Analyzing URL..." spinner with full-screen loading state
  - Added real progress tracking (0-100%) throughout the generation process
  - Displays skeleton preview of description structure being generated
  - Engaging, rotating messages that reduce perceived wait time:
    - URL analysis: "🔍 Fetching product information from URL..."
    - Content creation: "✨ Crafting compelling description..."
    - SEO optimization: "🎯 Optimizing for your SEO keywords..."
  - Shows estimated completion time (20-30 seconds based on input method)

- **Enhanced Vendor & Product Type Loading States**:
  - Replaced generic "Loading..." spinners with contextual messages
  - Shows discovered item count for product types as they load
  - Different messages for cached vs fresh data fetching
  - Personalized loading messages that include vendor name
  - Better feedback during first-time product type discovery

- **Technical Implementation**:
  - Follows LEVER optimization framework - extends existing Polaris patterns
  - Minimal code addition (~180 lines total) for maximum impact
  - Leverages React Query's built-in loading states
  - Consistent with Shopify admin design patterns
  - Progressive enhancement approach maintains functionality without JavaScript

These loading state improvements significantly enhance perceived performance and user engagement during wait times, making the product creation process feel faster and more responsive.

### Product Builder Pro UI/UX Improvements

- **Enhanced App Layout & Spacing**:
  - Added bottom padding to prevent content from touching screen edge
  - Improved visual hierarchy in success page (replaced "Success!" with "Product Created Successfully!")
  - Removed background color from suggested categories while maintaining hover/selection states

- **Improved Form Validation & User Experience**:
  - Updated validation messaging to only appear after user interaction (Next button click)
  - Changed validation tone from info to critical for better visibility
  - Removed edit links from review step to streamline final approval process
  - Fixed description display to render HTML formatting properly instead of raw markup

- **Settings Integration & Workflow Optimization**:
  - Integrated description perspective setting - now pulls from app settings instead of step selection
  - Shows Badge when perspective is configured or warning Banner when not set
  - Updated "Additional Context" label to "What makes this product special?" for better user guidance
  - Removed regenerate functionality to simplify AI description workflow

- **AI Description Generation Enhancements**:
  - Made Generate Description button work without keywords while showing encouraging toast
  - Disabled Next button until description exists to ensure proper workflow completion
  - Verified TinyMCE editor remains fully editable for generated content
  - Simplified TinyMCE toolbar to match Shopify native editor (removed menu, kept essential formatting)

- **Performance & Technical Optimizations**:
  - Optimized product types loading with improved caching (10-minute cache duration)
  - Added cache metadata and better user feedback during loading
  - Verified AI service generates full-length descriptions without artificial truncation
  - Confirmed proper SEO field lengths (60 chars for title, 155 for description)

All changes follow the LEVER framework from optimization principles, extending existing code rather than creating new components. These improvements enhance user experience while maintaining all existing functionality and following Shopify design patterns.

## 2025.01.13

### Fixed HTML Tags in SEO Fields

- **Fixed SEO Field HTML Tag Issue**: Resolved issue where HTML tags were appearing in product SEO titles and descriptions
  - Replaced WYSIWYG rich text editors with plain TextField components for SEO Title and SEO Description in `StepAIDescription.tsx`
  - SEO Title now uses a single-line TextField with 60-character limit
  - SEO Description now uses a multi-line TextField with 155-character limit
  - Backend HTML stripping in API routes remains as a safety measure
  - Prevents HTML formatting at input while ensuring clean data sent to Shopify

## 2025.01.14

### Multi-Journey Customer Support in AI Descriptions

- **Removed Step 1 Journey Assumption**: Updated AI prompt generation to support customers at any stage of their buying journey
  - Changed from rigid "Write for someone at step 1" to inclusive "Address customers at ANY stage"
  - AI now creates content that serves browsers, comparers, and decision-makers simultaneously
  - Maintains all existing journey steps and focus areas without requiring new configuration

- **Implemented Layered Content Strategy**: Restructured content principles in `ai.server.ts`
  - **Multi-stage opening hooks**: Single sentences that appeal to awareness, consideration, and decision stages
  - **Progressive information disclosure**: Broad benefits → Differentiating features → Decision details
  - **Journey-aware benefits**: Addresses all journey stages within the same description
  - Added concrete examples showing how to serve multiple customer needs in one description

- **Enhanced Focus Area Integration**: 
  - Changed from single-stage focus to "Weave ALL focus areas throughout"
  - Content pillars now address different customer priorities simultaneously
  - Better alignment with diverse customer needs regardless of entry point

These changes create more inclusive product descriptions that maximize conversion potential by serving all customers effectively, whether they're just discovering the product category or ready to make a purchase.

## 2025.01.14

### Business Type Perspective & Enhanced Product Patterns

- **Added Business Type Setting**: New setting to control AI description perspective
  - Database schema updated with `businessType` field in ShopSettings
  - App settings page now includes "Product Creator/Manufacturer" vs "Retailer/Reseller" selection
  - AI descriptions automatically written in first person (we/our) for creators or third person (they/their) for retailers
  - Per-product override available in AI description step

- **Expanded Product Pattern Recognition**: Enhanced `productPatterns` in `ai.server.ts`
  - Added comprehensive patterns for all 12 product categories
  - Now includes patterns for: Food & Beverage, Pet Supplies, Office & School Supplies, Automotive
  - Expanded existing categories with more specific product types
  - Better product term extraction for more natural descriptions

- **Removed Character Limits for Better Descriptions**:
  - Scraped data no longer truncated at 2000 characters
  - All extracted features now included (removed 10-item limit)
  - Increased AI generation tokens from 1500 to 4000 for main descriptions
  - Increased improvement phase tokens from 1500 to 4000
  - Increased evaluation feedback tokens from 500 to 2000
  - Removed SEO title/description character limits from AI generation (can be enforced in UI later)
  - Customer avatar now includes all pain points and desires (removed 3-item limit)

## 2025.01.13

### Enhanced AI Product Description Generation

- **Improved Base System Prompt**: Transformed from rigid 8-section structure to flexible, principle-based guidance that emphasizes creative freedom while ensuring key elements are covered
  - Focus on storytelling and emotional connection
  - Natural SEO integration instead of prescriptive rules
  - Guidelines rather than mandatory structure

- **Smarter Product Term Extraction**: Enhanced `extractProductTerm` method in `ai.server.ts`
  - Intelligently identifies compound terms (e.g., "electric scooter" vs just "scooter")
  - Uses primary keyword when more specific than extracted term
  - Context-appropriate fallbacks (e.g., "gear" for sports products)
  - Better handles product titles like "Vuori Ponto Performance Crew Sweatshirt"

- **Inspiring Content Principles**: Redesigned `getContentPrinciples` method
  - Replaced prescriptive SEO requirements with conversational guidance
  - Added creative examples and emoji-based visual hierarchy
  - Emphasized natural keyword flow: "weave keywords like a conversation, not a checklist"
  - Tailored story arcs for lifestyle, technical, and hybrid product types

- **Better Scraped Data Organization**: Improved `formatScrapedDataForPrompt` method
  - Structured data into prioritized sections with clear visual hierarchy
  - Highlighted critical information (features, benefits, materials, size charts)
  - Added contextual guidance for using each data type
  - Smart extraction for unstructured content

These changes allow the AI to generate more engaging, conversion-focused product descriptions while naturally incorporating SEO requirements. The system now guides rather than constrains, resulting in descriptions that feel authentic and compelling.

## 2025.01.8

- [#923](https://github.com/Shopify/shopify-app-template-remix/pull/923) Enable GraphQL autocomplete for Javascript

## 2024.12.19

- [#904](https://github.com/Shopify/shopify-app-template-remix/pull/904) bump `@shopify/app-bridge-react` to latest
- 
## 2024.12.18

- [875](https://github.com/Shopify/shopify-app-template-remix/pull/875) Add Scopes Update Webhook
## 2024.12.05

- [#910](https://github.com/Shopify/shopify-app-template-remix/pull/910) Install `openssl` in Docker image to fix Prisma (see [#25817](https://github.com/prisma/prisma/issues/25817#issuecomment-2538544254))
- [#907](https://github.com/Shopify/shopify-app-template-remix/pull/907) Move `@remix-run/fs-routes` to `dependencies` to fix Docker image build
- [#899](https://github.com/Shopify/shopify-app-template-remix/pull/899) Disable v3_singleFetch flag
- [#898](https://github.com/Shopify/shopify-app-template-remix/pull/898) Enable the `removeRest` future flag so new apps aren't tempted to use the REST Admin API.

## 2024.12.04

- [#891](https://github.com/Shopify/shopify-app-template-remix/pull/891) Enable remix future flags.
-

## 2024.11.26
- [888](https://github.com/Shopify/shopify-app-template-remix/pull/888) Update restResources version to 2024-10

## 2024.11.06

- [881](https://github.com/Shopify/shopify-app-template-remix/pull/881) Update to the productCreate mutation to use the new ProductCreateInput type

## 2024.10.29

- [876](https://github.com/Shopify/shopify-app-template-remix/pull/876) Update shopify-app-remix to v3.4.0 and shopify-app-session-storage-prisma to v5.1.5

## 2024.10.02

- [863](https://github.com/Shopify/shopify-app-template-remix/pull/863) Update to Shopify App API v2024-10 and shopify-app-remix v3.3.2

## 2024.09.18

- [850](https://github.com/Shopify/shopify-app-template-remix/pull/850) Removed "~" import alias

## 2024.09.17

- [842](https://github.com/Shopify/shopify-app-template-remix/pull/842) Move webhook processing to individual routes

## 2024.08.19

Replaced deprecated `productVariantUpdate` with `productVariantsBulkUpdate`

## v2024.08.06

Allow `SHOP_REDACT` webhook to process without admin context

## v2024.07.16

Started tracking changes and releases using calver
