from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_apigateway as apigateway,
    aws_cloudfront as cloudfront,
    aws_s3_deployment as s3deploy,
    aws_cloudfront_origins as origins,
    RemovalPolicy,
    CfnOutput,
)
from constructs import Construct


class InfrastructureStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # S3 bucket for storing images
        images_bucket = s3.Bucket(
            self,
            "HiddenItemsImagesBucket",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            public_read_access=True, # Note: Public read access might be too permissive depending on requirements
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False,
                block_public_policy=False,
                ignore_public_acls=False,
                restrict_public_buckets=False,
            ),
            cors=[
                s3.CorsRule(
                    allowed_methods=[
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST, # Keep POST if needed for direct uploads later?
                    ],
                    allowed_origins=["*"], # Restrict in production
                    allowed_headers=["*"],
                )
            ],
        )

        # S3 bucket for frontend hosting
        website_bucket = s3.Bucket(
            self,
            "HiddenItemsWebsiteBucket",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            website_index_document="index.html",
            website_error_document="index.html", # Consider a custom 404 page
            public_read_access=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ACLS, # Block ACLs, allow bucket policy
            # Consider using CloudFront Origin Access Identity (OAI) instead of public bucket access
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET],
                    allowed_origins=["*"], # Should be restricted by CloudFront ideally
                    allowed_headers=["*"],
                )
            ],
        )

        # DynamoDB table for storing item data
        items_table = dynamodb.Table(
            self,
            "HiddenItemsTable",
            partition_key=dynamodb.Attribute(
                name="item_id", type=dynamodb.AttributeType.STRING
            ),
            removal_policy=RemovalPolicy.DESTROY,
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
        )

        # Add Global Secondary Index for querying public items
        items_table.add_global_secondary_index(
            index_name="visibility-created_at-index",
            partition_key=dynamodb.Attribute(
                name="visibility", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="created_at", type=dynamodb.AttributeType.STRING
            ),
            # Project only necessary attributes for the public map view
            projection_type=dynamodb.ProjectionType.INCLUDE,
            non_key_attributes=[
                "item_id",
                "title",
                "latitude",
                "longitude",
                "category", # Include category for filtering/icons
                # Add image_url if showing thumbnails on map is desired
                # "image_url",
            ]
        )


        # Lambda function Layer for common dependencies (optional but good practice)
        # Example: Create a layer if boto3 needs updating or other libs are shared
        # common_layer = lambda_.LayerVersion(
        #     self, 'CommonLayer',
        #     code=lambda_.Code.from_asset('path/to/layer/package'),
        #     compatible_runtimes=[lambda_.Runtime.PYTHON_3_11],
        #     description='Common dependencies layer'
        # )

        # Lambda function environment variables (shared)
        lambda_environment = {
            "DYNAMODB_TABLE": items_table.table_name,
            "IMAGES_BUCKET": images_bucket.bucket_name,
            # Add other shared env vars here if needed
        }

        # Lambda function for creating items
        create_item_lambda = lambda_.Function(
            self,
            "CreateItemFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="create_item.handler",
            code=lambda_.Code.from_asset("../backend/functions/create_item"),
            environment=lambda_environment,
            # layers=[common_layer] # Add layer if created
        )

        # Lambda function for getting a specific item (public or private)
        get_item_lambda = lambda_.Function(
            self,
            "GetItemFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="get_item.handler",
            code=lambda_.Code.from_asset("../backend/functions/get_item"),
            environment=lambda_environment,
            # layers=[common_layer]
        )

        # Lambda function for getting ALL items (admin only)
        get_all_items_lambda = lambda_.Function(
            self,
            "GetAllItemsFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="get_all_items.handler",
            code=lambda_.Code.from_asset("../backend/functions/get_all_items"),
            environment=lambda_environment,
            # layers=[common_layer]
        )

        # Lambda function for getting PUBLIC items
        get_public_items_lambda = lambda_.Function(
            self,
            "GetPublicItemsFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="get_public_items.handler", # Assumes handler file is get_public_items.py
            code=lambda_.Code.from_asset("../backend/functions/get_public_items"), # Assumes code is in this folder
            environment={ # Only needs table name
                "DYNAMODB_TABLE": items_table.table_name,
            },
            # layers=[common_layer]
        )


        # Grant permissions
        images_bucket.grant_read_write(create_item_lambda)
        images_bucket.grant_read(get_item_lambda) # Read needed for image_url construction? Maybe not if URL is stored.

        items_table.grant_read_write_data(create_item_lambda)
        items_table.grant_read_data(get_item_lambda)
        items_table.grant_read_data(get_all_items_lambda) # Grant scan permission (used in the function)
        # Grant permission to query the GSI for the get_public_items_lambda
        items_table.grant_read_data(get_public_items_lambda) # grant_read_data covers GSI reads


        # API Gateway
        api = apigateway.RestApi(
            self,
            "HiddenItemsApi",
            # Configure CORS more granularly if needed, or rely on Lambda headers
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=["*"], # Restrict in production!
                allow_methods=apigateway.Cors.ALL_METHODS, # Allow GET, POST, OPTIONS etc.
                allow_headers=apigateway.Cors.DEFAULT_HEADERS + ["Authorization", "X-Secret-Key"], # Include any custom headers used
            ),
            deploy_options=apigateway.StageOptions(
                stage_name="prod" # Explicitly name the stage
            )
        )

        # Define resources
        items_resource = api.root.add_resource("items")
        item_id_resource = items_resource.add_resource("{id}")
        public_resource = api.root.add_resource("public") # Create /public
        public_items_resource = public_resource.add_resource("items") # Create /public/items

        # Add methods
        items_resource.add_method("POST", apigateway.LambdaIntegration(create_item_lambda))
        item_id_resource.add_method("GET", apigateway.LambdaIntegration(get_item_lambda))
        public_items_resource.add_method("GET", apigateway.LambdaIntegration(get_public_items_lambda))

        # Consider adding the admin endpoint for get_all_items if needed
        # admin_resource = api.root.add_resource("admin")
        # admin_items_resource = admin_resource.add_resource("items")
        # admin_items_resource.add_method("GET", apigateway.LambdaIntegration(get_all_items_lambda)) # Add authorizer later


        # CloudFront distribution for the website
        # Consider using OAI for S3 bucket access
        oai = cloudfront.OriginAccessIdentity(self, "OAI")
        website_bucket.grant_read(oai)

        distribution = cloudfront.Distribution(
            self,
            "HiddenItemsDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                # Use OAI origin instead of public S3 website endpoint
                origin=origins.S3BucketOrigin(website_bucket, origin_access_identity=oai),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                compress=True,
            ),
            # Handle single-page application routing (redirect 403/404 to index.html)
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                ),
                 cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                )
            ],
            default_root_object="index.html"
        )

        # Deploy frontend to S3 bucket
        # Note: Assumes frontend build in ../frontend/dist
        s3deploy.BucketDeployment(
            self,
            "DeployWebsite",
            sources=[s3deploy.Source.asset("../frontend/dist")],
            destination_bucket=website_bucket,
            distribution=distribution,
            distribution_paths=["/*"], # Invalidate CloudFront cache on deployment
        )

        # Output the important values
        CfnOutput(self, "WebsiteBucketName", value=website_bucket.bucket_name)
        CfnOutput(self, "ImagesBucketName", value=images_bucket.bucket_name)
        CfnOutput(self, "ApiUrl", value=api.url) # URL includes the stage name
        CfnOutput(
            self, "DistributionDomainName", value=distribution.distribution_domain_name
        )
        CfnOutput(
            self, "WebsiteUrl", value=f"https://{distribution.distribution_domain_name}"
        )
