# Product Builder Pro - AI-Powered Description Generation Implementation Guide

## Project Overview

This guide provides comprehensive instructions for implementing AI-powered product description generation with shop-specific settings into the existing Product Builder Pro Shopify app. The implementation includes a settings page for shop configuration, an AI description generation step in the product builder workflow, and integration with OpenAI/Claude API for content generation.

## Key Features to Implement

1. **Shop Settings Page** - Persistent shop-wide configuration for brand identity and customer avatar
2. **AI Description Generation Step** - New step in product builder workflow after Product Details
3. **Three Input Methods** - Manual entry, URL scraping, or text/image context
4. **WYSIWYG Editors** - For product description, SEO title, and SEO description
5. **SEO & GEO Optimization** - Built-in prompts for Search Engine and Generative Engine Optimization
6. **Regeneration Limits** - Maximum 3 regenerations per description
7. **Onboarding Flow** - Guide users through initial setup

## 1. Database Schema Updates

### Add to `prisma/schema.prisma`:

```prisma
model ShopSettings {
  id            String    @id @default(uuid()) @db.VarChar(36)
  shop          String    @unique @db.VarChar(255)
  
  // Customer Avatar Fields
  targetCustomer        String?   @db.Text
  customerPainPoints    String?   @db.Text
  customerDesires       String?   @db.Text
  
  // Brand Identity Fields
  uniqueSellingPoints   String?   @db.Text
  coreValues           String?   @db.Text
  brandPersonality     String?   @db.Text
  
  // Customer Psychology Fields
  lifestyleHabits      String?   @db.Text
  aspirations          String?   @db.Text
  buyingMotivations    String?   @db.Text
  
  // Store Information
  storeName            String?   @db.VarChar(255)
  storeLocation        String?   @db.VarChar(255)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([shop])
}

model AIGenerationLog {
  id            String    @id @default(uuid()) @db.VarChar(36)
  shop          String    @db.VarChar(255)
  productId     String?   @db.VarChar(255)
  generationType String   @db.VarChar(50) // 'description', 'seo_title', 'seo_description'
  prompt        String    @db.Text
  response      String    @db.Text
  regenerations Int       @default(0)
  
  createdAt     DateTime  @default(now())
  
  @@index([shop])
  @@index([productId])
}
```

Run migrations after updating schema:
```bash
npm run prisma:migrate
```

## 2. Settings Page Implementation

### Create `app/routes/app.settings.tsx`:

