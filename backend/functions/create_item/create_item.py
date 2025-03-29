import os
import json
import uuid
import base64
import boto3
from datetime import datetime
from decimal import Decimal

# --- AWS SDK Clients (initialized globally for potential reuse) ---
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

# --- Environment Variables ---
# These are expected to be set in the Lambda function's configuration
DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE"]
IMAGES_BUCKET_NAME = os.environ["IMAGES_BUCKET"]

# --- DynamoDB Table Resource ---
table = dynamodb.Table(DYNAMODB_TABLE_NAME)

# --- Helper Classes ---
class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle DynamoDB's Decimal type."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Convert Decimal to float for JSON serialization
            return float(obj)
        # Let the base class default method raise the TypeError
        return super(DecimalEncoder, self).default(obj)

# --- Helper Functions ---
def generate_secret_key():
    """Generates a secure, URL-safe random secret key."""
    # Uses UUID4 for randomness and base64 for URL-safe encoding
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).decode("utf-8").rstrip("=")

# --- Lambda Handler ---
def handler(event, context):
    """
    AWS Lambda handler function for creating a new hidden item.
    Triggered by API Gateway POST request.
    """
    try:
        # 1. Parse Request Body
        # Assumes request body is JSON stringified
        body = json.loads(event["body"])

        # 2. Validate Input
        required_fields = ["title", "description", "latitude", "longitude", "image"]
        for field in required_fields:
            if field not in body or not body[field]: # Check for presence and non-empty value
                # Return a 400 Bad Request response if validation fails
                return {
                    "statusCode": 400,
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*", # CORS header
                    },
                    "body": json.dumps(
                        {"error": f"Missing or empty required field: {field}"},
                        cls=DecimalEncoder, # Use custom encoder for consistency
                    ),
                }

        # 3. Generate IDs and Keys
        item_id = str(uuid.uuid4()) # Generate a unique item ID
        secret_key = generate_secret_key() # Generate a secret key for viewing

        # 4. Process and Store Image in S3
        # Assumes image is a Base64 encoded string with a data URI prefix (e.g., "data:image/jpeg;base64,...")
        # Split the prefix and decode the Base64 data
        try:
            # TODO: Add more robust parsing for different image types (png, gif etc.) and extract ContentType
            image_data_base64 = body["image"].split(",")[1]
            image_data = base64.b64decode(image_data_base64)
            # Basic validation: Check if decoded data is empty
            if not image_data:
                 raise ValueError("Decoded image data is empty.")
        except (IndexError, ValueError, binascii.Error) as img_err:
             print(f"Image decoding/validation error: {img_err}")
             return {
                 "statusCode": 400,
                 "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                 "body": json.dumps({"error": "Invalid image format, encoding, or empty image data."}, cls=DecimalEncoder),
             }

        # Define S3 object key (using item_id ensures uniqueness)
        # TODO: Consider adding content-based hashing or user ID prefix if needed later
        image_key = f"{item_id}.jpg" # Assuming JPEG for now, might need dynamic type later

        # Upload image data to S3 bucket
        s3.put_object(
            Bucket=IMAGES_BUCKET_NAME,
            Key=image_key,
            Body=image_data,
            ContentType="image/jpeg" # Set content type for proper browser handling
            # TODO: Consider adding ACL or other parameters if needed
        )

        # 5. Create Item in DynamoDB
        timestamp = datetime.utcnow().isoformat() # Use UTC timestamp
        # Construct the item payload for DynamoDB
        # Note: Latitude/Longitude are converted to Decimal for DynamoDB compatibility
        item = {
            "item_id": item_id,             # Primary Key
            "secret_key": secret_key,       # Needed for retrieval auth
            "title": body["title"],
            "description": body["description"],
            "latitude": Decimal(str(body["latitude"])), # Convert to Decimal
            "longitude": Decimal(str(body["longitude"])),# Convert to Decimal
            # Construct the public S3 URL for the image
            "image_url": f"https://{IMAGES_BUCKET_NAME}.s3.amazonaws.com/{image_key}",
            "created_at": timestamp,        # Timestamp of creation
        }

        # Put the item into the DynamoDB table
        table.put_item(Item=item)

        # 6. Return Success Response
        # Include item_id and secret_key for constructing the shareable URL on the frontend
        return {
            "statusCode": 200, # OK
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", # Allow frontend to access
            },
            "body": json.dumps(
                {
                    "item_id": item_id,
                    "secret_key": secret_key,
                    # Note: Frontend constructs the full URL, backend provides components
                    "secret_url_path": f"/items/{item_id}?key={secret_key}", # Renamed for clarity
                },
                cls=DecimalEncoder, # Use custom encoder for Decimals
            ),
        }

    # 7. Generic Error Handling
    except Exception as e:
        # Log the unexpected error for debugging
        # TODO: Implement more robust logging (e.g., using Python's logging module)
        print(f"Unexpected Error creating item: {str(e)}")
        # Return a generic 500 Internal Server Error response
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": "An internal server error occurred while creating the item."}, cls=DecimalEncoder),
        }
