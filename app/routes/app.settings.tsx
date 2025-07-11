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
  const [toastActive, setToastActive] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Initialize form state with settings data
  const [formData, setFormData] = useState({
    storeName: settings?.storeName || '',
    storeLocation: settings?.storeLocation || '',
    targetCustomer: settings?.targetCustomer || '',
    customerPainPoints: settings?.customerPainPoints || '',
    customerDesires: settings?.customerDesires || '',
    uniqueSellingPoints: settings?.uniqueSellingPoints || '',
    coreValues: settings?.coreValues || '',
    brandPersonality: settings?.brandPersonality || '',
    lifestyleHabits: settings?.lifestyleHabits || '',
    aspirations: settings?.aspirations || '',
    buyingMotivations: settings?.buyingMotivations || '',
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
                      value={formData.targetCustomer}
                      onChange={handleChange('targetCustomer')}
                      multiline={3}
                      helpText="Describe demographics, interests, and characteristics. Example: 'Busy professionals aged 25-45 who value quality and sustainability'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="What problems do they face?"
                      name="customerPainPoints"
                      value={formData.customerPainPoints}
                      onChange={handleChange('customerPainPoints')}
                      multiline={3}
                      helpText="What frustrations or challenges do your products solve? Example: 'Lack of time for self-care, difficulty finding eco-friendly options'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="What do they desire?"
                      name="customerDesires"
                      value={formData.customerDesires}
                      onChange={handleChange('customerDesires')}
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

              {/* Customer Psychology */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Customer Psychology</Text>
                  
                  <FormLayout>
                    <TextField
                      label="Lifestyle and Daily Habits"
                      name="lifestyleHabits"
                      value={formData.lifestyleHabits}
                      onChange={handleChange('lifestyleHabits')}
                      multiline={3}
                      helpText="How do your customers live? Example: 'Active lifestyle, shops online during lunch breaks, values experiences over possessions'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Aspirations & Desired Identity"
                      name="aspirations"
                      value={formData.aspirations}
                      onChange={handleChange('aspirations')}
                      multiline={3}
                      helpText="Who do they want to become? Example: 'Want to be seen as successful, eco-conscious, trendsetter'"
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Buying Motivations and Triggers"
                      name="buyingMotivations"
                      value={formData.buyingMotivations}
                      onChange={handleChange('buyingMotivations')}
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
      
      {toastMarkup}
      
      <OnboardingFlow
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
      />
    </Page>
  );
}