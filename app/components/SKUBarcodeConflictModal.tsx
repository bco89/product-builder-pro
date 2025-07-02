import { useState } from 'react';
import {
  Modal,
  BlockStack,
  Text,
  InlineStack,
  Button,
  Card,
  Badge
} from '@shopify/polaris';

interface ConflictingProduct {
  id: string;
  title: string;
  handle: string;
}

interface ValidationConflict {
  type: 'sku' | 'barcode';
  value: string;
  conflictingProduct: ConflictingProduct;
}

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueWithDuplicate: () => void;
  conflicts: ValidationConflict[];
}

export function SKUBarcodeConflictModal({ 
  isOpen, 
  onClose, 
  onContinueWithDuplicate,
  conflicts
}: ConflictModalProps) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="SKU/Barcode Conflicts Detected"
      primaryAction={{
        content: 'Review and Update',
        onAction: onClose
      }}
      secondaryActions={[{
        content: 'Continue with Duplicate SKU',
        destructive: true,
        onAction: onContinueWithDuplicate
      }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text as="p" tone="subdued">
            The following conflicts were found with existing products in your store:
          </Text>

          {conflicts.map((conflict, index) => (
            <Card key={index}>
              <BlockStack gap="300">
                <InlineStack gap="200" align="space-between">
                  <Text as="h3" variant="headingSm">
                    {conflict.type.toUpperCase()} Conflict
                  </Text>
                  <Badge tone="critical">Duplicate Found</Badge>
                </InlineStack>
                <Text as="p" tone="critical">
                  This {conflict.type.toUpperCase()} already exists in your store for the following product:
                </Text>
                <BlockStack gap="100">
                  <Text as="p" fontWeight="bold">
                    {conflict.conflictingProduct.title}
                  </Text>
                  <InlineStack gap="200">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {conflict.type.toUpperCase()}:
                    </Text>
                    <Text as="span" variant="bodySm" fontWeight="medium">
                      {conflict.value}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          ))}

          <Text as="p" variant="bodySm" tone="subdued">
            You can either update your SKU/Barcode values to be unique, or continue with the duplicates. 
            Note that having duplicate SKUs may cause inventory tracking issues.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
} 