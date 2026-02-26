"""
AWS Config Rule: S3 Bucket Lifecycle Policy Compliance
Evaluates whether S3 buckets have lifecycle configurations defined.
Buckets without lifecycle policies are considered non-compliant.
"""
import sys
import os
import boto3

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'shared'))
from config_rule_base import lambda_handler


def s3_withoutlifecycle_evaluate_compliance(configuration_item, valid_rule_parameters):
    """
    Evaluate if an S3 bucket has a lifecycle configuration.
    
    Args:
        configuration_item: The AWS Config configuration item for the S3 bucket
        valid_rule_parameters: Rule parameters (not used in this rule)
        
    Returns:
        str: 'COMPLIANT' if lifecycle policy exists, 'NON_COMPLIANT' otherwise
    """
    try:
        s3 = boto3.client("s3")
        bucket_name = configuration_item["resourceName"]
        
        lifecycle_configuration = s3.get_bucket_lifecycle_configuration(
            Bucket=bucket_name
        )
        
        # Check if lifecycle rules exist and are not empty
        if (
            "Rules" not in lifecycle_configuration
            or len(lifecycle_configuration["Rules"]) == 0
        ):
            return "NON_COMPLIANT"
        
        return "COMPLIANT"
    except Exception as ex:
        # NoSuchLifecycleConfiguration means no lifecycle policy exists
        if "NoSuchLifecycleConfiguration" in str(ex):
            return "NON_COMPLIANT"
        else:
            # Re-raise other exceptions
            raise ex


# Export the handler from the base module
handler = lambda_handler
