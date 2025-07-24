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
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const maxRetries = 3;

  // Detect mobile device
  const isMobile = typeof navigator !== 'undefined' && 
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const initTimeout = isMobile ? 3000 : 1500;

  useEffect(() => {
    checkScopes();
  }, [retryCount]);

  const checkScopes = async () => {
    try {
      // Add delay to ensure App Bridge is fully initialized
      await new Promise(resolve => setTimeout(resolve, initTimeout));
      
      const { granted } = await shopify.scopes.query();
      console.log('App Bridge scope check - Granted scopes:', granted);
      
      const missing = REQUIRED_SCOPES.filter(scope => !granted.includes(scope));
      
      if (missing.length === 0) {
        setHasRequiredScopes(true);
        console.log('All required scopes are granted');
        setLoading(false);
      } else {
        setMissingScopes(missing);
        setHasRequiredScopes(false);
        console.log('Missing scopes:', missing);
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error checking scopes:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
        appBridgeAvailable: !!shopify,
        scopesAPIAvailable: !!shopify?.scopes,
        isMobile,
        retryCount
      });
      
      // If the scopes API is not available, check if we should retry
      if (error?.message?.includes('scopes') || error?.message?.includes('undefined')) {
        if (retryCount < maxRetries) {
          const backoff = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying scope check in ${backoff}ms (attempt ${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, backoff);
          return; // Don't set loading to false yet
        } else {
          console.error(`Failed to initialize after ${maxRetries} attempts`);
          // On mobile, show user-friendly error instead of assuming scopes
          if (isMobile) {
            setError({
              message: 'Unable to verify app permissions',
              details: 'Please try refreshing the page or opening the app on a desktop browser.'
            });
            setLoading(false);
            return;
          }
          // On desktop, fall back to assuming scopes are granted
          console.warn('Scopes API not available after retries, assuming scopes are granted');
          setHasRequiredScopes(true);
        }
      }
    } finally {
      // Only set loading to false if we're not going to retry
      if (retryCount >= maxRetries) {
        setLoading(false);
      }
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
            {retryCount > 0 && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                Retry attempt {retryCount} of {maxRetries}...
              </p>
            )}
          </Card>
        </Page>
      </ScopeContext.Provider>
    );
  }

  if (error) {
    return (
      <ScopeContext.Provider value={{ hasRequiredScopes: false, loading: false, missingScopes: [] }}>
        <Page>
          <Banner
            title={error.message}
            tone="critical"
            action={{
              content: 'Refresh page',
              onAction: () => window.location.reload()
            }}
          >
            {error.details && <p>{error.details}</p>}
          </Banner>
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