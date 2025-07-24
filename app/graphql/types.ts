// TypeScript types for GraphQL operations

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface Image {
  id: string;
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface MediaImage {
  id: string;
  alt: string | null;
  image: Image;
}

export interface Metafield {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: string;
  sku: string | null;
  barcode: string | null;
  inventoryQuantity: number;
  weight: number | null;
  weightUnit: string;
  compareAtPrice: string | null;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
}

export interface ProductOption {
  id: string;
  name: string;
  position: number;
  values: string[];
}

export interface Category {
  id: string;
  name: string;
  fullName: string;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  productType: string;
  descriptionHtml: string;
  tags: string[];
  totalInventory: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  category: Category | null;
  featuredImage: Image | null;
  priceRangeV2: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
}

export interface ProductWithVariants extends Product {
  options: ProductOption[];
  variants: {
    edges: Array<{
      node: ProductVariant;
    }>;
  };
}

export interface UserError {
  field: string[] | null;
  message: string;
}

export interface StagedUploadTarget {
  url: string;
  resourceUrl: string;
  parameters: Array<{
    name: string;
    value: string;
  }>;
}

export interface Shop {
  id: string;
  name: string;
  email: string;
  currencyCode: string;
  ianaTimezone: string;
  unitSystem: string;
  weightUnit: string;
  primaryDomain: {
    url: string;
    host: string;
  };
  plan: {
    displayName: string;
    partnerDevelopment: boolean;
    shopifyPlus: boolean;
  };
  features: {
    eligibleForSubscriptions: boolean;
    multiLocation: boolean;
  };
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  fullName: string;
  level: number;
  isLeaf: boolean;
  isRoot: boolean;
  parentId: string | null;
  childrenIds: string[];
}

// Input types for mutations

export interface ProductInput {
  id?: string;
  title?: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  handle?: string;
  seo?: {
    title?: string;
    description?: string;
  };
  category?: {
    id: string;
  };
}

export interface ProductVariantInput {
  id?: string;
  price?: string;
  compareAtPrice?: string;
  sku?: string;
  barcode?: string;
  weight?: number;
  weightUnit?: string;
  inventoryQuantity?: number;
  options?: string[];
}

export interface OptionCreateInput {
  name: string;
  values: string[];
}

export interface CreateMediaInput {
  originalSource: string;
  alt?: string;
  mediaContentType: 'IMAGE' | 'VIDEO' | 'MODEL_3D' | 'EXTERNAL_VIDEO';
}

export interface StagedUploadInput {
  filename: string;
  mimeType: string;
  resource: 'IMAGE' | 'VIDEO' | 'MODEL_3D' | 'FILE';
  fileSize?: string;
}