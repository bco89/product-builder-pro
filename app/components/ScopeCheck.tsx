import { useEffect, useState } from 'react';
import { Banner, Card, Page } from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { ScopeContext } from '../contexts/ScopeContext';

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
      // Add delay to ensure App Bridge is fully initialized
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { granted } = await shopify.scopes.query();
      console.log('App Bridge scope check - Granted scopes:', granted);
      
      const missing = REQUIRED_SCOPES.filter(scope => !granted.includes(scope));
      
      if (missing.length === 0) {
        setHasRequiredScopes(true);
        console.log('All required scopes are granted');
      } else {
        setMissingScopes(missing);
        setHasRequiredScopes(false);
        console.log('Missing scopes:', missing);
      }
    } catch (error: any) {
      console.error('Error checking scopes:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
        appBridgeAvailable: !!shopify,
        scopesAPIAvailable: !!shopify?.scopes
      });
      
      // If the scopes API is not available, assume we have the required scopes
      // This can happen in development or with older App Bridge versions
      if (error?.message?.includes('scopes') || error?.message?.includes('undefined')) {
        console.warn('Scopes API may not be available, assuming scopes are granted');
        setHasRequiredScopes(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const requestScopes = async () => {
    try {
      setLoading(true);
      console.log('Requesting scopes via App Bridge:', missingScopes);
      
      const response = await shopify.scopes.request(missingScopes);
      console.log('Scope request response:', response);
      
      if (response.result === 'granted-all') {
        console.log('All requested scopes were granted');
        // Scopes were granted, refresh the check
        await checkScopes();
        
        // Force a page reload to ensure the session is updated
        window.location.reload();
      } else {
        console.log('User declined scope request or partial grant:', response.result);
        // Still check scopes in case some were granted
        await checkScopes();
      }
    } catch (error: any) {
      console.error('Error requesting scopes:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorStack: error?.stack
      });
      
      // If App Bridge scope request fails, try manual re-authentication
      if (error?.message?.includes('scopes') || error?.message?.includes('undefined')) {
        console.warn('App Bridge scope request failed, trying manual re-authentication');
        // Clear session and redirect to re-authenticate
        window.location.href = '/app/clear-session';
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ScopeContext.Provider value={{ hasRequiredScopes: false, loading: true, missingScopes: [] }}>
        <Page>
          <Card>
            <p>Checking app permissions...</p>
          </Card>
        </Page>
      </ScopeContext.Provider>
    );
  }

  if (!hasRequiredScopes) {
    return (
      <ScopeContext.Provider value={{ hasRequiredScopes: false, loading: false, missingScopes }}>
        <Page>
          <Banner 
            title="Additional permissions required"
            tone="warning"
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
      </ScopeContext.Provider>
    );
  }

  // All required scopes are granted, render children with context
  return (
    <ScopeContext.Provider value={{ hasRequiredScopes, loading, missingScopes }}>
      {children}
    </ScopeContext.Provider>
  );
}