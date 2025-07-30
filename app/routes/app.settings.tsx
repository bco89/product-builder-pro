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
  const { session, admin } = await authenticate.admin(request);
  
  // Fetch shop name from Shopify
  let shopName = '';
  try {
    const response = await admin.graphql(
      `#graphql
      query getShop {
        shop {
          name
        }
      }`
    );
    const responseJson = await response.json();
    shopName = responseJson.data?.shop?.name || '';
  } catch (error) {
    console.error('Failed to fetch shop name:', error);
  }
  
  const settings = await prisma.shopSettings.findUnique({
    where: { shop: session.shop }
  });

  return json({ settings, shop: session.shop, shopName });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const settings = {
    storeName: formData.get('storeName')?.toString() || '',
    businessType: formData.get('businessType')?.toString() || '',
    uniqueSellingPoints: formData.get('uniqueSellingPoints')?.toString() || '',
    coreValues: formData.get('coreValues')?.toString() || '',
    brandPersonality: formData.get('brandPersonality')?.toString() || '',
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
  const { settings, shopName } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [toastActive, setToastActive] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Initialize form state with settings data
  const [formData, setFormData] = useState({
    storeName: settings?.storeName || shopName || '',
    businessType: settings?.businessType || 'retailer',
    uniqueSellingPoints: settings?.uniqueSellingPoints || '',
    coreValues: settings?.coreValues || '',
    brandPersonality: settings?.brandPersonality || '',
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
                      helpText="Pre-filled with your Shopify store name. You can customize this if your brand name is different."
                      autoComplete="off"
                    />
                    
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">Description Voice</Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        This determines how your product descriptions are written. Choose based on your relationship with the products.
                      </Text>
                      <BlockStack gap="300">
                        <RadioButton
                          label="Product Creator / Manufacturer"
                          helpText="Uses 'we/our' language (first-person voice) - Example: 'We handcraft each item...'"
                          checked={formData.businessType === 'manufacturer'}
                          id="manufacturer"
                          name="businessType"
                          onChange={() => handleChange('businessType')('manufacturer')}
                        />
                        <RadioButton
                          label="Retailer / Reseller"
                          helpText="Uses neutral, third-person descriptions - Example: 'This product features...'"
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