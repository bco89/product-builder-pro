# @shopify/shopify-app-template-remix


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
