# Shopify GraphQL Types \- Input objects

## CreateMediaInput

The input fields required to create a media object.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/CreateMediaInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/CreateMediaInput)

Map:  
Fields  
\<-|CreateMediaInput.alt  
\<-|CreateMediaInput.mediaContentType  
\<-|CreateMediaInput.originalSource

CreateMediaInput

Mutations using this input  
\<\~\>productCreate  
\<\~\>productCreateMedia  
\<\~\>productUpdate  
\<\~\>productVariantsBulkCreate  
\<\~\>productVariantsBulkUpdate

## FileCreateInput

The input fields that are required to create a file object.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/FileCreateInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/FileCreateInput)

Map:  
Fields  
\<-|FileCreateInput.alt  
\<-|FileCreateInput.contentType  
\<-|FileCreateInput.duplicateResolutionMode  
\<-|FileCreateInput.filename  
\<-|FileCreateInput.originalSource

FileCreateInput

Mutations using this input  
\<\~\>fileCreate

## FileSetInput

The input fields required to create or update a file object.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/FileSetInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/FileSetInput)

Map:  
Fields  
\<-|FileSetInput.alt  
\<-|FileSetInput.contentType  
\<-|FileSetInput.duplicateResolutionMode  
\<-|FileSetInput.filename  
\<-|FileSetInput.id  
\<-|FileSetInput.originalSource

FileSetInput

Input objects using this input  
ProductSetInput.files  
ProductVariantSetInput.file

## FileUpdateInput

The input fields that are required to update a file object.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/FileUpdateInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/FileUpdateInput)

Map:  
Fields  
\<-|FileUpdateInput.alt  
\<-|FileUpdateInput.filename  
\<-|FileUpdateInput.id  
\<-|FileUpdateInput.originalSource  
\<-|FileUpdateInput.previewImageSource  
\<-|FileUpdateInput.referencesToAdd  
\<-|FileUpdateInput.referencesToRemove

FileUpdateInput

Mutations using this input  
\<\~\>fileUpdate

## ImageInput

The input fields for an image.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ImageInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ImageInput)

Map:  
Fields  
\<-|ImageInput.altText  
\<-|ImageInput.id  
\<-|ImageInput.src

ImageInput

Input objects using this input  
CollectionInput.image

## OptionAndValueInput

The input fields for the options and values of the combined listing.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/OptionAndValueInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/OptionAndValueInput)

Map:  
Fields  
\<-|OptionAndValueInput.linkedMetafield  
\<-|OptionAndValueInput.name  
\<-|OptionAndValueInput.optionId  
\<-|OptionAndValueInput.values

OptionAndValueInput

Mutations using this input  
\<\~\>combinedListingUpdate

## OptionCreateInput

The input fields for creating a product option.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/OptionCreateInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/OptionCreateInput)

Map:  
Fields  
\<-|OptionCreateInput.linkedMetafield  
\<-|OptionCreateInput.name  
\<-|OptionCreateInput.position  
\<-|OptionCreateInput.values

OptionCreateInput

Mutations using this input  
\<\~\>productOptionsCreate

Input objects using this input  
ProductCreateInput.productOptions  
ProductInput.productOptions

## OptionSetInput

The input fields for creating or updating a product option.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/OptionSetInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/OptionSetInput)

Map:  
Fields  
\<-|OptionSetInput.id  
\<-|OptionSetInput.linkedMetafield  
\<-|OptionSetInput.name  
\<-|OptionSetInput.position  
\<-|OptionSetInput.values

OptionSetInput

Input objects using this input  
ProductSetInput.productOptions

## OptionValueCreateInput

The input fields required to create a product option value.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/OptionValueCreateInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/OptionValueCreateInput)

Map:  
Fields  
\<-|OptionValueCreateInput.linkedMetafieldValue  
\<-|OptionValueCreateInput.name

OptionValueCreateInput

Mutations using this input  
\<\~\>productOptionUpdate

Input objects using this input  
OptionCreateInput.values

## OptionValueSetInput

The input fields for creating or updating a product option value.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/OptionValueSetInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/OptionValueSetInput)

Map:  
Fields  
\<-|OptionValueSetInput.id  
\<-|OptionValueSetInput.name

OptionValueSetInput

Input objects using this input  
OptionSetInput.values

## ProductIdentifierInput

The input fields for identifying a product.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductIdentifierInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductIdentifierInput)

Map:  
Fields  
\<-|ProductIdentifierInput.customId  
\<-|ProductIdentifierInput.handle  
\<-|ProductIdentifierInput.id

ProductIdentifierInput

## ProductInput

The input fields for creating or updating a product.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductInput)

Map:  
Fields  
\<-|ProductInput.category  
\<-|ProductInput.claimOwnership  
\<-|ProductInput.collectionsToJoin  
\<-|ProductInput.collectionsToLeave  
\<-|ProductInput.combinedListingRole  
\<-|ProductInput.descriptionHtml  
\<-|ProductInput.giftCard  
\<-|ProductInput.giftCardTemplateSuffix  
\<-|ProductInput.handle  
\<-|ProductInput.id  
\<-|ProductInput.metafields  
\<-|ProductInput.productOptions  
\<-|ProductInput.productType  
\<-|ProductInput.redirectNewHandle  
\<-|ProductInput.requiresSellingPlan  
\<-|ProductInput.seo  
\<-|ProductInput.status  
\<-|ProductInput.tags  
\<-|ProductInput.templateSuffix  
\<-|ProductInput.title  
\<-|ProductInput.vendor

