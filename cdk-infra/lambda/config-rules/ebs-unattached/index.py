"""
AWS Config Rule: EBS Unattached Volume Compliance
Evaluates whether EBS volumes are attached to EC2 instances.
Unattached volumes are considered wasteful and non-compliant.
"""
import sys
import os

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'shared'))
from config_rule_base import lambda_handler


def ebs_unattached_evaluate_compliance(configuration_item, valid_rule_parameters):
    """
    Evaluate if an EBS volume is attached to an EC2 instance.
    
    Args:
        configuration_item: The AWS Config configuration item for the EBS volume
        valid_rule_parameters: Rule parameters (not used in this rule)
        
    Returns:
        str: 'COMPLIANT' if attached, 'NON_COMPLIANT' if unattached
    """
    attachments = configuration_item["configuration"].get("attachments", [])
    
    # If no attachments or empty attachments list, volume is unattached
    if not attachments or len(attachments) == 0:
        return "NON_COMPLIANT"
    
    return "COMPLIANT"


# Export the handler from the base module
handler = lambda_handler
