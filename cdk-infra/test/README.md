# Test Suite

## Overview

This directory contains tests for the Cost Optimization CDK project.

## Structure

```
test/
├── unit/
│   ├── stacks/
│   │   ├── member-stack.test.ts       # Tests for MemberAccountStack
│   │   └── main-stack.test.ts         # Tests for CostOptimizationMainStack
│   ├── lambda/
│   │   ├── test_ebs_gp3.py            # Tests for EBS GP3 rule logic
│   │   ├── test_ebs_unattached.py     # Tests for EBS unattached rule logic
│   │   └── test_s3_lifecycle.py       # Tests for S3 lifecycle rule logic
│   └── __snapshots__/                 # Jest snapshot files
├── requirements.txt                    # Python test dependencies
└── README.md                           # This file
```

## Running Tests

### TypeScript Tests (CDK Infrastructure)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Python Tests (Lambda Functions)

```bash
# Run Python tests
npm run test:python

# Run Python tests with coverage
npm run test:python:coverage
```

### All Tests

```bash
# Run both TypeScript and Python tests
npm run test:all
```

## Test Results

### TypeScript Tests (Jest)

- **member-stack.test.ts**: Tests the member account stack configuration
  - AutomationRole creation
  - Lambda function creation
  - Config rule creation
  - IAM policies and permissions
- **main-stack.test.ts**: Tests the main stack configuration
  - Organization details lookup
  - SSM document creation
  - StackSet configuration
  - Conformance pack creation

### Python Tests (pytest)

- **test_ebs_gp3.py**: Tests EBS volume type evaluation
  - gp2 volumes are NON_COMPLIANT
  - gp3 volumes are COMPLIANT
  - Other volume types are NOT_APPLICABLE
- **test_ebs_unattached.py**: Tests EBS attachment evaluation
  - Attached volumes are COMPLIANT
  - Unattached volumes are NON_COMPLIANT
- **test_s3_lifecycle.py**: Tests S3 lifecycle policy evaluation
  - Buckets with lifecycle policies are COMPLIANT
  - Buckets without lifecycle policies are NON_COMPLIANT

## Coverage Goals

- **TypeScript**: 80%+ statement coverage
- **Python**: 90%+ statement coverage

## Adding New Tests

### For CDK Constructs/Stacks

1. Create a new file in `test/unit/stacks/` or `test/unit/constructs/`
2. Import dependencies:
   ```typescript
   import * as cdk from "aws-cdk-lib";
   import { Template } from "aws-cdk-lib/assertions";
   ```
3. Write test suites following the existing pattern
4. Run `npm test` to verify

### For Lambda Functions

1. Create a new file in `test/unit/lambda/` with prefix `test_`
2. Import the function to test from the Lambda directory
3. Write test functions with prefix `test_`
4. Use mocking for AWS SDK calls (boto3)
5. Run `npm run test:python` to verify

## Continuous Integration

These tests are designed to run in CI/CD pipelines. Example GitHub Actions workflow:

```yaml
- name: Run TypeScript Tests
  run: npm test

- name: Run Python Tests
  run: |
    pip install -r test/requirements.txt
    pytest
```
