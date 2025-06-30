import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Card,
  FormLayout,
  TextField,
  Button,
  ButtonGroup,
  Text,
  DropZone,
  InlineGrid,
  Thumbnail,
  Banner,
  InlineStack,
  Checkbox,
  Spinner,
  Icon,
  BlockStack,
  Box,
  Badge,
  Autocomplete,
  InlineError
} from '@shopify/polaris';
import { CheckIcon, AlertTriangleIcon, SearchIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import { generateHandle, isValidHandle } from '../../../utils/handleGenerator';
import { ShopifyApiServiceImpl } from '../../../services/shopifyApi';

interface Category {
  id: string;
  name: string;
  fullName: string;
  level: number;
  isLeaf: boolean;
}

interface FormDataType {
  title: string;
  description: string;
  handle: string;
  images: File[];
  addImagesLater: boolean;
}

interface StepProductDetailsProps {
  formData: {
    vendor: string;
    productType: string;
    category: { id: string; name: string; fullName?: string; level?: number; isLeaf?: boolean; } | null;
    title: string;
    description: string;
    handle: string;
    images: File[];
    addImagesLater: boolean;
  };
  onChange: (updates: Partial<StepProductDetailsProps['formData']>) => void;
  onNext: () => void;
  onBack: () => void;
  productId?: string | null;
}

type HandleValidationState = 'idle' | 'checking' | 'available' | 'taken' | 'error' | 'invalid';

export default function StepProductDetails({ formData, onChange, onNext, onBack, productId }: StepProductDetailsProps) {
  const [rejectedFiles, setRejectedFiles] = useState<File[]>([]);
  const [handleValidationState, setHandleValidationState] = useState<HandleValidationState>('idle');
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Category-related state
  const [categoryInputValue, setCategoryInputValue] = useState(formData.category?.name || '');
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);

  const shopifyApi = useMemo(() => new ShopifyApiServiceImpl(null), []);

  // Fetch categories for selected vendor and product type
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

  // Update category input when selection changes
  useEffect(() => {
    if (formData.category?.name !== categoryInputValue) {
      setCategoryInputValue(formData.category?.name || '');
    }
  }, [formData.category?.name]);

  // Category options for Autocomplete
  const categoryOptions = useMemo(() => {
    const options = filteredCategories?.map((cat: Category) => ({
      value: cat.id,
      label: cat.level > 0 ? `${cat.name} (${cat.fullName})` : cat.name
    })) || [];

    return options;
  }, [filteredCategories]);

  // Auto-generate handle when title changes
  useEffect(() => {
    if (formData.title) {
      const generatedHandle = generateHandle(formData.title);
      if (generatedHandle !== formData.handle) {
        onChange({ handle: generatedHandle });
      }
    }
  }, [formData.title, formData.handle, onChange]);

  // Validate handle with debouncing
  useEffect(() => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    if (!formData.handle) {
      setHandleValidationState('idle');
      return;
    }

    if (!isValidHandle(formData.handle)) {
      setHandleValidationState('invalid');
      return;
    }

    const timeout = setTimeout(async () => {
      setHandleValidationState('checking');
      try {
        const result = await shopifyApi.validateHandle(formData.handle);
        if (result.available) {
          setHandleValidationState('available');
        } else {
          setHandleValidationState('taken');
        }
      } catch (error) {
        console.error('Handle validation error:', error);
        setHandleValidationState('error');
      }
    }, 300);

    setValidationTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [formData.handle, shopifyApi]);

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], rejectedFiles: File[]) => {
      setRejectedFiles(rejectedFiles);
      onChange({ 
        images: [...formData.images, ...acceptedFiles].slice(0, 5), // Limit to 5 images
        addImagesLater: false // Uncheck "add images later" when images are added
      });
    },
    [formData.images, onChange]
  );

  const handleRemoveImage = useCallback((indexToRemove: number) => {
    onChange({
      images: formData.images.filter((_, index) => index !== indexToRemove)
    });
  }, [formData.images, onChange]);

  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
  
  const fileUpload = !formData.images.length && (
    <DropZone.FileUpload actionHint="or drop files to upload" />
  );

  const uploadedFiles = formData.images.length > 0 && (
    <InlineGrid gap="400" columns={2}>
      {formData.images.map((file, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {validImageTypes.includes(file.type) ? (
            <Thumbnail
              size="small"
              alt={file.name}
              source={window.URL.createObjectURL(file)}
            />
          ) : (
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: '#f1f2f3', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '4px'
            }}>
              File
            </div>
          )}
          <div>
            {file.name} <Button variant="plain" onClick={() => handleRemoveImage(index)}>Remove</Button>
          </div>
        </div>
      ))}
    </InlineGrid>
  );

  const errorMessage = rejectedFiles.length > 0 && (
    <Banner tone="critical">
      <p>The following images couldn't be uploaded:</p>
      <ul>
        {rejectedFiles.map((file, index) => (
          <li key={index}>{file.name}</li>
        ))}
      </ul>
    </Banner>
  );

  const isFormValid = () => {
    const hasTitle = !!formData.title;
    const hasDescription = !!formData.description;
    const hasValidHandle = handleValidationState === 'available';
    const hasImagesOrWillAddLater = formData.images.length > 0 || formData.addImagesLater;
    
    return hasTitle && hasDescription && hasValidHandle && hasImagesOrWillAddLater;
  };

  const handleSubmit = () => {
    if (isFormValid()) {
      onNext();
    }
  };

  return (
    <>
      {/* Selected Information Display Card */}
      <Card>
        <BlockStack gap="200">
          <InlineStack gap="400" wrap>
            <Text as="span">
              <Text as="span" fontWeight="bold">Vendor:</Text> {formData.vendor || 'Not specified'}
            </Text>
            <Text as="span">
              <Text as="span" fontWeight="bold">Product Type:</Text> {formData.productType || 'Not specified'}
            </Text>
            <Text as="span">
              <Text as="span" fontWeight="bold">Category:</Text> {formData.category?.name || 'Will be selected below'}
            </Text>
          </InlineStack>
        </BlockStack>
      </Card>

      <Card>
        <FormLayout>
          <Text variant="headingMd" as="h2">Product Details</Text>

          <TextField
          label="Title"
          value={formData.title}
          onChange={(value) => onChange({ title: value })}
          autoComplete="off"
          helpText="Enter a clear, descriptive name for your product"
          showCharacterCount
          maxLength={255}
        />

        <TextField
          label="Description"
          value={formData.description}
          onChange={(value) => onChange({ description: value })}
          multiline={4}
          autoComplete="off"
          helpText="Provide a detailed description to help customers understand your product"
          showCharacterCount
          maxLength={5000}
        />

        {/* Product Category Selection */}
        <BlockStack gap="200">
          <div style={{ height: categoriesLoading ? '44px' : 'auto' }}>
            {!formData.vendor || !formData.productType ? (
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
                    placeholder="Complete vendor and product type in step 1..."
                    autoComplete="off"
                    disabled={true}
                    helpText="Select the most appropriate category to improve your product's discoverability"
                  />
                }
                emptyState={
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Please complete vendor and product type in the previous step
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
                    helpText="Select the most appropriate category to improve your product's discoverability"
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

        <BlockStack gap="200">
          <DropZone
            accept="image/*"
            type="image"
            onDrop={handleDropZoneDrop}
            allowMultiple
            label="Product Images"
            errorOverlayText="File type must be .jpg, .png, or .gif"
          >
            {uploadedFiles}
            {fileUpload}
          </DropZone>
          <Text as="p" variant="bodyMd" tone="subdued">
            Add up to 5 product images. Accepted formats: JPG, PNG, GIF. Maximum file size: 20MB per image.
          </Text>
          {formData.images.length > 0 && (
            <Text as="p" variant="bodyMd" tone="success">
              {formData.images.length} image{formData.images.length > 1 ? 's' : ''} uploaded
            </Text>
          )}
        </BlockStack>

        {errorMessage}

        <Checkbox
          label="Add product images at a later time"
          checked={formData.addImagesLater}
          onChange={(checked) => onChange({ addImagesLater: checked })}
          disabled={formData.images.length > 0}
          helpText={
            formData.images.length > 0 
              ? "Images have been uploaded - uncheck to remove images and add later"
              : "Check this if you want to proceed without images and add them later"
          }
        />

        <div>
          <TextField
            label="Product Handle"
            value={formData.handle}
            readOnly
            autoComplete="off"
            suffix={
              handleValidationState === 'checking' ? (
                <Spinner accessibilityLabel="Validating handle" size="small" />
              ) : handleValidationState === 'available' ? (
                <Icon source={CheckIcon} tone="success" />
              ) : handleValidationState === 'taken' || handleValidationState === 'invalid' || handleValidationState === 'error' ? (
                <Icon source={AlertTriangleIcon} tone="critical" />
              ) : null
            }
            helpText={
              handleValidationState === 'available' 
                ? "This handle is available and will be used as your product URL"
                : handleValidationState === 'checking'
                ? "Checking availability..."
                : "Auto-generated from product title. This will be your product URL."
            }
            error={handleValidationState === 'taken' || handleValidationState === 'invalid' || handleValidationState === 'error'}
          />
          {(handleValidationState === 'taken' || handleValidationState === 'invalid' || handleValidationState === 'error') && (
            <Text as="p" variant="bodyMd" tone="critical">
              {handleValidationState === 'taken' 
                ? "This handle is already in use. Please choose a different product title."
                : handleValidationState === 'invalid'
                ? "Invalid handle format. Please choose a different product title."
                : "Unable to validate handle. Please try again."
              }
            </Text>
          )}
        </div>

        <BlockStack gap="300">
          {!isFormValid() && (
            <Banner tone="info" title="Complete all required fields">
              <Text as="p">
                Please fill in all required fields: 
                {!formData.title && " Title"}
                {!formData.description && " Description"}
                {handleValidationState !== 'available' && " Valid Handle"}
                {!(formData.images.length > 0 || formData.addImagesLater) && " Images or check 'Add images later'"}
              </Text>
            </Banner>
          )}
          
          <InlineStack gap="300" align="end">
            <Button onClick={onBack}>Back</Button>
            <Button 
              variant="primary"
              onClick={handleSubmit}
              disabled={!isFormValid()}
              loading={handleValidationState === 'checking'}
            >
              {handleValidationState === 'checking' ? 'Validating...' : 'Next'}
            </Button>
          </InlineStack>
        </BlockStack>
      </FormLayout>
    </Card>
    </>
  );
} 