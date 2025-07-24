/**
 * Polaris-based Error Boundary component for graceful error handling
 */

import React from "react";
import { Card, Page, Text, Button, BlockStack, InlineStack } from "@shopify/polaris";
import { AlertTriangleIcon } from "@shopify/polaris-icons";

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to monitoring service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // In production, you would send this to a monitoring service
    if (typeof window !== "undefined" && window.location) {
      const errorContext = {
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };
      
      // Send to monitoring service
      // For now, just log to console
      console.error("Error context:", errorContext);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            resetError={this.resetError}
          />
        );
      }

      // Default error UI
      return (
        <Page>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200" align="start">
                <div style={{ color: "var(--p-color-icon-critical)" }}>
                  <AlertTriangleIcon />
                </div>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Something went wrong
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    We encountered an unexpected error. The issue has been logged and we'll look into it.
                  </Text>
                  
                  {/* Show error details in development */}
                  {process.env.NODE_ENV !== "production" && this.state.error && (
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="critical">
                        Error: {this.state.error.message}
                      </Text>
                      {this.state.errorInfo && (
                        <details style={{ marginTop: "8px" }}>
                          <summary style={{ cursor: "pointer" }}>
                            <Text as="span" variant="bodySm">
                              Component Stack
                            </Text>
                          </summary>
                          <pre style={{ 
                            fontSize: "12px", 
                            overflow: "auto", 
                            padding: "8px",
                            backgroundColor: "var(--p-color-bg-surface-secondary)",
                            borderRadius: "4px",
                            marginTop: "8px"
                          }}>
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </BlockStack>
                  )}
                </BlockStack>
              </InlineStack>
              
              <InlineStack gap="200">
                <Button onClick={this.handleReload} variant="primary">
                  Reload page
                </Button>
                <Button onClick={this.handleGoBack} variant="plain">
                  Go back
                </Button>
                <Button onClick={this.resetError} variant="plain">
                  Try again
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Page>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to easily wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}

/**
 * Simple error fallback component
 */
export function SimpleErrorFallback({ 
  error, 
  resetError 
}: { 
  error: Error; 
  resetError: () => void;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h3" variant="headingSm">
          Oops! Something went wrong
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          {error.message || "An unexpected error occurred"}
        </Text>
        <Button onClick={resetError} size="slim">
          Try again
        </Button>
      </BlockStack>
    </Card>
  );
}