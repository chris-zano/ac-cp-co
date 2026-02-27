import boto3
import subprocess

OU_ID = "ou-xxxx-xxxxxxxx"
REGION = "eu-west-1"
MANAGEMENT_ACCOUNT = "123456789012"
ASSUME_ROLE_NAME = "OrganizationAccountAccessRole"

org_client = boto3.client("organizations")

def get_accounts_in_ou(ou_id):
    accounts = []
    paginator = org_client.get_paginator("list_accounts_for_parent")
    for page in paginator.paginate(ParentId=ou_id):
        accounts.extend(page["Accounts"])
    return [a for a in accounts if a["Status"] == "ACTIVE"]

accounts = get_accounts_in_ou(OU_ID)

for account in accounts:
    account_id = account["Id"]
    role_arn = f"arn:aws:iam::{account_id}:role/{ASSUME_ROLE_NAME}"
    
    print(f"Bootstrapping account {account_id}")
    subprocess.run([
        "cdk", "bootstrap",
        f"aws://{account_id}/{REGION}",
        "--trust", MANAGEMENT_ACCOUNT,
        "--cloudformation-execution-policies", "arn:aws:iam::aws:policy/AdministratorAccess",
        "--role-arn", role_arn
    ], check=True)
