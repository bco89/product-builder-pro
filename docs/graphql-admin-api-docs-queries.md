# Shopify Queries

## Products

Returns a list of products.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/queries/products](https://shopify.dev/docs/api/admin-graphql/2025-01/queries/products)

Retrieve a list of products:  
query GetProducts {  
  products(first: 10\) {  
    nodes {  
      id  
      title  
    }  
  }  
}

Response \- JSON  
{  
  "products": {  
    "nodes": \[  
      {  
        "id": "gid://shopify/Product/20995642",  
        "title": "Element"  
      },  
      {  
        "id": "gid://shopify/Product/108828309",  
        "title": "Draft"  
      },  
      {  
        "id": "gid://shopify/Product/121709582",  
        "title": "Boots"  
      },  
      {  
        "id": "gid://shopify/Product/440089423",  
        "title": "IPod Nano \- 8GB"  
      },  
      {  
        "id": "gid://shopify/Product/558169081",  
        "title": "Unpublished Boots"  
      },  
      {  
        "id": "gid://shopify/Product/910489600",  
        "title": "Crafty Shoes"  
      },  
      {  
        "id": "gid://shopify/Product/912855135",  
        "title": "SEO Boots"  
      }  
    \]  
  }  
}

## productVariants

Returns a list of product variants.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/queries/productVariants](https://shopify.dev/docs/api/admin-graphql/2025-01/queries/productVariants)

Retrieves a list of product variants  
query ProductVariantsList {  
  productVariants(first: 10, query: "product\_id:20995642") {  
    nodes {  
      id  
      title  
    }  
    pageInfo {  
      startCursor  
      endCursor  
    }  
  }  
}

Response \- JSON  
{  
  "productVariants": {  
    "nodes": \[  
      {  
        "id": "gid://shopify/ProductVariant/30322695",  
        "title": "151cm"  
      },  
      {  
        "id": "gid://shopify/ProductVariant/113711323",  
        "title": "155cm"  
      },  
      {  
        "id": "gid://shopify/ProductVariant/236948360",  
        "title": "158cm"  
      }  
    \],  
    "pageInfo": {  
      "startCursor": "eyJsYXN0X2lkIjozMDMyMjY5NSwibGFzdF92YWx1ZSI6IjMwMzIyNjk1In0=",  
      "endCursor": "eyJsYXN0X2lkIjoyMzY5NDgzNjAsImxhc3RfdmFsdWUiOiIyMzY5NDgzNjAifQ=="  
    }  
  }  
}

## Taxonomy

The Taxonomy resource lets you access the categories, attributes and values of the loaded taxonomy tree.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/queries/taxonomy](https://shopify.dev/docs/api/admin-graphql/2025-01/queries/taxonomy)

Query reference:  
{  
  taxonomy {  
    \# Taxonomy fields  
  }  
}

## currentBulkOperation

Returns the current app's most recent BulkOperation. Apps can run one bulk query and one bulk mutation operation at a time, by shop.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/queries/currentBulkOperation](https://shopify.dev/docs/api/admin-graphql/2025-01/queries/currentBulkOperation)

Get the currentBulkOperation for a query  
query {  
  currentBulkOperation(type: QUERY) {  
    id  
    type  
    status  
  }  
}  
Response \- JSON  
{  
  "currentBulkOperation": {  
    "id": "gid://shopify/BulkOperation/726270413",  
    "type": "QUERY",  
    "status": "CREATED"  
  }  
}

