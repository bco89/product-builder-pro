# Shopify GraphQL Types \- Objects

## AppCreditEdge

An auto-generated type which holds one AppCredit and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppCreditEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppCreditEdge)

Map:  
Connections from  
\<-|AppCreditConnection.edges

{} AppCreditEdge

## AppEdge

An auto-generated type which holds one App and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppEdge)

Map:  
Connections from  
\<-|AppConnection.edges

{} AppEdge

## AppInstallationEdge

An auto-generated type which holds one AppInstallation and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppInstallationEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppInstallationEdge)

Map:  
Connections from  
\<-|AppInstallationConnection.edges

{} AppInstallationEdge

## AppPurchaseOneTimeEdge

An auto-generated type which holds one AppPurchaseOneTime and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppPurchaseOneTimeEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppPurchaseOneTimeEdge)

Map:  
Connections from  
\<-|AppPurchaseOneTimeConnection.edges

{} AppPurchaseOneTimeEdge

## AppRevenueAttributionRecordEdge

An auto-generated type which holds one AppRevenueAttributionRecord and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppRevenueAttributionRecordEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppRevenueAttributionRecordEdge)

Map:  
Connections from  
\<-|AppRevenueAttributionRecordConnection.edges

{} AppRevenueAttributionRecordEdge

## AppSubscriptionEdge

An auto-generated type which holds one AppSubscription and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppSubscriptionEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/AppSubscriptionEdge)

Map:  
Connections from  
\<-|AppSubscriptionConnection.edges

{} AppSubscriptionEdge

## FileEdge

An auto-generated type which holds one File and a cursor during pagination.  
Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/FileEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/FileEdge)

Map:  
Connections from  
\<-|FileConnection.edges

{} FileEdge

## ImageEdge

An auto-generated type which holds one Image and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ImageEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ImageEdge)

Map:  
Connections from  
\<-|ImageConnection.edges

{} ImageEdge

## MediaEdge

An auto-generated type which holds one Media and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/MediaEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/MediaEdge)

Map:  
Connections from  
\<-|MediaConnection.edges

{} MediaEdge

## ProductEdge

An auto-generated type which holds one Product and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductEdge)

Map:  
Connections from  
\<-|ProductConnection.edges

{} ProductEdge

## ProductOptionsCreateUserError

Requires `read_products` access scope.  
Error codes for failed `ProductOptionsCreate` mutation.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductOptionsCreateUserError](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductOptionsCreateUserError)

Map:  
No referencing fields

{} ProductOptionsCreateUserError

Mutations:  
productOptionsCreate \- Creates options on a product

ProductOptionsCreateUserError Mutations  
Map:  
\<\~\>ProductOptionsCreateUserError Mutations

{} ProductOptionsCreateUserError

Mutated by  
\<\~\>productOptionsCreate

Implements:  
DisplayableError \- Interface

Map:  
||-ProductOptionsCreateUserError Implements

{} ProductOptionsCreateUserError  
Implements  
||-DisplayableError

## ProductOptionUpdateUserError

Requires `read_products` access scope.  
Error codes for failed `ProductOptionUpdate` mutation.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductOptionUpdateUserError](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductOptionUpdateUserError)

Map:  
No referencing fields

{} ProductOptionUpdateUserError

Mutations:  
productOptionUpdate \- Updates a product option

Map:  
\<\~\>ProductOptionUpdateUserError Mutations

{} ProductOptionUpdateUserError

Mutated by  
\<\~\>productOptionUpdate

Implements:  
DisplayableError \- interface

Map:  
||-ProductOptionUpdateUserError Implements

{} ProductOptionUpdateUserError

Implements  
||-DisplayableError

## ProductSetUserError

Defines errors for ProductSet mutation.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductSetUserError](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductSetUserError)

Map:  
Fields from  
\<-|ProductSetOperation.userErrors

{} ProductSetUserError

Mutations:  
productSet  
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

Map:  
\<\~\>ProductSetUserError Mutations

{} ProductSetUserError

Mutated by  
\<\~\>productSet

Implements:  
DisplayableError \- interface

Map:  
||-ProductSetUserError Implements

{} ProductSetUserError

Implements  
||-DisplayableError

## ProductVariantComponentEdge

An auto-generated type which holds one ProductVariantComponent and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariantComponentEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariantComponentEdge)

Map:  
Connections from  
\<-|ProductVariantComponentConnection.edges

{} ProductVariantComponentEdge

## ProductVariantEdge

An auto-generated type which holds one ProductVariant and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariantEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariantEdge)  
Map:  
Connections from  
\<-|ProductVariantConnection.edges

{} ProductVariantEdge

## ProductVariantsBulkCreateUserError

Requires `read_products` access scope.  
Error codes for failed product variant bulk create mutations.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariantsBulkCreateUserError](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariantsBulkCreateUserError)

Map:  
No referencing fields

{} ProductVariantsBulkCreateUserError

Mutations:  
productVariantsBulkCreate  
Creates multiple variants in a single product. This mutation can be called directly or via the bulkOperation.

Map:  
\<\~\>ProductVariantsBulkCreateUserError Mutations

{} ProductVariantsBulkCreateUserError

Mutated by  
\<\~\>productVariantsBulkCreate

Implements:  
DisplayableError \- interface

Map:  
||-ProductVariantsBulkCreateUserError Implements

{} ProductVariantsBulkCreateUserError

Implements  
||-DisplayableError

## ProductVariantsBulkUpdateUserError

Requires `read_products` access scope.  
Error codes for failed variant bulk update mutations.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariantsBulkUpdateUserError](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/ProductVariantsBulkUpdateUserError)

Map:  
No referencing fields

{} ProductVariantsBulkUpdateUserError

Mutations:  
productVariantsBulkUpdate  
Updates multiple variants in a single product. This mutation can be called directly or via the bulkOperation.

Map:  
\<\~\>ProductVariantsBulkUpdateUserError Mutations

{} ProductVariantsBulkUpdateUserError

Mutated by  
\<\~\>productVariantsBulkUpdate

## TaxonomyCategoryAttributeEdge

An auto-generated type which holds one TaxonomyCategoryAttribute and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/TaxonomyCategoryAttributeEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/TaxonomyCategoryAttributeEdge)

Map:  
Connections from  
\<-|TaxonomyCategoryAttributeConnection.edges

{} TaxonomyCategoryAttributeEdge

## TaxonomyCategoryEdge

An auto-generated type which holds one TaxonomyCategory and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/TaxonomyCategoryEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/TaxonomyCategoryEdge)

Map:  
Connections from  
\<-|TaxonomyCategoryConnection.edges

{} TaxonomyCategoryEdge

## TaxonomyCategoryEdge

An auto-generated type which holds one TaxonomyCategory and a cursor during pagination.  
Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/TaxonomyCategoryEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/TaxonomyCategoryEdge)

Map:  
Connections from  
\<-|TaxonomyCategoryConnection.edges

{} TaxonomyCategoryEdge

## TaxonomyValueEdge

An auto-generated type which holds one TaxonomyValue and a cursor during pagination.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/objects/TaxonomyValueEdge](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/TaxonomyValueEdge)

Map:  
Connections from  
\<-|TaxonomyValueConnection.edges

{} TaxonomyValueEdge

