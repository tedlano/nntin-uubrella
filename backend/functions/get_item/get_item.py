import os
import json
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

# --- AWS SDK Clients ---
dynamodb = boto3.resource("dynamodb")

# --- Environment Variables ---
DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE"]

# --- DynamoDB Table Resource ---
table = dynamodb.Table(DYNAMODB_TABLE_NAME)

# --- Helper Classes ---
class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle DynamoDB's Decimal type."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# --- Lambda Handler ---
def handler(event, context):
    """
    AWS Lambda handler function for retrieving a specific hidden item.
    Requires the item_id in the path and the secret_key as a query parameter.
    Triggered by API Gateway GET request to /items/{id}.
    """
    try:
        # 1. Extract Parameters
        # Get item_id from the path parameter
        item_id = event["pathParameters"]["id"]
        # Get query string parameters, defaulting to an empty dict if none exist
        query_params = event.get("queryStringParameters", {}) or {}
        # Extract the 'key' (secret_key) from query parameters
        secret_key = query_params.get("key")

        # 2. Validate Secret Key Presence
        if not secret_key:
            # Return 400 Bad Request if the secret key is missing
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

        # 3. Fetch Item from DynamoDB
        # Use get_item with the primary key (item_id)
        response = table.get_item(Key={"item_id": item_id})

        # 4. Check if Item Exists
        if "Item" not in response:
            # Return 404 Not Found if the item doesn't exist
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Item not found"}, cls=DecimalEncoder),
            }

        # Extract the item data from the response
        item = response["Item"]

        # 5. Validate Secret Key Match
        # Compare the provided secret_key with the one stored in DynamoDB
        if item.get("secret_key") != secret_key:
            # Return 403 Forbidden if the keys don't match
            return {
                "statusCode": 403,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Invalid secret key provided."}, cls=DecimalEncoder),
            }

        # 6. Return Item Data (Success)
        # Exclude the secret_key from the response body for security
        return {
            "statusCode": 200, # OK
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", # CORS header
            },
            "body": json.dumps(
                {
                    "item_id": item["item_id"],
                    "title": item["title"],
                    "description": item["description"],
                    "latitude": item["latitude"], # Will be serialized by DecimalEncoder
                    "longitude": item["longitude"],# Will be serialized by DecimalEncoder
                    "image_url": item["image_url"],
                    "created_at": item["created_at"],
                },
                cls=DecimalEncoder, # Use custom encoder for Decimals
            ),
        }

    # 7. Generic Error Handling
    except Exception as e:
        # Log the unexpected error
        # TODO: Implement more robust logging
        print(f"Unexpected Error getting item {item_id if 'item_id' in locals() else 'UNKNOWN'}: {str(e)}")
        # Return a generic 500 Internal Server Error
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": "An internal server error occurred while retrieving the item."}, cls=DecimalEncoder),
        }
