# ADR-0006: Combine Three Config Rules in Single Lambda Function

## Status

Accepted

## Context

The cost optimization solution requires three AWS Config rules:

1. **CostOpt-Ebs-Gp3**: Check that EBS volumes use gp3 instead of gp2
2. **CostOpt-Ebs-Unattached**: Check that EBS volumes are attached to instances
3. **CostOpt-S3-WithoutLifecycle**: Check that S3 buckets have lifecycle policies

Each Config rule evaluates resources and determines compliance. The question is whether to create separate Lambda functions for each rule or combine them into a single function.

## Decision Drivers

- Deployment to 100+ accounts via StackSet
- Lambda function limits per account
- Code maintainability and duplication
- Lambda cold start performance
- Deployment complexity
- Total deployed Lambda count (100 accounts × 3 regions × rules)
- Shared code patterns between evaluators

## Considered Options

### Option 1: Separate Lambda Functions (One per Rule)

**Pros:**

- Clear separation of concerns
- Independent function updates
- Easier to debug individual rules
- Follows single responsibility principle
- Independent scaling

**Cons:**

- 3× Lambda function count: 100 accounts × 3 regions × 3 functions = 900 Lambda functions
- Code duplication for shared Config logic
- 3× deployment complexity
- More CloudWatch log groups (900 total)
- Higher Lambda management overhead
- Common code must be duplicated or packaged as layer

**Deployment Impact:**

- Total Lambda functions: 900
- Total CloudWatch log groups: 900
- Stack template size: Larger with 3 function definitions
- Inline code size: 3 separate code blocks

### Option 2: Combined Lambda Function with Dispatcher

**Pros:**

- Single Lambda per account/region: 300 functions vs 900
- Shared code patterns (Config API, evaluation logic)
- Simpler deployment
- Easier code maintenance
- Reduced CloudWatch log groups
- Smaller inline code footprint (12KB total)

**Cons:**

- Slight increase in complexity with dispatcher logic
- All rules share same Lambda timeout/memory settings
- Single point of failure (mitigated by rule independence)
- Function handles multiple rule types

**Deployment Impact:**

- Total Lambda functions: 300 (67% reduction)
- Total CloudWatch log groups: 300
- Single inline code block per deployment
- Simpler stack template

### Option 3: Lambda Layer with Separate Functions

**Pros:**

- Shared code via Lambda layer
- Separate functions maintain independence

**Cons:**

- Lambda layers require S3 (conflicts with ADR-0002)
- Cannot use with inline code approach
- Additional deployment complexity
- Layer versioning management
- Still 900 Lambda functions deployed

## Decision

Combine all three Config rules in a single Lambda function with dispatcher pattern.

## Rationale

1. **Deployment Scale**: Reduces deployed Lambda count from 900 to 300 (67% reduction)
2. **Code Reuse**: Shared Config API logic (list_discovered_resources, batch_get_resource_config)
3. **Inline Code Compatibility**: Single 12KB file fits inline code limits (ADR-0002)
4. **Maintainability**: Common patterns centralized in one place
5. **Deployment Simplicity**: One Lambda function per stack instance
6. **Operational Overhead**: Fewer resources to monitor and manage

## Implementation

### Dispatcher Pattern

```python
def lambda_handler(event, context):
    """Main Lambda handler for Config rule evaluation."""
    check_defined(event, "event")
    invoking_event = json.loads(event["invokingEvent"])
    rule_parameters = json.loads(event["ruleParameters"]) if "ruleParameters" in event else {}

    # Dispatch based on rule prefix
    function_prefix = rule_parameters.get("customFunctionPrefix", "")

    match invoking_event["messageType"]:
        case "ScheduledNotification":
            # Periodic evaluation
            evaluations = [
                build_evaluation(ci, event, rule_parameters)
                for ci in get_configuration_items(rule_parameters["applicableResourceType"])
            ]
        case "ConfigurationItemChangeNotification" | "OversizedConfigurationItemChangeNotification":
            # Resource change evaluation
            configuration_item = get_configuration_item(invoking_event)
            evaluations = [build_evaluation(configuration_item, event, rule_parameters)]

    put_evaluations(event, evaluations)
```

### Evaluation Functions

