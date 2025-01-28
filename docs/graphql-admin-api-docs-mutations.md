# Shopify Mutations with code examples

## productCreate

Requires `write_products` access scope. Also: The user must have a permission to create products.  
Creates a product.

Learn more about the [product model](https://shopify.dev/docs/apps/build/graphql/migrate/new-product-model) and [adding product data](https://shopify.dev/docs/apps/build/graphql/migrate/new-product-model/add-data).

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productCreate](https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productCreate)

Mutation reference:  
mutation productCreate($input: ProductInput, $media: \[CreateMediaInput\!\], $product: ProductCreateInput) {  
  productCreate(input: $input, media: $media, product: $product) {  
    product {  
      \# Product fields  
    }  
    shop {  
      \# Shop fields  
    }  
    userErrors {  
      field  
      message  
    }  
  }  
}

Input Variables:  
{  
  "input": {  
    "category": "gid://shopify/\<objectName\>/10079785100",  
    "claimOwnership": {  
      "bundles": true  
    },  
    "collectionsToJoin": \[  
      "gid://shopify/\<objectName\>/10079785100"  
    \],  
    "collectionsToLeave": \[  
      "gid://shopify/\<objectName\>/10079785100"  
    \],  
    "combinedListingRole": "CHILD",  
    "descriptionHtml": "\<your-descriptionHtml\>",  
    "giftCard": true,  
    "giftCardTemplateSuffix": "\<your-giftCardTemplateSuffix\>",  
    "handle": "\<your-handle\>",  
    "id": "gid://shopify/\<objectName\>/10079785100",  
    "metafields": \[  
      {  
        "description": "\<your-description\>",  
        "id": "gid://shopify/\<objectName\>/10079785100",  
        "key": "\<your-key\>",  
        "namespace": "\<your-namespace\>",  
        "type": "\<your-type\>",  
        "value": "\<your-value\>"  
      }  
    \],  
    "productOptions": \[  
      {  
        "linkedMetafield": {  
          "key": "\<your-key\>",  
          "namespace": "\<your-namespace\>",  
          "values": \[  
            "\<your-values\>"  
          \]  
        },  
        "name": "\<your-name\>",  
        "position": 1,  
        "values": \[  
          {  
            "linkedMetafieldValue": "\<your-linkedMetafieldValue\>",  
            "name": "\<your-name\>"  
          }  
        \]  
      }  
    \],  
    "productType": "\<your-productType\>",  
    "redirectNewHandle": true,  
    "requiresSellingPlan": true,  
    "seo": {  
      "description": "\<your-description\>",  
      "title": "\<your-title\>"  
    },  
    "status": "ACTIVE",  
    "tags": \[  
      "\<your-tags\>"  
    \],  
    "templateSuffix": "\<your-templateSuffix\>",  
    "title": "\<your-title\>",  
    "vendor": "\<your-vendor\>"  
  },  
  "media": \[  
    {  
      "alt": "\<your-alt\>",  
      "mediaContentType": "EXTERNAL\_VIDEO",  
      "originalSource": "\<your-originalSource\>"  
    }  
  \],  
  "product": {  
    "category": "gid://shopify/\<objectName\>/10079785100",  
    "claimOwnership": {  
      "bundles": true  
    },  
    "collectionsToJoin": \[  
      "gid://shopify/\<objectName\>/10079785100"  
    \],  
    "combinedListingRole": "CHILD",  
    "descriptionHtml": "\<your-descriptionHtml\>",  
    "giftCard": true,  
    "giftCardTemplateSuffix": "\<your-giftCardTemplateSuffix\>",  
    "handle": "\<your-handle\>",  
    "metafields": \[  
      {  
        "description": "\<your-description\>",  
        "id": "gid://shopify/\<objectName\>/10079785100",  
        "key": "\<your-key\>",  
        "namespace": "\<your-namespace\>",  
        "type": "\<your-type\>",  
        "value": "\<your-value\>"  
      }  
    \],  
    "productOptions": \[  
      {  
        "linkedMetafield": {  
          "key": "\<your-key\>",  
          "namespace": "\<your-namespace\>",  
          "values": \[  
            "\<your-values\>"  
          \]  
        },  
        "name": "\<your-name\>",  
        "position": 1,  
        "values": \[  
          {  
            "linkedMetafieldValue": "\<your-linkedMetafieldValue\>",  
            "name": "\<your-name\>"  
          }  
        \]  
      }  
    \],  
    "productType": "\<your-productType\>",  
    "requiresSellingPlan": true,  
    "seo": {  
      "description": "\<your-description\>",  
      "title": "\<your-title\>"  
    },  
    "status": "ACTIVE",  
    "tags": \[  
      "\<your-tags\>"  
    \],  
    "templateSuffix": "\<your-templateSuffix\>",  
    "title": "\<your-title\>",  
    "vendor": "\<your-vendor\>"  
  }  
}

