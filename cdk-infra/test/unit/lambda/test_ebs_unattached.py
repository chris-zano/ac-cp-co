"""
Unit tests for EBS Unattached Config rule evaluator.
Tests the logic that determines if EBS volumes are attached to EC2 instances.
"""
import sys
import os

# Add the Lambda function directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../../lambda/config-rules-combined"))

from index import ebs_unattached_evaluate_compliance


def test_attached_volume_is_compliant():
    """Test that attached volumes are marked as COMPLIANT"""
    configuration_item = {
        "configuration": {
            "attachments": [
                {
                    "instanceId": "i-1234567890abcdef0",
                    "state": "attached"
                }
            ]
        }
    }
    rule_parameters = {}
    
    result = ebs_unattached_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "COMPLIANT"


def test_unattached_volume_is_non_compliant():
    """Test that volumes with no attachments are NON_COMPLIANT"""
    configuration_item = {
        "configuration": {
            "attachments": []
        }
    }
    rule_parameters = {}
    
    result = ebs_unattached_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "NON_COMPLIANT"


def test_missing_attachments_key_is_non_compliant():
    """Test that volumes without attachments key are NON_COMPLIANT"""
    configuration_item = {
        "configuration": {}
    }
    rule_parameters = {}
    
    result = ebs_unattached_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "NON_COMPLIANT"


def test_multiple_attachments_is_compliant():
    """Test that volumes with multiple attachments are COMPLIANT"""
    configuration_item = {
        "configuration": {
            "attachments": [
                {
                    "instanceId": "i-1234567890abcdef0",
                    "state": "attached"
                },
                {
                    "instanceId": "i-0987654321fedcba0",
                    "state": "attached"
                }
            ]
        }
    }
    rule_parameters = {}
    
    result = ebs_unattached_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "COMPLIANT"
