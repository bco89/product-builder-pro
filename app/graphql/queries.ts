export const GET_VENDORS = `#graphql
  query GetVendors {
    shop {
      productVendors(first: 250) {
        edges {
          node
        }
      }
    }
  }
`;

export const GET_PRODUCT_TYPES = `#graphql
  query GetProductTypes {
    shop {
      productTypes(first: 250) {
        edges {
          node
        }
      }
    }
  }
`;

export const GET_PRODUCT_TAGS = `#graphql
  query GetProductTags {
    shop {
      productTags(first: 250) {
        edges {
          node
        }
      }
    }
  }
`;

export const GET_PRODUCT_OPTIONS = `#graphql
  query GetProductOptions($type: String!) {
    products(first: 250, query: "product_type:$type") {
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