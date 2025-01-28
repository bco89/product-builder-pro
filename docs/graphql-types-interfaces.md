# Shopify GraphQL Types \- Interfaces

## File

Requires `read_products` access scope, `read_files` access scope, `read_themes` access scope, `read_orders` access scope, `read_draft_orders` access scope or `read_images` access scope.  
A file interface.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/interfaces/File](https://shopify.dev/docs/api/admin-graphql/2025-01/interfaces/File)

Code Variables:  
{  
	"alt": "",  
	"createdAt": "",  
	"fileErrors": "",  
	"fileStatus": "",  
	"id": "",  
	"preview": "",  
	"updatedAt": ""  
}

Code Schema:  
interface File {  
  alt: String  
  createdAt: DateTime\!  
  fileErrors: \[FileError\!\]\!  
  fileStatus: FileStatus\!  
  id: ID\!  
  preview: MediaPreviewImage  
  updatedAt: DateTime\!  
}

Map:  
Fields  
\<-|File.alt  
\<-|File.createdAt  
\<-|File.fileErrors  
\<-|File.fileStatus  
\<-|File.id  
\<-|File.preview  
\<-|File.updatedAt

{}File

Types implemented in  
\<-|ExternalVideo  
\<-|GenericFile  
\<-|MediaImage  
\<-|Model3d  
\<-|Video

## Media

Requires `read_products` access scope, `read_files` access scope, `read_themes` access scope, `read_orders` access scope, `read_draft_orders` access scope or `read_images` access scope.  
Represents a media interface.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/interfaces/Media](https://shopify.dev/docs/api/admin-graphql/2025-01/interfaces/Media)

Code Variables:  
{  
	"alt": "",  
	"id": "",  
	"mediaContentType": "",  
	"mediaErrors": "",  
	"mediaWarnings": "",  
	"preview": "",  
	"status": ""  
}

Code Schema:  
interface Media {  
  alt: String  
  id: ID\!  
  mediaContentType: MediaContentType\!  
  mediaErrors: \[MediaError\!\]\!  
  mediaWarnings: \[MediaWarning\!\]\!  
  preview: MediaPreviewImage  
  status: MediaStatus\!  
}

Map:  
Fields  
\<-|Media.alt  
\<-|Media.id  
\<-|Media.mediaContentType  
\<-|Media.mediaErrors  
\<-|Media.mediaWarnings  
\<-|Media.preview  
\<-|Media.status

{}Media

Types implemented in  
\<-|ExternalVideo  
\<-|MediaImage  
\<-|Model3d  
\<-|Video

## Node

An object with an ID field to support global identification, in accordance with the [Relay specification](https://relay.dev/graphql/objectidentification.htm#sec-Node-Interface). This interface is used by the [node](https://shopify.dev/api/admin-graphql/unstable/queries/node) and [nodes](https://shopify.dev/api/admin-graphql/unstable/queries/nodes) queries.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/interfaces/Node](https://shopify.dev/docs/api/admin-graphql/2025-01/interfaces/Node)

Code Variables:  
{  
	"id": ""  
}

Code Schema:  
interface Node {  
  id: ID\!  
}

Map:  
Fields  
\<-|Node.id

{}Node

Types implemented in (Not a comprehensive list)  
\<-|App  
\<-|BasicEvent  
\<-|BulkOperation  
\<-|Comment  
\<-|CommentEvent  
\<-|Domain  
\<-|GenericFile  
\<-|MediaImage  
\<-|Menu  
\<-|Product  
\<-|ProductOption  
\<-|ProductOptionValue  
\<-|ProductSetOperation  
\<-|ProductTaxonomyNode  
\<-|ProductVariant  
\<-|ProductVariantComponent  
\<-|StaffMember  
\<-|StorefrontAccessToken  
\<-|TaxonomyAttribute  
\<-|TaxonomyCategory  
\<-|TaxonomyChoiceListAttribute  
\<-|TaxonomyMeasurementAttribute  
\<-|TaxonomyValue  
\<-|Validation  
\<-|Video

## ProductOperation

Requires `read_products` access scope.  
An entity that represents details of an asynchronous operation on a product.

Link: [https://shopify.dev/docs/api/admin-graphql/2025-01/interfaces/ProductOperation](https://shopify.dev/docs/api/admin-graphql/2025-01/interfaces/ProductOperation)

Code Variables:  
{  
	"product": "",  
	"status": ""  
}

Code Schema:  
interface ProductOperation {  
  product: Product  
  status: ProductOperationStatus\!  
}

Map:  
Fields  
\<-|ProductOperation.product  
\<-|ProductOperation.status

{}ProductOperation

Types implemented in  
\<-|ProductBundleOperation  
\<-|ProductDeleteOperation  
\<-|ProductDuplicateOperation  
\<-|ProductSetOperation

