import { useState, useEffect } from 'react';
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
  RadioButton,
  InlineStack,
} from '@shopify/polaris';
import { QuestionCircleIcon } from '@shopify/polaris-icons';
import { authenticate } from '../shopify.server';
import { json } from '@remix-run/node';
import { useLoaderData, useSubmit, useNavigation, Form } from '@remix-run/react';
import { prisma } from '../db.server';
import { OnboardingFlow } from '../components/OnboardingFlow';
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const settings = await prisma.shopSettings.findUnique({
    where: { shop: session.shop }
  });

  return json({ settings, shop: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const settings = {
    storeName: formData.get('storeName')?.toString() || '',
    storeLocation: formData.get('storeLocation')?.toString() || '',
    businessType: formData.get('businessType')?.toString() || '',
    uniqueSellingPoints: formData.get('uniqueSellingPoints')?.toString() || '',
    coreValues: formData.get('coreValues')?.toString() || '',
    brandPersonality: formData.get('brandPersonality')?.toString() || '',
    targetCustomerOverride: formData.get('targetCustomerOverride')?.toString() || '',
    additionalCustomerInsights: formData.get('additionalCustomerInsights')?.toString() || '',
    excludedCustomerSegments: formData.get('excludedCustomerSegments')?.toString() || '',
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
  const [toastActive, setToastActive] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Initialize form state with settings data
  const [formData, setFormData] = useState({
    storeName: settings?.storeName || '',
    storeLocation: settings?.storeLocation || '',
    businessType: settings?.businessType || 'retailer',
    uniqueSellingPoints: settings?.uniqueSellingPoints || '',
    coreValues: settings?.coreValues || '',
    brandPersonality: settings?.brandPersonality || '',
    targetCustomerOverride: settings?.targetCustomerOverride || '',
    additionalCustomerInsights: settings?.additionalCustomerInsights || '',
    excludedCustomerSegments: settings?.excludedCustomerSegments || '',
  });
  
  const isSubmitting = navigation.state === 'submitting';

  // Show onboarding if settings don't exist (first time user)
  useEffect(() => {
    if (!settings) {
      setShowOnboarding(true);
    }
  }, [settings]);

  const handleChange = (field: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formDataToSubmit = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSubmit.append(key, value);
    });
    submit(formDataToSubmit, { method: 'post' });
    setToastActive(true);
  };

  const toastMarkup = toastActive ? (
    <Toast content="Settings saved successfully!" onDismiss={() => setToastActive(false)} />
  ) : null;

  return (
    <Page
      title="AI Description Settings"
      subtitle="Configure your store's brand identity and customer profile for AI-powered product descriptions"
    >
      <Box paddingBlockEnd="800">
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
                      value={formData.storeName}
                      onChange={handleChange('storeName')}
                      autoComplete="off"
                    />
                    <TextField
                      label="Store Location"
                      name="storeLocation"
                      value={formData.storeLocation}
                      onChange={handleChange('storeLocation')}
                      helpText="e.g., 'Austin, Texas' or 'Made in USA'"
                      autoComplete="off"
                    />
                    
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">Business Type</Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Choose whether you create your own products or sell products from other brands
                      </Text>
                      <BlockStack gap="300">
                        <RadioButton
                          label="Product Creator / Manufacturer"
                          helpText="I make, design, or manufacture my own products"
                          checked={formData.businessType === 'manufacturer'}
                          id="manufacturer"
                          name="businessType"
                          onChange={() => handleChange('businessType')('manufacturer')}
                        />
                        <RadioButton
                          label="Retailer / Reseller"
                          helpText="I sell products from other brands or suppliers"
                          checked={formData.businessType === 'retailer'}
                          id="retailer"
                          name="businessType"
                          onChange={() => handleChange('businessType')('retailer')}
                        />
                      </BlockStack>
                    </BlockStack>
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Customer Customization */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Customer Customization (Optional)</Text>
                  <Banner tone="info">
                    <Text as="p">
                      Our AI already understands typical customers for each product type. Use these fields only if your store serves a very specific niche or needs to exclude certain segments.
                    </Text>
                  </Banner>
                  
                  <FormLayout>
                    <TextField
                      label="Target Customer Override (Optional)"
                      name="targetCustomerOverride"
                      value={formData.targetCustomerOverride}
                      onChange={handleChange('targetCustomerOverride')}
                      multiline={2}
                      helpText="Only fill this if your store serves a VERY specific niche different from typical product buyers. Example: 'Only eco-conscious millennials' or 'Exclusively B2B corporate buyers'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Additional Customer Insights (Optional)"
                      name="additionalCustomerInsights"
                      value={formData.additionalCustomerInsights}
                      onChange={handleChange('additionalCustomerInsights')}
                      multiline={2}
                      helpText="Any unique insights about your customers that supplement (not replace) standard customer profiles. Example: 'Our customers particularly value handmade craftsmanship' or 'Most buyers are repeat customers'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Excluded Customer Segments (Optional)"
                      name="excludedCustomerSegments"
                      value={formData.excludedCustomerSegments}
                      onChange={handleChange('excludedCustomerSegments')}
                      multiline={2}
                      helpText="Specify any customer segments you explicitly DON'T serve. Example: 'Not for bargain hunters' or 'Not suitable for beginners'"
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
                      value={formData.uniqueSellingPoints}
                      onChange={handleChange('uniqueSellingPoints')}
                      multiline={3}
                      helpText="What makes your products special? Example: 'Handcrafted in small batches, 10% of profits donated to charity'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Core Values & Beliefs"
                      name="coreValues"
                      value={formData.coreValues}
                      onChange={handleChange('coreValues')}
                      multiline={3}
                      helpText="What principles guide your business? Example: 'Sustainability, transparency, community support'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Brand Personality"
                      name="brandPersonality"
                      value={formData.brandPersonality}
                      onChange={handleChange('brandPersonality')}
                      multiline={2}
                      helpText="How would you describe your brand's voice? Example: 'Friendly, authentic, inspiring, professional yet approachable'"
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
      
      {toastMarkup}
      
      <OnboardingFlow
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
      />
      </Box>
    </Page>
  );
}