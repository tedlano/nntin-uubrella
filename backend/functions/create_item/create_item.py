import os
import json
import uuid
import base64
import boto3
import logging
import mimetypes
import binascii # For b64decode error handling
from datetime import datetime
from decimal import Decimal, InvalidOperation
from botocore.exceptions import ClientError

# --- Logging Setup ---
# Configure logging to output structured logs
logger = logging.getLogger()
logger.setLevel(logging.INFO) # Set desired log level (INFO, DEBUG, etc.)

# --- AWS SDK Clients (initialized globally for potential reuse) ---
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

# --- Environment Variables ---
# These are expected to be set in the Lambda function's configuration
try:
    DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE"]
    IMAGES_BUCKET_NAME = os.environ["IMAGES_BUCKET"]
except KeyError as e:
    logger.critical(f"Missing required environment variable: {e}")
    # Raising an exception here will cause Lambda initialization to fail,
    # which is appropriate if core configuration is missing.
    raise Exception(f"Configuration error: Missing environment variable {e}") from e

# --- DynamoDB Table Resource ---
table = dynamodb.Table(DYNAMODB_TABLE_NAME)

# --- Helper Classes ---
class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle DynamoDB's Decimal type."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Convert Decimal to float for JSON serialization
            # Note: Using float might lose precision for very large/small decimals,
            # but is generally acceptable for typical coordinate values.
            # For financial data, consider string conversion.
            return float(obj)
        # Let the base class default method raise the TypeError
        return super(DecimalEncoder, self).default(obj)