Input Schema:  
input ProductInput {  
  category: ID  
  claimOwnership: ProductClaimOwnershipInput  
  collectionsToJoin: \[ID\!\]  
  collectionsToLeave: \[ID\!\]  
  combinedListingRole: CombinedListingsRole  
  descriptionHtml: String  
  giftCard: Boolean  
  giftCardTemplateSuffix: String  
  handle: String  
  id: ID  
  metafields: \[MetafieldInput\!\]  
  productOptions: \[OptionCreateInput\!\]  
  productPublications: \[ProductPublicationInput\!\]  
  productType: String  
  publications: \[ProductPublicationInput\!\]  
  publishDate: DateTime  
  publishOn: DateTime  
  published: Boolean  
  publishedAt: DateTime  
  redirectNewHandle: Boolean  
  requiresSellingPlan: Boolean  
  seo: SEOInput  
  status: ProductStatus  
  tags: \[String\!\]  
  templateSuffix: String  
  title: String  
  vendor: String  
}

input ProductClaimOwnershipInput {  
  bundles: Boolean  
}

input MetafieldInput {  
  description: String  
  id: ID  
  key: String  
  namespace: String  
  type: String  
  value: String  
}

input OptionCreateInput {  
  linkedMetafield: LinkedMetafieldCreateInput  
  name: String  
  position: Int  
  values: \[OptionValueCreateInput\!\]  
}

input ProductPublicationInput {  
  channelHandle: String  
  channelId: ID  
  publicationId: ID  
  publishDate: DateTime  
}

input SEOInput {  
  description: String  
  title: String  
}

input CreateMediaInput {  
  alt: String  
  mediaContentType: MediaContentType\!  
  originalSource: String\!  
}

input ProductCreateInput {  
  category: ID  
  claimOwnership: ProductClaimOwnershipInput  
  collectionsToJoin: \[ID\!\]  
  combinedListingRole: CombinedListingsRole  
  descriptionHtml: String  
  giftCard: Boolean  
  giftCardTemplateSuffix: String  
  handle: String  
  metafields: \[MetafieldInput\!\]  
  productOptions: \[OptionCreateInput\!\]  
  productType: String  
  requiresSellingPlan: Boolean  
  seo: SEOInput  
  status: ProductStatus  
  tags: \[String\!\]  
  templateSuffix: String  
  title: String  
  vendor: String  
}

## productCreateMedia \- Deprecated

Creates media for a product. Use `productUpdate` or `productSet` instead.

## productOptionsCreate

Requires `write_products` access scope. Also: The user must have a permission to create product variants.  
Creates options on a product.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productOptionsCreate](https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productOptionsCreate)

Mutation reference:  
mutation productOptionsCreate($options: \[OptionCreateInput\!\]\!, $productId: ID\!, $variantStrategy: ProductOptionCreateVariantStrategy) {  
  productOptionsCreate(options: $options, productId: $productId, variantStrategy: $variantStrategy) {  
    product {  
      \# Product fields  
    }  
    userErrors {  
      field  
      message  
    }  
  }  
}

Input Variables:  
{  
  "options": \[  
    {  
      "linkedMetafield": {  
        "key": "\<your-key\>",  
        "namespace": "\<your-namespace\>",  
        "values": \[  
          "\<your-values\>"  
        \]  
      },  
      "name": "\<your-name\>",  
      "position": 1,  
      "values": \[  
        {  
          "linkedMetafieldValue": "\<your-linkedMetafieldValue\>",  
          "name": "\<your-name\>"  
        }  
      \]  
    }  
  \],  
  "productId": "gid://shopify/\<objectName\>/10079785100",  
  "variantStrategy": "CREATE"  
}

