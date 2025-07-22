import { useEffect, useState } from 'react';
import { Banner, Card, Page } from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';

const REQUIRED_SCOPES = ['write_products', 'read_products'];

export function ScopeCheck({ children }: { children: React.ReactNode }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [hasRequiredScopes, setHasRequiredScopes] = useState(false);
  const [missingScopes, setMissingScopes] = useState<string[]>([]);

  useEffect(() => {
    checkScopes();
  }, []);

  const checkScopes = async () => {
    try {
      const { granted } = await shopify.scopes.query();
      console.log('Granted scopes:', granted);
      
      const missing = REQUIRED_SCOPES.filter(scope => !granted.includes(scope));
      
      if (missing.length === 0) {
        setHasRequiredScopes(true);
      } else {
        setMissingScopes(missing);
        setHasRequiredScopes(false);
      }
    } catch (error) {
      console.error('Error checking scopes:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestScopes = async () => {
    try {
      setLoading(true);
      const response = await shopify.scopes.request(missingScopes);
      
      if (response.result === 'granted-all') {
        // Scopes were granted, refresh the check
        await checkScopes();
      } else {
        console.log('User declined scope request');
      }
    } catch (error) {
      console.error('Error requesting scopes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <Card>
          <p>Checking app permissions...</p>
        </Card>
      </Page>
    );
  }

  if (!hasRequiredScopes) {
    return (
      <Page>
        <Banner 
          title="Additional permissions required"
          status="warning"
          action={{
            content: 'Grant permissions',
            onAction: requestScopes
          }}
        >
          <p>
            This app requires additional permissions to function properly. 
            Please click "Grant permissions" to update your app's access.
          </p>
          <p>
            Missing permissions: {missingScopes.join(', ')}
          </p>
        </Banner>
      </Page>
    );
  }

  // All required scopes are granted, render children
  return <>{children}</>;
}