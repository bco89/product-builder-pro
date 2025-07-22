import { createContext, useContext } from 'react';

interface ScopeContextValue {
  hasRequiredScopes: boolean;
  loading: boolean;
  missingScopes: string[];
}

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined);

export function useScopeContext() {
  const context = useContext(ScopeContext);
  if (context === undefined) {
    throw new Error('useScopeContext must be used within a ScopeProvider');
  }
  return context;
}

export { ScopeContext };