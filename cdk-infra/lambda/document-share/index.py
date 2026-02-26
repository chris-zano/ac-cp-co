"""
Lambda function to share SSM documents with all AWS Organization accounts.
Handles Create, Update, and Delete operations from CloudFormation.
"""
import json
import boto3

ssm = boto3.client("ssm")


def get_accounts(context):
    """Get all active AWS Organization accounts except the current account."""
    aws_account_id = context.invoked_function_arn.split(":")[4]
    org = boto3.client("organizations")
    list_accounts = org.list_accounts()
    accountids = [a["Id"] for a in list_accounts["Accounts"] if a["Status"] == "ACTIVE"]
    while "NextToken" in list_accounts:
        list_accounts = org.list_accounts(NextToken=list_accounts["NextToken"])
        accountids += [
            a["Id"] for a in list_accounts["Accounts"] if a["Status"] == "ACTIVE"
        ]
    accountids.remove(aws_account_id)
    return accountids


def share(context, document_name):
    """Share SSM document with all organization accounts (batches of 20)."""
    accounts = get_accounts(context)
    for batch in range(0, len(accounts), 20):
        ssm.modify_document_permission(
            Name=document_name,
            PermissionType="Share",
            AccountIdsToAdd=accounts[batch : batch + 20],
        )


def unshare(context, document_name):
    """Unshare SSM document from all organization accounts (batches of 20)."""
    accounts = get_accounts(context)
    for batch in range(0, len(accounts), 20):
        ssm.modify_document_permission(
            Name=document_name,
            PermissionType="Share",
            AccountIdsToRemove=accounts[batch : batch + 20],
        )


def handler(event, context):
    """Custom resource handler for SSM document sharing."""
    print(json.dumps(event))
    
    request_type = event["RequestType"]
    document_name = event["ResourceProperties"]["DocumentName"]
    
    try:
        if request_type == "Create":
            share(context, document_name)
        elif request_type == "Update":
            old_document_name = event["OldResourceProperties"]["DocumentName"]
            unshare(context, old_document_name)
            share(context, document_name)
        elif request_type == "Delete":
            unshare(context, document_name)
        
        return {
            "PhysicalResourceId": f"ShareDocument-{document_name}"
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        raise
