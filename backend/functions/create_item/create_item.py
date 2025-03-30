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
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# --- Constants ---
VISIBILITY_PUBLIC = "PUBLIC"
VISIBILITY_PRIVATE = "PRIVATE"
ALLOWED_VISIBILITY = {VISIBILITY_PUBLIC, VISIBILITY_PRIVATE}

# --- AWS SDK Clients ---
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

# --- Environment Variables ---
try:
    DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE"]
    IMAGES_BUCKET_NAME = os.environ["IMAGES_BUCKET"]
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
def generate_secret_key():
    """Generates a secure, URL-safe random secret key."""
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).decode("utf-8").rstrip("=")

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
    AWS Lambda handler function for creating a new hidden item.
    Accepts visibility and category fields.
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
        # Core required fields
        required_fields = ["title", "description", "latitude", "longitude", "image"]
        for field in required_fields:
            if field not in body or not body[field]:
                return create_error_response(400, f"Missing or empty required field: {field}")

        # Visibility and Category validation
        visibility = body.get("visibility", VISIBILITY_PRIVATE).upper() # Default to PRIVATE, ensure uppercase
        category = body.get("category") # Optional

        if visibility not in ALLOWED_VISIBILITY:
            return create_error_response(400, f"Invalid visibility value. Must be one of: {', '.join(ALLOWED_VISIBILITY)}")

        if visibility == VISIBILITY_PUBLIC and (not category or not str(category).strip()):
             return create_error_response(400, "Category is required for PUBLIC items.")
        # Optional: Add validation against a predefined list of categories if needed
        # allowed_categories = {"Umbrella", "StreetArt", "Other"}
        # if visibility == VISIBILITY_PUBLIC and category not in allowed_categories:
        #     return create_error_response(400, f"Invalid category. Must be one of: {', '.join(allowed_categories)}")


        # Validate coordinate ranges and types
        try:
            latitude = Decimal(str(body["latitude"]))
            longitude = Decimal(str(body["longitude"]))
            if not (-90 <= latitude <= 90):
                raise ValueError("Latitude must be between -90 and 90.")
            if not (-180 <= longitude <= 180):
                raise ValueError("Longitude must be between -180 and 180.")
        except (InvalidOperation, TypeError):
             return create_error_response(400, "Latitude and Longitude must be valid numbers.")
        except ValueError as coord_err:
             return create_error_response(400, str(coord_err))

        # Extract other fields
        title = body["title"]
        description = body["description"]
        image_base64_data_uri = body["image"]

        # 3. Generate IDs and Keys
        item_id = str(uuid.uuid4())
        # Secret key is always generated, but only used for PRIVATE items
        secret_key = generate_secret_key()

        # 4. Process and Store Image in S3 (Code unchanged from previous version)
        try:
            content_type = "application/octet-stream"
            if image_base64_data_uri.startswith("data:"):
                try:
                    header, encoded_data = image_base64_data_uri.split(",", 1)
                    parts = header.split(";")
                    if len(parts) > 0 and parts[0].startswith("data:"):
                        potential_mime = parts[0].split(":", 1)[1]
                        if '/' in potential_mime:
                            content_type = potential_mime
                except ValueError:
                    encoded_data = image_base64_data_uri
            else:
                encoded_data = image_base64_data_uri

            image_data = base64.b64decode(encoded_data)
            if not image_data:
                 raise ValueError("Decoded image data is empty.")
        except (ValueError, binascii.Error) as img_err:
             logger.warning(f"Image decoding/validation error: {img_err}")
             return create_error_response(400, "Invalid image format, encoding, or empty image data.")

        extension = mimetypes.guess_extension(content_type) or ".bin"
        image_key = f"{item_id}{extension}"

        try:
            s3.put_object(
                Bucket=IMAGES_BUCKET_NAME,
                Key=image_key,
                Body=image_data,
                ContentType=content_type
            )
            logger.info(f"Successfully uploaded image {image_key} to bucket {IMAGES_BUCKET_NAME}")
        except ClientError as s3_err:
            logger.error(f"Failed to upload image to S3: {s3_err}", exc_info=True)
            error_code = s3_err.response.get("Error", {}).get("Code", "UnknownS3Error")
            return create_error_response(500, f"Failed to store image (S3 Error: {error_code}).")

        # 5. Create Item in DynamoDB
        timestamp = datetime.utcnow().isoformat()
        item = {
            "item_id": item_id,
            "visibility": visibility, # Store visibility
            "title": title,
            "description": description,
            "latitude": latitude,
            "longitude": longitude,
            "image_url": f"https://{IMAGES_BUCKET_NAME}.s3.amazonaws.com/{image_key}",
            "created_at": timestamp,
        }
        # Only add category if item is public
        if visibility == VISIBILITY_PUBLIC:
            item["category"] = category
        # Only add secret_key if item is private
        if visibility == VISIBILITY_PRIVATE:
             item["secret_key"] = secret_key

        # Put the item into the DynamoDB table
        try:
            table.put_item(Item=item)
            logger.info(f"Successfully created item {item_id} with visibility {visibility} in table {DYNAMODB_TABLE_NAME}")
        except ClientError as ddb_err:
            logger.error(f"Failed to create item in DynamoDB: {ddb_err}", exc_info=True)
            error_code = ddb_err.response.get("Error", {}).get("Code", "UnknownDynamoDBError")
            # Attempt cleanup
            try:
                logger.warning(f"Attempting to delete orphaned S3 object {image_key} due to DynamoDB error.")
                s3.delete_object(Bucket=IMAGES_BUCKET_NAME, Key=image_key)
            except ClientError as s3_del_err:
                 logger.error(f"Failed to delete orphaned S3 object {image_key}: {s3_del_err}", exc_info=True)
            return create_error_response(500, f"Failed to save item details (DynamoDB Error: {error_code}).")

        # 6. Return Success Response
        # Only include secret_key and secret_url_path in response for PRIVATE items
        success_payload = {
            "item_id": item_id,
        }
        if visibility == VISIBILITY_PRIVATE:
            success_payload["secret_key"] = secret_key
            success_payload["secret_url_path"] = f"/items/{item_id}?key={secret_key}"

        logger.info(f"Item creation successful for item_id: {item_id}")
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(success_payload, cls=DecimalEncoder),
        }

    # 7. Generic Error Handling
    except Exception as e:
        logger.error(f"Unexpected Error creating item: {str(e)}", exc_info=True)
        return create_error_response(500, "An internal server error occurred while creating the item.")
