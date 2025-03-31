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

# --- Constants ---
VISIBILITY_PUBLIC = "PUBLIC"
VISIBILITY_PRIVATE = "PRIVATE" # Default if attribute is missing

# --- AWS SDK Clients ---
dynamodb = boto3.resource("dynamodb")

# --- Environment Variables ---
try:
    DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE"]
    ADMIN_KEY = os.environ["ADMIN_KEY"] # Read the admin key
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
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps({"error": message}, cls=DecimalEncoder),
    }

# --- Lambda Handler ---
def handler(event, context):
    """
    AWS Lambda handler function for retrieving a specific item.
    If item is PRIVATE, requires secret_key query parameter.
    If item is PUBLIC, secret_key is ignored.
    Triggered by API Gateway GET request to /items/{id}.
    """
    item_id = None # Initialize item_id for logging
    try:
        # 1. Extract Item ID
        try:
            item_id = event["pathParameters"]["id"]
        except (KeyError, TypeError):
            logger.warning("Missing or invalid 'pathParameters' or 'id' in event.")
            return create_error_response(400, "Item ID missing in request path.")

        # 2. Fetch Item from DynamoDB
        try:
            logger.info(f"Fetching item {item_id} from table {DYNAMODB_TABLE_NAME}")
            response = table.get_item(Key={"item_id": item_id})
        except ClientError as ddb_err:
            logger.error(f"DynamoDB error fetching item {item_id}: {ddb_err}", exc_info=True)
            error_code = ddb_err.response.get("Error", {}).get("Code", "UnknownDynamoDBError")
            return create_error_response(500, f"Failed to retrieve item details (Database Error: {error_code}).")

        # 3. Check if Item Exists
        if "Item" not in response:
            logger.warning(f"Item not found: {item_id}")
            return create_error_response(404, "Item not found.")

        item = response["Item"]
        # Determine visibility, defaulting to PRIVATE if somehow missing
        visibility = item.get("visibility", VISIBILITY_PRIVATE).upper()

        # 4. Handle Authorization: Check for Admin Key Override FIRST
        query_params = event.get("queryStringParameters", {}) or {}
        provided_admin_key = query_params.get("admin_key")
        admin_access_granted = False

        if provided_admin_key and ADMIN_KEY:
            # Use hmac.compare_digest for timing-attack resistance
            if hmac.compare_digest(provided_admin_key.encode('utf-8'), ADMIN_KEY.encode('utf-8')):
                logger.info(f"Valid admin_key provided for item {item_id}. Granting admin access.")
                admin_access_granted = True
            else:
                # Log invalid admin key attempt but don't fail the request yet,
                # let the normal key check proceed if applicable.
                logger.warning(f"Invalid admin_key provided for item {item_id}.")

        # 5. Handle Authorization based on Visibility (if admin access not granted)
        if admin_access_granted:
            # Skip normal checks if admin access was granted
            pass
        elif visibility == VISIBILITY_PUBLIC:
            logger.info(f"Item {item_id} is PUBLIC. Access granted.")
            # Public items don't require key check

        elif visibility == VISIBILITY_PRIVATE:
            logger.info(f"Item {item_id} is PRIVATE. Checking secret key.")
            # Get provided key from query parameters
            query_params = event.get("queryStringParameters", {}) or {}
            provided_secret_key = query_params.get("key")

            if not provided_secret_key:
                logger.warning(f"Secret key missing for PRIVATE item_id: {item_id}")
                # Return 401 Unauthorized as key is needed but missing
                return create_error_response(401, "Secret key is required for this item.")

            stored_secret_key = item.get("secret_key")
            if not stored_secret_key:
                 logger.error(f"Stored secret key missing for PRIVATE item {item_id}. Data integrity issue?")
                 # Treat as forbidden, as we cannot verify the provided key
                 return create_error_response(403, "Cannot verify access for this item.")

            # Use hmac.compare_digest for timing-attack resistance
            keys_match = hmac.compare_digest(
                stored_secret_key.encode('utf-8'),
                provided_secret_key.encode('utf-8')
            )

            if not keys_match:
                logger.warning(f"Invalid secret key provided for item {item_id}")
                return create_error_response(403, "Invalid secret key provided.")
            logger.info(f"Secret key validated successfully for item {item_id}.")

        else:
            # Should not happen if create_item validation is working
            logger.error(f"Item {item_id} has unknown visibility value: {visibility}")
            return create_error_response(500, "Internal configuration error.")


        # 5. Return Item Data (Success)
        # Exclude the secret_key from the response body (if present)
        item_payload = {k: v for k, v in item.items() if k != "secret_key"}

        logger.info(f"Successfully retrieved item {item_id} (Visibility: {visibility})")
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(item_payload, cls=DecimalEncoder),
        }

    # 6. Generic Error Handling
    except Exception as e:
        logger.error(f"Unexpected Error getting item {item_id or 'UNKNOWN'}: {str(e)}", exc_info=True)
        return create_error_response(500, "An internal server error occurred while retrieving the item.")