```typescript
import { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  BlockStack,
  Text,
  Banner,
  Toast,
  Box,
  Divider,
  Icon,
} from '@shopify/polaris';
import { QuestionCircleIcon } from '@shopify/polaris-icons';
import { authenticate } from '../shopify.server';
import { json } from '@remix-run/node';
import { useLoaderData, useSubmit, useNavigation, Form } from '@remix-run/react';
import { prisma } from '../db.server';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  const settings = await prisma.shopSettings.findUnique({
    where: { shop: session.shop }
  });

  return json({ settings, shop: session.shop });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const settings = {
    targetCustomer: formData.get('targetCustomer')?.toString() || '',
    customerPainPoints: formData.get('customerPainPoints')?.toString() || '',
    customerDesires: formData.get('customerDesires')?.toString() || '',
    uniqueSellingPoints: formData.get('uniqueSellingPoints')?.toString() || '',
    coreValues: formData.get('coreValues')?.toString() || '',
    brandPersonality: formData.get('brandPersonality')?.toString() || '',
    lifestyleHabits: formData.get('lifestyleHabits')?.toString() || '',
    aspirations: formData.get('aspirations')?.toString() || '',
    buyingMotivations: formData.get('buyingMotivations')?.toString() || '',
    storeName: formData.get('storeName')?.toString() || '',
    storeLocation: formData.get('storeLocation')?.toString() || '',
  };

  await prisma.shopSettings.upsert({
    where: { shop: session.shop },
    update: settings,
    create: {
      shop: session.shop,
      ...settings
    }
  });

  return json({ success: true });
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [toastMessage, setToastMessage] = useState('');
  
  const isSubmitting = navigation.state === 'submitting';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(event.currentTarget, { method: 'post' });
    setToastMessage('Settings saved successfully!');
  };

  return (
    <Page
      title="AI Description Settings"
      subtitle="Configure your store's brand identity and customer profile for AI-powered product descriptions"
    >
      <Form method="post" onSubmit={handleSubmit}>
        <Layout>
          <Layout.Section>
            <BlockStack gap="600">
              {/* Store Information */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Store Information</Text>
                  <FormLayout>
                    <TextField
                      label="Store Name"
                      name="storeName"
                      defaultValue={settings?.storeName || ''}
                      autoComplete="off"
                    />
                    <TextField
                      label="Store Location"
                      name="storeLocation"
                      defaultValue={settings?.storeLocation || ''}
                      helpText="e.g., 'Austin, Texas' or 'Made in USA'"
                      autoComplete="off"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Customer Avatar */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Customer Avatar</Text>
                  <Banner tone="info">
                    <Text as="p">
                      Creating a detailed customer avatar helps AI write product descriptions that deeply resonate with your target audience.
                    </Text>
                  </Banner>
                  
                  <FormLayout>
                    <TextField
                      label="Who are your ideal customers?"
                      name="targetCustomer"
                      defaultValue={settings?.targetCustomer || ''}
                      multiline={3}
                      helpText="Describe demographics, interests, and characteristics. Example: 'Busy professionals aged 25-45 who value quality and sustainability'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="What problems do they face?"
                      name="customerPainPoints"
                      defaultValue={settings?.customerPainPoints || ''}
                      multiline={3}
                      helpText="What frustrations or challenges do your products solve? Example: 'Lack of time for self-care, difficulty finding eco-friendly options'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="What do they desire?"
                      name="customerDesires"
                      defaultValue={settings?.customerDesires || ''}
                      multiline={3}
                      helpText="What outcomes or feelings are they seeking? Example: 'To feel confident, save time, make sustainable choices'"
                      autoComplete="off"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Brand Identity */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Brand Identity</Text>
                  
                  <FormLayout>
                    <TextField
                      label="Unique Selling Points"
                      name="uniqueSellingPoints"
                      defaultValue={settings?.uniqueSellingPoints || ''}
                      multiline={3}
                      helpText="What makes your products special? Example: 'Handcrafted in small batches, 10% of profits donated to charity'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Core Values & Beliefs"
                      name="coreValues"
                      defaultValue={settings?.coreValues || ''}
                      multiline={3}
                      helpText="What principles guide your business? Example: 'Sustainability, transparency, community support'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Brand Personality"
                      name="brandPersonality"
                      defaultValue={settings?.brandPersonality || ''}
                      multiline={2}
                      helpText="How would you describe your brand's voice? Example: 'Friendly, authentic, inspiring, professional yet approachable'"
                      autoComplete="off"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Customer Psychology */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Customer Psychology</Text>
                  
                  <FormLayout>
                    <TextField
                      label="Lifestyle and Daily Habits"
                      name="lifestyleHabits"
                      defaultValue={settings?.lifestyleHabits || ''}
                      multiline={3}
                      helpText="How do your customers live? Example: 'Active lifestyle, shops online during lunch breaks, values experiences over possessions'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Aspirations & Desired Identity"
                      name="aspirations"
                      defaultValue={settings?.aspirations || ''}
                      multiline={3}
                      helpText="Who do they want to become? Example: 'Want to be seen as successful, eco-conscious, trendsetter'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Buying Motivations and Triggers"
                      name="buyingMotivations"
                      defaultValue={settings?.buyingMotivations || ''}
                      multiline={3}
                      helpText="What drives purchase decisions? Example: 'Social proof, limited editions, solving immediate problems, FOMO'"
                      autoComplete="off"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Button variant="primary" submit loading={isSubmitting}>
                Save Settings
              </Button>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Form>
      
      {toastMessage && (
        <Toast
          content={toastMessage}
          onDismiss={() => setToastMessage('')}
          duration={4000}
        />
      )}
    </Page>
  );
}
```

## 3. AI Description Generation Step

### Create `app/routes/product-builder/steps/StepAIDescription.tsx`:

