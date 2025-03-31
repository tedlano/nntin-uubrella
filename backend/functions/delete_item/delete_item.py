import json
import os
import boto3
from botocore.exceptions import ClientError
from urllib.parse import urlparse

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('DYNAMODB_TABLE')
table = dynamodb.Table(table_name) if table_name else None

# Initialize S3 client
images_bucket_name = os.environ.get('IMAGES_BUCKET')
s3 = boto3.client('s3') if images_bucket_name else None

def handler(event, context):
    print(f"Received event: {json.dumps(event)}")

    # Define CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*', # Be more specific in production
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,DELETE'
    }

    if not table:
        print("Error: DynamoDB table not configured.")
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'DynamoDB table not configured'})}
    if not s3:
        print("Error: S3 bucket not configured.")
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'S3 bucket not configured'})}

    try:
        # Get item_id from path parameters
        item_id = event.get('pathParameters', {}).get('id')

        if not item_id:
            print("Error: Missing item ID in path.")
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Missing item ID in path'})}

        print(f"Attempting to delete item: {item_id}")

        # --- Get item to find image URL ---
        try:
            get_response = table.get_item(Key={'item_id': item_id})
            item = get_response.get('Item')
            if not item:
                 print(f"Item {item_id} not found in DynamoDB. Proceeding to delete attempt anyway.")
                 # Allow delete attempt even if item not found, maybe it only exists in S3? Or maybe delete failed previously.
                 image_url = None
            else:
                image_url = item.get('image_url')
                print(f"Found item, image_url: {image_url}")

        except ClientError as e:
            print(f"Error getting item {item_id} before delete: {e.response['Error']['Message']}")
            # Decide if we should stop or continue? Let's continue to attempt delete.
            image_url = None


        # --- Delete S3 object if image_url exists ---
        if image_url:
            try:
                parsed_url = urlparse(image_url)
                # Assuming URL format is https://<bucket-name>.s3.<region>.amazonaws.com/<key>
                # Or https://<cloudfront-domain>/<key> - need to handle both?
                # Safest is often to store just the key in DynamoDB, but let's parse for now.
                # The key is the path part, removing the leading '/'
                s3_key = parsed_url.path.lstrip('/')

                if s3_key:
                    print(f"Attempting to delete S3 object: Bucket={images_bucket_name}, Key={s3_key}")
                    s3.delete_object(Bucket=images_bucket_name, Key=s3_key)
                    print(f"Successfully deleted S3 object (or it didn't exist): {s3_key}")
                else:
                    print(f"Could not parse S3 key from image_url: {image_url}")

            except ClientError as e:
                # Log S3 delete error but continue to DynamoDB delete
                print(f"Error deleting S3 object {s3_key}: {e.response['Error']['Message']}")
            except Exception as e:
                 # Log other parsing errors but continue
                 print(f"Error parsing image_url or deleting S3 object: {str(e)}")


        # --- Delete item from DynamoDB ---
        print(f"Attempting to delete DynamoDB item: {item_id}")
        db_delete_response = table.delete_item(Key={'item_id': item_id})
        print(f"DynamoDB delete response: {db_delete_response}")
        print(f"Successfully deleted DynamoDB item {item_id} (or it didn't exist).")

        return {
            'statusCode': 200, # Or 204 No Content
            'headers': headers,
            'body': json.dumps({'message': f'Item {item_id} deleted successfully'})
        }

    except ClientError as e:
        # Handle potential DynamoDB errors during the delete phase (e.g., throttling)
        error_code = e.response.get('Error', {}).get('Code')
        print(f"DynamoDB ClientError during delete: {e.response['Error']['Message']} (Code: {error_code})")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f"Database delete error: {e.response['Error']['Message']}"})
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'An unexpected error occurred: {str(e)}'})
        }