# --- Helper Functions ---
def generate_secret_key():
    """Generates a secure, URL-safe random secret key."""
    # Uses UUID4 for randomness and base64 for URL-safe encoding
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).decode("utf-8").rstrip("=")

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
    AWS Lambda handler function for creating a new hidden item.
    Triggered by API Gateway POST request.
    """
    try:
        # 1. Parse Request Body
        try:
            body = json.loads(event["body"])
            if not isinstance(body, dict):
                 raise ValueError("Request body must be a JSON object.")
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            logger.warning(f"Invalid JSON request body: {e}")
            return create_error_response(400, "Invalid request body: Must be a valid JSON object.")

        # 2. Validate Input Fields
        required_fields = ["title", "description", "latitude", "longitude", "image"]
        for field in required_fields:
            if field not in body or not body[field]: # Check for presence and non-empty value
                return create_error_response(400, f"Missing or empty required field: {field}")

        # Validate coordinate ranges and types
        try:
            latitude = Decimal(str(body["latitude"]))
            longitude = Decimal(str(body["longitude"]))
            if not (-90 <= latitude <= 90):
                raise ValueError("Latitude must be between -90 and 90.")
            if not (-180 <= longitude <= 180):
                raise ValueError("Longitude must be between -180 and 180.")
        except (InvalidOperation, TypeError): # Catch Decimal conversion errors
             return create_error_response(400, "Latitude and Longitude must be valid numbers.")
        except ValueError as coord_err: # Catch range errors
             return create_error_response(400, str(coord_err))

        # Extract other fields
        title = body["title"]
        description = body["description"]
        image_base64_data_uri = body["image"]

        # 3. Generate IDs and Keys
        item_id = str(uuid.uuid4()) # Generate a unique item ID
        secret_key = generate_secret_key() # Generate a secret key for viewing

        # 4. Process and Store Image in S3
        try:
            # Split data URI prefix (if present) and decode Base64 data
            # Format: "data:[<mediatype>][;base64],<data>"
            content_type = "application/octet-stream" # Default content type
            if image_base64_data_uri.startswith("data:"):
                try:
                    header, encoded_data = image_base64_data_uri.split(",", 1)
                    # Extract content type from header (e.g., "data:image/jpeg;base64")
                    parts = header.split(";")
                    if len(parts) > 0 and parts[0].startswith("data:"):
                        potential_mime = parts[0].split(":", 1)[1]
                        # Basic check if it looks like a mime type
                        if '/' in potential_mime:
                            content_type = potential_mime
                except ValueError:
                    # If split fails, assume it might be raw base64
                    encoded_data = image_base64_data_uri
            else:
                # Assume raw base64 if no "data:" prefix
                encoded_data = image_base64_data_uri

            # Decode the base64 string
            image_data = base64.b64decode(encoded_data)

            # Basic validation: Check if decoded data is empty
            if not image_data:
                 raise ValueError("Decoded image data is empty.")

            # TODO: Add more robust image validation if needed (e.g., using Pillow or magic bytes)
            # This currently only checks if base64 decoding worked and produced non-empty bytes.

        except (ValueError, binascii.Error) as img_err:
             logger.warning(f"Image decoding/validation error: {img_err}")
             return create_error_response(400, "Invalid image format, encoding, or empty image data.")

        # Determine file extension based on detected content type
        extension = mimetypes.guess_extension(content_type) or ".bin" # Fallback extension

        # Define S3 object key (using item_id ensures uniqueness)
        image_key = f"{item_id}{extension}"

        # Upload image data to S3 bucket
        try:
            s3.put_object(
                Bucket=IMAGES_BUCKET_NAME,
                Key=image_key,
                Body=image_data,
                ContentType=content_type # Use detected content type
            )
            logger.info(f"Successfully uploaded image {image_key} to bucket {IMAGES_BUCKET_NAME}")
        except ClientError as s3_err:
            logger.error(f"Failed to upload image to S3: {s3_err}", exc_info=True)
            # Provide specific error code if available
            error_code = s3_err.response.get("Error", {}).get("Code", "UnknownS3Error")
            return create_error_response(500, f"Failed to store image (S3 Error: {error_code}).")

        # 5. Create Item in DynamoDB
        timestamp = datetime.utcnow().isoformat() # Use UTC timestamp
        # Construct the item payload for DynamoDB
        item = {
            "item_id": item_id,             # Primary Key
            "secret_key": secret_key,       # Needed for retrieval auth
            "title": title,
            "description": description,
            "latitude": latitude,           # Use validated Decimal
            "longitude": longitude,         # Use validated Decimal
            # Construct the public S3 URL for the image
            "image_url": f"https://{IMAGES_BUCKET_NAME}.s3.amazonaws.com/{image_key}",
            "created_at": timestamp,        # Timestamp of creation
        }

        # Put the item into the DynamoDB table
        try:
            table.put_item(Item=item)
            logger.info(f"Successfully created item {item_id} in table {DYNAMODB_TABLE_NAME}")
        except ClientError as ddb_err:
            logger.error(f"Failed to create item in DynamoDB: {ddb_err}", exc_info=True)
            # Provide specific error code if available
            error_code = ddb_err.response.get("Error", {}).get("Code", "UnknownDynamoDBError")
            # Attempt to clean up S3 object if DynamoDB write fails
            try:
                logger.warning(f"Attempting to delete orphaned S3 object {image_key} due to DynamoDB error.")
                s3.delete_object(Bucket=IMAGES_BUCKET_NAME, Key=image_key)
            except ClientError as s3_del_err:
                 logger.error(f"Failed to delete orphaned S3 object {image_key}: {s3_del_err}", exc_info=True)
            return create_error_response(500, f"Failed to save item details (DynamoDB Error: {error_code}).")

        # 6. Return Success Response
        # Include item_id and secret_key for constructing the shareable URL on the frontend
        success_payload = {
            "item_id": item_id,
            "secret_key": secret_key,
            # Frontend constructs the full URL, backend provides components
            "secret_url_path": f"/items/{item_id}?key={secret_key}", # Renamed for clarity
        }
        logger.info(f"Item creation successful for item_id: {item_id}")
        return {
            "statusCode": 200, # OK
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", # Add CORS header back
            },
            "body": json.dumps(success_payload, cls=DecimalEncoder),
        }

    # 7. Generic Error Handling for Unexpected Issues
    except Exception as e:
        # Log the unexpected error for debugging
        logger.error(f"Unexpected Error creating item: {str(e)}", exc_info=True) # Log stack trace
        # Return a generic 500 Internal Server Error response
        return create_error_response(500, "An internal server error occurred while creating the item.")
