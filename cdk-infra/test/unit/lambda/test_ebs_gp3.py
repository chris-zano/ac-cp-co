"""
Unit tests for EBS GP3 Config rule evaluator.
Tests the logic that determines if EBS volumes should use gp3 instead of gp2.
"""
import sys
import os

# Add the Lambda function directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../../lambda/config-rules-combined"))

from index import ebs_gp3_evaluate_compliance


def test_gp2_volume_is_non_compliant():
    """Test that gp2 volumes are marked as NON_COMPLIANT"""
    configuration_item = {
        "configuration": {
            "volumeType": "gp2"
        }
    }
    rule_parameters = {
        "desiredVolumeType": "gp3"
    }
    
    result = ebs_gp3_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "NON_COMPLIANT"


def test_gp3_volume_is_compliant():
    """Test that gp3 volumes are marked as COMPLIANT"""
    configuration_item = {
        "configuration": {
            "volumeType": "gp3"
        }
    }
    rule_parameters = {
        "desiredVolumeType": "gp3"
    }
    
    result = ebs_gp3_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "COMPLIANT"


def test_io1_volume_is_not_applicable():
    """Test that non-gp2/gp3 volumes (like io1) are NOT_APPLICABLE"""
    configuration_item = {
        "configuration": {
            "volumeType": "io1"
        }
    }
    rule_parameters = {
        "desiredVolumeType": "gp3"
    }
    
    result = ebs_gp3_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "NOT_APPLICABLE"


def test_io2_volume_is_not_applicable():
    """Test that io2 volumes are NOT_APPLICABLE"""
    configuration_item = {
        "configuration": {
            "volumeType": "io2"
        }
    }
    rule_parameters = {
        "desiredVolumeType": "gp3"
    }
    
    result = ebs_gp3_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "NOT_APPLICABLE"


def test_st1_volume_is_not_applicable():
    """Test that st1 (throughput optimized HDD) volumes are NOT_APPLICABLE"""
    configuration_item = {
        "configuration": {
            "volumeType": "st1"
        }
    }
    rule_parameters = {
        "desiredVolumeType": "gp3"
    }
    
    result = ebs_gp3_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "NOT_APPLICABLE"
