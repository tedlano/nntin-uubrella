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
import os # Import os module


class InfrastructureStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # --- Configuration ---
        admin_key = os.getenv("ADMIN_KEY")
        if not admin_key:
            raise ValueError("ADMIN_KEY environment variable is not set. Please define it in infrastructure/.env")

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
                        s3.HttpMethods.POST,
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
            website_error_document="index.html",
            public_read_access=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ACLS,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET],
                    allowed_origins=["*"],
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
            projection_type=dynamodb.ProjectionType.INCLUDE,
            non_key_attributes=[
                "item_id",
                "title",
                "latitude",
                "longitude",
                "category",
            ]
        )

        # Lambda function environment variables (shared)
        lambda_environment = {
            "DYNAMODB_TABLE": items_table.table_name,
            "IMAGES_BUCKET": images_bucket.bucket_name,
        }

        # Lambda function for creating items
        create_item_lambda = lambda_.Function(
            self,
            "CreateItemFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="create_item.handler",
            code=lambda_.Code.from_asset("../backend/functions/create_item"),
            environment=lambda_environment,
        )

        # Lambda function for getting a specific item
        get_item_lambda = lambda_.Function(
            self,
            "GetItemFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="get_item.handler",
            code=lambda_.Code.from_asset("../backend/functions/get_item"),
            environment=lambda_environment,
        )

        # Lambda function for getting ALL items (admin only)
        get_all_items_lambda = lambda_.Function(
            self,
            "GetAllItemsFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="get_all_items.handler",
            code=lambda_.Code.from_asset("../backend/functions/get_all_items"),
            environment={
                **lambda_environment, # Include shared environment variables
                "ADMIN_KEY": admin_key # Use the key loaded from environment
            },
        )

        # Lambda function for getting PUBLIC items
        get_public_items_lambda = lambda_.Function(
            self,
            "GetPublicItemsFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="get_public_items.handler",
            code=lambda_.Code.from_asset("../backend/functions/get_public_items"),
            environment={ # Only needs table name
                "DYNAMODB_TABLE": items_table.table_name,
            },
        )

        # Lambda function for deleting an item (admin only)
        delete_item_lambda = lambda_.Function(
            self,
            "DeleteItemFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="delete_item.handler",
            code=lambda_.Code.from_asset("../backend/functions/delete_item"),
            environment={ # Needs table and bucket names
                "DYNAMODB_TABLE": items_table.table_name,
                "IMAGES_BUCKET": images_bucket.bucket_name, # Add bucket name
            },
        )


        # Grant permissions
        images_bucket.grant_read_write(create_item_lambda)
        images_bucket.grant_read(get_item_lambda)
        images_bucket.grant_delete(delete_item_lambda) # Grant delete permission

        items_table.grant_read_write_data(create_item_lambda)
        items_table.grant_read_data(get_item_lambda)
        items_table.grant_read_data(get_all_items_lambda)
        items_table.grant_read_data(get_public_items_lambda)
        items_table.grant_read_data(delete_item_lambda) # Grant read permission (to get image_url)
        items_table.grant_write_data(delete_item_lambda) # Grant delete permission


        # API Gateway
        api = apigateway.RestApi(
            self,
            "HiddenItemsApi",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=["https://d1s1luyhy2c7h8.cloudfront.net"], # Only allow CloudFront domain
                allow_methods=apigateway.Cors.ALL_METHODS,
                allow_headers=apigateway.Cors.DEFAULT_HEADERS + ["Authorization", "X-Secret-Key"],
            ),
            deploy_options=apigateway.StageOptions(
                stage_name="prod"
            )
        )

        # Define resources
        items_resource = api.root.add_resource("items")
        item_id_resource = items_resource.add_resource("{id}")
        public_resource = api.root.add_resource("public")
        public_items_resource = public_resource.add_resource("items")

        # Add methods
        items_resource.add_method("POST", apigateway.LambdaIntegration(create_item_lambda))
        item_id_resource.add_method("GET", apigateway.LambdaIntegration(get_item_lambda))
        item_id_resource.add_method("DELETE", apigateway.LambdaIntegration(delete_item_lambda))
        public_items_resource.add_method("GET", apigateway.LambdaIntegration(get_public_items_lambda))

        # Add the admin endpoint for get_all_items
        admin_resource = api.root.add_resource("admin")
        admin_items_resource = admin_resource.add_resource("items")
        admin_items_resource.add_method("GET", apigateway.LambdaIntegration(get_all_items_lambda))


        # CloudFront distribution for the website
        oai = cloudfront.OriginAccessIdentity(self, "OAI")
        website_bucket.grant_read(oai)

        distribution = cloudfront.Distribution(
            self,
            "HiddenItemsDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin(website_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                compress=True,
            ),
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
        s3deploy.BucketDeployment(
            self,
            "DeployWebsite",
            sources=[s3deploy.Source.asset("../frontend/dist")],
            destination_bucket=website_bucket,
            distribution=distribution,
            distribution_paths=["/*"],
        )

        # Output the important values
        CfnOutput(self, "WebsiteBucketName", value=website_bucket.bucket_name)
        CfnOutput(self, "ImagesBucketName", value=images_bucket.bucket_name)
        CfnOutput(self, "ApiUrl", value=api.url)
        CfnOutput(
            self, "DistributionDomainName", value=distribution.distribution_domain_name
        )
        CfnOutput(
            self, "WebsiteUrl", value=f"https://{distribution.distribution_domain_name}"
        )
