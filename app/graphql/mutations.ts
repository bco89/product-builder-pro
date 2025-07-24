// GraphQL Mutations for all write operations

import {
  ProductFragment,
  ProductWithVariantsFragment,
  ProductVariantFragment,
  UserErrorFragment,
  ErrorFragment,
  StagedMediaUploadTargetFragment,
  FileFragment,
} from './fragments';

// Product Creation & Update Mutations

export const CREATE_PRODUCT_BASIC = `
  mutation createProductBasic($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        ...ProductFields
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
  ${ProductFragment}
  ${UserErrorFragment}
`;

export const UPDATE_PRODUCT_DESCRIPTION = `
  mutation updateProductDescription($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        descriptionHtml
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
  ${UserErrorFragment}
`;

// Product Variant Mutations

export const CREATE_PRODUCT_OPTIONS = `
  mutation createProductOptions($productId: ID!, $options: [OptionCreateInput!]!) {
    productOptionsCreate(productId: $productId, options: $options) {
      product {
        id
        options {
          id
          name
          position
          optionValues {
            id
            name
          }
        }
        variants(first: 100) {
          edges {
            node {
              id
              title
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
  ${UserErrorFragment}
`;

export const PRODUCT_VARIANTS_BULK_CREATE = `
  mutation productVariantsBulkCreate($productId: ID!, $strategy: ProductVariantsBulkCreateStrategy!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, strategy: $strategy, variants: $variants) {
      product {
        id
        variants(first: 100) {
          edges {
            node {
              ...ProductVariantFields
            }
          }
        }
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
  ${ProductVariantFragment}
  ${UserErrorFragment}
`;

export const PRODUCT_VARIANTS_BULK_UPDATE = `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product {
        id
        variants(first: 100) {
          edges {
            node {
              ...ProductVariantFields
            }
          }
        }
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
  ${ProductVariantFragment}
  ${UserErrorFragment}
`;

// Staged Upload Mutations

export const STAGED_UPLOADS_CREATE = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        ...StagedMediaUploadTargetFields
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
  ${StagedMediaUploadTargetFragment}
  ${UserErrorFragment}
`;

export const CREATE_PRODUCT_WITH_MEDIA = `
  mutation createProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product {
        ...ProductWithVariantsFields
        media(first: 10) {
          edges {
            node {
              ...FileFields
            }
          }
        }
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
  ${ProductWithVariantsFragment}
  ${FileFragment}
  ${UserErrorFragment}
`;

// App Installation Mutation (for cache warming)

export const PUBLISH_SUBSCRIPTION = `
  mutation {
    pubSubWebhookSubscriptionCreate(
      topic: APP_INSTALLED
      webhookSubscription: {
        callbackUrl: "https://product-builder-pro.fly.dev/webhooks/app-installed"
        format: JSON
      }
    ) {
      webhookSubscription {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;