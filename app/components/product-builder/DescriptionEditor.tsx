import { useRef } from 'react';
import {
  BlockStack,
  Text,
  TextField,
  Box,
} from '@shopify/polaris';
import { Editor } from '@tinymce/tinymce-react';

interface DescriptionEditorProps {
  description: string;
  seoTitle: string;
  seoDescription: string;
  onChange: (updates: {
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
  }) => void;
  tinymceApiKey?: string;
  showDescriptionLabel?: boolean;
  descriptionHeight?: number;
}

// TinyMCE Editor Component (extracted from StepAIDescription)
const WYSIWYGEditor = ({ 
  value, 
  onChange, 
  height = 400,
  placeholder = "Enter content here...",
  id,
  variant = 'full',
  apiKey
}: { 
  value: string; 
  onChange: (content: string) => void; 
  height?: number;
  placeholder?: string;
  id: string;
  variant?: 'full' | 'simple';
  apiKey?: string;
}) => {
  const editorRef = useRef<any>(null);

  // Simple toolbar for SEO fields
  const simpleToolbar = 'bold italic | link | removeformat';
  
  // Simplified toolbar for product description (matching Shopify native editor)
  const fullToolbar = 'bold italic underline | alignleft aligncenter alignright | bullist numlist | link | removeformat';

  const toolbar = variant === 'simple' ? simpleToolbar : fullToolbar;
  
  // Configure plugins based on variant
  const plugins = variant === 'simple' 
    ? ['link', 'paste', 'wordcount']
    : ['link', 'lists', 'paste', 'wordcount'];

  return (
    <Box borderColor="border" borderWidth="025" borderRadius="200">
      <Editor
        id={id}
        apiKey={apiKey}
        onInit={(_evt, editor) => editorRef.current = editor}
        value={value}
        init={{
          height: height,
          menubar: false,
          plugins: plugins,
          toolbar: toolbar,
          placeholder: placeholder,
          content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; }',
          paste_as_text: variant === 'simple',
          branding: false,
          resize: false,
          statusbar: true,
          elementpath: false,
          wordcount: {
            countHTML: false,
            countCharacters: true,
            showWordCount: false,
            showCharCount: true,
          },
          // Restrict formatting for SEO fields
          ...(variant === 'simple' && {
            formats: {
              bold: { inline: 'strong' },
              italic: { inline: 'em' },
            },
            valid_elements: 'strong,em,a[href|target|title]',
            extended_valid_elements: '',
          }),
        }}
        onEditorChange={(content) => {
          onChange(content);
        }}
      />
    </Box>
  );
};

export default function DescriptionEditor({
  description,
  seoTitle,
  seoDescription,
  onChange,
  tinymceApiKey,
  showDescriptionLabel = true,
  descriptionHeight = 400,
}: DescriptionEditorProps) {
  return (
    <BlockStack gap="500">
      {/* Description Editor */}
      <BlockStack gap="400">
        {showDescriptionLabel && (
          <Text variant="headingSm" as="h3">Product Description</Text>
        )}
        <WYSIWYGEditor
          id="product-description"
          value={description}
          onChange={(content) => onChange({ description: content })}
          height={descriptionHeight}
          placeholder="Enter your compelling product description here..."
          variant="full"
          apiKey={tinymceApiKey}
        />
      </BlockStack>

      {/* SEO Title Editor */}
      <BlockStack gap="400">
        <TextField
          label="SEO Title"
          value={seoTitle}
          onChange={(value) => onChange({ seoTitle: value })}
          placeholder="Enter SEO optimized title..."
          helpText="Maximum 60 characters for optimal search engine display"
          autoComplete="off"
          maxLength={60}
        />
        <Text variant="bodySm" as="p" tone={seoTitle.length > 60 ? 'critical' : 'subdued'}>
          {seoTitle.length}/60 characters
        </Text>
      </BlockStack>

      {/* SEO Description Editor */}
      <BlockStack gap="400">
        <TextField
          label="SEO Meta Description"
          value={seoDescription}
          onChange={(value) => onChange({ seoDescription: value })}
          placeholder="Enter SEO meta description..."
          helpText="Maximum 155 characters for optimal search engine display"
          autoComplete="off"
          maxLength={155}
          multiline={2}
        />
        <Text variant="bodySm" as="p" tone={seoDescription.length > 155 ? 'critical' : 'subdued'}>
          {seoDescription.length}/155 characters
        </Text>
      </BlockStack>
    </BlockStack>
  );
}