import os
import json
import boto3
import logging
from decimal import Decimal
from botocore.exceptions import ClientError

# --- Logging Setup ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# --- Constants ---
VISIBILITY_PUBLIC = "PUBLIC"
GSI_NAME = "visibility-created_at-index" # Match the GSI name defined in CDK

# --- AWS SDK Clients ---
dynamodb = boto3.resource("dynamodb")

# --- Environment Variables ---
try:
    DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE"]
except KeyError as e:
    logger.critical(f"Missing required environment variable: {e}")
    raise Exception(f"Configuration error: Missing environment variable {e}") from e

# --- DynamoDB Table Resource ---
table = dynamodb.Table(DYNAMODB_TABLE_NAME)

# --- Helper Classes ---
class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle DynamoDB's Decimal type."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# --- Helper Functions ---
def create_error_response(status_code, message):
    """Creates a standardized error response dictionary."""
    logger.error(f"Returning error: {status_code} - {message}")
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", # Add CORS header
        },
        "body": json.dumps({"error": message}, cls=DecimalEncoder),
    }

# --- Lambda Handler ---
def handler(event, context):
    """
    AWS Lambda handler function for retrieving all PUBLIC items (paginated).
    Uses the visibility-created_at-index GSI for efficiency.
    Triggered by API Gateway GET request.
    """
    try:
        all_public_items = []
        # Define attributes to retrieve based on GSI projection
        projection_expression = "item_id, title, latitude, longitude, category"
        # Use KeyConditionExpression to filter by the GSI partition key
        key_condition_expression = boto3.dynamodb.conditions.Key('visibility').eq(VISIBILITY_PUBLIC)

        query_kwargs = {
            'IndexName': GSI_NAME,
            'KeyConditionExpression': key_condition_expression,
            'ProjectionExpression': projection_expression,
        }
        item_count = 0

        logger.info(f"Starting paginated query on GSI {GSI_NAME} for PUBLIC items in table {DYNAMODB_TABLE_NAME}")

        try:
            while True:
                response = table.query(**query_kwargs)
                items_page = response.get("Items", [])
                all_public_items.extend(items_page)
                item_count += len(items_page)

                # Check if there are more items to fetch
                last_evaluated_key = response.get("LastEvaluatedKey")
                if last_evaluated_key:
                    logger.info(f"Fetching next page, LastEvaluatedKey: {last_evaluated_key}")
                    query_kwargs["ExclusiveStartKey"] = last_evaluated_key
                else:
                    # No more pages
                    break # Exit the loop
        except ClientError as ddb_err:
            logger.error(f"DynamoDB query error on GSI {GSI_NAME}: {ddb_err}", exc_info=True)
            error_code = ddb_err.response.get("Error", {}).get("Code", "UnknownDynamoDBError")
            # Check if the error is because the index doesn't exist yet
            if "Cannot do operations on index" in str(ddb_err) or "IndexNotFoundException" in str(ddb_err):
                 return create_error_response(500, f"Database index '{GSI_NAME}' not found or not active. Please deploy infrastructure changes.")
            return create_error_response(500, f"Failed to query public items (Database Error: {error_code}).")

        logger.info(f"Query complete. Fetched {item_count} public items.")

        # Return the list of public items
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", # Add CORS header
            },
            # Return the list of items under an "items" key
            "body": json.dumps({"items": all_public_items}, cls=DecimalEncoder),
        }

    # Generic Error Handling for Unexpected Issues
    except Exception as e:
        logger.error(f"Unexpected Error getting public items: {str(e)}", exc_info=True)
        return create_error_response(500, "An internal server error occurred while retrieving public items.")