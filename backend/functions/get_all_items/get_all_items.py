import os
import json
import boto3
from decimal import Decimal


# Custom JSON encoder to handle Decimal objects
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


# Initialize AWS clients
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["DYNAMODB_TABLE"])


def handler(event, context):
    try:
        # Get admin key from query parameters
        query_params = event.get("queryStringParameters", {}) or {}
        admin_key = query_params.get("admin_key")

        # Validate admin key (simple implementation - would use more secure method in production)
        if admin_key != os.environ.get("ADMIN_KEY", "admin-secret-key"):
            return {
                "statusCode": 403,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Invalid admin key"}, cls=DecimalEncoder),
            }

        # Scan the table to get all items
        response = table.scan()
        items = response.get("Items", [])

        # Return all items
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"items": items}, cls=DecimalEncoder),
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": "Internal server error"}, cls=DecimalEncoder),
        }
