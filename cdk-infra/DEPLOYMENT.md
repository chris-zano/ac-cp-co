# CDK Deployment Guide

## Prerequisites

1. **AWS Organizations Setup**
   - AWS Control Tower deployed
   - Delegated admin account registered for:
     - `config.amazonaws.com`
     - `config-multiaccountsetup.amazonaws.com`
     - `member.org.stacksets.cloudformation.amazonaws.com`

2. **AWS Config**
   - Enabled and recording in all accounts
   - Organization aggregator configured

3. **AWS CLI Profile**
   - Configure profile for delegated admin account:
     ```bash
     aws configure --profile audit
     ```

## Configuration

1. **Copy environment template:**

   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file:**
   ```bash
   CDK_DEPLOY_ACCOUNT=886436962263  # Your delegated admin account ID
   CDK_DEPLOY_REGION=eu-west-1      # Your deployment region
   AWS_PROFILE=audit                # Your AWS profile name
   ```

## Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Synthesize CloudFormation Template

```bash
npm run synth
```

### 4. Deploy Main Stack

```bash
# Using environment variables from .env
npm run deploy:main

# Or specify directly
CDK_DEPLOY_ACCOUNT=886436962263 CDK_DEPLOY_REGION=eu-west-1 AWS_PROFILE=audit cdk deploy CostOptimizationMainStack

# Or if using PowerShell
$env:CDK_DEPLOY_ACCOUNT="886436962263"; $env:CDK_DEPLOY_REGION="eu-west-1"; $env:AWS_PROFILE="audit"; cdk deploy CostOptimizationMainStack
```

## What Gets Deployed

### Main Stack (Delegated Admin Account)

- **OrgDetails**: Custom resource to get organization root and management account ID
- **RemediationDocuments**: SSM Automation documents for remediation
- **DocumentShare**: Custom resource to share SSM docs with all org accounts
- **StackSet**: Deploys member stack to all organization accounts
- **ConformancePack**: Organization-wide conformance pack

### Member Stack (All Accounts via StackSet)

- **AutomationRole**: IAM role for SSM remediation
- **ConfigRuleFunction**: Lambda function with all rule evaluators
- **Config Rules**:
  - `CostOpt-Ebs-Gp3`: Checks EBS volumes use gp3 instead of gp2
  - `CostOpt-Ebs-Unattached`: Checks EBS volumes are attached
  - `CostOpt-S3-WithoutLifecycle`: Checks S3 buckets have lifecycle policies

## Verification

Check deployment status:

```bash
# List stacks
aws cloudformation list-stacks --profile audit --region eu-west-1

# Check StackSet instances
aws cloudformation list-stack-instances \
  --stack-set-name CostOptimizationMainStack-StackSet \
  --profile audit --region eu-west-1

# View Config rules in a member account
aws configservice describe-config-rules \
  --profile member-account --region eu-west-1
```

## Cleanup

To remove the deployment:

```bash
npm run destroy

# Or
cdk destroy --all --profile audit
```

**Note**: StackSet instances may need to be deleted manually before destroying the main stack.