```typescript
import { useState, useCallback, useEffect } from 'react';
import {
  Card,
  BlockStack,
  Text,
  Button,
  TextField,
  InlineStack,
  Banner,
  Spinner,
  RadioButton,
  Stack,
  FormLayout,
  Box,
  Badge,
  Divider,
  Icon,
  DropZone,
  Thumbnail,
} from '@shopify/polaris';
import { AlertCircleIcon } from '@shopify/polaris-icons';
import { Editor } from '@tinymce/tinymce-react';
import { useQuery } from '@tanstack/react-query';

interface StepAIDescriptionProps {
  formData: {
    title: string;
    productType: string;
    category: { name: string } | null;
    vendor: string;
    images: File[];
    description: string;
    seoTitle: string;
    seoDescription: string;
  };
  onChange: (updates: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepAIDescription({ formData, onChange, onNext, onBack }: StepAIDescriptionProps) {
  const [inputMethod, setInputMethod] = useState<'manual' | 'url' | 'context'>('manual');
  const [productUrl, setProductUrl] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [contextImages, setContextImages] = useState<File[]>([]);
  const [keywords, setKeywords] = useState({ primary: '', secondary: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [error, setError] = useState('');

  // Fetch shop settings
  const { data: shopSettings } = useQuery({
    queryKey: ['shopSettings'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/shop-settings');
      return response.json();
    }
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const payload = {
        method: inputMethod,
        productTitle: formData.title,
        productType: formData.productType,
        category: formData.category?.name || '',
        vendor: formData.vendor,
        keywords: [keywords.primary, keywords.secondary].filter(Boolean),
        productUrl: inputMethod === 'url' ? productUrl : undefined,
        additionalContext: inputMethod === 'context' ? additionalContext : undefined,
        hasImages: formData.images.length > 0 || contextImages.length > 0,
        shopSettings,
      };

      const response = await fetch('/api/shopify/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Generation failed');

      const result = await response.json();
      
      onChange({
        description: result.description,
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription,
      });

      setRegenerationCount(prev => prev + 1);
    } catch (err) {
      setError('Failed to generate description. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (regenerationCount < 3) {
      handleGenerate();
    }
  };

  const editorConfig = {
    height: 400,
    menubar: false,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'charmap', 'preview',
      'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
    ],
    toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | removeformat | help',
    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size: 14px }',
  };

  return (
    <>
      <Card>
        <BlockStack gap="200">
          <Text as="span">
            <Text as="span" fontWeight="bold">Product:</Text> {formData.title}
          </Text>
          <InlineStack gap="400" wrap>
            <Text as="span">
              <Text as="span" fontWeight="bold">Type:</Text> {formData.productType}
            </Text>
            <Text as="span">
              <Text as="span" fontWeight="bold">Category:</Text> {formData.category?.name || 'Not specified'}
            </Text>
          </InlineStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="500">
          <Text variant="headingMd" as="h2">AI-Powered Description Generation</Text>

          {/* Input Method Selection */}
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">Choose Input Method</Text>
            <Stack vertical>
              <RadioButton
                label="Write description manually"
                checked={inputMethod === 'manual'}
                onChange={() => setInputMethod('manual')}
              />
              <RadioButton
                label="Generate from product URL"
                checked={inputMethod === 'url'}
                onChange={() => setInputMethod('url')}
              />
              <RadioButton
                label="Generate from text/images"
                checked={inputMethod === 'context'}
                onChange={() => setInputMethod('context')}
              />
            </Stack>
          </BlockStack>

          <Divider />

          {/* SEO Keywords */}
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">SEO Keywords</Text>
            <FormLayout>
              <FormLayout.Group>
                <TextField
                  label="Primary Keyword"
                  value={keywords.primary}
                  onChange={(value) => setKeywords(prev => ({ ...prev, primary: value }))}
                  helpText="Most important keyword for SEO"
                  autoComplete="off"
                />
                <TextField
                  label="Secondary Keyword"
                  value={keywords.secondary}
                  onChange={(value) => setKeywords(prev => ({ ...prev, secondary: value }))}
                  helpText="Supporting keyword (optional)"
                  autoComplete="off"
                />
              </FormLayout.Group>
            </FormLayout>
          </BlockStack>

          {/* Conditional Input Fields */}
          {inputMethod === 'url' && (
            <TextField
              label="Product URL"
              value={productUrl}
              onChange={setProductUrl}
              placeholder="https://example.com/product-page"
              helpText="Enter the URL of the product from manufacturer or supplier"
              autoComplete="off"
            />
          )}

          {inputMethod === 'context' && (
            <BlockStack gap="400">
              <TextField
                label="Additional Context"
                value={additionalContext}
                onChange={setAdditionalContext}
                multiline={4}
                helpText="Add details like size charts, special features, or usage instructions"
                autoComplete="off"
              />
              
              <Box>
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  Reference Images
                </Text>
                <Box paddingBlockStart="200">
                  <DropZone
                    accept="image/*"
                    type="image"
                    onDrop={(files) => setContextImages(files)}
                  >
                    {contextImages.length === 0 ? (
                      <DropZone.FileUpload />
                    ) : (
                      <Stack>
                        {contextImages.map((file, index) => (
                          <Thumbnail
                            key={index}
                            size="small"
                            alt={file.name}
                            source={URL.createObjectURL(file)}
                          />
                        ))}
                      </Stack>
                    )}
                  </DropZone>
                </Box>
              </Box>
            </BlockStack>
          )}

          {/* Generate Button */}
          {inputMethod !== 'manual' && (
            <Box>
              <Button
                variant="primary"
                onClick={handleGenerate}
                loading={isGenerating}
                disabled={
                  isGenerating ||
                  (inputMethod === 'url' && !productUrl) ||
                  !keywords.primary
                }
              >
                Generate Description
              </Button>
              
              {regenerationCount > 0 && regenerationCount < 3 && (
                <Box paddingBlockStart="200">
                  <InlineStack gap="200" align="center">
                    <Button
                      onClick={handleRegenerate}
                      disabled={isGenerating}
                    >
                      Regenerate ({3 - regenerationCount} left)
                    </Button>
                    <Badge tone="info">
                      Generation {regenerationCount} of 3
                    </Badge>
                  </InlineStack>
                </Box>
              )}
            </Box>
          )}

          {error && (
            <Banner tone="critical">
              <InlineStack gap="200" align="center">
                <Icon source={AlertCircleIcon} />
                <Text as="p">{error}</Text>
              </InlineStack>
            </Banner>
          )}

          <Divider />

          {/* Description Editor */}
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">Product Description</Text>
            <Box borderColor="border" borderWidth="025" borderRadius="200">
              <Editor
                apiKey={process.env.TINYMCE_API_KEY}
                value={formData.description}
                onEditorChange={(content) => onChange({ description: content })}
                init={editorConfig}
              />
            </Box>
          </BlockStack>

          {/* SEO Title Editor */}
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">SEO Title</Text>
            <Text variant="bodySm" as="p" tone="subdued">
              Maximum 60 characters for optimal search engine display
            </Text>
            <Box borderColor="border" borderWidth="025" borderRadius="200">
              <Editor
                apiKey={process.env.TINYMCE_API_KEY}
                value={formData.seoTitle}
                onEditorChange={(content) => onChange({ seoTitle: content })}
                init={{ ...editorConfig, height: 100, toolbar: 'bold italic | removeformat' }}
              />
            </Box>
            <Text variant="bodySm" as="p" tone={formData.seoTitle.length > 60 ? 'critical' : 'subdued'}>
              {formData.seoTitle.length}/60 characters
            </Text>
          </BlockStack>

          {/* SEO Description Editor */}
          <BlockStack gap="400">
            <Text variant="headingSm" as="h3">SEO Meta Description</Text>
            <Text variant="bodySm" as="p" tone="subdued">
              Maximum 155 characters for optimal search engine display
            </Text>
            <Box borderColor="border" borderWidth="025" borderRadius="200">
              <Editor
                apiKey={process.env.TINYMCE_API_KEY}
                value={formData.seoDescription}
                onEditorChange={(content) => onChange({ seoDescription: content })}
                init={{ ...editorConfig, height: 120, toolbar: 'bold italic | removeformat' }}
              />
            </Box>
            <Text variant="bodySm" as="p" tone={formData.seoDescription.length > 155 ? 'critical' : 'subdued'}>
              {formData.seoDescription.length}/155 characters
            </Text>
          </BlockStack>

          <InlineStack gap="300" align="end">
            <Button onClick={onBack}>Back</Button>
            <Button
              variant="primary"
              onClick={onNext}
              disabled={!formData.description}
            >
              Next
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>
    </>
  );
}
```