```python
def build_evaluation(configuration_item, event, rule_parameters):
    """Route to appropriate evaluation function based on prefix."""
    function_prefix = rule_parameters.get("customFunctionPrefix", "")

    if function_prefix == "ebs_gp3":
        return ebs_gp3_evaluate_compliance(configuration_item, rule_parameters)
    elif function_prefix == "ebs_unattached":
        return ebs_unattached_evaluate_compliance(configuration_item, rule_parameters)
    elif function_prefix == "s3_withoutlifecycle":
        return s3_withoutlifecycle_evaluate_compliance(configuration_item, rule_parameters)
    else:
        return build_evaluation_from_config_item(configuration_item, "NOT_APPLICABLE")
```

### Rule Configuration

Each Config rule specifies its evaluator via `customFunctionPrefix` parameter:

```typescript
new config.CustomRule(this, "EbsGp3Rule", {
  configRuleName: "CostOpt-Ebs-Gp3",
  lambdaFunction: configRuleFunction, // Shared function
  inputParameters: {
    customFunctionPrefix: "ebs_gp3", // Routes to ebs_gp3_evaluate_compliance
    applicableResourceType: "AWS::EC2::Volume",
    desiredVolumeType: "gp3",
  },
});
```

### Shared Helper Functions

```python
# Common Config API interactions
def list_discovered_resources(resource_type):
    """List all discovered resources of a given type."""
    # Shared by all evaluators

def batch_get_resource_config(resource_keys):
    """Batch retrieve resource configurations."""
    # Shared by all evaluators

def put_evaluations(event, evaluations):
    """Submit evaluations to Config service."""
    # Shared by all evaluators
```

## Consequences

### Positive

- Deployed Lambda count reduced from 900 to 300
- Shared code patterns eliminate duplication
- Single inline code block (12KB) fits CloudFormation limits
- Simplified stack template
- Easier code maintenance and updates
- Reduced CloudWatch log group count
- Lower operational complexity

### Negative

- Dispatcher adds slight complexity
- All rules share Lambda timeout (60 seconds - adequate for all)
- All rules share Lambda memory (default - adequate for all)
- Single function logs all rule evaluations (mitigated by rule name in logs)

### Neutral

- Lambda cold starts affect all rules equally
- Function handles three distinct rule types
- Error in one evaluator doesn't affect others (isolated logic)

## Performance Considerations

### Lambda Configuration

- Runtime: Python 3.12
- Architecture: ARM64 (Graviton2 - cost optimized)
- Timeout: 60 seconds (sufficient for all rules)
- Memory: Default (128MB - sufficient for Config API calls)

### Execution Patterns

- Periodic evaluation: Every 6 hours per rule
- Change-triggered: On resource configuration changes
- Each invocation handles single rule evaluation

### Cold Start Impact

- Combined function: 12KB code size
- Minimal dependencies (boto3 only)
- Cold start: <1 second
- Negligible impact on Config evaluations

## Code Organization

### File Structure

```
lambda/
  config-rules-combined/
    index.py                  # 12KB combined code
    ├── lambda_handler()      # Main dispatcher
    ├── ebs_gp3_evaluate_compliance()
    ├── ebs_unattached_evaluate_compliance()
    ├── s3_withoutlifecycle_evaluate_compliance()
    └── Shared helper functions
```

### Code Size

- Total: 12KB (well within inline limits)
- Dispatcher logic: Minimal overhead
- Each evaluator: 2-3KB
- Shared helpers: 4-5KB

## Testing Strategy

### Unit Tests

```python
# test/unit/lambda/test_ebs_gp3.py
def test_gp2_volume_non_compliant():
    """Test that gp2 volumes are marked non-compliant."""

# test/unit/lambda/test_ebs_unattached.py
def test_unattached_volume_non_compliant():
    """Test that unattached volumes are marked non-compliant."""

# test/unit/lambda/test_s3_lifecycle.py
def test_bucket_without_lifecycle_non_compliant():
    """Test that buckets without lifecycle are marked non-compliant."""
```

## Related Decisions

- [ADR-0003: Use Inline Lambda Code](0003-use-inline-lambda-code.md)
- [ADR-0006: Enable AWS Config Recorder](0006-enable-aws-config-recorder.md)

## References

- AWS Config Custom Rules: https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_develop-rules.html
- Lambda Best Practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- Config Rule Parameters: https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_develop-rules_nodejs.html#creating-custom-rules-for-runtime