Input Schema:  
input OptionCreateInput {  
  linkedMetafield: LinkedMetafieldCreateInput  
  name: String  
  position: Int  
  values: \[OptionValueCreateInput\!\]  
}

input LinkedMetafieldCreateInput {  
  key: String\!  
  namespace: String\!  
  values: \[String\!\]  
}

input OptionValueCreateInput {  
  linkedMetafieldValue: String  
  name: String  
}

## productOptionUpdate

Requires `write_products` access scope. Also: The user must have a permission to edit products and manage product variants.  
Updates a product option.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productOptionUpdate](https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productOptionUpdate)

Mutation reference:  
mutation productOptionUpdate($option: OptionUpdateInput\!, $optionValuesToAdd: \[OptionValueCreateInput\!\], $optionValuesToDelete: \[ID\!\], $optionValuesToUpdate: \[OptionValueUpdateInput\!\], $productId: ID\!, $variantStrategy: ProductOptionUpdateVariantStrategy) {  
  productOptionUpdate(option: $option, optionValuesToAdd: $optionValuesToAdd, optionValuesToDelete: $optionValuesToDelete, optionValuesToUpdate: $optionValuesToUpdate, productId: $productId, variantStrategy: $variantStrategy) {  
    product {  
      \# Product fields  
    }  
    userErrors {  
      field  
      message  
    }  
  }  
}

Input Variables:  
{  
  "option": {  
    "id": "gid://shopify/\<objectName\>/10079785100",  
    "linkedMetafield": {  
      "key": "\<your-key\>",  
      "namespace": "\<your-namespace\>"  
    },  
    "name": "\<your-name\>",  
    "position": 1  
  },  
  "optionValuesToAdd": \[  
    {  
      "linkedMetafieldValue": "\<your-linkedMetafieldValue\>",  
      "name": "\<your-name\>"  
    }  
  \],  
  "optionValuesToDelete": \[  
    "gid://shopify/\<objectName\>/10079785100"  
  \],  
  "optionValuesToUpdate": \[  
    {  
      "id": "gid://shopify/\<objectName\>/10079785100",  
      "linkedMetafieldValue": "\<your-linkedMetafieldValue\>",  
      "name": "\<your-name\>"  
    }  
  \],  
  "productId": "gid://shopify/\<objectName\>/10079785100",  
  "variantStrategy": "LEAVE\_AS\_IS"  
}

Input Schema:  
input OptionUpdateInput {  
  id: ID\!  
  linkedMetafield: LinkedMetafieldUpdateInput  
  name: String  
  position: Int  
}

input LinkedMetafieldUpdateInput {  
  key: String\!  
  namespace: String\!  
}

input OptionValueCreateInput {  
  linkedMetafieldValue: String  
  name: String  
}

input OptionValueUpdateInput {  
  id: ID\!  
  linkedMetafieldValue: String  
  name: String  
}

## productPublish \- Deprecated

Use `publishablePublish` instead.

## productSet

Requires `write_products` access scope. Also: The user must have a permission to create products.  
Creates or updates a product in a single request.

Use this mutation when syncing information from an external data source into Shopify.

When using this mutation to update a product, specify that product's `id` in the input.