## 4. AI Service Implementation

### Create `app/services/ai.server.ts`:

```typescript
import { Configuration, OpenAIApi } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { prisma } from '../db.server';
import { logger } from './logger.server';
import { getProductTypePrompt } from './prompts/product-type-prompts';
import { formatProductDescription } from './prompts/formatting';

export class AIService {
  private openai?: OpenAIApi;
  private anthropic?: Anthropic;
  private provider: 'openai' | 'anthropic';

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
      this.openai = new OpenAIApi(configuration);
      this.provider = 'openai';
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.provider = 'anthropic';
    } else {
      throw new Error('No AI API key configured');
    }
  }

  async generateProductDescription(params: {
    shop: string;
    productTitle: string;
    productType: string;
    category: string;
    vendor: string;
    keywords: string[];
    additionalContext?: string;
    imageAnalysis?: string;
    shopSettings?: any;
    scrapedData?: any;
  }): Promise<{
    description: string;
    seoTitle: string;
    seoDescription: string;
  }> {
    const systemPrompt = getProductTypePrompt(params.productType);
    const userPrompt = this.buildUserPrompt(params);

    try {
      let response: string;
      
      if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.createChatCompletion({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1500,
        });
        response = completion.data.choices[0].message?.content || '';
      } else if (this.provider === 'anthropic' && this.anthropic) {
        const completion = await this.anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt,
          max_tokens: 1500,
          temperature: 0.7,
        });
        response = completion.content[0].type === 'text' ? completion.content[0].text : '';
      } else {
        throw new Error('AI provider not configured');
      }

      // Log the generation
      await prisma.aIGenerationLog.create({
        data: {
          shop: params.shop,
          generationType: 'description',
          prompt: userPrompt,
          response,
        }
      });

      return this.parseAIResponse(response);
    } catch (error) {
      logger.error('AI generation failed:', error);
      throw error;
    }
  }

  private buildUserPrompt(params: any): string {
    const settings = params.shopSettings || {};
    
    return `
