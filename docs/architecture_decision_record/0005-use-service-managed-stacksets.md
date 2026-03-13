# ADR-0005: Use SERVICE_MANAGED StackSets with OU Targeting

## Status

Accepted

## Context

The cost optimization solution must deploy AWS Config rules and supporting infrastructure to all member accounts in the AWS Organization. CloudFormation StackSets provide two permission models: SELF_MANAGED and SERVICE_MANAGED. Additionally, StackSets support targeting by specific account IDs or by Organizational Unit (OU) IDs.

Initial implementation attempted to use SERVICE_MANAGED with individual account targeting for testing purposes. This resulted in deployment error: "Invalid request provided: OrganizationalUnitIds should be specified in DeploymentTargets in [SERVICE_MANAGED] model".

## Decision Drivers

- Need organization-wide deployment capability
- Desire to test on subset of accounts before full rollout
- AWS Organizations integration required
- Automatic deployment to new accounts desired
- Delegated administrator account (886436962263) must perform deployment
- Simplified permission management preferred

## Considered Options

### Option 1: Use SELF_MANAGED StackSets

**Pros:**

- Can target specific account IDs
- More granular control over target accounts
- Does not require Organizations integration

**Cons:**

- Requires IAM roles in every target account
- Manual role setup in each account (AWSCloudFormationStackSetExecutionRole)
- No automatic deployment to new accounts
- More complex permission management
- Higher operational overhead

### Option 2: Use SERVICE_MANAGED with Individual Account Targeting

**Pros:**

- Theoretically allows specific account testing
- AWS Organizations integration

**Cons:**

- NOT SUPPORTED by AWS
- Deployment fails with error: "OrganizationalUnitIds should be specified in DeploymentTargets in [SERVICE_MANAGED] model"
- AWS requires OU-based targeting for SERVICE_MANAGED model

### Option 3: Use SERVICE_MANAGED with OU Targeting

**Pros:**

- Native AWS Organizations integration
- Automatic IAM role management by AWS
- No manual role creation needed
- Supports automatic deployment to new accounts joining OU
- Delegated administrator support
- Simplified permission model
- Can target specific OUs for testing

**Cons:**

- Cannot target individual accounts
- Must organize accounts into OUs for granular targeting
- Requires creating/using appropriate OU structure for testing

## Decision

Use SERVICE_MANAGED StackSets with Organizational Unit (OU) targeting via `organizationalUnitIds`.

## Rationale

1. **AWS Requirement**: SERVICE_MANAGED model explicitly requires OU-based targeting
2. **Automatic Permissions**: AWS automatically manages IAM roles in member accounts
3. **Delegated Admin Support**: Works with delegated administrator account (audit account 886436962263)
4. **Auto-Deployment**: New accounts added to target OU automatically receive deployment
5. **Simplified Management**: No manual IAM role creation across 100+ accounts
6. **Testing Capability**: Can target small test OU before organization-wide deployment

## Implementation Strategy

### StackSet Configuration

```typescript
const stackSet = new cfn.CfnStackSet(this, "StackSet", {
  stackSetName: `${this.stackName}-StackSet`,
  permissionModel: "SERVICE_MANAGED",
  autoDeployment: {
    enabled: true,
    retainStacksOnAccountRemoval: false,
  },
  callAs: "DELEGATED_ADMIN",
  stackInstancesGroup: [
    {
      deploymentTargets: {
        organizationalUnitIds: [
          process.env.STACKSET_TARGET_OU || orgDetails.rootId,
        ],
      },
      regions: process.env.STACKSET_TARGET_REGIONS?.split(",") || [this.region],
    },
  ],
  // ...
});
```

### Environment Configuration

```bash
# For testing: Target specific OU with limited accounts
STACKSET_TARGET_OU=ou-fbmz-tgm8qovf  # Test OU with 1 account

# For production: Target organization root
STACKSET_TARGET_OU=r-fbmz  # Deploys to all accounts
```

### Testing Workflow

1. **Create or Identify Test OU**: Use existing OU with single account (ou-fbmz-tgm8qovf)
2. **Deploy to Test OU**: Set STACKSET_TARGET_OU to test OU ID
3. **Validate Deployment**: Verify Config rules, Lambda, and S3 bucket in test account
4. **Production Deployment**: Update STACKSET_TARGET_OU to root OU (r-fbmz)

## Consequences

### Positive

- Deployment successful across organization
- No manual IAM role management
- Automatic deployment to new accounts in target OU
- Simplified permission model
- Delegated administrator support working correctly
- Parallel deployment across regions

### Negative

- Cannot target individual accounts directly
- Must use OU structure for targeting
- Testing requires appropriate OU organization
- All accounts in OU receive deployment (cannot exclude specific accounts)

### Neutral

- Requires setting STACKSET_TARGET_OU environment variable
- OU ID format validation needed: `^(r-[a-z0-9]{4}|ou-[a-z0-9]{4,32}-[a-z0-9]{8,32})$`

## Operational Considerations

### Multi-Region Deployment

```typescript
regions: process.env.STACKSET_TARGET_REGIONS?.split(",") || [this.region];
// Deploys to: us-east-1, eu-west-1, eu-central-1
```

### Operation Preferences

```typescript
operationPreferences: {
  maxConcurrentPercentage: 100,    // Fast deployment
  failureTolerancePercentage: 100,  // Continue despite failures
  regionConcurrencyType: "PARALLEL", // Deploy to all regions simultaneously
}
```

### Auto-Deployment Settings

```typescript
autoDeployment: {
  enabled: true,                       // Auto-deploy to new accounts
  retainStacksOnAccountRemoval: false, // Clean up when accounts removed
}
```

## Error Resolution

**Original Error:**

```
Invalid request provided: OrganizationalUnitIds should be specified
in DeploymentTargets in [SERVICE_MANAGED] model
```

**Root Cause:** Attempted to use `accounts` field instead of `organizationalUnitIds` in SERVICE_MANAGED StackSet.

**Resolution:** Changed deployment targets from account-based to OU-based targeting.

## Related Decisions

- [ADR-0002: Use AWS CDK with TypeScript](0002-use-cdk-typescript-over-cloudformation.md)
- [ADR-0004: Use BootstraplessSynthesizer](0004-use-bootstrapless-synthesizer.md)
- [ADR-0006: Enable AWS Config Recorder in Member Accounts](0006-enable-aws-config-recorder.md)

## References

- AWS StackSets Permission Models: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-concepts.html#stacksets-concepts-accts
- SERVICE_MANAGED StackSets: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-manage-auto-deployment.html
- AWS Organizations Integration: https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-cloudformation.html
- Delegated Administrator: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-delegated-admin.html
