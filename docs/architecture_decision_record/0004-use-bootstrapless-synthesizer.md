# ADR-0004: Use BootstraplessSynthesizer for Member Stack Synthesis

## Status

Accepted

## Context

AWS CDK typically requires bootstrap resources (S3 bucket, SSM parameters, IAM roles) in target accounts for asset deployment. The cost optimization solution needs to deploy member stacks via CloudFormation StackSets to 100+ AWS Organization accounts that do not have CDK bootstrap resources.

The member stack template must be synthesized and provided as a CloudFormation template to the StackSet resource. Without proper synthesizer configuration, CDK generates templates that reference bootstrap resources that don't exist in member accounts.

## Decision Drivers

- Member accounts do not have CDK bootstrap resources
- Cannot assume bootstrap resources will be available
- Need pure CloudFormation template without CDK dependencies
- StackSet requires CloudFormation template as input
- Must avoid bootstrap-related deployment failures

## Considered Options

### Option 1: Use Default CDK Synthesizer

**Pros:**

- Standard CDK behavior
- Supports file assets and Docker images
- Well-documented and widely used

**Cons:**

- Requires CDK bootstrap in all target accounts
- References bootstrap resources (/cdk-bootstrap/hnb659fds/version)
- Would fail deployment to unbootstrapped accounts
- Adds operational complexity

### Option 2: Use BootstraplessSynthesizer

**Pros:**

- Generates pure CloudFormation without bootstrap dependencies
- Works in accounts without CDK bootstrap
- Clean template output
- Specifically designed for this use case
- No additional infrastructure required

**Cons:**

- Cannot use file assets (must use inline code or other methods)
- Cannot use Docker image assets
- Less feature-rich than default synthesizer
- Requires alternative asset deployment strategies

### Option 3: Use LegacyStackSynthesizer

**Pros:**

- Simpler than modern synthesizer
- Fewer dependencies

**Cons:**

- Deprecated approach
- Still requires some bootstrap resources
- Not recommended for new projects

## Decision

Use `BootstraplessSynthesizer` for member stack synthesis.

## Rationale

1. **No Bootstrap Requirement**: Member accounts do not need CDK bootstrap resources
2. **Pure CloudFormation**: Generated template is pure CloudFormation without CDK-specific references
3. **StackSet Compatibility**: Template can be directly provided to StackSet resource
4. **Designed for Purpose**: BootstraplessSynthesizer explicitly designed for deploying to accounts without bootstrap
5. **Works with Inline Lambda**: Complements ADR-0002 decision to use inline Lambda code

## Consequences

### Positive

- Successful deployment to unbootstrapped member accounts
- No bootstrap maintenance overhead
- Pure CloudFormation template output
- StackSet deployment works immediately
- No cross-account bootstrap resource dependencies

### Negative

- Cannot use CDK file assets (must use inline code)
- Cannot use Docker image assets
- Limited to CloudFormation-native resource types
- Must find alternative solutions for asset deployment

### Neutral

- Forces use of inline Lambda code (already decided in ADR-0002)
- Template synthesis slightly different from standard CDK
- Must be explicit about synthesizer choice

## Implementation

### Main Stack (Delegated Admin Account)

```typescript
// Uses default synthesizer (has CDK bootstrap)
export class CostOptimizationMainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // ... main stack resources
  }
}
```

### Member Stack (Target Accounts via StackSet)

```typescript
// Uses BootstraplessSynthesizer
const memberStackStage = new cdk.Stage(this, "MemberStackStage");
const memberStack = new MemberAccountStack(
  memberStackStage,
  "MemberAccountStack",
  {
    synthesizer: new cdk.BootstraplessSynthesizer(),
    env: {
      account: this.account,
      region: this.region,
    },
  },
);

// Synthesize to get CloudFormation template
const assembly = memberStackStage.synth();
const memberTemplate = assembly.getStackByName(memberStack.stackName).template;

// Use template in StackSet
const stackSet = new cfn.CfnStackSet(this, "StackSet", {
  templateBody: JSON.stringify(memberTemplate),
  // ... other StackSet properties
});
```

## Validation

- Member stack template contains no bootstrap references
- Template validated as pure CloudFormation
- StackSet deployment successful to 100+ accounts
- No bootstrap-related errors in member accounts
- Template can be deployed independently without CDK

## Alternatives Considered for Asset Deployment

Given BootstraplessSynthesizer limitations on assets:

1. **Inline Lambda Code**: Chosen approach (ADR-0002)
2. **External S3 with Parameters**: Rejected due to parameter complexity (ADR-0002)
3. **Lambda Layers**: Not needed for small code size
4. **CloudFormation Custom Resources**: Used for org details and document sharing

## Related Decisions

- [ADR-0002: Use AWS CDK with TypeScript](0002-use-cdk-typescript-over-cloudformation.md)
- [ADR-0003: Use Inline Lambda Code](0003-use-inline-lambda-code.md)
- [ADR-0005: Use SERVICE_MANAGED StackSets with OU Targeting](0005-use-service-managed-stacksets.md)

## References

- AWS CDK BootstraplessSynthesizer: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BootstraplessSynthesizer.html
- CDK Bootstrap Documentation: https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html
- CloudFormation StackSets: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/what-is-cfnstacksets.html
