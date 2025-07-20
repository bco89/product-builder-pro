import { useCallback, useMemo, useState } from 'react';
import {
  Card,
  FormLayout,
  Button,
  Text,
  ButtonGroup,
  Combobox,
  Listbox,
  Autocomplete,
  Icon,
  InlineStack,
  BlockStack,
  InlineError,
  Banner,
  Modal,
  Checkbox
} from '@shopify/polaris';
import { SearchIcon, PlusIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import LoadingProgress from '../../../components/LoadingProgress';

interface ProductType {
  productType: string;
  category: {
    id: string;
    name: string;
    fullName?: string;
    level?: number;
    isLeaf?: boolean;
  } | null;
}

interface FormDataType {
  vendor: string;
  productType: string;
  category: {
    id: string;
    name: string;
    fullName?: string;
    level?: number;
    isLeaf?: boolean;
  } | null;
}

interface StepVendorTypeProps {
  formData: FormDataType;
  onChange: (updates: Partial<FormDataType>) => void;
  onNext: () => void;
  onBack: () => void;
  productId?: string | null;
}

interface ProductTypesDataResponse {
  suggestedProductTypes?: string[];
  allProductTypes?: string[];
  fromCache?: boolean;
}

export default function StepVendorType({ formData, onChange, onNext, onBack, productId }: StepVendorTypeProps) {
  // State for search inputs
  const [vendorInputValue, setVendorInputValue] = useState(formData.vendor || '');
  const [productTypeInputValue, setProductTypeInputValue] = useState(formData.productType || '');
  const [filteredVendors, setFilteredVendors] = useState<string[]>([]);
  const [filteredProductTypes, setFilteredProductTypes] = useState<ProductType[]>([]);

  // State for new entry creation and confirmation
  const [newEntryConfirmation, setNewEntryConfirmation] = useState({
    isOpen: false,
    type: '' as 'vendor' | 'productType' | '',
    value: '',
    isConfirmed: false
  });

  // Fetch all vendors
  const { data: vendorsData, isLoading: vendorsLoading, error: vendorsError } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/products?type=vendors');
      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }
      const data = await response.json();
      return data.vendors || [];
    }
  });



  // Fetch product types for selected vendor with suggested and all types
  const { data: productTypesData, isLoading: productTypesLoading, error: productTypesError } = useQuery<ProductTypesDataResponse>({
    queryKey: ['productTypesByVendor', formData.vendor],
    enabled: !!formData.vendor,
    queryFn: async () => {
      const response = await fetch(`/api/shopify/product-types-by-vendor?vendor=${encodeURIComponent(formData.vendor)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product types');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes - increased for better performance
  });

  // Helper function to check if entry exists
  const isNewVendor = useCallback((value: string) => {
    return value && vendorsData && !vendorsData.includes(value);
  }, [vendorsData]);

  const isNewProductType = useCallback((value: string) => {
    if (!value || !productTypesData) return false;
    
    // Check if the value exists in either suggested or all product types
    const allTypes = [
      ...(productTypesData.suggestedProductTypes || []),
      ...(productTypesData.allProductTypes || [])
    ];
    
    return !allTypes.includes(value);
  }, [productTypesData]);

  // Handle new entry confirmation
  const handleNewEntryConfirmation = useCallback((type: 'vendor' | 'productType', value: string) => {
    setNewEntryConfirmation({
      isOpen: true,
      type,
      value,
      isConfirmed: false
    });
  }, []);

  const handleConfirmNewEntry = useCallback(() => {
    const { type, value } = newEntryConfirmation;
    
    if (!newEntryConfirmation.isConfirmed) {
      return; // User must check the confirmation box
    }

    switch (type) {
      case 'vendor':
        onChange({ 
          vendor: value,
          productType: '',
          category: null
        });
        setVendorInputValue(value);
        setProductTypeInputValue('');
        break;
      case 'productType':
        onChange({ 
          productType: value
        });
        setProductTypeInputValue(value);
        break;
    }

    setNewEntryConfirmation({
      isOpen: false,
      type: '',
      value: '',
      isConfirmed: false
    });
  }, [newEntryConfirmation, onChange]);

  const handleCancelNewEntry = useCallback(() => {
    setNewEntryConfirmation({
      isOpen: false,
      type: '',
      value: '',
      isConfirmed: false
    });
  }, []);

  // Filter vendors based on input
  const updateVendorText = useCallback((value: string) => {
    setVendorInputValue(value);
    
    if (!vendorsData) {
      setFilteredVendors([]);
      return;
    }
    
    if (value === '') {
      // Sort vendors alphabetically when showing all
      setFilteredVendors([...vendorsData].sort((a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
      return;
    }

    const filterRegex = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const resultVendors = vendorsData.filter((vendor: string) =>
      vendor.match(filterRegex)
    );
    // Sort filtered results alphabetically
    setFilteredVendors(resultVendors.sort((a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
  }, [vendorsData]);

  // Handle vendor selection
  const updateVendorSelection = useCallback((selected: string) => {
    if (selected === 'create-new-vendor') {
      handleNewEntryConfirmation('vendor', vendorInputValue);
      return;
    }

    const matchedVendor = filteredVendors.find((vendor: string) => vendor === selected);
    if (matchedVendor) {
      setVendorInputValue(matchedVendor);
      onChange({ 
        vendor: matchedVendor,
        productType: ''
      });
      setProductTypeInputValue('');
    }
  }, [filteredVendors, onChange, vendorInputValue, handleNewEntryConfirmation]);

  // Filter product types based on input
  const updateProductTypeText = useCallback((value: string) => {
    setProductTypeInputValue(value);
    
    if (!productTypesData) {
      setFilteredProductTypes([]);
      return;
    }
    
    // Combine suggested and all product types for filtering
    const allTypes = [
      ...(productTypesData.suggestedProductTypes || []).map((type: string) => ({ productType: type })),
      ...(productTypesData.allProductTypes || []).map((type: string) => ({ productType: type }))
    ];
    
    // Remove duplicates
    const uniqueTypes = allTypes.filter((type: ProductType, index: number, self: ProductType[]) => 
      index === self.findIndex((t: ProductType) => t.productType === type.productType)
    );
    
    if (value === '') {
      setFilteredProductTypes(uniqueTypes);
      return;
    }

    const filterRegex = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const resultProductTypes = uniqueTypes.filter((type: ProductType) =>
      type.productType.match(filterRegex)
    );
    setFilteredProductTypes(resultProductTypes);
  }, [productTypesData]);

  // Handle product type selection
  const updateProductTypeSelection = useCallback((selected: string[]) => {
    const selectedValue = selected[0];
    
    // Skip header/separator options
    if (selectedValue === 'suggested-header' || selectedValue === 'all-header') {
      return;
    }
    
    if (selectedValue === 'create-new-producttype') {
      handleNewEntryConfirmation('productType', productTypeInputValue);
      return;
    }

    if (selectedValue) {
      setProductTypeInputValue(selectedValue);
      onChange({ 
        productType: selectedValue
      });
    }
  }, [onChange, productTypeInputValue, handleNewEntryConfirmation]);

  // Vendor options for Combobox
  const vendorOptionsMarkup = useMemo(() => {
    const options = [];
    
    // Add existing vendors
    if (filteredVendors.length > 0) {
      filteredVendors.forEach((vendor: string) => {
        options.push(
          <Listbox.Option
            key={vendor}
            value={vendor}
            selected={formData.vendor === vendor}
            accessibilityLabel={vendor}
          >
            {vendor}
          </Listbox.Option>
        );
      });
    }

    // Add "Create new" option if input doesn't match any existing vendor
    if (vendorInputValue && isNewVendor(vendorInputValue)) {
      options.push(
        <Listbox.Option
          key="create-new-vendor"
          value="create-new-vendor"
          accessibilityLabel={`Create new vendor: ${vendorInputValue}`}
        >
          <InlineStack gap="200" align="center">
            <Icon source={PlusIcon} tone="base" />
            <Text as="span">Create new vendor: "{vendorInputValue}"</Text>
          </InlineStack>
        </Listbox.Option>
      );
    }

    return options.length > 0 ? options : null;
  }, [filteredVendors, vendorInputValue, isNewVendor, formData.vendor]);

  // Product type options for Autocomplete with suggested/all pattern
  const productTypeOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; disabled?: boolean }> = [];
    
    if (!productTypesData) return options;
    
    // Filter suggested types based on input
    const suggestedTypes = (productTypesData.suggestedProductTypes || []).filter((type: string) => {
      if (!productTypeInputValue) return true;
      const filterRegex = new RegExp(productTypeInputValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      return type.match(filterRegex);
    });
    
    // Filter all types based on input (excluding suggested ones)
    const suggestedSet = new Set(productTypesData.suggestedProductTypes || []);
    const allTypes = (productTypesData.allProductTypes || []).filter((type: string) => {
      if (suggestedSet.has(type)) return false; // Don't duplicate suggested types
      if (!productTypeInputValue) return true;
      const filterRegex = new RegExp(productTypeInputValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      return type.match(filterRegex);
    });
    
    // Add suggested types section
    if (suggestedTypes.length > 0) {
      options.push({
        value: 'suggested-header',
        label: `Suggested Product Types - From existing ${formData.vendor} products`,
        disabled: true
      });
      
      suggestedTypes.forEach((type: string) => {
        options.push({
          value: type,
          label: type
        });
      });
    }
    
    // Add all types section
    if (allTypes.length > 0) {
      options.push({
        value: 'all-header',
        label: 'All Product Types',
        disabled: true
      });
      
      allTypes.forEach((type: string) => {
        options.push({
          value: type,
          label: type
        });
      });
    }

    // Add "Create new" option if input doesn't match any existing product type
    if (productTypeInputValue && isNewProductType(productTypeInputValue)) {
      options.push({
        value: 'create-new-producttype',
        label: `Create new product type: "${productTypeInputValue}"`
      });
    }

    return options;
  }, [productTypesData, productTypeInputValue, formData.vendor, isNewProductType]);

  // Initialize filtered data when source data loads
  useMemo(() => {
    if (vendorsData && filteredVendors.length === 0 && vendorInputValue === '') {
      // Sort vendors alphabetically on initial load
      setFilteredVendors([...vendorsData].sort((a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
    }
  }, [vendorsData, filteredVendors.length, vendorInputValue]);

  useMemo(() => {
    if (productTypesData && filteredProductTypes.length === 0 && productTypeInputValue === '') {
      // Combine suggested and all product types for initial display
      const allTypes = [
        ...(productTypesData.suggestedProductTypes || []).map((type: string) => ({ productType: type })),
        ...(productTypesData.allProductTypes || []).map((type: string) => ({ productType: type }))
      ];
      
      // Remove duplicates
      const uniqueTypes = allTypes.filter((type: ProductType, index: number, self: ProductType[]) => 
        index === self.findIndex((t: ProductType) => t.productType === type.productType)
      );
      
      setFilteredProductTypes(uniqueTypes);
    }
  }, [productTypesData, filteredProductTypes.length, productTypeInputValue]);

  const handleSubmit = () => {
    if (formData.vendor && formData.productType) {
      onNext();
    }
  };

  // Check for any errors
  const hasErrors = vendorsError || productTypesError;

  const getConfirmationTitle = () => {
    const typeMap: Record<string, string> = {
      vendor: 'Vendor',
      productType: 'Product Type'
    };
    return typeMap[newEntryConfirmation.type] || 'Entry';
  };

  const getProductTypeHelpText = () => {
    if (!formData.vendor) {
      return "Select a vendor first to see product type suggestions";
    }
    
    return "Choose a product type that matches your item.";
  };

  return (
    <>
      <style>
        {`
          /* Make Autocomplete header options bold and black */
          [role="option"][aria-disabled="true"] {
            font-weight: bold !important;
            color: var(--p-color-text) !important;
          }
        `}
      </style>
      <Card>
        <FormLayout>
        <Text variant="headingMd" as="h2">Select Vendor & Product Type</Text>
        
        {hasErrors && (
          <Banner tone="critical" title="Error loading data">
            <p>
              {vendorsError && "Failed to load vendors. "}
              {productTypesError && "Failed to load product types. "}
              Please try refreshing the page.
            </p>
          </Banner>
        )}

        {/* Enhanced Vendor Selection with Combobox */}
        <BlockStack gap="200">
          <div style={{ height: vendorsLoading ? '44px' : 'auto' }}>
            {vendorsLoading ? (
              <LoadingProgress
                variant="data-fetch"
                messages={[
                  "🔍 Discovering available vendors...",
                  "📦 Loading vendor catalog...",
                  "✨ Preparing vendor list..."
                ]}
              />
            ) : (
              <Combobox
                activator={
                  <Combobox.TextField
                    label="Vendor"
                    prefix={<Icon source={SearchIcon} tone="base" />}
                    onChange={updateVendorText}
                    value={vendorInputValue}
                    placeholder="Search vendors or type to create new..."
                    autoComplete="off"
                    disabled={!!vendorsError}
                    helpText="Search existing vendors or type a new vendor name to create one"
                  />
                }
              >
                {vendorOptionsMarkup ? (
                  <div style={{ paddingBottom: '8px' }}>
                    <Listbox onSelect={updateVendorSelection}>
                      {vendorOptionsMarkup}
                    </Listbox>
                  </div>
                ) : vendorInputValue !== '' ? (
                  <div style={{ paddingBottom: '8px' }}>
                    <Listbox>
                      <Listbox.Option value="" disabled>
                        No vendors found matching "{vendorInputValue}"
                      </Listbox.Option>
                    </Listbox>
                  </div>
                ) : null}
              </Combobox>
            )}
          </div>

          {vendorsError && (
            <InlineError message="Unable to load vendors" fieldID="vendor" />
          )}
        </BlockStack>

        {/* Enhanced Product Type Selection with Autocomplete */}
        <BlockStack gap="200">
          <div style={{ height: productTypesLoading ? '44px' : 'auto' }}>
            {!formData.vendor ? (
              <Autocomplete
                options={[]}
                selected={[]}
                onSelect={() => {}}
                textField={
                  <Autocomplete.TextField
                    label="Product Type"
                    onChange={() => {}}
                    value=""
                    prefix={<Icon source={SearchIcon} tone="base" />}
                    placeholder="Select a vendor first..."
                    autoComplete="off"
                    disabled={true}
                    helpText={getProductTypeHelpText()}
                  />
                }
                emptyState={
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Please select a vendor first
                  </Text>
                }
              />
            ) : productTypesLoading ? (
              <LoadingProgress
                variant="data-fetch"
                messages={
                  productTypesData?.fromCache ? [
                    `📊 Refreshing ${formData.vendor} product types...`,
                    "✨ Updating suggestions...",
                    "🎯 Almost ready..."
                  ] : [
                    `🔍 Discovering ${formData.vendor} product types...`,
                    "📦 Analyzing product catalog...",
                    "🎨 Creating personalized suggestions...",
                    "✅ Organizing results for you..."
                  ]
                }
                currentCount={filteredProductTypes.length}
              />
            ) : (
              <Autocomplete
                options={productTypeOptions}
                selected={formData.productType ? [formData.productType] : []}
                onSelect={updateProductTypeSelection}
                textField={
                  <Autocomplete.TextField
                    label="Product Type"
                    onChange={updateProductTypeText}
                    value={productTypeInputValue}
                    prefix={<Icon source={SearchIcon} tone="base" />}
                    placeholder="Search product types or type to create new..."
                    autoComplete="off"
                    disabled={!!productTypesError}
                    helpText={`${getProductTypeHelpText()}${productTypesData?.fromCache ? ' (Recently cached data)' : ''}`}
                  />
                }
                emptyState={
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    {productTypeInputValue && isNewProductType(productTypeInputValue) 
                      ? `Type to create new product type: "${productTypeInputValue}"`
                      : `No product types found matching "${productTypeInputValue}"`
                    }
                  </Text>
                }
                loading={productTypesLoading}
              />
            )}
          </div>
          {productTypesError && (
            <InlineError message="Unable to load product types" fieldID="productType" />
          )}
        </BlockStack>

        <ButtonGroup>
          <Button onClick={onBack} disabled>Back</Button>
          <Button 
            variant="primary"
            onClick={handleSubmit} 
            disabled={!formData.vendor || !formData.productType || vendorsLoading || productTypesLoading}
          >
            Next
          </Button>
        </ButtonGroup>
      </FormLayout>

      {/* New Entry Confirmation Modal */}
      <Modal
        open={newEntryConfirmation.isOpen}
        onClose={handleCancelNewEntry}
        title={`Create New ${getConfirmationTitle()}`}
        primaryAction={{
          content: 'Create',
          onAction: handleConfirmNewEntry,
          disabled: !newEntryConfirmation.isConfirmed
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleCancelNewEntry
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              You are creating a new <strong>{getConfirmationTitle()}</strong> for your store: 
              <strong> "{newEntryConfirmation.value}"</strong>
            </Text>
            
            <Text as="p" variant="bodyMd" tone="subdued">
              This will add a new {getConfirmationTitle().toLowerCase()} to your store that can be used for future products.
            </Text>

            <Checkbox
              label={`I confirm that I want to create this new ${getConfirmationTitle().toLowerCase()}`}
              checked={newEntryConfirmation.isConfirmed}
              onChange={(checked) => 
                setNewEntryConfirmation(prev => ({ ...prev, isConfirmed: checked }))
              }
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Card>
    </>
  );
} 