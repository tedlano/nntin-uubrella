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
            "Access-Control-Allow-Origin": "*", # Add CORS header back
        },
        "body": json.dumps({"error": message}, cls=DecimalEncoder),
    }

# --- Lambda Handler ---
def handler(event, context):
    """
    AWS Lambda handler function for retrieving a specific hidden item.
    Requires the item_id in the path and the secret_key as a query parameter.
    Triggered by API Gateway GET request to /items/{id}.
    """
    item_id = None # Initialize item_id for logging in case of early failure
    try:
        # 1. Extract Parameters
        try:
            # Get item_id from the path parameter
            item_id = event["pathParameters"]["id"]
        except (KeyError, TypeError):
            logger.warning("Missing or invalid 'pathParameters' or 'id' in event.")
            return create_error_response(400, "Item ID missing in request path.")

        # Get query string parameters, defaulting to an empty dict if none exist
        query_params = event.get("queryStringParameters", {}) or {}
        # Extract the 'key' (secret_key) from query parameters
        provided_secret_key = query_params.get("key")

        # 2. Validate Secret Key Presence
        if not provided_secret_key:
            logger.warning(f"Secret key missing for item_id: {item_id}")
            return create_error_response(400, "Secret key is required.")

        # 3. Fetch Item from DynamoDB
        try:
            logger.info(f"Fetching item {item_id} from table {DYNAMODB_TABLE_NAME}")
            response = table.get_item(Key={"item_id": item_id})
        except ClientError as ddb_err:
            logger.error(f"DynamoDB error fetching item {item_id}: {ddb_err}", exc_info=True)
            error_code = ddb_err.response.get("Error", {}).get("Code", "UnknownDynamoDBError")
            return create_error_response(500, f"Failed to retrieve item details (Database Error: {error_code}).")

        # 4. Check if Item Exists
        if "Item" not in response:
            logger.warning(f"Item not found: {item_id}")
            return create_error_response(404, "Item not found.")

        # Extract the item data from the response
        item = response["Item"]
        stored_secret_key = item.get("secret_key")

        # 5. Validate Secret Key Match using constant-time comparison
        if not stored_secret_key:
             logger.error(f"Stored secret key missing for item {item_id}. Data integrity issue?")
             # Treat as forbidden, as we cannot verify the provided key
             return create_error_response(403, "Cannot verify access for this item.")

        # Use hmac.compare_digest for timing-attack resistance
        # Both arguments must be bytes or byte-like objects
        keys_match = hmac.compare_digest(
            stored_secret_key.encode('utf-8'),
            provided_secret_key.encode('utf-8')
        )

        if not keys_match:
            logger.warning(f"Invalid secret key provided for item {item_id}")
            return create_error_response(403, "Invalid secret key provided.")

        # 6. Return Item Data (Success)
        # Exclude the secret_key from the response body for security
        # Use dict comprehension for cleaner exclusion
        item_payload = {k: v for k, v in item.items() if k != "secret_key"}

        logger.info(f"Successfully retrieved item {item_id}")
        return {
            "statusCode": 200, # OK
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", # Add CORS header back
            },
            "body": json.dumps(item_payload, cls=DecimalEncoder),
        }

    # 7. Generic Error Handling for Unexpected Issues
    except Exception as e:
        # Log the unexpected error
        logger.error(f"Unexpected Error getting item {item_id or 'UNKNOWN'}: {str(e)}", exc_info=True)
        # Return a generic 500 Internal Server Error
        return create_error_response(500, "An internal server error occurred while retrieving the item.")
