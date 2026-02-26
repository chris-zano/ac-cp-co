"""
AWS Config Rule: EBS Volume GP3 Compliance
Evaluates whether EBS volumes use gp3 volume type instead of gp2.
"""
import sys
import os

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'shared'))
from config_rule_base import lambda_handler


def ebs_gp3_evaluate_compliance(configuration_item, valid_rule_parameters):
    """
    Evaluate if an EBS volume is using gp2 (non-compliant) or gp3 (compliant).
    
    Args:
        configuration_item: The AWS Config configuration item for the EBS volume
        valid_rule_parameters: Rule parameters including desiredVolumeType
        
    Returns:
        str: 'COMPLIANT', 'NON_COMPLIANT', or 'NOT_APPLICABLE'
    """
    volume_type = configuration_item["configuration"]["volumeType"]
    
    # gp2 volumes are always non-compliant (should be upgraded to gp3)
    if volume_type == "gp2":
        return "NON_COMPLIANT"
    
    # Check if volume matches the desired type (typically gp3)
    if volume_type == valid_rule_parameters.get("desiredVolumeType", "gp3"):
        return "COMPLIANT"

    return "NOT_APPLICABLE"


# Export the handler from the base module
handler = lambda_handler
