import os
import json
import uuid
import base64
import boto3
from datetime import datetime
from decimal import Decimal


# Custom JSON encoder to handle Decimal objects
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


# Initialize AWS clients
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["DYNAMODB_TABLE"])
BUCKET_NAME = os.environ["IMAGES_BUCKET"]


def generate_secret_key():
    """Generate a random secret key for the item."""
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).decode("utf-8").rstrip("=")


def handler(event, context):
    try:
        # Parse request body
        body = json.loads(event["body"])

        # Validate required fields
        required_fields = ["title", "description", "latitude", "longitude", "image"]
        for field in required_fields:
            if field not in body:
                return {
                    "statusCode": 400,
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                    "body": json.dumps(
                        {"error": f"Missing required field: {field}"},
                        cls=DecimalEncoder,
                    ),
                }

        # Generate unique IDs
        item_id = str(uuid.uuid4())
        secret_key = generate_secret_key()

        # Process and store image
        image_data = base64.b64decode(body["image"].split(",")[1])
        image_key = f"{item_id}.jpg"

        s3.put_object(
            Bucket=BUCKET_NAME, Key=image_key, Body=image_data, ContentType="image/jpeg"
        )

        # Create item in DynamoDB
        timestamp = datetime.utcnow().isoformat()
        item = {
            "item_id": item_id,
            "secret_key": secret_key,
            "title": body["title"],
            "description": body["description"],
            "latitude": Decimal(str(body["latitude"])),
            "longitude": Decimal(str(body["longitude"])),
            "image_url": f"https://{BUCKET_NAME}.s3.amazonaws.com/{image_key}",
            "created_at": timestamp,
        }

        table.put_item(Item=item)

        # Return success response with secret URL
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(
                {
                    "item_id": item_id,
                    "secret_key": secret_key,
                    "secret_url": f"/items/{item_id}?key={secret_key}",
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