Deprecated fields  
\<-|ProductInput.productPublications  
\<-|ProductInput.publications  
\<-|ProductInput.publishDate  
\<-|ProductInput.publishOn  
\<-|ProductInput.published  
\<-|ProductInput.publishedAt

ProductInput

\<\~\>productCreate \- Deprecated  
\<\~\>productUpdate \- Deprecated

## ProductSetInput

The input fields required to create or update a product via ProductSet mutation.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductSetInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductSetInput)

Map:  
Fields  
\<-|ProductSetInput.category  
\<-|ProductSetInput.claimOwnership  
\<-|ProductSetInput.collections  
\<-|ProductSetInput.combinedListingRole  
\<-|ProductSetInput.descriptionHtml  
\<-|ProductSetInput.files  
\<-|ProductSetInput.giftCard  
\<-|ProductSetInput.giftCardTemplateSuffix  
\<-|ProductSetInput.handle  
\<-|ProductSetInput.id  
\<-|ProductSetInput.metafields  
\<-|ProductSetInput.productOptions  
\<-|ProductSetInput.productType  
\<-|ProductSetInput.redirectNewHandle  
\<-|ProductSetInput.requiresSellingPlan  
\<-|ProductSetInput.seo  
\<-|ProductSetInput.status  
\<-|ProductSetInput.tags  
\<-|ProductSetInput.templateSuffix  
\<-|ProductSetInput.title  
\<-|ProductSetInput.variants  
\<-|ProductSetInput.vendor

ProductSetInput

Mutations using this input  
\<\~\>productSet

## ProductVariantPositionInput

The input fields representing a product variant position.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductVariantPositionInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductVariantPositionInput)

Map:  
Fields  
\<-|ProductVariantPositionInput.id  
\<-|ProductVariantPositionInput.position

ProductVariantPositionInput

Mutations using this input  
\<\~\>productVariantsBulkReorder

## ProductVariantsBulkInput

The input fields for specifying a product variant to create as part of a variant bulk mutation.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductVariantsBulkInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductVariantsBulkInput)

Map:  
Fields  
\<-|ProductVariantsBulkInput.barcode  
\<-|ProductVariantsBulkInput.compareAtPrice  
\<-|ProductVariantsBulkInput.id  
\<-|ProductVariantsBulkInput.inventoryItem  
\<-|ProductVariantsBulkInput.inventoryPolicy  
\<-|ProductVariantsBulkInput.inventoryQuantities  
\<-|ProductVariantsBulkInput.mediaId  
\<-|ProductVariantsBulkInput.mediaSrc  
\<-|ProductVariantsBulkInput.metafields  
\<-|ProductVariantsBulkInput.optionValues  
\<-|ProductVariantsBulkInput.price  
\<-|ProductVariantsBulkInput.requiresComponents  
\<-|ProductVariantsBulkInput.taxCode  
\<-|ProductVariantsBulkInput.taxable

ProductVariantsBulkInput

Mutations using this input  
\<\~\>productVariantsBulkCreate  
\<\~\>productVariantsBulkUpdate

## ProductVariantSetInput

The input fields for specifying a product variant to create or update.  
Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductVariantSetInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/ProductVariantSetInput)

Map:  
Fields  
\<-|ProductVariantSetInput.barcode  
\<-|ProductVariantSetInput.compareAtPrice  
\<-|ProductVariantSetInput.file  
\<-|ProductVariantSetInput.id  
\<-|ProductVariantSetInput.inventoryItem  
\<-|ProductVariantSetInput.inventoryPolicy  
\<-|ProductVariantSetInput.inventoryQuantities  
\<-|ProductVariantSetInput.metafields  
\<-|ProductVariantSetInput.optionValues  
\<-|ProductVariantSetInput.position  
\<-|ProductVariantSetInput.price  
\<-|ProductVariantSetInput.requiresComponents  
\<-|ProductVariantSetInput.sku  
\<-|ProductVariantSetInput.taxCode  
\<-|ProductVariantSetInput.taxable

ProductVariantSetInput

Input objects using this input  
ProductSetInput.variants

## SEOInput

The input fields for SEO information.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/SEOInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/SEOInput)

Map:  
Fields  
\<-|SEOInput.description  
\<-|SEOInput.title

SEOInput

Input objects using this input  
CollectionInput.seo  
ProductCreateInput.seo  
ProductInput.seo  
ProductSetInput.seo  
ProductUpdateInput.seo

## WeightInput

The input fields for the weight unit and value inputs.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/WeightInput](https://shopify.dev/docs/api/admin-graphql/2025-01/input-objects/WeightInput)

Map:  
Fields  
\<-|WeightInput.unit  
\<-|WeightInput.value

WeightInput

Input objects using this input  
CustomShippingPackageInput.weight  
DeliveryWeightConditionInput.criteria  
DraftOrderLineItemInput.weight  
InventoryItemMeasurementInput.weight  