Context about the store:
- Store Name: ${settings.storeName || params.shop}
- Location: ${settings.storeLocation || 'Not specified'}
- Unique Selling Points: ${settings.uniqueSellingPoints || 'Not specified'}
- Core Values: ${settings.coreValues || 'Not specified'}
- Brand Personality: ${settings.brandPersonality || 'Not specified'}

Target Customer Profile:
- Who They Are: ${settings.targetCustomer || 'Not specified'}
- Pain Points: ${settings.customerPainPoints || 'Not specified'}
- Desires: ${settings.customerDesires || 'Not specified'}
- Lifestyle: ${settings.lifestyleHabits || 'Not specified'}
- Aspirations: ${settings.aspirations || 'Not specified'}
- Buying Motivations: ${settings.buyingMotivations || 'Not specified'}

Product Information:
- Title: ${params.productTitle}
- Type: ${params.productType}
- Category: ${params.category}
- Vendor: ${params.vendor}
- Primary Keywords: ${params.keywords.join(', ')}
${params.additionalContext ? `- Additional Context: ${params.additionalContext}` : ''}
${params.scrapedData ? `- Scraped Product Info: ${JSON.stringify(params.scrapedData)}` : ''}
${params.imageAnalysis ? `- Visual Analysis: ${params.imageAnalysis}` : ''}

Create a compelling product description following the structure provided in the system prompt.
Ensure the primary keyword "${params.keywords[0]}" appears naturally in the headline and at least 2-3 times throughout the description.
${params.keywords[1] ? `Include the secondary keyword "${params.keywords[1]}" naturally 1-2 times.` : ''}

Format the response as JSON:
{
  "description": "HTML formatted description (300-500 words)",
  "seoTitle": "SEO title (max 60 chars, include primary keyword)",
  "seoDescription": "Meta description (max 155 chars, compelling CTA)"
}

Make the content optimized for both search engines and generative AI platforms (GEO - Generative Engine Optimization).
`;
  }

  private parseAIResponse(response: string): {
    description: string;
    seoTitle: string;
    seoDescription: string;
  } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return {
        description: formatProductDescription(parsed.description),
        seoTitle: parsed.seoTitle.substring(0, 60),
        seoDescription: parsed.seoDescription.substring(0, 155),
      };
    } catch (error) {
      // Fallback parsing if not valid JSON
      logger.error('Failed to parse AI response as JSON:', error);
      return {
        description: response,
        seoTitle: '',
        seoDescription: '',
      };
    }
  }
}
```

## 5. Prompt Templates

### Create `app/services/prompts/base-prompt.ts`:

```typescript
export const BASE_SYSTEM_PROMPT = `
You are an expert e-commerce copywriter specializing in creating compelling product descriptions that:
1. Convert browsers into buyers through emotional connection and clear benefits
2. Rank well in search engines (SEO optimized)
3. Perform well in AI-powered search and recommendations (GEO - Generative Engine Optimization)

