# Testing Strategy for Cost Optimization CDK Project

## Overview

Our testing approach uses a **multi-layer strategy** to ensure reliability:

1. **Unit Tests** - Test individual components in isolation
2. **Integration Tests** - Test CDK construct behavior
3. **Snapshot Tests** - Verify CloudFormation template consistency
4. **Lambda Function Tests** - Test Python rule evaluators

---

## Testing Stack

### TypeScript (CDK Infrastructure)

- **Framework**: Jest
- **Coverage**: CDK constructs, stack synthesis
- **Tools**: `@aws-cdk/assert` for CDK-specific assertions

### Python (Lambda Functions)

- **Framework**: pytest
- **Coverage**: Config rule evaluators
- **Mocking**: boto3 mocking with moto

---

## Test Structure

```
cdk-infra/
├── test/
│   ├── unit/
│   │   ├── constructs/
│   │   │   ├── org-details.test.ts
│   │   │   ├── config-rules.test.ts
│   │   │   ├── document-share.test.ts
│   │   │   └── remediation-documents.test.ts
│   │   ├── stacks/
│   │   │   ├── member-stack.test.ts
│   │   │   └── main-stack.test.ts
│   │   └── lambda/
│   │       ├── test_ebs_gp3.py
│   │       ├── test_ebs_unattached.py
│   │       └── test_s3_lifecycle.py
│   └── snapshots/
│       └── __snapshots__/
```

---

## Test Types

### 1. **Snapshot Tests**

Verify that CloudFormation templates haven't changed unexpectedly.

```typescript
test("Main Stack matches snapshot", () => {
  const app = new cdk.App();
  const stack = new CostOptimizationMainStack(app, "TestStack", {
    env: { account: "123456789012", region: "us-east-1" },
  });
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
```

### 2. **Resource Validation Tests**

Check that expected resources are created with correct properties.

```typescript
test("Creates Config Rules in Member Stack", () => {
  const stack = new MemberAccountStack(app, "TestMemberStack");
  const template = Template.fromStack(stack);

  // Assert 3 Config rules exist
  template.resourceCountIs("AWS::Config::ConfigRule", 3);

  // Assert Lambda function exists
  template.hasResourceProperties("AWS::Lambda::Function", {
    Runtime: "python3.12",
    Handler: "index.lambda_handler",
  });
});
```

### 3. **Construct Behavior Tests**

Test custom constructs work as expected.

```typescript
test("OrgDetailsConstruct exposes rootId and managementAccountId", () => {
  const stack = new cdk.Stack();
  const orgDetails = new OrgDetailsConstruct(stack, "OrgDetails");

  expect(orgDetails.rootId).toBeDefined();
  expect(orgDetails.managementAccountId).toBeDefined();
});
```

### 4. **Lambda Function Unit Tests**

Test Python rule evaluators with mocked AWS responses.

```python
def test_ebs_gp3_non_compliant_for_gp2():
    """Test that gp2 volumes are marked NON_COMPLIANT"""
    config_item = {
        "configuration": {"volumeType": "gp2"}
    }
    rule_params = {"desiredVolumeType": "gp3"}

    result = ebs_gp3_evaluate_compliance(config_item, rule_params)
    assert result == "NON_COMPLIANT"

def test_ebs_gp3_compliant_for_gp3():
    """Test that gp3 volumes are marked COMPLIANT"""
    config_item = {
        "configuration": {"volumeType": "gp3"}
    }
    rule_params = {"desiredVolumeType": "gp3"}

    result = ebs_gp3_evaluate_compliance(config_item, rule_params)
    assert result == "COMPLIANT"
```

---

## Running Tests

### TypeScript Tests (CDK)

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Python Tests (Lambda)

```bash
# From cdk-infra directory
cd lambda/config-rules-combined
pytest -v

# With coverage
pytest --cov=. --cov-report=html
```

---

## Test Coverage Goals

- **CDK Constructs**: 80%+ coverage
- **Lambda Functions**: 90%+ coverage (critical business logic)
- **Stack Templates**: 100% snapshot coverage

---

## Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions/setup-python@v4
      - run: npm ci
      - run: npm test
      - run: cd lambda/config-rules-combined && pip install pytest && pytest
```

---

## Mock Data Guidelines

### For Config Rule Tests

Use realistic AWS Config configuration items:

```python
SAMPLE_EBS_VOLUME = {
    "resourceType": "AWS::EC2::Volume",
    "resourceId": "vol-1234567890abcdef0",
    "configuration": {
        "volumeType": "gp2",
        "size": 100,
        "state": "available"
    },
    "configurationItemCaptureTime": "2026-02-26T10:00:00Z"
}
```

### For CDK Tests

Use test account IDs and regions:

```typescript
const testEnv = {
  account: "123456789012",
  region: "us-east-1",
};
```

---

## Best Practices

1. **Isolate Tests** - Each test should be independent
2. **Mock External Calls** - Don't make real AWS API calls
3. **Test Edge Cases** - Empty lists, null values, errors
4. **Descriptive Names** - Test names should explain what they verify
5. **Arrange-Act-Assert** - Follow AAA pattern
6. **Fast Tests** - Keep unit tests under 100ms each

---

## Next Steps

1. Write unit tests for Lambda evaluators (Python)
2. Write snapshot tests for CDK stacks (TypeScript)
3. Write integration tests for construct behavior
4. Set up CI/CD pipeline with test automation
