import os
import json
import boto3
import logging
import hmac # For secure comparison
from decimal import Decimal
from botocore.exceptions import ClientError

# --- Logging Setup ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# --- AWS SDK Clients ---
dynamodb = boto3.resource("dynamodb")

# --- Environment Variables ---
try:
    DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE"]
    # Use os.environ directly here to ensure it fails if not set
    EXPECTED_ADMIN_KEY = os.environ["ADMIN_KEY"]
except KeyError as e:
    logger.critical(f"Missing required environment variable: {e}")
    # Fail Lambda initialization if critical config is missing
    raise Exception(f"Configuration error: Missing environment variable {e}") from e

# --- DynamoDB Table Resource ---
table = dynamodb.Table(DYNAMODB_TABLE_NAME)

# --- Helper Classes ---
class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle Decimal objects."""
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
            "Access-Control-Allow-Origin": "*", # Add CORS header back
        },
        "body": json.dumps({"error": message}, cls=DecimalEncoder),
    }

# --- Lambda Handler ---
def handler(event, context):
    """
    AWS Lambda handler function for retrieving ALL hidden items (paginated).
    Requires a valid admin_key as a query parameter for authorization.
    Triggered by API Gateway GET request.
    WARNING: Scanning large tables can be slow and costly. Use with caution.
    """
    try:
        # 1. Extract and Validate Admin Key
        query_params = event.get("queryStringParameters", {}) or {}
        provided_admin_key = query_params.get("admin_key")

        if not provided_admin_key:
            logger.warning("Admin key missing from request.")
            return create_error_response(401, "Admin key is required.") # 401 Unauthorized

        # Securely compare the provided key with the expected key
        # Use hmac.compare_digest for timing-attack resistance
        keys_match = hmac.compare_digest(
            EXPECTED_ADMIN_KEY.encode('utf-8'),
            provided_admin_key.encode('utf-8')
        )

        if not keys_match:
            logger.warning("Invalid admin key provided.")
            return create_error_response(403, "Invalid admin key.") # 403 Forbidden

        # 2. Scan DynamoDB Table with Pagination
        all_items = []
        scan_kwargs = {}
        item_count = 0

        logger.info(f"Starting paginated scan on table {DYNAMODB_TABLE_NAME}")

        try:
            while True:
                response = table.scan(**scan_kwargs)
                items_page = response.get("Items", [])
                all_items.extend(items_page)
                item_count += len(items_page)

                # Check if there are more items to fetch
                last_evaluated_key = response.get("LastEvaluatedKey")
                if last_evaluated_key:
                    logger.info(f"Fetching next page, LastEvaluatedKey: {last_evaluated_key}")
                    scan_kwargs["ExclusiveStartKey"] = last_evaluated_key
                else:
                    # No more pages
                    break # Exit the loop
        except ClientError as ddb_err:
            logger.error(f"DynamoDB scan error: {ddb_err}", exc_info=True)
            error_code = ddb_err.response.get("Error", {}).get("Code", "UnknownDynamoDBError")
            return create_error_response(500, f"Failed to scan items (Database Error: {error_code}).")

        logger.info(f"Scan complete. Fetched {item_count} items.")

        # 3. Filter Secret Keys from Response
        # Create a new list containing items without the 'secret_key' field
        filtered_items = [
            {k: v for k, v in item.items() if k != "secret_key"}
            for item in all_items
        ]

        # 4. Return Filtered Items
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", # Add CORS header back
            },
            # Return the list of items under an "items" key
            "body": json.dumps({"items": filtered_items}, cls=DecimalEncoder),
        }

    # 5. Generic Error Handling for Unexpected Issues
    except Exception as e:
        logger.error(f"Unexpected Error getting all items: {str(e)}", exc_info=True)
        return create_error_response(500, "An internal server error occurred while retrieving items.")