Writing Style Guidelines:
- Use power words that trigger emotion and action
- Write in active voice with short, punchy sentences
- Address the customer directly using "you" language
- Focus on benefits over features (how it improves their life)
- Create urgency without being pushy
- Use sensory language when applicable

SEO & GEO Guidelines:
- Include keywords naturally without stuffing
- Use semantic variations of keywords
- Structure content with clear HTML headers (H2, H3)
- Include specific details that AI systems can extract
- Write in a way that answers common customer questions

Required Structure:
1. Compelling H2 headline with primary keyword
2. Opening paragraph that addresses customer desires/pain points
3. "Why You'll Love It" section with emotional benefits
4. "Highlights" bulleted list (5-7 specific benefits)
5. "Details & Fit" section with specifications
6. "Perfect For" lifestyle integration paragraph

Length: 300-500 words total
Tone: Match the brand personality while being conversational and trustworthy
`;
```

### Create `app/services/prompts/product-type-prompts.ts`:

```typescript
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
    `,
    
    'Electronics': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for electronics:
      - Balance technical specs with user benefits
      - Explain complex features in simple terms
      - Emphasize compatibility and ease of use
      - Include warranty/support information
      - Address common technical concerns
    `,
    
    'Beauty': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for beauty products:
      - Focus on results and transformation
      - Include key ingredients and their benefits
      - Address specific skin/hair concerns
      - Mention application tips
      - Emphasize safety and quality standards
    `,
    
    'Home & Garden': `
      ${BASE_SYSTEM_PROMPT}
      
      Additional guidelines for home & garden:
      - Paint a picture of the improved living space
      - Include dimensions and assembly info
      - Emphasize durability and materials
      - Suggest complementary items
      - Address maintenance and care
    `,
    
    // Add more product types...
  };

  return prompts[productType] || BASE_SYSTEM_PROMPT;
}
```

## 6. API Routes

### Create `app/routes/api.shopify.generate-description.ts`:

```typescript
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { AIService } from "../services/ai.server";
import { ProductScraperService } from "../services/scraper.server";
import { ImageAnalysisService } from "../services/image-analysis.server";
import { prisma } from "../db.server";

export const action = async ({ request }: { request: Request }) => {
  const { session } = await authenticate.admin(request);
  const data = await request.json();

  try {
    let scrapedData = null;
    let imageAnalysis = null;

    // Scrape URL if provided
    if (data.method === 'url' && data.productUrl) {
      const scraper = new ProductScraperService();
      scrapedData = await scraper.scrapeProductInfo(data.productUrl);
    }

    // Analyze images if available
    if (data.hasImages) {
      const analyzer = new ImageAnalysisService();
      imageAnalysis = await analyzer.analyzeProductImages(data.images);
    }

    // Get shop settings
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shop: session.shop }
    });

    // Generate description
    const ai = new AIService();
    const result = await ai.generateProductDescription({
      shop: session.shop,
      ...data,
      shopSettings,
      scrapedData,
      imageAnalysis,
    });

    return json(result);
  } catch (error) {
    console.error('Generation error:', error);
    return json({ error: 'Failed to generate description' }, { status: 500 });
  }
};
```

### Create `app/routes/api.shopify.shop-settings.ts`:

```typescript
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const loader = async ({ request }: { request: Request }) => {
  const { session } = await authenticate.admin(request);
  
  const settings = await prisma.shopSettings.findUnique({
    where: { shop: session.shop }
  });

  return json(settings || {});
};
```

## 7. Update Product Builder Flow

### Modify `app/routes/app.product-builder.tsx`:

Add the new step after Product Details:

```typescript
// In the getSteps function, add StepAIDescription
import StepAIDescription from './product-builder/steps/StepAIDescription';

const getSteps = () => {
  if (hasVariants === null) {
    return [
      { title: 'Vendor & Type', component: StepVendorType, phase: 1 },
      { title: 'Product Details', component: StepProductDetails, phase: 1 },
      { title: 'AI Description', component: StepAIDescription, phase: 1 }, // NEW
      { title: 'Tags', component: StepTags, phase: 1 },
      { title: 'Pricing', component: StepPricing, phase: 1 },
      { title: 'Variants?', component: StepVariantDecision, phase: 1 }
    ];
  }
  // ... continue with existing logic
};

