// GraphQL Queries for all read operations

import { ProductFragment, ProductWithVariantsFragment, MoneyFragment } from './fragments';

// Shop & Store Queries

export const GET_SHOP_DATA = `
  query getShopData {
    shop {
      id
      name
      email
      currencyCode
      ianaTimezone
      unitSystem
      weightUnit
      primaryDomain {
        url
        host
      }
      plan {
        displayName
        partnerDevelopment
        shopifyPlus
      }
      features {
        eligibleForSubscriptions
        multiLocation
      }
    }
  }
`;

export const GET_STORE_SETTINGS = `
  query getStoreSettings {
    shop {
      name
      currencyCode
      weightUnit
      currencyFormats {
        moneyFormat
        moneyWithCurrencyFormat
      }
    }
  }
`;

export const GET_STORE_METRICS = `
  query getStoreMetrics {
    shop {
      productTypes(first: 100) {
        edges {
          node
        }
      }
    }
    productVendors(first: 100) {
      edges {
        node
      }
    }
    products(first: 1) {
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export const GET_PRODUCT_COUNT = `
  query getProductCount {
    productsCount {
      count
    }
  }
`;

// Vendor & Product Type Queries

export const GET_VENDORS = `
  query getVendors {
    productVendors(first: 100) {
      edges {
        node
      }
    }
  }
`;

export const GET_PRODUCT_TYPES_BY_VENDOR = `
  query getProductTypesByVendor($vendor: String!) {
    products(first: 100, query: $vendor) {
      edges {
        node {
          productType
        }
      }
    }
  }
`;

export const GET_ALL_PRODUCT_TYPES = `
  query getAllProductTypes {
    shop {
      productTypes(first: 250) {
        edges {
          node
        }
      }
    }
  }
`;

// Product Queries

export const GET_PRODUCTS = `
  query getProducts($query: String, $first: Int = 10, $after: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        cursor
        node {
          ...ProductFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${ProductFragment}
`;

export const GET_PRODUCT_WITH_VARIANTS = `
  query getProductWithVariants($id: ID!) {
    product(id: $id) {
      ...ProductWithVariantsFields
    }
  }
  ${ProductWithVariantsFragment}
`;

export const GET_PRODUCT_VARIANTS = `
  query getProductVariants($id: ID!) {
    product(id: $id) {
      id
      title
      options {
        id
        name
        position
        values
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            sku
            price
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

// Validation Queries

export const VALIDATE_PRODUCT_HANDLE = `
  query validateProductHandle($handle: String!) {
    productByIdentifier(identifier: { handle: $handle }) {
      id
      title
    }
  }
`;

export const VALIDATE_BARCODE = `
  query validateBarcode($query: String!) {
    productVariants(first: 1, query: $query) {
      edges {
        node {
          id
          barcode
          product {
            id
            title
            handle
          }
        }
      }
    }
  }
`;

export const VALIDATE_SKU = `
  query validateSKU($query: String!) {
    productVariants(first: 1, query: $query) {
      edges {
        node {
          id
          sku
          product {
            id
            title
          }
        }
      }
    }
  }
`;

// Category Queries

export const GET_CATEGORIES_BY_PRODUCT_TYPE = `
  query getCategoriesByProductType($productType: String!) {
    products(first: 20, query: $productType) {
      edges {
        node {
          productType
          category {
            id
            name
            fullName
          }
        }
      }
    }
  }
`;

export const GET_TAXONOMY_CATEGORIES_HIERARCHICAL = `
  query getTaxonomyCategories($search: String, $childrenOf: ID) {
    taxonomy {
      categories(
        first: 50
        search: $search
        childrenOf: $childrenOf
      ) {
        edges {
          node {
            id
            name
            fullName
            level
            isLeaf
            isRoot
            parentId
            childrenIds
          }
        }
      }
    }
  }
`;

// File Upload Query

export const GET_FILES = `
  query getFiles($first: Int!, $query: String) {
    files(first: $first, query: $query) {
      edges {
        node {
          id
          alt
          createdAt
          fileStatus
          ... on MediaImage {
            image {
              url
              width
              height
            }
          }
        }
      }
    }
  }
`;

// Legacy queries (kept for compatibility)

export const GET_PRODUCT_TYPES = `#graphql
  query GetProductTypes {
    collections(first: 250) {
      edges {
        node {
          handle
          title
        }
      }
    }
  }
`;

export const GET_PRODUCT_TAGS = `#graphql
  query GetProductTags {
    collections(first: 250) {
      edges {
        node {
          products(first: 250) {
            edges {
              node {
                tags
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_PRODUCT_OPTIONS = `#graphql
  query GetProductOptions($productType: String!) {
    products(first: 250, query: $productType) {
      edges {
        node {
          options {
            name
            values
          }
        }
      }
    }
  }
`;

export const GET_PRODUCT_CATEGORIES = `#graphql
  query GetProductCategories($productType: String!) {
    products(first: 250, query: $productType) {
      edges {
        node {
          category {
            id
            name
          }
        }
      }
    }
  }
`;

export const SHOP_QUERY = `#graphql
  query {
    shop {
      name
      metafields(first: 10, namespace: "custom") {
        edges {
          node {
            key
            value
          }
        }
      }
    }
  }
`; 