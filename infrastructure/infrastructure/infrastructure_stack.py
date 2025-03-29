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
            public_read_access=True,
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
                    allowed_origins=["*"],
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
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False,
                block_public_policy=False,
                ignore_public_acls=False,
                restrict_public_buckets=False,
            ),
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

        # Lambda function for creating items
        create_item_lambda = lambda_.Function(
            self,
            "CreateItemFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="create_item.handler",
            code=lambda_.Code.from_asset("../backend/functions/create_item"),
            environment={
                "DYNAMODB_TABLE": items_table.table_name,
                "IMAGES_BUCKET": images_bucket.bucket_name,
            },
        )

        # Lambda function for getting items
        get_item_lambda = lambda_.Function(
            self,
            "GetItemFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="get_item.handler",
            code=lambda_.Code.from_asset("../backend/functions/get_item"),
            environment={
                "DYNAMODB_TABLE": items_table.table_name,
                "IMAGES_BUCKET": images_bucket.bucket_name,
            },
        )

        # Grant permissions
        images_bucket.grant_read_write(create_item_lambda)
        images_bucket.grant_read(get_item_lambda)
        items_table.grant_read_write_data(create_item_lambda)
        items_table.grant_read_data(get_item_lambda)

        # API Gateway
        api = apigateway.RestApi(
            self,
            "HiddenItemsApi",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=["*"],
                allow_methods=["GET", "POST"],
                allow_headers=["*"],
            ),
        )

        items = api.root.add_resource("items")
        items.add_method("POST", apigateway.LambdaIntegration(create_item_lambda))

        item = items.add_resource("{id}")
        item.add_method("GET", apigateway.LambdaIntegration(get_item_lambda))

        # CloudFront distribution for the website
        distribution = cloudfront.Distribution(
            self,
            "HiddenItemsDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3StaticWebsiteOrigin(website_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            ),
        )

        # Deploy frontend to S3 bucket
        # Note: This assumes the frontend has been built and is available in the frontend/dist directory
        # You need to run 'npm run build' in the frontend directory before deploying
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
