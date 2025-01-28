# Shopify API Objects

## MediaImage \- An image hosted on Shopify.

Requires `read_products` access scope, `read_files` access scope, `read_themes` access scope, `read_orders` access scope, `read_draft_orders` access scope or `read_images` access scope.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/MediaImage](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/MediaImage)

## Product

The `Product` object lets you manage products in a merchant’s store.

Products are the goods and services that merchants offer to customers. They can include various details such as title, description, price, images, and options such as size or color. You can use [product variants](https://shopify.dev/docs/api/admin-graphql/latest/objects/productvariant) to create or update different versions of the same product. You can also add or update product [media](https://shopify.dev/docs/api/admin-graphql/latest/interfaces/media). Products can be organized by grouping them into a [collection](https://shopify.dev/docs/api/admin-graphql/latest/objects/collection).

Learn more about working with [Shopify's product model](https://shopify.dev/docs/apps/build/graphql/migrate/new-product-model/product-model-components), including limitations and considerations.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/Product](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/Product)

Map:  
Fields and connections from  
\<-|AbandonedCheckoutLineItem.product  
\<-|CalculatedDraftOrderLineItem.product  
\<-|Channel.products  
\<-|Collection.products  
\<-|CombinedListing.parentProduct  
\<-|CombinedListingChild.product  
\<-|CustomerVisitProductInfo.product  
\<-|DeliveryProfileItem.product  
\<-|DiscountProducts.products  
\<-|DraftOrderLineItem.product  
\<-|LineItem.product  
\<-|PriceRuleItemEntitlements.products  
\<-|PriceRuleLineItemPrerequisites.products  
\<-|ProductBundleComponent.componentProduct  
\<-|ProductBundleOperation.product  
\<-|ProductConnection.nodes  
\<-|ProductDeleteOperation.product  
\<-|ProductDuplicateOperation.newProduct  
\<-|ProductDuplicateOperation.product  
\<-|ProductEdge.node  
\<-|ProductPublication.product  
\<-|ProductSetOperation.product  
\<-|ProductVariant.product  
\<-|Publication.products  
\<-|SellingPlanGroup.products

Deprecated fields and connections from  
\<-|Shop.products

Possible types in  
CommentEventEmbed  
MetafieldReference  
MetafieldReferencer

{} Product

## ProductOption

Requires `read_products` access scope.  
The product property names. For example, "Size", "Color", and "Material". Variants are selected based on permutations of these options. The limit for each product property name is 255 characters.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductOption](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductOption)

Map:  
Fields from  
\<-|Product.options  
\<-|ProductBundleComponentOptionSelection.componentOption  
\<-|ProductBundleComponentOptionSelection.parentOption  
\<-|ProductBundleComponentQuantityOption.parentOption

{} ProductOption

## ProductOptionValue

Requires `read_products` access scope.  
The product option value names. For example, "Red", "Blue", and "Green" for a "Color" option.  
Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductOptionValue](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductOptionValue)

Map:  
Fields from  
\<-|ProductOption.optionValues  
\<-|SelectedOption.optionValue

{} ProductOptionValue

## SelectedOption

Properties used by customers to select a product variant. Products can have multiple options, like different sizes or colors.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/SelectedOption](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/SelectedOption)

Map:  
Fields from  
\<-|ProductVariant.selectedOptions

{} SelectedOption

## StagedMediaUploadTarget

Information about a staged upload target, which should be used to send a request to upload the file.

For more information on the upload process, refer to [Upload media to Shopify](https://shopify.dev/apps/online-store/media/products#step-1-upload-media-to-shopify).

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/StagedMediaUploadTarget](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/StagedMediaUploadTarget)

Map:  
No referencing fields

{} StagedMediaUploadTarget

## ProductCategory

The details of a specific product category within the [Shopify product taxonomy](https://shopify.github.io/product-taxonomy/releases/unstable/?categoryId=sg-4-17-2-17).

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductCategory](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductCategory)