Any list field (e.g. [collections](https://shopify.dev/api/admin-graphql/current/input-objects/ProductSetInput#field-productsetinput-collections), [metafields](https://shopify.dev/api/admin-graphql/current/input-objects/ProductSetInput#field-productsetinput-metafields), [variants](https://shopify.dev/api/admin-graphql/current/input-objects/ProductSetInput#field-productsetinput-variants)) will be updated so that all included entries are either created or updated, and all existing entries not included will be deleted.

All other fields will be updated to the value passed. Omitted fields will not be updated.

When run in synchronous mode, you will get the product back in the response. For versions `2024-04` and earlier, the synchronous mode has an input limit of 100 variants. This limit has been removed for versions `2024-07` and later.

In asynchronous mode, you will instead get a [ProductSetOperation](https://shopify.dev/api/admin-graphql/current/objects/ProductSetOperation) object back. You can then use the [productOperation](https://shopify.dev/api/admin-graphql/current/queries/productOperation) query to retrieve the updated product data. This query uses the `ProductSetOperation` object to check the status of the operation and to retrieve the details of the updated product and its variants.

If you need to update a subset of variants, use one of the bulk variant mutations:

* [productVariantsBulkCreate](https://shopify.dev/api/admin-graphql/current/mutations/productVariantsBulkCreate)  
* [productVariantsBulkUpdate](https://shopify.dev/api/admin-graphql/current/mutations/productVariantsBulkUpdate)  
* [productVariantsBulkDelete](https://shopify.dev/api/admin-graphql/current/mutations/productVariantsBulkDelete)

If you need to update options, use one of the product option mutations:

* [productOptionsCreate](https://shopify.dev/api/admin-graphql/current/mutations/productOptionsCreate)  
* [productOptionUpdate](https://shopify.dev/api/admin-graphql/current/mutations/productOptionUpdate)  
* [productOptionsDelete](https://shopify.dev/api/admin-graphql/current/mutations/productOptionsDelete)  
* [productOptionsReorder](https://shopify.dev/api/admin-graphql/current/mutations/productOptionsReorder)

See our guide to [sync product data from an external source](https://shopify.dev/api/admin/migrate/new-product-model/sync-data) for more.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productSet](https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productSet)

Mutation reference:  
mutation productSet($input: ProductSetInput\!, $synchronous: Boolean) {  
  productSet(input: $input, synchronous: $synchronous) {  
    product {  
      \# Product fields  
    }  
    productSetOperation {  
      \# ProductSetOperation fields  
    }  
    userErrors {  
      field  
      message  
    }  
  }  
}

Input Variables:  
{  
  "input": {  
    "category": "gid://shopify/\<objectName\>/10079785100",  
    "claimOwnership": {  
      "bundles": true  
    },  
    "collections": \[  
      "gid://shopify/\<objectName\>/10079785100"  
    \],  
    "combinedListingRole": "CHILD",  
    "descriptionHtml": "\<your-descriptionHtml\>",  
    "files": \[  
      {  
        "alt": "\<your-alt\>",  
        "contentType": "EXTERNAL\_VIDEO",  
        "duplicateResolutionMode": "APPEND\_UUID",  
        "filename": "\<your-filename\>",  
        "id": "gid://shopify/\<objectName\>/10079785100",  
        "originalSource": "\<your-originalSource\>"  
      }  
    \],  
    "giftCard": true,  
    "giftCardTemplateSuffix": "\<your-giftCardTemplateSuffix\>",  
    "handle": "\<your-handle\>",  
    "id": "gid://shopify/\<objectName\>/10079785100",  
    "metafields": \[  
      {  
        "description": "\<your-description\>",  
        "id": "gid://shopify/\<objectName\>/10079785100",  
        "key": "\<your-key\>",  
        "namespace": "\<your-namespace\>",  
        "type": "\<your-type\>",  
        "value": "\<your-value\>"  
      }  
    \],  
    "productOptions": \[  
      {  
        "id": "gid://shopify/\<objectName\>/10079785100",  
        "linkedMetafield": {  
          "key": "\<your-key\>",  
          "namespace": "\<your-namespace\>",  
          "values": \[  
            "\<your-values\>"  
          \]  
        },  
        "name": "\<your-name\>",  
        "position": 1,  
        "values": \[  
          {  
            "id": "gid://shopify/\<objectName\>/10079785100",  
            "name": "\<your-name\>"  
          }  
        \]  
      }  
    \],  
    "productType": "\<your-productType\>",  
    "redirectNewHandle": true,  
    "requiresSellingPlan": true,  
    "seo": {  
      "description": "\<your-description\>",  
      "title": "\<your-title\>"  
    },  
    "status": "ACTIVE",  
    "tags": \[  
      "\<your-tags\>"  
    \],  
    "templateSuffix": "\<your-templateSuffix\>",  
    "title": "\<your-title\>",  
    "variants": \[  
      {  
        "barcode": "\<your-barcode\>",  
        "compareAtPrice": "100.57",  
        "file": {  
          "alt": "\<your-alt\>",  
          "contentType": "EXTERNAL\_VIDEO",  
          "duplicateResolutionMode": "APPEND\_UUID",  
          "filename": "\<your-filename\>",  
          "id": "gid://shopify/\<objectName\>/10079785100",  
          "originalSource": "\<your-originalSource\>"  
        },  
        "id": "gid://shopify/\<objectName\>/10079785100",  
        "inventoryItem": {  
          "cost": "29.99",  
          "countryCodeOfOrigin": "AC",  
          "countryHarmonizedSystemCodes": \[  
            {  
              "countryCode": "AC",  
              "harmonizedSystemCode": "\<your-harmonizedSystemCode\>"  
            }  
          \],  
          "harmonizedSystemCode": "\<your-harmonizedSystemCode\>",  
          "measurement": {  
            "weight": {  
              "unit": "GRAMS",  
              "value": 1.1  
            }  
          },  
          "provinceCodeOfOrigin": "\<your-provinceCodeOfOrigin\>",  
          "requiresShipping": true,  
          "sku": "\<your-sku\>",  
          "tracked": true  
        },  
        "inventoryPolicy": "CONTINUE",  
        "inventoryQuantities": \[  
          {  
            "locationId": "gid://shopify/\<objectName\>/10079785100",  
            "name": "\<your-name\>",  
            "quantity": 1  
          }  
        \],  
        "metafields": \[  
          {  
            "id": "gid://shopify/\<objectName\>/10079785100",  
            "key": "\<your-key\>",  
            "namespace": "\<your-namespace\>",  
            "type": "\<your-type\>",  
            "value": "\<your-value\>"  
          }  
        \],  
        "optionValues": \[  
          {  
            "id": "gid://shopify/\<objectName\>/10079785100",  
            "linkedMetafieldValue": "\<your-linkedMetafieldValue\>",  
            "name": "\<your-name\>",  
            "optionId": "gid://shopify/\<objectName\>/10079785100",  
            "optionName": "\<your-optionName\>"  
          }  
        \],  
        "position": 1,  
        "price": "100.57",  
        "requiresComponents": true,  
        "sku": "\<your-sku\>",  
        "taxCode": "\<your-taxCode\>",  
        "taxable": true  
      }  
    \],  
    "vendor": "\<your-vendor\>"  
  },  
  "synchronous": true  
}

Input Schema:  
input ProductSetInput {  
  category: ID  
  claimOwnership: ProductClaimOwnershipInput  
  collections: \[ID\!\]  
  combinedListingRole: CombinedListingsRole  
  descriptionHtml: String  
  files: \[FileSetInput\!\]  
  giftCard: Boolean  
  giftCardTemplateSuffix: String  
  handle: String  
  id: ID  
  metafields: \[MetafieldInput\!\]  
  productOptions: \[OptionSetInput\!\]  
  productType: String  
  redirectNewHandle: Boolean  
  requiresSellingPlan: Boolean  
  seo: SEOInput  
  status: ProductStatus  
  tags: \[String\!\]  
  templateSuffix: String  
  title: String  
  variants: \[ProductVariantSetInput\!\]  
  vendor: String  
}

input ProductClaimOwnershipInput {  
  bundles: Boolean  
}

input FileSetInput {  
  alt: String  
  contentType: FileContentType  
  duplicateResolutionMode: FileCreateInputDuplicateResolutionMode  
  filename: String  
  id: ID  
  originalSource: String  
}

input MetafieldInput {  
  description: String  
  id: ID  
  key: String  
  namespace: String  
  type: String  
  value: String  
}

input OptionSetInput {  
  id: ID  
  linkedMetafield: LinkedMetafieldCreateInput  
  name: String  
  position: Int  
  values: \[OptionValueSetInput\!\]  
}

input SEOInput {  
  description: String  
  title: String  
}

input ProductVariantSetInput {  
  barcode: String  
  compareAtPrice: Money  
  file: FileSetInput  
  id: ID  
  inventoryItem: InventoryItemInput  
  inventoryPolicy: ProductVariantInventoryPolicy  
  inventoryQuantities: \[ProductSetInventoryInput\!\]  
  metafields: \[MetafieldInput\!\]  
  optionValues: \[VariantOptionValueInput\!\]\!  
  position: Int  
  price: Money  
  requiresComponents: Boolean  
  sku: String  
  taxCode: String  
  taxable: Boolean  
}

## productUpdate

Requires `write_products` access scope. Also: The user must have a permission to update products.  
Updates a product.

For versions `2024-01` and older: If you update a product and only include some variants in the update, then any variants not included will be deleted.

To safely manage variants without the risk of deleting excluded variants, use [productVariantsBulkUpdate](https://shopify.dev/api/admin-graphql/latest/mutations/productvariantsbulkupdate).

If you want to update a single variant, then use [productVariantUpdate](https://shopify.dev/api/admin-graphql/latest/mutations/productvariantupdate).

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productUpdate](https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productUpdate)

Mutation reference:  
mutation productUpdate($input: ProductInput, $media: \[CreateMediaInput\!\], $product: ProductUpdateInput) {  
  productUpdate(input: $input, media: $media, product: $product) {  
    product {  
      \# Product fields  
    }  
    userErrors {  
      field  
      message  
    }  
  }  
}

Input Variables:  
{  
  "input": {  
    "category": "gid://shopify/\<objectName\>/10079785100",  
    "claimOwnership": {  
      "bundles": true  
    },  
    "collectionsToJoin": \[  
      "gid://shopify/\<objectName\>/10079785100"  
    \],  
    "collectionsToLeave": \[  
      "gid://shopify/\<objectName\>/10079785100"  
    \],  
    "combinedListingRole": "CHILD",  
    "descriptionHtml": "\<your-descriptionHtml\>",  
    "giftCard": true,  
    "giftCardTemplateSuffix": "\<your-giftCardTemplateSuffix\>",  
    "handle": "\<your-handle\>",  
    "id": "gid://shopify/\<objectName\>/10079785100",  
    "metafields": \[  
      {  
        "description": "\<your-description\>",  
        "id": "gid://shopify/\<objectName\>/10079785100",  
        "key": "\<your-key\>",  
        "namespace": "\<your-namespace\>",  
        "type": "\<your-type\>",  
        "value": "\<your-value\>"  
      }  
    \],  
    "productOptions": \[  
      {  
        "linkedMetafield": {  
          "key": "\<your-key\>",  
          "namespace": "\<your-namespace\>",  
          "values": \[  
            "\<your-values\>"  
          \]  
        },  
        "name": "\<your-name\>",  
        "position": 1,  
        "values": \[  
          {  
            "linkedMetafieldValue": "\<your-linkedMetafieldValue\>",  
            "name": "\<your-name\>"  
          }  
        \]  
      }  
    \],  
    "productType": "\<your-productType\>",  
    "redirectNewHandle": true,  
    "requiresSellingPlan": true,  
    "seo": {  
      "description": "\<your-description\>",  
      "title": "\<your-title\>"  
    },  
    "status": "ACTIVE",  
    "tags": \[  
      "\<your-tags\>"  
    \],  
    "templateSuffix": "\<your-templateSuffix\>",  
    "title": "\<your-title\>",  
    "vendor": "\<your-vendor\>"  
  },  
  "media": \[  
    {  
      "alt": "\<your-alt\>",  
      "mediaContentType": "EXTERNAL\_VIDEO",  
      "originalSource": "\<your-originalSource\>"  
    }  
  \],  
  "product": {  
    "category": "gid://shopify/\<objectName\>/10079785100",  
    "collectionsToJoin": \[  
      "gid://shopify/\<objectName\>/10079785100"  
    \],  
    "collectionsToLeave": \[  
      "gid://shopify/\<objectName\>/10079785100"  
    \],  
    "deleteConflictingConstrainedMetafields": true,  
    "descriptionHtml": "\<your-descriptionHtml\>",  
    "giftCardTemplateSuffix": "\<your-giftCardTemplateSuffix\>",  
    "handle": "\<your-handle\>",  
    "id": "gid://shopify/\<objectName\>/10079785100",  
    "metafields": \[  
      {  
        "description": "\<your-description\>",  
        "id": "gid://shopify/\<objectName\>/10079785100",  
        "key": "\<your-key\>",  
        "namespace": "\<your-namespace\>",  
        "type": "\<your-type\>",  
        "value": "\<your-value\>"  
      }  
    \],  
    "productType": "\<your-productType\>",  
    "redirectNewHandle": true,  
    "requiresSellingPlan": true,  
    "seo": {  
      "description": "\<your-description\>",  
      "title": "\<your-title\>"  
    },  
    "status": "ACTIVE",  
    "tags": \[  
      "\<your-tags\>"  
    \],  
    "templateSuffix": "\<your-templateSuffix\>",  
    "title": "\<your-title\>",  
    "vendor": "\<your-vendor\>"  
  }  
}

Input Schema:  
input ProductInput {  
  category: ID  
  claimOwnership: ProductClaimOwnershipInput  
  collectionsToJoin: \[ID\!\]  
  collectionsToLeave: \[ID\!\]  
  combinedListingRole: CombinedListingsRole  
  descriptionHtml: String  
  giftCard: Boolean  
  giftCardTemplateSuffix: String  
  handle: String  
  id: ID  
  metafields: \[MetafieldInput\!\]  
  productOptions: \[OptionCreateInput\!\]  
  productPublications: \[ProductPublicationInput\!\]  
  productType: String  
  publications: \[ProductPublicationInput\!\]  
  publishDate: DateTime  
  publishOn: DateTime  
  published: Boolean  
  publishedAt: DateTime  
  redirectNewHandle: Boolean  
  requiresSellingPlan: Boolean  
  seo: SEOInput  
  status: ProductStatus  
  tags: \[String\!\]  
  templateSuffix: String  
  title: String  
  vendor: String  
}

input ProductClaimOwnershipInput {  
  bundles: Boolean  
}

input MetafieldInput {  
  description: String  
  id: ID  
  key: String  
  namespace: String  
  type: String  
  value: String  
}

input OptionCreateInput {  
  linkedMetafield: LinkedMetafieldCreateInput  
  name: String  
  position: Int  
  values: \[OptionValueCreateInput\!\]  
}

input ProductPublicationInput {  
  channelHandle: String  
  channelId: ID  
  publicationId: ID  
  publishDate: DateTime  
}

input SEOInput {  
  description: String  
  title: String  
}

input CreateMediaInput {  
  alt: String  
  mediaContentType: MediaContentType\!  
  originalSource: String\!  
}

input ProductUpdateInput {  
  category: ID  
  collectionsToJoin: \[ID\!\]  
  collectionsToLeave: \[ID\!\]  
  deleteConflictingConstrainedMetafields: Boolean  
  descriptionHtml: String  
  giftCardTemplateSuffix: String  
  handle: String  
  id: ID  
  metafields: \[MetafieldInput\!\]  
  productType: String  
  redirectNewHandle: Boolean  
  requiresSellingPlan: Boolean  
  seo: SEOInput  
  status: ProductStatus  
  tags: \[String\!\]  
  templateSuffix: String  
  title: String  
  vendor: String  
}

## productUpdateMedia \- Deprecated

Use `fileUpdate` instead.

## productVariantsBulkCreate

Requires `write_products` access scope. Also: The user must have a permission to create product variants.  
Creates multiple variants in a single product. This mutation can be called directly or via the bulkOperation.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productVariantsBulkCreate](https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/productVariantsBulkCreate)

Mutation reference:  
mutation productVariantsBulkCreate($media: \[CreateMediaInput\!\], $productId: ID\!, $strategy: ProductVariantsBulkCreateStrategy, $variants: \[ProductVariantsBulkInput\!\]\!) {  
  productVariantsBulkCreate(media: $media, productId: $productId, strategy: $strategy, variants: $variants) {  
    product {  
      \# Product fields  
    }  
    productVariants {  
      \# ProductVariant fields  
    }  
    userErrors {  
      field  
      message  
    }  
  }  
}

Input Variables:  
{  
  "media": \[  
    {  
      "alt": "\<your-alt\>",  
      "mediaContentType": "EXTERNAL\_VIDEO",  
      "originalSource": "\<your-originalSource\>"  
    }  
  \],  
  "productId": "gid://shopify/\<objectName\>/10079785100",  
  "strategy": "DEFAULT",  
  "variants": \[  
    {  
      "barcode": "\<your-barcode\>",  
      "compareAtPrice": "100.57",  
      "id": "gid://shopify/\<objectName\>/10079785100",  
      "inventoryItem": {  
        "cost": "29.99",  
        "countryCodeOfOrigin": "AC",  
        "countryHarmonizedSystemCodes": \[  
          {  
            "countryCode": "AC",  
            "harmonizedSystemCode": "\<your-harmonizedSystemCode\>"  
          }  
        \],  
        "harmonizedSystemCode": "\<your-harmonizedSystemCode\>",  
        "measurement": {  
          "weight": {  
            "unit": "GRAMS",  
            "value": 1.1  
          }  
        },  
        "provinceCodeOfOrigin": "\<your-provinceCodeOfOrigin\>",  
        "requiresShipping": true,  
        "sku": "\<your-sku\>",  
        "tracked": true  
      },  
      "inventoryPolicy": "CONTINUE",  
      "inventoryQuantities": \[  
        {  
          "availableQuantity": 1,  
          "locationId": "gid://shopify/\<objectName\>/10079785100"  
        }  
      \],  
      "mediaId": "gid://shopify/\<objectName\>/10079785100",  
      "mediaSrc": \[  
        "\<your-mediaSrc\>"  
      \],  
      "metafields": \[  
        {  
          "description": "\<your-description\>",  
          "id": "gid://shopify/\<objectName\>/10079785100",  
          "key": "\<your-key\>",  
          "namespace": "\<your-namespace\>",  
          "type": "\<your-type\>",  
          "value": "\<your-value\>"  
        }  
      \],  
      "optionValues": \[  
        {  
          "id": "gid://shopify/\<objectName\>/10079785100",  
          "linkedMetafieldValue": "\<your-linkedMetafieldValue\>",  
          "name": "\<your-name\>",  
          "optionId": "gid://shopify/\<objectName\>/10079785100",  
          "optionName": "\<your-optionName\>"  
        }  
      \],  
      "price": "100.57",  
      "requiresComponents": true,  
      "taxCode": "\<your-taxCode\>",  
      "taxable": true  
    }  
  \]  
}

Input Schema:  
input CreateMediaInput {  
  alt: String  
  mediaContentType: MediaContentType\!  
  originalSource: String\!  
}

input ProductVariantsBulkInput {  
  barcode: String  
  compareAtPrice: Money  
  id: ID  
  inventoryItem: InventoryItemInput  
  inventoryPolicy: ProductVariantInventoryPolicy  
  inventoryQuantities: \[InventoryLevelInput\!\]  
  mediaId: ID  
  mediaSrc: \[String\!\]  
  metafields: \[MetafieldInput\!\]  
  optionValues: \[VariantOptionValueInput\!\]  
  price: Money  
  requiresComponents: Boolean  
  taxCode: String  
  taxable: Boolean  
}

input InventoryItemInput {  
  cost: Decimal  
  countryCodeOfOrigin: CountryCode  
  countryHarmonizedSystemCodes: \[CountryHarmonizedSystemCodeInput\!\]  
  harmonizedSystemCode: String  
  measurement: InventoryItemMeasurementInput  
  provinceCodeOfOrigin: String  
  requiresShipping: Boolean  
  sku: String  
  tracked: Boolean  
}

input InventoryLevelInput {  
  availableQuantity: Int\!  
  locationId: ID\!  
}

input MetafieldInput {  
  description: String  
  id: ID  
  key: String  
  namespace: String  
  type: String  
  value: String  
}

input VariantOptionValueInput {  
  id: ID  
  linkedMetafieldValue: String  
  name: String  
  optionId: ID  
  optionName: String  
}

## bulkOperationRunMutation

Creates and runs a bulk operation mutation.

To learn how to bulk import large volumes of data asynchronously, refer to the [bulk import data guide](https://shopify.dev/api/usage/bulk-operations/imports).

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/bulkOperationRunMutation](https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/bulkOperationRunMutation)

Mutation reference:  
mutation bulkOperationRunMutation($clientIdentifier: String, $mutation: String\!, $stagedUploadPath: String\!) {  
  bulkOperationRunMutation(clientIdentifier: $clientIdentifier, mutation: $mutation, stagedUploadPath: $stagedUploadPath) {  
    bulkOperation {  
      \# BulkOperation fields  
    }  
    userErrors {  
      field  
      message  
    }  
  }  
}

Input Variables:  
{  
  "clientIdentifier": "\<your-clientIdentifier\>",  
  "mutation": "\<your-mutation\>",  
  "stagedUploadPath": "\<your-stagedUploadPath\>"  
}

## bulkOperationRunQuery

Creates and runs a bulk operation query.

See the [bulk operations guide](https://shopify.dev/api/usage/bulk-operations/queries) for more details.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/bulkOperationRunQuery](https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/bulkOperationRunQuery)

Mutation reference:  
mutation bulkOperationRunQuery($query: String\!) {  
  bulkOperationRunQuery(query: $query) {  
    bulkOperation {  
      \# BulkOperation fields  
    }  
    userErrors {  
      field  
      message  
    }  
  }  
}

Input Variables:  
{  
  "query": "\<your-query\>"  
}
