# Shopify GraphQL Types \- Connections

## ProductConnection

An auto-generated type for paginating through multiple Products.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/connections/ProductConnection](https://shopify.dev/docs/api/admin-graphql/2025-01/connections/ProductConnection)

Map:  
Fields with this connection  
{}Channel.products  
{}Collection.products  
{}DiscountProducts.products  
{}PriceRuleItemEntitlements.products  
{}PriceRuleLineItemPrerequisites.products  
{}Publication.products  
{}SellingPlanGroup.products

Deprecated fields with this connection  
{}Shop.products

Queries with this connection  
\<?\>products

{} ProductConnection

Possible returns  
\<-\>ProductConnection.edges  
\<-\>ProductConnection.nodes  
\<-\>ProductConnection.pageInfo

## ProductVariantConnection

An auto-generated type for paginating through multiple ProductVariants.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/connections/ProductVariantConnection](https://shopify.dev/docs/api/admin-graphql/2025-01/connections/ProductVariantConnection)

Map:  
Fields with this connection  
{}DeliveryProfileItem.variants  
{}DiscountProducts.productVariants  
{}PriceRuleItemEntitlements.productVariants  
{}PriceRuleLineItemPrerequisites.productVariants  
{}Product.variants  
{}ProductBundleComponent.componentVariants  
{}SellingPlanGroup.productVariants  
{}SubscriptionBillingAttemptInsufficientStockProductVariantsError.insufficientStockProductVariants

Deprecated fields with this connection  
{}Shop.productVariants  
{}SubscriptionBillingAttemptOutOfStockProductVariantsError.outOfStockProductVariants

Queries with this connection  
\<?\>productVariants

{} ProductVariantConnection

Possible returns  
\<-\>ProductVariantConnection.edges  
\<-\>ProductVariantConnection.nodes  
\<-\>ProductVariantConnection.pageInfo

## TaxonomyCategoryAttributeConnection

An auto-generated type for paginating through multiple TaxonomyCategoryAttributes.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/connections/TaxonomyCategoryAttributeConnection](https://shopify.dev/docs/api/admin-graphql/2025-01/connections/TaxonomyCategoryAttributeConnection)

Map:  
Fields with this connection  
{}TaxonomyCategory.attributes

{}TaxonomyCategoryAttributeConnection

Possible returns  
\<-\>TaxonomyCategoryAttributeConnection.edges  
\<-\>TaxonomyCategoryAttributeConnection.nodes  
\<-\>TaxonomyCategoryAttributeConnection.pageInfo

## TaxonomyCategoryConnection

An auto-generated type for paginating through multiple TaxonomyCategories.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/connections/TaxonomyCategoryConnection](https://shopify.dev/docs/api/admin-graphql/2025-01/connections/TaxonomyCategoryConnection)

Map:  
Fields with this connection  
{}Taxonomy.categories

{}TaxonomyCategoryConnection

Possible returns  
\<-\>TaxonomyCategoryConnection.edges  
\<-\>TaxonomyCategoryConnection.nodes  
\<-\>TaxonomyCategoryConnection.pageInfo

## TaxonomyValueConnection

An auto-generated type for paginating through multiple TaxonomyValues.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/connections/TaxonomyValueConnection](https://shopify.dev/docs/api/admin-graphql/2025-01/connections/TaxonomyValueConnection)

Map:  
Fields with this connection  
{}TaxonomyChoiceListAttribute.values

{}TaxonomyValueConnection

Possible returns  
\<-\>TaxonomyValueConnection.edges  
\<-\>TaxonomyValueConnection.nodes  
\<-\>TaxonomyValueConnection.pageInfo

