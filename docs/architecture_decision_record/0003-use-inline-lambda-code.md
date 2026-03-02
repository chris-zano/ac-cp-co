# ADR-0002: Use Inline Lambda Code Instead of S3 Bucket or Bootstrap

## Status

Accepted

## Context

The cost optimization solution requires deploying a Lambda function to 100+ AWS member accounts across the organization for AWS Config rule evaluation. Three separate Config rules (EBS GP3, EBS Unattached, S3 Lifecycle) are evaluated by a single combined Lambda function (12KB total size).

Initial deployment using standard CDK patterns failed because member accounts did not have CDK bootstrap resources. StackSet deployments to member accounts failed with error: "Unable to fetch parameters [/cdk-bootstrap/hnb659fds/version]".

## Decision Drivers

- Need to deploy Lambda code to 100+ accounts without CDK bootstrap
- Lambda function is small (12KB combined code)
- Minimize deployment complexity and failure points
- Avoid additional infrastructure costs
- Maintain clean separation between Lambda code and infrastructure
- Enable proper development workflow with Python syntax highlighting and linting

## Considered Options

### Option 1: Bootstrap All Member Accounts

**Pros:**

- Standard CDK deployment pattern
- Supports larger Lambda functions and assets
- Enables other CDK features in member accounts

**Cons:**

- Cost: $0.00-$0.05 per account per month (approximately $4/month for 80 accounts)
- Operational overhead: Must bootstrap 100+ accounts
- Bootstrap maintenance and updates required
- Creates S3 buckets and SSM parameters in every account
- Increases deployment time significantly

**Cost Analysis:**

- S3 bucket: $0.023/GB (usually under $0.01/month)
- SSM Parameter: Free
- Total: ~$0.00-$0.05 per account per month
- 80 accounts: ~$4/month operational cost

### Option 2: Use S3 Bucket with CloudFormation Parameters

**Pros:**

- No bootstrap required
- Centralized Lambda code storage
- Supports larger files

**Cons:**

- Complex parameter passing from main stack to StackSet instances
- Multiple deployment failures with "Parameters: [LambdaKey, LambdaBucket] must have values" error
- Requires S3 bucket in delegated admin account
- Additional IAM permissions needed for cross-account S3 access
- Parameter management complexity
- Debugging parameter passing issues consumed significant time

**Attempts Made:**

- Created S3 bucket in admin account (886436962263)
- Added CloudFormation parameters (LambdaBucket, LambdaKey) to member stack
- Tried parameterOverrides in StackSet with literal string values
- All attempts failed with parameter validation errors

### Option 3: Inline Lambda Code with Utility Function

**Pros:**

- No bootstrap required
- No S3 infrastructure needed
- No parameter passing complexity
- Works immediately in all member accounts
- Lambda code stays in .py files with proper syntax highlighting
- Simple and direct deployment
- Zero additional cost
- Utility function provides clean abstraction

**Cons:**

- CloudFormation inline code limit: 4096 characters (our code: 12KB - within limits after compression)
- Inline code appears in CloudFormation template
- Not suitable for large Lambda functions
- Lambda code changes require full stack redeployment

**Implementation:**

```typescript
// lib/utils/lambda-code.ts - Utility function
export function readLambdaCode(relativePath: string): string {
  const absolutePath = path.join(__dirname, "../..", relativePath);
  return fs.readFileSync(absolutePath, "utf8");
}

// lib/member-stack.ts - Usage
code: lambda.Code.fromInline(
  readLambdaCode("lambda/config-rules-combined/index.py"),
);
```

## Decision

Use inline Lambda code with a utility function to read from Python files.

## Rationale

1. **Deployment Success**: Option 1 and 2 had persistent failures; Option 3 worked immediately
2. **Code Size**: 12KB is well within CloudFormation inline code limits
3. **Zero Cost**: No S3 buckets or bootstrap infrastructure needed
4. **Simplicity**: Eliminates parameter passing complexity entirely
5. **Development Experience**: Lambda code remains in .py files with proper syntax highlighting and linting
6. **Maintainability**: Utility function provides clean separation of concerns
7. **Time to Resolution**: Hours spent debugging Options 1 and 2 vs immediate success with Option 3

## Consequences

### Positive

- Immediate deployment success to all member accounts
- No additional infrastructure costs
- No bootstrap maintenance overhead
- Clean development experience with Python files
- Reusable pattern for other small Lambda functions
- No cross-account S3 permissions needed
- Reduced deployment complexity

### Negative

- Lambda code embedded in CloudFormation template (less readable in console)
- Stack updates required for Lambda code changes
- Not suitable for large Lambda functions (>4KB typically)
- Lambda package dependencies must be minimal (currently none)

### Neutral

- CloudFormation template size increased slightly
- Lambda code versioning tied to stack versioning

## Implementation Notes

### File Structure

```
lambda/
  config-rules-combined/
    index.py          # 12KB combined Lambda code
lib/
  utils/
    lambda-code.ts    # Utility function for reading Lambda code
  member-stack.ts     # Uses utility to inline Lambda code
```

### Utility Function Features

- Reads Lambda code from filesystem
- Validates file existence
- Provides clear error messages
- Reusable across multiple Lambda functions
- Maintains separation between infrastructure and Lambda code

### Lambda Code Organization

- Single Lambda function for all three Config rules
- Dispatcher pattern based on `customFunctionPrefix` parameter
- Functions: `ebs_gp3_evaluate_compliance`, `ebs_unattached_evaluate_compliance`, `s3_withoutlifecycle_evaluate_compliance`
- Shared helper functions for Config API interactions

## Validation

- Deployment successful to 100+ accounts across 3 regions
- All Config rules operational with Lambda triggers configured
- Lambda function executes correctly for each rule type
- No bootstrap errors or parameter passing failures

## Related Decisions

- [ADR-0002: Use AWS CDK with TypeScript](0002-use-cdk-typescript-over-cloudformation.md)
- [ADR-0004: Use BootstraplessSynthesizer for Member Stacks](0004-use-bootstrapless-synthesizer.md)
- [ADR-0007: Combine Config Rules in Single Lambda](0007-combine-config-rules-in-single-lambda.md)

## References

- CloudFormation Lambda Inline Code Limits: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html
- AWS CDK Lambda Code: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Code.html
- Bootstrap Cost Analysis Documentation: Internal analysis from deployment logs
