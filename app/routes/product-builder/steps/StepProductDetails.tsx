import { useState, useCallback } from 'react';
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
  InlineStack
} from '@shopify/polaris';

interface FormDataType {
  title: string;
  description: string;
  images: File[];
}

interface StepProductDetailsProps {
  formData: FormDataType;
  onChange: (updates: Partial<FormDataType>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepProductDetails({ formData, onChange, onNext, onBack }: StepProductDetailsProps) {
  const [rejectedFiles, setRejectedFiles] = useState<File[]>([]);

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], rejectedFiles: File[]) => {
      setRejectedFiles(rejectedFiles);
      onChange({ 
        images: [...formData.images, ...acceptedFiles].slice(0, 5) // Limit to 5 images
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

  const handleSubmit = () => {
    if (formData.title && formData.description) {
      onNext();
    }
  };

  return (
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

        <InlineStack gap="300" align="end">
          <Button onClick={onBack}>Back</Button>
          <Button 
            variant="primary"
            onClick={handleSubmit}
            disabled={!formData.title || !formData.description}
          >
            Next
          </Button>
        </InlineStack>
      </FormLayout>
    </Card>
  );
} 