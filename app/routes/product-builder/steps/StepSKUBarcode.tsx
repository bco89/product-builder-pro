import { useCallback, useState, useEffect, useMemo } from 'react';
import {
  Card,
  TextField,
  BlockStack,
  InlineStack,
  Text,
  Spinner,
  Icon,
  Banner,
  Checkbox
} from '@shopify/polaris';
import { CheckIcon, AlertTriangleIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import { SKUBarcodeConflictModal } from '../../../components/SKUBarcodeConflictModal';
import { useBeforeUnloadWarning } from '../../../hooks/useBeforeUnloadWarning';
import { ShopifyApiServiceImpl } from '../../../services/shopifyApi';
import { ProductInfoCard } from '../../../components/ProductInfoCard';
import { StepNavigation } from '../../../components/StepNavigation';

interface StepSKUBarcodeProps {
  formData: {
    vendor: string;
    productType: string;
    category: { id: string; name: string; } | null;
    title: string;
    options: Array<{ name: string; values: string[] }>;
    skus: string[];
    barcodes: string[];
    pricing?: Array<{
      price?: string;
      compareAtPrice?: string;
      cost?: string;
    }>;
  };
  onChange: (updates: Partial<StepSKUBarcodeProps['formData']>) => void;
  onNext: () => void;
  onBack: () => void;
  productId?: string | null;
}

type ValidationState = 'idle' | 'checking' | 'available' | 'conflict' | 'error';

interface ValidationStates {
  sku: ValidationState;
  barcode: ValidationState;
}

interface ValidationConflict {
  type: 'sku' | 'barcode';
  value: string;
  conflictingProduct: {
    id: string;
    title: string;
    handle: string;
  };
}

interface ConflictHistory {
  [key: string]: {
    type: 'sku' | 'barcode';
    value: string;
    conflictingProduct: any;
    userChoice: 'pending' | 'continue' | 'resolved';
  };
}

interface LastValidatedValues {
  [key: string]: {
    sku: string;
    barcode: string;
  };
}

export default function StepSKUBarcode({ formData, onChange, onNext, onBack, productId }: StepSKUBarcodeProps) {
  const hasVariants = formData.options.length > 0;
  const shopifyApi = useMemo(() => new ShopifyApiServiceImpl(), []);
  
  // Get store metrics to determine validation strategy
  const { data: storeMetrics } = useQuery({
    queryKey: ['store-metrics'],
    queryFn: () => shopifyApi.getStoreMetrics(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const storeSize = storeMetrics?.storeSize || 'small';
  
  // Validation states for each SKU/Barcode (for small stores)
  const [validationStates, setValidationStates] = useState<ValidationStates[]>([]);
  const [validationTimeouts, setValidationTimeouts] = useState<(NodeJS.Timeout | null)[]>([]);
  
  // Track conflicts and user choices
  const [conflictHistory, setConflictHistory] = useState<ConflictHistory>({});
  const [lastValidatedValues, setLastValidatedValues] = useState<LastValidatedValues>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Batch validation state (for medium stores)
  const [batchValidating, setBatchValidating] = useState(false);
  
  // Conflict modal state
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    conflicts: ValidationConflict[];
  }>({
    isOpen: false,
    conflicts: []
  });
  
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [validationEnabled, setValidationEnabled] = useState(storeSize === 'small');

  // Warning before leaving page if unsaved changes
  const hasUnsavedData = formData.skus.some(Boolean) || formData.barcodes.some(Boolean);
  const shouldWarnBeforeLeave = hasUnsavedData && !productId && !allowDuplicates;
  
  useBeforeUnloadWarning(
    shouldWarnBeforeLeave,
    'You have entered SKU and Barcode information. If you leave now, you will need to re-enter this information from within the product page in Shopify.'
  );

  // Initialize validation states for small stores
  useEffect(() => {
    if (storeSize === 'small') {
      const variantCount = hasVariants ? generateVariants().length : 1;
      setValidationStates(Array(variantCount).fill({ sku: 'idle', barcode: 'idle' }));
      setValidationTimeouts(Array(variantCount).fill(null));
    }
  }, [hasVariants, formData.options, storeSize]);

  // Helper function to get conflict key
  const getConflictKey = (type: 'sku' | 'barcode', value: string, index: number) => {
    return `${type}-${value}-${index}`;
  };

  // Helper function to check if value has changed since last validation
  const hasValueChanged = (type: 'sku' | 'barcode', value: string, index: number) => {
    const key = `variant-${index}`;
    const lastValues = lastValidatedValues[key];
    if (!lastValues) return true;
    return lastValues[type] !== value;
  };

  // Helper function to should skip validation
  const shouldSkipValidation = (type: 'sku' | 'barcode', value: string, index: number) => {
    const conflictKey = getConflictKey(type, value, index);
    const conflict = conflictHistory[conflictKey];
    
    // Skip if user chose to continue with duplicate and value hasn't changed
    if (conflict && conflict.userChoice === 'continue' && !hasValueChanged(type, value, index)) {
      return true;
    }
    
    // Skip if there's a pending conflict modal for this value
    if (conflict && conflict.userChoice === 'pending') {
      return true;
    }
    
    return false;
  };

  // Real-time validation for small stores
  const validateSKU = useCallback(async (sku: string, index: number) => {
    if (!sku) {
      setValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { ...newStates[index], sku: 'idle' };
        return newStates;
      });
      return;
    }

    // Skip validation if we should
    if (shouldSkipValidation('sku', sku, index)) {
      // Set state based on conflict history
      const conflictKey = getConflictKey('sku', sku, index);
      const conflict = conflictHistory[conflictKey];
      if (conflict && conflict.userChoice === 'continue') {
        setValidationStates(prev => {
          const newStates = [...prev];
          newStates[index] = { ...newStates[index], sku: 'conflict' };
          return newStates;
        });
      }
      return;
    }

    setValidationStates(prev => {
      const newStates = [...prev];
      newStates[index] = { ...newStates[index], sku: 'checking' };
      return newStates;
    });

    try {
      const result = await shopifyApi.validateSKU(sku);
      setValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { 
          ...newStates[index], 
          sku: result.available ? 'available' : 'conflict' 
        };
        return newStates;
      });

      // Update last validated values
      setLastValidatedValues(prev => ({
        ...prev,
        [`variant-${index}`]: {
          ...prev[`variant-${index}`],
          sku
        }
      }));

      if (!result.available) {
        const conflictKey = getConflictKey('sku', sku, index);
        setConflictHistory(prev => ({
          ...prev,
          [conflictKey]: {
            type: 'sku',
            value: sku,
            conflictingProduct: result.conflictingProduct!,
            userChoice: 'pending'
          }
        }));

        setConflictModal({
          isOpen: true,
          conflicts: [{
            type: 'sku',
            value: sku,
            conflictingProduct: result.conflictingProduct!
          }]
        });
      }
    } catch (error) {
      console.error('SKU validation error:', error);
      setValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { ...newStates[index], sku: 'error' };
        return newStates;
      });
    }
  }, [shopifyApi, conflictHistory, shouldSkipValidation]);

  const validateBarcode = useCallback(async (barcode: string, index: number) => {
    if (!barcode) {
      setValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { ...newStates[index], barcode: 'idle' };
        return newStates;
      });
      return;
    }

    // Skip validation if we should
    if (shouldSkipValidation('barcode', barcode, index)) {
      // Set state based on conflict history
      const conflictKey = getConflictKey('barcode', barcode, index);
      const conflict = conflictHistory[conflictKey];
      if (conflict && conflict.userChoice === 'continue') {
        setValidationStates(prev => {
          const newStates = [...prev];
          newStates[index] = { ...newStates[index], barcode: 'conflict' };
          return newStates;
        });
      }
      return;
    }

    setValidationStates(prev => {
      const newStates = [...prev];
      newStates[index] = { ...newStates[index], barcode: 'checking' };
      return newStates;
    });

    try {
      const result = await shopifyApi.validateBarcode(barcode);
      setValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { 
          ...newStates[index], 
          barcode: result.available ? 'available' : 'conflict' 
        };
        return newStates;
      });

      // Update last validated values
      setLastValidatedValues(prev => ({
        ...prev,
        [`variant-${index}`]: {
          ...prev[`variant-${index}`],
          barcode
        }
      }));

      if (!result.available) {
        const conflictKey = getConflictKey('barcode', barcode, index);
        setConflictHistory(prev => ({
          ...prev,
          [conflictKey]: {
            type: 'barcode',
            value: barcode,
            conflictingProduct: result.conflictingProduct!,
            userChoice: 'pending'
          }
        }));

        setConflictModal({
          isOpen: true,
          conflicts: [{
            type: 'barcode',
            value: barcode,
            conflictingProduct: result.conflictingProduct!
          }]
        });
      }
    } catch (error) {
      console.error('Barcode validation error:', error);
      setValidationStates(prev => {
        const newStates = [...prev];
        newStates[index] = { ...newStates[index], barcode: 'error' };
        return newStates;
      });
    }
  }, [shopifyApi, conflictHistory, shouldSkipValidation]);



  // Handle field focus and blur for controlled validation
  const handleFieldFocus = useCallback((fieldId: string) => {
    setFocusedField(fieldId);
  }, []);

  const handleFieldBlur = useCallback((fieldId: string) => {
    if (focusedField === fieldId) {
      setFocusedField(null);
      
      // Extract index from fieldId (format: "sku-0" or "barcode-0")
      const parts = fieldId.split('-');
      const fieldType = parts[0] as 'sku' | 'barcode';
      const index = parseInt(parts[1], 10);
      
      // Only validate if we're in small store mode and validation is enabled
      if (storeSize === 'small' && validationEnabled && !isNaN(index)) {
        // Clear any existing timeouts for this variant
        if (validationTimeouts[index]) {
          clearTimeout(validationTimeouts[index]);
        }
        
        // Start field-specific validation after a short delay
        const timeout = setTimeout(() => {
          const variants = hasVariants ? generateVariants() : [{ sku: formData.skus[0] || '', barcode: formData.barcodes[0] || '' }];
          const variant = variants[index];
          
          if (!variant) return;
          
          // Only validate the specific field that was blurred
          if (fieldType === 'sku' && variant.sku) {
            validateSKU(variant.sku, index);
          } else if (fieldType === 'barcode' && variant.barcode) {
            validateBarcode(variant.barcode, index);
          }
        }, 200);
        
        setValidationTimeouts(prev => {
          const newTimeouts = [...prev];
          newTimeouts[index] = timeout;
          return newTimeouts;
        });
      }
    }
  }, [focusedField, storeSize, validationEnabled, validationTimeouts, formData.skus, formData.barcodes, hasVariants, validateSKU, validateBarcode]);

  // Batch validation for medium stores
  const validateBatch = useCallback(async () => {
    const allSkus = hasVariants ? 
      generateVariants().map(v => v.sku).filter(Boolean) : 
      [formData.skus[0]].filter(Boolean);
    
    const allBarcodes = hasVariants ? 
      generateVariants().map(v => v.barcode).filter(Boolean) : 
      [formData.barcodes[0]].filter(Boolean);

    if (allSkus.length === 0) return true;

    setBatchValidating(true);
    try {
      const result = await shopifyApi.validateSKUsBatch(allSkus, allBarcodes);
      
      if (!result.valid) {
        setConflictModal({
          isOpen: true,
          conflicts: result.conflicts
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error('Batch validation error:', error);
      return true; // Allow to proceed on error
    } finally {
      setBatchValidating(false);
    }
  }, [formData.skus, formData.barcodes, hasVariants, shopifyApi]);

  const handleSKUChange = useCallback((value: string) => {
    const newSkus = [value];
    onChange({ skus: newSkus });
  }, [onChange]);

  const handleBarcodeChange = useCallback((value: string) => {
    const newBarcodes = [value];
    onChange({ barcodes: newBarcodes });
  }, [onChange]);

  const handleVariantSKUChange = useCallback((index: number, value: string) => {
    const newSkus = [...(formData.skus || [])];
    newSkus[index] = value;
    onChange({ skus: newSkus });
  }, [formData.skus, onChange]);

  const handleVariantBarcodeChange = useCallback((index: number, value: string) => {
    const newBarcodes = [...(formData.barcodes || [])];
    newBarcodes[index] = value;
    onChange({ barcodes: newBarcodes });
  }, [formData.barcodes, onChange]);

  // Generate variants if they exist
  const generateVariants = useCallback(() => {
    if (!hasVariants) return [];

    const cartesian = (...arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>(
        (results, array) => 
          results
            .map(result => array.map(value => [...result, value]))
            .reduce((subResults, array) => [...subResults, ...array], []),
        [[]]
      );
    };

    const optionValues = formData.options.map(option => option.values);
    const combinations = cartesian(...optionValues);

    return combinations.map((combination, index) => ({
      id: index.toString(),
      title: combination.join(' / '),
      sku: formData.skus[index] || '',
      barcode: formData.barcodes[index] || '',
    }));
  }, [formData.options, formData.skus, formData.barcodes, hasVariants]);

  const variants = generateVariants();
  const basePricing = formData.pricing?.[0];

  const getValidationIcon = (state: ValidationState) => {
    switch (state) {
      case 'checking':
        return <Spinner accessibilityLabel="Validating" size="small" />;
      case 'available':
        return <Icon source={CheckIcon} tone="success" />;
      case 'conflict':
      case 'error':
        return <Icon source={AlertTriangleIcon} tone="critical" />;
      default:
        return null;
    }
  };

  const getValidationError = (state: ValidationState) => {
    return state === 'conflict' || state === 'error';
  };

  // Check if field has a conflict that user chose to continue with
  const hasAcceptedConflict = (type: 'sku' | 'barcode', value: string, index: number) => {
    const conflictKey = getConflictKey(type, value, index);
    const conflict = conflictHistory[conflictKey];
    return conflict && conflict.userChoice === 'continue';
  };

  const isFormValid = () => {
    if (allowDuplicates) return true;
    
    // For large stores, no validation required
    if (storeSize === 'large') {
      return hasVariants ? variants.every(v => v.sku) : !!formData.skus[0];
    }
    
    // For small stores with real-time validation
    if (storeSize === 'small' && validationEnabled) {
      if (hasVariants) {
        return variants.every((variant, index) => {
          const states = validationStates[index];
          if (!states) return false;
          
          const skuValid = !variant.sku || states.sku === 'available' || hasAcceptedConflict('sku', variant.sku, index);
          const barcodeValid = !variant.barcode || states.barcode === 'available' || hasAcceptedConflict('barcode', variant.barcode, index);
          
          return variant.sku && skuValid && barcodeValid;
        });
      } else {
        const states = validationStates[0];
        if (!states) return false;
        
        const skuValid = !formData.skus[0] || states.sku === 'available' || hasAcceptedConflict('sku', formData.skus[0], 0);
        const barcodeValid = !formData.barcodes[0] || states.barcode === 'available' || hasAcceptedConflict('barcode', formData.barcodes[0], 0);
        
        return formData.skus[0] && skuValid && barcodeValid;
      }
    }
    
    // For medium stores or disabled validation, just check if SKUs exist
    return hasVariants ? variants.every(v => v.sku) : !!formData.skus[0];
  };

  const handleSubmit = async () => {
    // For medium stores, run batch validation
    if (storeSize === 'medium' && validationEnabled && !allowDuplicates) {
      const isValid = await validateBatch();
      if (!isValid) return;
    }
    
    if (isFormValid()) {
      onNext();
    }
  };

  const handleModalClose = () => {
    // Mark conflicts as resolved when user chooses to review and update
    const currentConflicts = conflictModal.conflicts;
    setConflictHistory(prev => {
      const updated = { ...prev };
      currentConflicts.forEach(conflict => {
        const key = getConflictKey(conflict.type, conflict.value, hasVariants ? 0 : 0); // TODO: Fix index tracking
        if (updated[key]) {
          updated[key].userChoice = 'resolved';
        }
      });
      return updated;
    });
    
    setConflictModal({ isOpen: false, conflicts: [] });
  };

  const handleContinueWithDuplicate = () => {
    // Mark conflicts as user choice to continue
    const currentConflicts = conflictModal.conflicts;
    setConflictHistory(prev => {
      const updated = { ...prev };
      currentConflicts.forEach(conflict => {
        const key = getConflictKey(conflict.type, conflict.value, hasVariants ? 0 : 0); // TODO: Fix index tracking
        if (updated[key]) {
          updated[key].userChoice = 'continue';
        }
      });
      return updated;
    });
    
    setAllowDuplicates(true);
    setConflictModal({ isOpen: false, conflicts: [] });
  };

  return (
    <>
      {/* Enhanced Product Information Display Card */}
      <ProductInfoCard
        title={formData.title}
        vendor={formData.vendor}
        productType={formData.productType}
        category={formData.category?.name}
        price={basePricing?.price}
        compareAtPrice={basePricing?.compareAtPrice}
        cost={basePricing?.cost}
      />

      <Card>
        <BlockStack gap="500">
          <Text variant="headingMd" as="h2">
            SKU & Barcode Assignment
          </Text>

          {/* Store size based messaging */}
          {storeSize === 'large' && (
            <Banner tone="info">
              <BlockStack gap="200">
                <Text as="p" fontWeight="bold">Large Catalog Detected</Text>
                <Text as="p">
                  For stores with extensive product catalogs, we recommend managing SKU 
                  uniqueness through your existing inventory management system.
                </Text>
              </BlockStack>
            </Banner>
          )}

          {storeSize === 'medium' && (
            <Banner tone="info">
              <BlockStack gap="200">
                <Text as="p" fontWeight="bold">Medium Catalog Size</Text>
                <Text as="p">
                  SKU validation will be performed when you submit this form to ensure uniqueness.
                </Text>
                <Checkbox
                  label="Enable SKU/Barcode validation"
                  checked={validationEnabled}
                  onChange={setValidationEnabled}
                  helpText="Recommended to prevent duplicate inventory issues"
                />
              </BlockStack>
            </Banner>
          )}

          {allowDuplicates && (
            <Banner tone="warning">
              <Text as="p">You have chosen to continue with duplicate SKU/Barcode values. This may cause inventory tracking issues.</Text>
            </Banner>
          )}

          {!hasVariants ? (
            // Single product SKU/Barcode form
            <BlockStack gap="400">
              <TextField
                label="SKU"
                value={formData.skus[0] || ''}
                onChange={handleSKUChange}
                onFocus={() => handleFieldFocus('sku-0')}
                onBlur={() => handleFieldBlur('sku-0')}
                autoComplete="off"
                helpText="Stock Keeping Unit - unique identifier for this product"
                suffix={storeSize === 'small' && validationEnabled ? getValidationIcon(validationStates[0]?.sku || 'idle') : undefined}
                error={storeSize === 'small' && validationEnabled ? getValidationError(validationStates[0]?.sku || 'idle') : false}
                tone={hasAcceptedConflict('sku', formData.skus[0] || '', 0) ? 'magic' : undefined}
              />

              <TextField
                label="Barcode (ISBN, UPC, GTIN, etc.)"
                value={formData.barcodes[0] || ''}
                onChange={handleBarcodeChange}
                onFocus={() => handleFieldFocus('barcode-0')}
                onBlur={() => handleFieldBlur('barcode-0')}
                autoComplete="off"
                helpText="Optional - Enter a valid barcode or leave blank"
                suffix={storeSize === 'small' && validationEnabled ? getValidationIcon(validationStates[0]?.barcode || 'idle') : undefined}
                error={storeSize === 'small' && validationEnabled ? getValidationError(validationStates[0]?.barcode || 'idle') : false}
                tone={hasAcceptedConflict('barcode', formData.barcodes[0] || '', 0) ? 'magic' : undefined}
              />
            </BlockStack>
          ) : (
            // Variant SKUs/Barcodes form
            <BlockStack gap="500">
              {variants.map((variant, index) => (
                <Card key={variant.id}>
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">
                      {variant.title}
                    </Text>

                    <BlockStack gap="300">
                      <TextField
                        label="SKU"
                        value={variant.sku}
                        onChange={(value) => handleVariantSKUChange(index, value)}
                        onFocus={() => handleFieldFocus(`sku-${index}`)}
                        onBlur={() => handleFieldBlur(`sku-${index}`)}
                        autoComplete="off"
                        helpText="Stock Keeping Unit - unique identifier for this variant"
                        suffix={storeSize === 'small' && validationEnabled ? getValidationIcon(validationStates[index]?.sku || 'idle') : undefined}
                        error={storeSize === 'small' && validationEnabled ? getValidationError(validationStates[index]?.sku || 'idle') : false}
                        tone={hasAcceptedConflict('sku', variant.sku, index) ? 'magic' : undefined}
                      />

                      <TextField
                        label="Barcode (ISBN, UPC, GTIN, etc.)"
                        value={variant.barcode}
                        onChange={(value) => handleVariantBarcodeChange(index, value)}
                        onFocus={() => handleFieldFocus(`barcode-${index}`)}
                        onBlur={() => handleFieldBlur(`barcode-${index}`)}
                        autoComplete="off"
                        helpText="Optional - Enter a valid barcode or leave blank"
                        suffix={storeSize === 'small' && validationEnabled ? getValidationIcon(validationStates[index]?.barcode || 'idle') : undefined}
                        error={storeSize === 'small' && validationEnabled ? getValidationError(validationStates[index]?.barcode || 'idle') : false}
                        tone={hasAcceptedConflict('barcode', variant.barcode, index) ? 'magic' : undefined}
                      />
                    </BlockStack>
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          )}

          <StepNavigation
            onBack={onBack}
            onNext={handleSubmit}
            nextDisabled={!isFormValid() && !allowDuplicates}
            nextLoading={batchValidating}
            nextLabel={batchValidating ? 'Validating...' : 'Next'}
          />
        </BlockStack>
      </Card>

      {/* Conflict Modal */}
      <SKUBarcodeConflictModal
        isOpen={conflictModal.isOpen}
        onClose={handleModalClose}
        onContinueWithDuplicate={handleContinueWithDuplicate}
        conflicts={conflictModal.conflicts}
      />
    </>
  );
} 