// Update formData state to include new fields
const [formData, setFormData] = useState({
  // ... existing fields
  description: '',
  seoTitle: '',
  seoDescription: '',
});
```

## 8. Update Navigation

### Modify `app/routes/app.tsx`:

```typescript
<NavMenu
  navigation={[
    {
      label: "Product Builder",
      destination: "/app/product-builder",
    },
    {
      label: "Settings",
      destination: "/app/settings",
    },
  ]}
/>
```

## 9. Onboarding Component

### Create `app/components/OnboardingFlow.tsx`:

```typescript
import { useState } from 'react';
import {
  Modal,
  TextContainer,
  Button,
  Stack,
  ProgressBar,
  Text,
  Banner,
} from '@shopify/polaris';

interface OnboardingFlowProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingFlow({ open, onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: 'Welcome to AI-Powered Descriptions!',
      content: 'Generate compelling product descriptions that convert browsers into buyers.',
    },
    {
      title: 'Tell Us About Your Brand',
      content: 'Complete your settings to help AI understand your unique brand voice and target customers.',
    },
    {
      title: 'Boost Your Sales',
      content: 'Well-crafted descriptions can increase conversion rates by up to 30%!',
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Modal
      open={open}
      onClose={onSkip}
      title="Get Started with AI Descriptions"
      primaryAction={{
        content: currentStep === steps.length - 1 ? 'Go to Settings' : 'Next',
        onAction: () => {
          if (currentStep === steps.length - 1) {
            onComplete();
          } else {
            setCurrentStep(prev => prev + 1);
          }
        },
      }}
      secondaryActions={[{
        content: 'Skip for now',
        onAction: onSkip,
      }]}
    >
      <Modal.Section>
        <Stack vertical>
          <ProgressBar progress={progress} size="small" />
          
          <TextContainer>
            <Text variant="headingMd" as="h2">
              {steps[currentStep].title}
            </Text>
            <Text as="p">{steps[currentStep].content}</Text>
          </TextContainer>
          
          {currentStep === 1 && (
            <Banner tone="info">
              <Text as="p">
                Settings are optional but highly recommended for best results!
              </Text>
            </Banner>
          )}
        </Stack>
      </Modal.Section>
    </Modal>
  );
}
```

## 10. Environment Variables

Add to `.env`:

```bash
# AI Provider (choose one)
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...

# TinyMCE for WYSIWYG editor
TINYMCE_API_KEY=your-tinymce-api-key
```

## 11. Package Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "openai": "^4.0.0",
    "@anthropic-ai/sdk": "^0.24.0",
    "@tinymce/tinymce-react": "^4.3.0",
    "playwright": "^1.40.0"
  }
}
```

Run `npm install` after adding dependencies.

## 12. Additional Services

### Create `app/services/scraper.server.ts` for URL scraping
### Create `app/services/image-analysis.server.ts` for image analysis
### Create `app/services/prompts/formatting.ts` for HTML formatting utilities

## 13. Error Handling

- Implement retry logic for AI API calls
- Add rate limiting per shop
- Validate all generated content
- Sanitize HTML output
- Handle API quota limits gracefully

## 14. Testing Checklist

1. **Settings Page**
   - [ ] Settings persist across sessions
   - [ ] All fields save correctly
   - [ ] Toast notifications work

2. **AI Generation**
   - [ ] Manual entry works
   - [ ] URL scraping works
   - [ ] Context generation works
   - [ ] Regeneration limit enforced
   - [ ] Keywords properly integrated

3. **WYSIWYG Editors**
   - [ ] Description editor works
   - [ ] SEO fields enforce character limits
   - [ ] HTML output is clean

4. **Integration**
   - [ ] New step appears in correct position
   - [ ] Data flows to product creation
   - [ ] Navigation works correctly

5. **Onboarding**
   - [ ] Shows on first use
   - [ ] Links to settings correctly
   - [ ] Can be skipped

## Implementation Notes

1. Start with database schema and run migrations
2. Implement settings page first to establish data structure
3. Add WYSIWYG editor support (TinyMCE)
4. Create AI service with basic OpenAI integration
5. Build the AI Description step component
6. Add prompt templates for different product types
7. Implement URL scraping (can start with basic implementation)
8. Add image analysis (optional enhancement)
9. Create onboarding flow
10. Test thoroughly with various product types

This implementation provides a powerful AI-assisted product description system that leverages shop-specific context to generate highly targeted, SEO and GEO optimized content while maintaining full user control over the final output.