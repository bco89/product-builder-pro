import { useCallback } from 'react';
import {
  Card,
  TextField,
  DropZone,
  BlockStack,
  InlineStack,
  Thumbnail,
  Banner,
  List,
  Text
} from '@shopify/polaris';

interface StepProductDetailsProps {
  formData: {
    title: string;
    description: string;
    images: Array<File>;
  };
  onChange: (updates: Partial<StepProductDetailsProps['formData']>) => void;
}

export default function StepProductDetails({ formData, onChange }: StepProductDetailsProps) {
  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
      onChange({ images: [...formData.images, ...acceptedFiles] });
    },
    [formData.images, onChange]
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      const newImages = [...formData.images];
      newImages.splice(index, 1);
      onChange({ images: newImages });
    },
    [formData.images, onChange]
  );

  return (
    <Card>
      <Card.Section>
        <BlockStack gap="4">
          <TextField
            label="Product Title"
            value={formData.title}
            onChange={(value) => onChange({ title: value })}
            autoComplete="off"
          />

          <TextField
            label="Product Description"
            value={formData.description}
            onChange={(value) => onChange({ description: value })}
            multiline={4}
            autoComplete="off"
          />

          <DropZone onDrop={handleDropZoneDrop} allowMultiple>
            <DropZone.FileUpload />
          </DropZone>

          {formData.images.length > 0 && (
            <InlineStack gap="4">
              {formData.images.map((image, index) => (
                <Thumbnail
                  key={index}
                  source={URL.createObjectURL(image)}
                  alt={image.name}
                  onError={() => handleRemoveImage(index)}
                />
              ))}
            </InlineStack>
          )}

          {formData.images.length > 0 && (
            <Banner title="Uploaded Images" status="info">
              <List>
                {formData.images.map((image, index) => (
                  <List.Item key={index}>
                    {image.name} ({Math.round(image.size / 1024)} KB)
                  </List.Item>
                ))}
              </List>
            </Banner>
          )}
        </BlockStack>
      </Card.Section>
    </Card>
  );
} 