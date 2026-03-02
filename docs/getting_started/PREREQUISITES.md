# Prerequisites

Before deploying the Cost Optimization Conformance Pack solution, ensure you have the following prerequisites in place. Each requirement is essential for the successful deployment and operation of this multi-account solution.

## 1. AWS Organizations with AWS Control Tower

**Required:** An active AWS Organization utilizing AWS Control Tower.

**Why this is important:**

- AWS Organizations provides the foundational multi-account structure required for this solution to operate across your entire organization
- Control Tower establishes the governance framework and automated account provisioning that ensures consistent security and compliance controls
- The solution relies on AWS Organizations' hierarchical structure to deploy conformance packs and resources across all member accounts simultaneously
- Control Tower's audit account serves as the delegated administrator, providing centralized visibility and management

## 2. Account Access Permissions

**Required:** Administrative permissions to access both:

- Your organization's **management account** (also known as the master account)
- The **audit account** where delegated administrative rights will be granted

**Why this is important:**

- The management account is required to establish trust relationships between AWS Organizations and service principals (AWS Config and CloudFormation StackSets)
- Only the management account can register delegated administrators for AWS services
- The audit account will serve as the delegated administrator, requiring proper permissions to deploy and manage the conformance pack solution
- Without access to both accounts, you cannot complete the initial setup steps that enable cross-account resource deployment

**Setup Commands:**

From the management account, establish trust relationships with the required service principals:

```bash
# Enable AWS Config multi-account setup
aws organizations enable-aws-service-access --service-principal=config-multiaccountsetup.amazonaws.com

# Enable CloudFormation StackSets
aws organizations enable-aws-service-access --service-principal=member.org.stacksets.cloudformation.amazonaws.com
```

Validate the trust relationships:

```bash
aws organizations list-aws-service-access-for-organization
```

Register the audit account as a delegated administrator (replace `222222222222` with your audit account ID):

```bash
# Register for AWS Config multi-account setup
aws organizations register-delegated-administrator --account-id 222222222222 --service-principal config-multiaccountsetup.amazonaws.com

# Register for AWS Config
aws organizations register-delegated-administrator --account-id 222222222222 --service-principal config.amazonaws.com

# Register for CloudFormation StackSets
aws organizations register-delegated-administrator --service-principal=member.org.stacksets.cloudformation.amazonaws.com --account-id=222222222222
```

Validate the delegated administrator registrations:

```bash
aws organizations list-delegated-administrators --service-principal=config.amazonaws.com
aws organizations list-delegated-administrators --service-principal=config-multiaccountsetup.amazonaws.com
aws organizations list-delegated-administrators --service-principal=member.org.stacksets.cloudformation.amazonaws.com
```

## 3. Trusted Access for StackSets

**Required:** Trusted access enabled for AWS CloudFormation StackSets with AWS Organizations.

**Why this is important:**

- StackSets deploy Lambda functions, IAM roles, and other resources across all member accounts in your organization
- Trusted access allows StackSets to perform automatic deployments to accounts as they are added to the organization
- This integration enables centralized management and ensures consistent resource deployment across your entire AWS environment
- Without trusted access, you would need to manually deploy resources to each account individually, which is error-prone and difficult to maintain

**Note:** Trusted access for StackSets is enabled by the command in section 2 above:

```bash
aws organizations enable-aws-service-access --service-principal=member.org.stacksets.cloudformation.amazonaws.com
```

## 4. AWS Config Console Access

**Required:** AWS Console access to AWS Config in the member accounts where the solution will be deployed.

**Why this is important:**

- You need to view compliance results and conformance pack status in member accounts to validate the solution is working correctly
- AWS Config console access allows you to trigger manual re-evaluations of resources when testing the solution
- This access enables you to review resource compliance details and troubleshoot any issues that may arise
- Member account visibility is essential for monitoring and managing the cost optimization posture of individual accounts

## Validation Checklist

Before proceeding with deployment, verify that:

- [ ] AWS Organizations is active and Control Tower is deployed
- [ ] You have administrative credentials for both the management and audit accounts
- [ ] Service access is enabled for AWS Config and CloudFormation StackSets
- [ ] Delegated administrator is registered for the audit account
- [ ] Your organization has at least one additional member account for testing
- [ ] You have familiarity with AWS CLI, AWS SSO, AWS SDK (for Typescript) and AWS Config RDK

## Next Steps

Once all prerequisites are met, proceed to the deployment guide to:

1. Establish trust relationships between AWS Organizations and service principals
2. Register the audit account as a delegated administrator
3. Deploy the Cost Optimization Conformance Pack solution
