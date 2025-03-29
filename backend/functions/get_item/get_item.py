import os
import json
import boto3
from boto3.dynamodb.conditions import Key
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
        # Get path parameters and query string
        item_id = event["pathParameters"]["id"]
        query_params = event.get("queryStringParameters", {}) or {}
        secret_key = query_params.get("key")

        if not secret_key:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps(
                    {"error": "Secret key is required"}, cls=DecimalEncoder
                ),
            }

        # Get item from DynamoDB
        response = table.get_item(Key={"item_id": item_id})

        # Check if item exists
        if "Item" not in response:
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Item not found"}, cls=DecimalEncoder),
            }

        item = response["Item"]

        # Validate secret key
        if item["secret_key"] != secret_key:
            return {
                "statusCode": 403,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Invalid secret key"}, cls=DecimalEncoder),
            }

        # Return item data
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(
                {
                    "item_id": item["item_id"],
                    "title": item["title"],
                    "description": item["description"],
                    "latitude": item["latitude"],
                    "longitude": item["longitude"],
                    "image_url": item["image_url"],
                    "created_at": item["created_at"],
                },
                cls=DecimalEncoder,
            ),
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
