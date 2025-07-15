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
  InlineError,
  Select
} from '@shopify/polaris';
import { CheckIcon, AlertTriangleIcon, SearchIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import { generateHandle, isValidHandle } from '../../../utils/handleGenerator';
import { ShopifyApiServiceImpl } from '../../../services/shopifyApi';
import { CategoryBrowser } from '../../../components/CategoryBrowser';

interface Category {
  id: string;
  name: string;
  fullName: string;
  level: number;
  isLeaf: boolean;
  isRoot?: boolean;
  parentId?: string;
  childrenIds?: string[];
}

interface FormDataType {
  title: string;
  handle: string;
  images: File[];
}

interface StepProductDetailsProps {
  formData: {
    vendor: string;
    productType: string;
    category: Category | null;
    title: string;
    description: string;
    handle: string;
    images: File[];
    weight?: number;
    weightUnit?: 'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS';
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
  const [defaultWeightUnit, setDefaultWeightUnit] = useState<'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS'>('POUNDS');

  // Category Browser state
  const [categoryBrowserOpen, setCategoryBrowserOpen] = useState(false);

  const shopifyApi = useMemo(() => new ShopifyApiServiceImpl(null), []);

  // Check if vendor/product type are available for category browsing
  const categoriesAvailable = !!formData.vendor && !!formData.productType;

  // Fetch default weight unit on component mount
  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const settings = await shopifyApi.getStoreSettings();
        setDefaultWeightUnit(settings.defaultWeightUnit);
        
        // Set default weight unit if not already set
        if (!formData.weightUnit) {
          onChange({ weightUnit: settings.defaultWeightUnit });
        }
      } catch (error) {
        console.error('Failed to fetch store settings:', error);
        // Fallback to POUNDS if fetch fails
        if (!formData.weightUnit) {
          onChange({ weightUnit: 'POUNDS' });
        }
      }
    };

    fetchStoreSettings();
  }, [shopifyApi, formData.weightUnit, onChange]);

  // Weight unit options for the select (using abbreviations only)
  const weightUnitOptions = [
    { label: 'g', value: 'GRAMS' },
    { label: 'kg', value: 'KILOGRAMS' },
    { label: 'oz', value: 'OUNCES' },
    { label: 'lb', value: 'POUNDS' },
  ];



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
    const hasValidHandle = handleValidationState === 'available';
    
    return hasTitle && hasValidHandle;
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




        {/* Product Category Selection */}
        <BlockStack gap="200">
          <Text variant="bodyMd" as="h3">Product Category</Text>
          
          {!categoriesAvailable ? (
            <TextField
              label="Product Category"
              labelHidden
              value=""
              onChange={() => {}}
              prefix={<Icon source={SearchIcon} />}
              placeholder="Complete vendor and product type in step 1..."
              autoComplete="off"
              disabled
              helpText="Select the most appropriate category to improve your product's discoverability"
            />
          ) : (
            <InlineStack gap="200" blockAlign="end">
              <div onClick={() => setCategoryBrowserOpen(true)} style={{ cursor: 'pointer', flexGrow: 1 }}>
                <TextField
                  label="Product Category"
                  labelHidden
                  value={formData.category?.name || ''}
                  onChange={() => {}}
                  placeholder="Click here to select a category..."
                  autoComplete="off"
                  readOnly
                  helpText="Select the most appropriate category to improve your product's discoverability"
                  connectedRight={
                    <div onClick={(e) => e.stopPropagation()}>
                      <Button 
                        onClick={() => setCategoryBrowserOpen(true)}
                      >
                        Browse
                      </Button>
                    </div>
                  }
                />
              </div>
            </InlineStack>
          )}
          
          {formData.category && (
            <Box>
              <InlineStack gap="200" align="space-between">
                <Text as="p" variant="bodySm" tone="subdued">
                  Full path: {formData.category.fullName}
                </Text>
                <Button 
                  variant="plain" 
                  size="slim"
                  onClick={() => onChange({ category: null })}
                >
                  Clear Category
                </Button>
              </InlineStack>
            </Box>
          )}
        </BlockStack>

        {/* Product Weight (Optional) */}
        <BlockStack gap="200">
          <Text variant="bodyMd" as="h3">Product Weight</Text>
          <InlineStack gap="300" blockAlign="end">
            <div style={{ width: '130px' }}>
              <TextField
                label="Weight"
                labelHidden
                type="number"
                value={formData.weight?.toString() || ''}
                onChange={(value) => {
                  const numericValue = value === '' ? undefined : parseFloat(value);
                  onChange({ weight: numericValue });
                }}
                placeholder="Enter weight"
                autoComplete="off"
                step={0.01}
                min={0}
              />
            </div>
            <div style={{ width: '60px' }}>
              <Select
                label="Unit"
                labelHidden
                options={weightUnitOptions}
                value={formData.weightUnit || defaultWeightUnit}
                onChange={(value) => onChange({ weightUnit: value as 'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS' })}
              />
            </div>
          </InlineStack>
          <Text as="p" variant="bodySm" tone="subdued">
            Used for shipping calculations and product information
          </Text>
          {formData.weight && (
            <Text as="p" variant="bodySm" tone="subdued">
              Weight will be applied to all product variants
            </Text>
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
                {handleValidationState !== 'available' && " Valid Handle"}
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

    {/* Category Browser Modal */}
    <CategoryBrowser
      open={categoryBrowserOpen}
      onClose={() => setCategoryBrowserOpen(false)}
      onSelect={(category) => {
        onChange({ category });
        setCategoryBrowserOpen(false);
      }}
      selectedCategory={formData.category}
      productType={formData.productType}
      vendor={formData.vendor}
    />
    </>
  );
} 