Map:  
Deprecated fields from  
\<-|Product.productCategory  
\<-|Shop.allProductCategories

{} ProductCategory

## TaxonomyCategory

The details of a specific product category within the [Shopify product taxonomy](https://shopify.github.io/product-taxonomy/releases/unstable/?categoryId=sg-4-17-2-17).

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/TaxonomyCategory](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/TaxonomyCategory)

Map:  
Fields and connections from  
\<-|CollectionRuleCategoryCondition.value  
\<-|Product.category  
\<-|Shop.allProductCategoriesList  
\<-|Taxonomy.categories  
\<-|TaxonomyCategoryConnection.nodes  
\<-|TaxonomyCategoryEdge.node

{} TaxonomyCategory

## ProductVariant

Requires `read_products` access scope.  
Represents a product variant.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariant](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariant)

Map:  
Fields and connections from  
\<-|AbandonedCheckoutLineItem.variant  
\<-|CalculatedDraftOrderLineItem.variant  
\<-|CalculatedExchangeLineItem.variant  
\<-|CalculatedLineItem.variant  
\<-|CombinedListingChild.parentVariant  
\<-|CustomerVisitProductInfo.variant  
\<-|DeliveryProfileItem.variants  
\<-|DiscountProducts.productVariants  
\<-|DraftOrderLineItem.variant  
\<-|FulfillmentOrderLineItem.variant  
\<-|InventoryItem.variant  
\<-|LineItem.variant  
\<-|OrderStagedChangeAddVariant.variant  
\<-|PriceListPrice.variant  
\<-|PriceRuleItemEntitlements.productVariants  
\<-|PriceRuleLineItemPrerequisites.productVariants  
\<-|Product.variants  
\<-|ProductBundleComponent.componentVariants  
\<-|ProductVariantComponent.productVariant  
\<-|ProductVariantConnection.nodes  
\<-|ProductVariantEdge.node  
\<-|QuantityPriceBreak.variant  
\<-|QuantityRule.productVariant  
\<-|SellingPlanGroup.productVariants  
\<-|SubscriptionBillingAttemptInsufficientStockProductVariantsError.insufficientStockProductVariants

Deprecated fields and connections from  
\<-|Shop.productVariants  
\<-|SubscriptionBillingAttemptOutOfStockProductVariantsError.outOfStockProductVariants

Possible types in  
CommentEventEmbed  
DeliveryPromiseParticipantOwner  
MetafieldReference  
MetafieldReferencer

{} ProductVariant

## ProductVariantComponent

Requires `read_products` access scope.  
A product variant component associated with a product variant.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariantComponent](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariantComponent)

Map:  
Fields and connections from  
\<-|ProductVariant.productVariantComponents  
\<-|ProductVariantComponentConnection.nodes  
\<-|ProductVariantComponentEdge.node

{} ProductVariantComponent

## Weight

A weight, which includes a numeric value and a unit of measurement.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/Weight](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/Weight)

Map:  
Fields from  
\<-|CalculatedDraftOrderLineItem.weight  
\<-|DraftOrderLineItem.weight  
\<-|FulfillmentOrderLineItem.weight  
\<-|InventoryItemMeasurement.weight  
\<-|ReturnLineItem.totalWeight

Possible types in  
DeliveryConditionCriteria

{} Weight

## BulkOperation

An asynchronous long-running operation to fetch data in bulk or to bulk import data.

Bulk operations are created using the `bulkOperationRunQuery` or `bulkOperationRunMutation` mutation. After they are created, clients should poll the `status` field for updates. When `COMPLETED`, the `url` field contains a link to the data in [JSONL](http://jsonlines.org/) format.

Refer to the [bulk operations guide](https://shopify.dev/api/usage/bulk-operations/imports) for more details.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/BulkOperation](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/BulkOperation)

Map:  
No referencing fields

{} BulkOperation
