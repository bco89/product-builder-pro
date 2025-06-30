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
  Badge
} from '@shopify/polaris';
import { CheckIcon, AlertTriangleIcon } from '@shopify/polaris-icons';
import { generateHandle, isValidHandle } from '../../../utils/handleGenerator';
import { ShopifyApiServiceImpl } from '../../../services/shopifyApi';

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
    category: { id: string; name: string; } | null;
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

  const shopifyApi = useMemo(() => new ShopifyApiServiceImpl(null), []);

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

  const getHandleErrorContent = () => {
    if (handleValidationState === 'taken' || handleValidationState === 'invalid' || handleValidationState === 'error') {
      return (
        <div style={{ marginTop: '0.5rem' }}>
          <Text as="span" variant="bodySm" tone="critical">
            Product handle already exists. Please choose an alternative product title.
          </Text>
        </div>
      );
    }
    return null;
  };

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
      {/* Vendor & Product Type Display Card */}
      <Card>
        <InlineStack gap="400" wrap>
          <Text as="span">
            <Text as="span" fontWeight="bold">Vendor:</Text> {formData.vendor || 'Not specified'}
          </Text>
          <Text as="span">
            <Text as="span" fontWeight="bold">Product Type:</Text> {formData.productType || 'Not specified'}
          </Text>
          <Text as="span">
            <Text as="span" fontWeight="bold">Category:</Text> {formData.category?.name || 'Not specified'}
          </Text>
        </InlineStack>
      </Card>

      <Card>
        <FormLayout>
          <Text variant="headingMd" as="h2">Product Details</Text>

          <TextField
          label="Title"
          value={formData.title}
          onChange={(value) => onChange({ title: value })}
          autoComplete="off"
        />

        <TextField
          label="Description"
          value={formData.description}
          onChange={(value) => onChange({ description: value })}
          multiline={4}
          autoComplete="off"
        />

        <DropZone
          accept="image/*"
          type="image"
          onDrop={handleDropZoneDrop}
          allowMultiple
          label="Product Images"
          errorOverlayText="File type must be image/*"
        >
          {uploadedFiles}
          {fileUpload}
        </DropZone>

        {errorMessage}

        <Checkbox
          label="Add product images at a later time"
          checked={formData.addImagesLater}
          onChange={(checked) => onChange({ addImagesLater: checked })}
          disabled={formData.images.length > 0}
        />

        <div>
          <TextField
            label="Product Handle"
            value={formData.handle}
            readOnly
            autoComplete="off"
          />
          {getHandleErrorContent()}
        </div>

        <InlineStack gap="300" align="end">
          <Button onClick={onBack}>Back</Button>
          <Button 
            variant="primary"
            onClick={handleSubmit}
            disabled={!isFormValid()}
          >
            Next
          </Button>
        </InlineStack>
      </FormLayout>
    </Card>
    </>
  );
} 