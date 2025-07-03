import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Card,
  FormLayout,
  Button,
  Text,
  ButtonGroup,
  Spinner,
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
import { SearchIcon, AlertCircleIcon, PlusIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';

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

  // Fetch all product types data (with caching)
  const { data: allProductTypesData, isLoading: allTypesLoading } = useQuery({
    queryKey: ['allProductTypes'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/all-product-types');
      if (!response.ok) {
        throw new Error('Failed to fetch all product types');
      }
      const data = await response.json();
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch product types for selected vendor with fallback
  const { data: vendorProductTypes, isLoading: productTypesLoading, error: productTypesError } = useQuery({
    queryKey: ['productTypes', formData.vendor],
    enabled: !!formData.vendor,
    queryFn: async () => {
      try {
        // Try vendor-specific query first
        const response = await fetch(`/api/shopify/products?type=productTypes&vendor=${encodeURIComponent(formData.vendor)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.productTypes && data.productTypes.length > 0) {
            return data.productTypes as ProductType[];
          }
        }
        
        // Fallback to filtering from all types
        if (allProductTypesData && allProductTypesData.productTypesByVendor) {
          const vendorTypes = allProductTypesData.productTypesByVendor[formData.vendor] || [];
          return vendorTypes.map((type: string) => ({ productType: type })) as ProductType[];
        }
        
        return [];
      } catch (error) {
        // Use fallback on error
        if (allProductTypesData && allProductTypesData.productTypesByVendor) {
          const vendorTypes = allProductTypesData.productTypesByVendor[formData.vendor] || [];
          return vendorTypes.map((type: string) => ({ productType: type })) as ProductType[];
        }
        throw error;
      }
    }
  });

  // Helper function to check if entry exists
  const isNewVendor = useCallback((value: string) => {
    return value && vendorsData && !vendorsData.includes(value);
  }, [vendorsData]);

  const isNewProductType = useCallback((value: string) => {
    return value && vendorProductTypes && !vendorProductTypes.some((type: ProductType) => type.productType === value);
  }, [vendorProductTypes]);

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
      setFilteredVendors(vendorsData);
      return;
    }

    const filterRegex = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const resultVendors = vendorsData.filter((vendor: string) =>
      vendor.match(filterRegex)
    );
    setFilteredVendors(resultVendors);
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
    
    if (!vendorProductTypes) {
      setFilteredProductTypes([]);
      return;
    }
    
    if (value === '') {
      setFilteredProductTypes(vendorProductTypes);
      return;
    }

    const filterRegex = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const resultProductTypes = vendorProductTypes.filter((type: ProductType) =>
      type.productType.match(filterRegex)
    );
    setFilteredProductTypes(resultProductTypes);
  }, [vendorProductTypes]);

  // Handle product type selection
  const updateProductTypeSelection = useCallback((selected: string[]) => {
    const selectedValue = selected[0];
    if (selectedValue === 'create-new-producttype') {
      handleNewEntryConfirmation('productType', productTypeInputValue);
      return;
    }

    if (selectedValue) {
      const matchedType = filteredProductTypes.find((type: ProductType) => 
        type.productType === selectedValue
      );
      if (matchedType) {
        setProductTypeInputValue(matchedType.productType);
        onChange({ 
          productType: matchedType.productType
        });
      }
    }
  }, [filteredProductTypes, onChange, productTypeInputValue, handleNewEntryConfirmation]);

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

  // Product type options for Autocomplete
  const productTypeOptions = useMemo(() => {
    const options = filteredProductTypes.map((type: ProductType) => ({
      value: type.productType,
      label: type.productType
    }));

    // Add "Create new" option if input doesn't match any existing product type
    if (productTypeInputValue && isNewProductType(productTypeInputValue)) {
      options.push({
        value: 'create-new-producttype',
        label: `Create new product type: "${productTypeInputValue}"`
      });
    }

    return options;
  }, [filteredProductTypes, productTypeInputValue, isNewProductType]);

  // Initialize filtered data when source data loads
  useMemo(() => {
    if (vendorsData && filteredVendors.length === 0 && vendorInputValue === '') {
      setFilteredVendors(vendorsData);
    }
  }, [vendorsData, filteredVendors.length, vendorInputValue]);

  useMemo(() => {
    if (vendorProductTypes && filteredProductTypes.length === 0 && productTypeInputValue === '') {
      setFilteredProductTypes(vendorProductTypes);
    }
  }, [vendorProductTypes, filteredProductTypes.length, productTypeInputValue]);

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

  return (
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
              <InlineStack gap="300" align="center">
                <Spinner accessibilityLabel="Loading vendors" size="small" />
                <Text as="p" variant="bodyMd" tone="subdued">Loading vendors...</Text>
              </InlineStack>
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
                  <Listbox onSelect={updateVendorSelection}>
                    {vendorOptionsMarkup}
                  </Listbox>
                ) : vendorInputValue !== '' ? (
                  <Listbox>
                    <Listbox.Option value="" disabled>
                      No vendors found matching "{vendorInputValue}"
                    </Listbox.Option>
                  </Listbox>
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
          <div style={{ height: (productTypesLoading || allTypesLoading) ? '44px' : 'auto' }}>
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
                    helpText="Choose a product type that matches your item to improve organization and searchability"
                  />
                }
                emptyState={
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Please select a vendor first
                  </Text>
                }
              />
            ) : (productTypesLoading || allTypesLoading) ? (
              <InlineStack gap="300" align="center">
                <Spinner accessibilityLabel="Loading product types" size="small" />
                <Text as="p" variant="bodyMd" tone="subdued">Loading product types...</Text>
              </InlineStack>
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
                    helpText="Choose a product type that matches your item to improve organization and searchability"
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
                loading={productTypesLoading || allTypesLoading}
              />
            )}
          </div>
          {productTypesError && (
            <InlineError message="Unable to load product types" fieldID="productType" />
          )}
        </BlockStack>

        <ButtonGroup>
          <Button onClick={onBack}>Back</Button>
          <Button 
            variant="primary"
            onClick={handleSubmit} 
            disabled={!formData.vendor || !formData.productType || vendorsLoading || productTypesLoading || allTypesLoading}
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
  );
} 