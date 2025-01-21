export const GET_VENDORS = `#graphql
  query GetVendors {
    shop {
      metafields(first: 250, namespace: "custom", keys: ["vendors"]) {
        edges {
          node {
            value
          }
        }
      }
    }
  }
`;

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