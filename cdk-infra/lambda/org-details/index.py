"""
Lambda function to retrieve AWS Organization details.
Returns the Organization Root ID and Management Account ID.
"""
import json
import boto3

org = boto3.client("organizations")


def handler(event, context):
    """Custom resource handler for organization details."""
    print(json.dumps(event))
    
    request_type = event["RequestType"]
    
    try:
        if request_type in ["Create", "Update"]:
            # Get organization details
            org_info = org.describe_organization()["Organization"]
            root_id = org.list_roots()["Roots"][0]["Id"]
            
            return {
                "PhysicalResourceId": root_id,
                "Data": {
                    "RootId": root_id,
                    "MasterAccountId": org_info["MasterAccountId"]
                }
            }
        elif request_type == "Delete":
            # Return the existing physical resource ID from the event
            return {
                "PhysicalResourceId": event.get("PhysicalResourceId", "DeletedResource")
            }
    except Exception as e:
        print(f"Error: {str(e)}")
        raise
