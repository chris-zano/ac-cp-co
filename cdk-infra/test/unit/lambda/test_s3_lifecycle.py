"""
Unit tests for S3 Lifecycle Config rule evaluator.
Tests the logic that determines if S3 buckets have lifecycle policies.

Note: These tests mock boto3 S3 client calls.
"""
import sys
import os
from unittest.mock import Mock, patch
import pytest

# Add the Lambda function directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../../lambda/config-rules-combined"))

from index import s3_withoutlifecycle_evaluate_compliance


@patch('index.boto3.client')
def test_bucket_with_lifecycle_is_compliant(mock_boto_client):
    """Test that buckets with lifecycle rules are COMPLIANT"""
    mock_s3 = Mock()
    mock_s3.get_bucket_lifecycle_configuration.return_value = {
        "Rules": [
            {
                "Id": "MoveToGlacier",
                "Status": "Enabled",
                "Transitions": [
                    {
                        "Days": 90,
                        "StorageClass": "GLACIER"
                    }
                ]
            }
        ]
    }
    mock_boto_client.return_value = mock_s3
    
    configuration_item = {
        "resourceName": "test-bucket"
    }
    rule_parameters = {}
    
    result = s3_withoutlifecycle_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "COMPLIANT"
    mock_s3.get_bucket_lifecycle_configuration.assert_called_once_with(Bucket="test-bucket")


@patch('index.boto3.client')
def test_bucket_with_empty_rules_is_non_compliant(mock_boto_client):
    """Test that buckets with empty rules list are NON_COMPLIANT"""
    mock_s3 = Mock()
    mock_s3.get_bucket_lifecycle_configuration.return_value = {
        "Rules": []
    }
    mock_boto_client.return_value = mock_s3
    
    configuration_item = {
        "resourceName": "test-bucket"
    }
    rule_parameters = {}
    
    result = s3_withoutlifecycle_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "NON_COMPLIANT"


@patch('index.boto3.client')
def test_bucket_without_lifecycle_is_non_compliant(mock_boto_client):
    """Test that buckets without lifecycle configuration are NON_COMPLIANT"""
    mock_s3 = Mock()
    mock_s3.get_bucket_lifecycle_configuration.side_effect = Exception(
        "NoSuchLifecycleConfiguration: The lifecycle configuration does not exist"
    )
    mock_boto_client.return_value = mock_s3
    
    configuration_item = {
        "resourceName": "test-bucket"
    }
    rule_parameters = {}
    
    result = s3_withoutlifecycle_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "NON_COMPLIANT"


@patch('index.boto3.client')
def test_bucket_with_multiple_lifecycle_rules_is_compliant(mock_boto_client):
    """Test that buckets with multiple lifecycle rules are COMPLIANT"""
    mock_s3 = Mock()
    mock_s3.get_bucket_lifecycle_configuration.return_value = {
        "Rules": [
            {
                "Id": "DeleteOldVersions",
                "Status": "Enabled",
                "NoncurrentVersionExpiration": {"NoncurrentDays": 30}
            },
            {
                "Id": "MoveToGlacier",
                "Status": "Enabled",
                "Transitions": [{"Days": 90, "StorageClass": "GLACIER"}]
            }
        ]
    }
    mock_boto_client.return_value = mock_s3
    
    configuration_item = {
        "resourceName": "test-bucket"
    }
    rule_parameters = {}
    
    result = s3_withoutlifecycle_evaluate_compliance(configuration_item, rule_parameters)
    assert result == "COMPLIANT"


@patch('index.boto3.client')
def test_bucket_with_other_error_raises_exception(mock_boto_client):
    """Test that non-NoSuchLifecycleConfiguration errors are re-raised"""
    mock_s3 = Mock()
    mock_s3.get_bucket_lifecycle_configuration.side_effect = Exception(
        "AccessDenied: Access Denied"
    )
    mock_boto_client.return_value = mock_s3
    
    configuration_item = {
        "resourceName": "test-bucket"
    }
    rule_parameters = {}
    
    with pytest.raises(Exception, match="AccessDenied"):
        s3_withoutlifecycle_evaluate_compliance(configuration_item, rule_parameters)
