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
  Select,
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
import { GET_PRODUCT_CATEGORIES } from '~/graphql/queries';

interface Category {
  id: string;
  name: string;
  fullName: string;
  level: number;
  isLeaf: boolean;
}

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
    type: '' as 'vendor' | 'productType' | 'category' | '',
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

  // Fetch product types for selected vendor
  const { data: vendorProductTypes, isLoading: productTypesLoading, error: productTypesError } = useQuery({
    queryKey: ['productTypes', formData.vendor],
    enabled: !!formData.vendor,
    queryFn: async () => {
      const response = await fetch(`/api/shopify/products?type=productTypes&vendor=${encodeURIComponent(formData.vendor)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product types');
      }
      const data = await response.json();
      return data.productTypes as ProductType[];
    }
  });

  // Updated query for categories
  const { data: productTypeCategories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['categories', formData.vendor, formData.productType],
    enabled: !!formData.vendor && !!formData.productType,
    queryFn: async () => {
      const response = await fetch(`/api/shopify/products?type=categories&productType=${encodeURIComponent(formData.productType)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      return data.categories || [];
    }
  });

  // Helper function to check if entry exists
  const isNewVendor = useCallback((value: string) => {
    return value && vendorsData && !vendorsData.includes(value);
  }, [vendorsData]);

  const isNewProductType = useCallback((value: string) => {
    return value && vendorProductTypes && !vendorProductTypes.some((type: ProductType) => type.productType === value);
  }, [vendorProductTypes]);

  // Categories now come from Shopify taxonomy - no need to create new ones

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
          productType: value,
          category: null
        });
        setProductTypeInputValue(value);
        setCategoryInputValue(''); // Clear category input when new product type is created
        break;
      // Categories now come from Shopify taxonomy - no creation needed
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
        productType: '',
        category: null
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
          productType: matchedType.productType,
          category: null
        });
      }
    }
  }, [filteredProductTypes, onChange, productTypeInputValue, handleNewEntryConfirmation]);

  // Category search functionality
  const [categoryInputValue, setCategoryInputValue] = useState(formData.category?.name || '');

  // Handle category selection
  const handleCategoryChange = useCallback((selected: string[]) => {
    const selectedValue = selected[0];

    if (selectedValue) {
      const category = productTypeCategories?.find((cat: Category) => cat.id === selectedValue) || null;
      onChange({ category });
      // Update the input value to match the selected category
      if (category) {
        setCategoryInputValue(category.name);
      }
    }
  }, [onChange, productTypeCategories]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);

  // Filter categories based on input
  const updateCategoryText = useCallback((value: string) => {
    setCategoryInputValue(value);
    
    if (!productTypeCategories) {
      setFilteredCategories([]);
      return;
    }
    
    if (value === '') {
      setFilteredCategories(productTypeCategories);
      return;
    }

    const filterRegex = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const resultCategories = productTypeCategories.filter((cat: Category) =>
      cat.name.match(filterRegex) || cat.fullName.match(filterRegex)
    );
    setFilteredCategories(resultCategories);
  }, [productTypeCategories]);

  // Initialize filtered categories when source data loads
  useMemo(() => {
    if (productTypeCategories) {
      if (categoryInputValue === '') {
        setFilteredCategories(productTypeCategories);
      } else {
        // Re-filter when categories change
        const filterRegex = new RegExp(categoryInputValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const resultCategories = productTypeCategories.filter((cat: Category) =>
          cat.name.match(filterRegex)
        );
        setFilteredCategories(resultCategories);
      }
    } else {
      // If no categories exist for this product type, reset filtered categories
      setFilteredCategories([]);
    }
  }, [productTypeCategories, categoryInputValue]);

  // Update category input when selection changes or when product type changes
  useEffect(() => {
    if (formData.category?.name !== categoryInputValue) {
      setCategoryInputValue(formData.category?.name || '');
    }
  }, [formData.category?.name]);

  // Clear category input when product type changes
  useEffect(() => {
    // Only clear if we don't have a category selected and we have some input
    // but don't clear during normal typing (when product type exists)
    if (!formData.category && categoryInputValue && !formData.productType) {
      setCategoryInputValue('');
    }
  }, [formData.category, formData.productType]);

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

  const categoryOptions = useMemo(() => {
    const options = filteredCategories?.map((cat: Category) => ({
      value: cat.id,
      label: cat.level > 0 ? `${cat.name} (${cat.fullName})` : cat.name
    })) || [];

    // Categories come from Shopify taxonomy - no new categories can be created
    return options;
  }, [filteredCategories]);

  const handleSubmit = () => {
    if (formData.vendor && formData.productType) {
      onNext();
    }
  };

  // Check for any errors
  const hasErrors = vendorsError || productTypesError || categoriesError;

  const getConfirmationTitle = () => {
    const typeMap: Record<string, string> = {
      vendor: 'Vendor',
      productType: 'Product Type',
      category: 'Product Category'
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
              {categoriesError && "Failed to load categories. "}
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
                    helpText="Choose a product type that matches your item to improve organization and searchability"
                  />
                }
                emptyState={
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Please select a vendor first
                  </Text>
                }
              />
            ) : productTypesLoading ? (
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
                loading={productTypesLoading}
              />
            )}
          </div>
          {productTypesError && (
            <InlineError message="Unable to load product types" fieldID="productType" />
          )}
        </BlockStack>

        {/* Enhanced Category Selection */}
        <BlockStack gap="200">
          <div style={{ height: categoriesLoading ? '44px' : 'auto' }}>
            {!formData.productType ? (
              <Autocomplete
                options={[]}
                selected={[]}
                onSelect={() => {}}
                textField={
                  <Autocomplete.TextField
                    label="Product Category"
                    onChange={() => {}}
                    value=""
                    prefix={<Icon source={SearchIcon} tone="base" />}
                    placeholder="Select a product type first..."
                    autoComplete="off"
                    disabled={true}
                    helpText="Select the most appropriate category to improve your product's discoverability and boost sales"
                  />
                }
                emptyState={
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Please select a product type first
                  </Text>
                }
              />
            ) : categoriesLoading ? (
              <InlineStack gap="300" align="center">
                <Spinner accessibilityLabel="Loading categories" size="small" />
                <Text as="p" variant="bodyMd" tone="subdued">Loading categories...</Text>
              </InlineStack>
            ) : (
              <Autocomplete
                options={categoryOptions}
                selected={formData.category ? [formData.category.id] : []}
                onSelect={handleCategoryChange}
                textField={
                  <Autocomplete.TextField
                    label="Product Category"
                    onChange={updateCategoryText}
                    value={categoryInputValue}
                    prefix={<Icon source={SearchIcon} tone="base" />}
                    placeholder="Search categories..."
                    autoComplete="off"
                    disabled={!!categoriesError}
                    helpText="Select the most appropriate category to improve your product's discoverability and boost sales"
                  />
                }
                emptyState={
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    {productTypeCategories && productTypeCategories.length === 0
                      ? "No categories available for this product type."
                      : `No categories found matching "${categoryInputValue}"`
                    }
                  </Text>
                }
                loading={categoriesLoading}
              />
            )}
          </div>
          {categoriesError && (
            <InlineError message="Unable to load categories" fieldID="category" />
          )}
        </BlockStack>

        <ButtonGroup>
          <Button onClick={onBack}>Back</Button>
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
  );
} 