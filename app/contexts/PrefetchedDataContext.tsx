import { createContext, useContext } from 'react';
import type { ProductTypesData } from '../types/shopify';

interface PrefetchedData {
  vendors: string[];
  productTypes: ProductTypesData | null;
  fromCache: boolean;
}

const PrefetchedDataContext = createContext<PrefetchedData | null>(null);

export function PrefetchedDataProvider({ 
  children, 
  data 
}: { 
  children: React.ReactNode;
  data: PrefetchedData;
}) {
  return (
    <PrefetchedDataContext.Provider value={data}>
      {children}
    </PrefetchedDataContext.Provider>
  );
}

export function usePrefetchedData() {
  const context = useContext(PrefetchedDataContext);
  if (!context) {
    throw new Error('usePrefetchedData must be used within PrefetchedDataProvider');
  }
  return context;
}