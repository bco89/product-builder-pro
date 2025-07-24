// GraphQL Fragments for common fields to reduce duplication

export const MoneyFragment = `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`;

export const MediaImageFragment = `
  fragment MediaImageFields on MediaImage {
    id
    alt
    image {
      id
      url
      altText
      width
      height
    }
  }
`;

export const MetafieldFragment = `
  fragment MetafieldFields on Metafield {
    id
    namespace
    key
    value
    type
  }
`;

export const ProductVariantFragment = `
  fragment ProductVariantFields on ProductVariant {
    id
    title
    price
    sku
    barcode
    inventoryQuantity
    weight
    weightUnit
    compareAtPrice
    selectedOptions {
      name
      value
    }
  }
`;

export const ProductFragment = `
  fragment ProductFields on Product {
    id
    title
    handle
    status
    vendor
    productType
    descriptionHtml
    tags
    totalInventory
    createdAt
    updatedAt
    publishedAt
    category {
      id
      name
      fullName
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
    priceRangeV2 {
      minVariantPrice {
        ...MoneyFields
      }
      maxVariantPrice {
        ...MoneyFields
      }
    }
  }
  ${MoneyFragment}
`;

export const ProductWithVariantsFragment = `
  fragment ProductWithVariantsFields on Product {
    ...ProductFields
    options {
      id
      name
      position
      values
    }
    variants(first: 100) {
      edges {
        node {
          ...ProductVariantFields
        }
      }
    }
  }
  ${ProductFragment}
  ${ProductVariantFragment}
`;

export const ErrorFragment = `
  fragment ErrorFields on DisplayableError {
    field
    message
  }
`;

export const UserErrorFragment = `
  fragment UserErrorFields on UserError {
    field
    message
  }
`;

export const StagedMediaUploadTargetFragment = `
  fragment StagedMediaUploadTargetFields on StagedMediaUploadTarget {
    url
    resourceUrl
    parameters {
      name
      value
    }
  }
`;

export const FileFragment = `
  fragment FileFields on File {
    alt
    createdAt
    fileStatus
    preview {
      image {
        url
        width
        height
      }
    }
    ... on MediaImage {
      id
      image {
        url
      }
    }
  }
`;