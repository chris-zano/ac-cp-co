import json


def lambda_handler(event, context):
    """Remediation function that logs the event for cost allocation tag violations
    
    This function is invoked when a resource is missing required cost allocation tags.
    It logs the event details for auditing and manual follow-up.
    """
    print("=" * 80)
    print("Cost Allocation Tag Remediation Triggered")
    print("=" * 80)
    
    print("\n--- Event Details ---")
    print(json.dumps(event, indent=2, default=str))
    
    print("\n--- Context Details ---")
    print(f"Function Name: {context.function_name}")
    print(f"Function Version: {context.function_version}")
    print(f"Invoked Function ARN: {context.invoked_function_arn}")
    print(f"Memory Limit: {context.memory_limit_in_mb} MB")
    print(f"Request ID: {context.aws_request_id}")
    print(f"Log Group Name: {context.log_group_name}")
    print(f"Log Stream Name: {context.log_stream_name}")
    
    # Extract resource information if available
    if "configRuleName" in event:
        print(f"\n--- Config Rule ---")
        print(f"Config Rule Name: {event['configRuleName']}")
    
    if "resourceId" in event:
        print(f"\n--- Resource Information ---")
        print(f"Resource ID: {event['resourceId']}")
        if "resourceType" in event:
            print(f"Resource Type: {event['resourceType']}")
    
    print("\n" + "=" * 80)
    print("Manual tagging action required for this resource")
    print("=" * 80)
    
    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Cost allocation tag violation logged successfully",
            "resourceId": event.get("resourceId", "unknown"),
            "requestId": context.aws_request_id
        })
    }
