# Project Setup and Configuration Guide

This guide walks you through setting up your development environment and configuring AWS access for deploying the solution.

## Prerequisites

Before starting, ensure you have completed all items in [PREREQUISITES.md](PREREQUISITES.md), including:

- AWS Organizations with Control Tower setup
- Access to management and audit accounts
- Service principals and delegated administrator configured

## Project Structure Overview

This project uses AWS CDK (TypeScript) for infrastructure and Python for Lambda functions:

```
cdk-infra/
├── bin/cdk-infra.ts          # CDK app entry point
├── lib/
│   ├── main-stack.ts         # Deployed to audit account
│   ├── member-stack.ts       # Deployed to member accounts via StackSet
│   └── constructs/           # Reusable CDK components
├── lambda/                   # Python Lambda functions
│   ├── config-rules-combined/  # Combined config rule evaluators
│   ├── org-details/          # Organization details lookup
│   └── document-share/       # SSM document sharing
├── ssm-documents/            # SSM automation documents for remediation
└── test/                     # Test files

docs/
├── deployment/               # Deployment guides (you are here)
└── architecture_decision_record/  # ADRs documenting design decisions
```

For detailed structure information, see [cdk-infra/PROJECT_STRUCTURE.md](../../cdk-infra/PROJECT_STRUCTURE.md).

## Installation Steps

### 1. Install Node.js and npm

Ensure you have Node.js 20+ installed:

```bash
node --version
npm --version
```

If not installed, download from [nodejs.org](https://nodejs.org/).

### 2. Install AWS CDK CLI Globally

Install the AWS CDK command-line tool globally:

```bash
npm install -g aws-cdk
```

Verify installation:

```bash
cdk --version
```

### 3. Install Project Dependencies

Navigate to the CDK infrastructure directory and install dependencies:

```bash
cd cdk-infra
npm install
```

This installs all TypeScript dependencies defined in [package.json](../../cdk-infra/package.json).

### 4. Install Python Dependencies (for Lambda development)

If you plan to develop or test Lambda functions locally:

```bash
# Install Python 3.12+ if not already installed
python --version

# Install test dependencies
pip install -r test/requirements.txt
```

## AWS Authentication Setup

### Configure AWS SSO

Set up AWS Single Sign-On for accessing your audit account:

```bash
aws configure sso
```

You'll be prompted for:

- **SSO session name**: `audit`
- **SSO start URL**: Your AWS SSO portal URL (e.g., `https://d-xxxxxxxxxx.awsapps.com/start`)
- **SSO region**: The region where AWS SSO is configured (e.g., `us-east-1`)
- **SSO registration scopes**: Press Enter to accept default (`sso:account:access`)

Then select:

- Your **audit account** from the list
- The **AdministratorAccess** role (or appropriate admin role)
- **Default region**: `us-east-1` (or your preferred region)
- **Default output format**: `json`
- **Profile name**: `audit`

This creates a profile named `audit` that you'll use for deployments.

### Login to AWS SSO

Before each deployment session, authenticate:

```bash
aws sso login --profile audit
```

This opens your browser for authentication. Once complete, your terminal session will have valid credentials.

**Note:** SSO sessions expire periodically. If you see authentication errors, re-run `aws sso login --profile audit`.

### Verify Authentication

Confirm you can access the audit account:

```bash
aws sts get-caller-identity --profile audit
```

**Expected output:** Account ID and ARN for your audit account.

## CDK Bootstrap

Bootstrap prepares your AWS account for CDK deployments by creating necessary resources (S3 buckets, IAM roles, etc.).

### Bootstrap the Audit Account

Run this command once per account/region combination:

```bash
cd cdk-infra
cdk bootstrap --profile audit
```

### Bootstrap Additional Regions

If deploying to multiple regions:

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION --profile audit
```

**Note:** This solution primarily deploys to `us-east-1` by default. Check [cdk-infra/bin/cdk-infra.ts](../../cdk-infra/bin/cdk-infra.ts) for region configuration.

## Building and Testing

### Build TypeScript Code

Compile TypeScript to JavaScript:

```bash
npm run build
```

Run in watch mode during development:

```bash
npm run watch
```

### Run Tests

Execute TypeScript (CDK) tests:

```bash
npm test
```

Execute Python (Lambda) tests:

```bash
npm run test:python
```

Run all tests with coverage:

```bash
npm run test:coverage
npm run test:python:coverage
```

### Synthesize CloudFormation Templates

Generate CloudFormation templates without deploying:

```bash
npm run synth
```

Templates are output to `cdk.out/` directory. Review these to understand what will be deployed.

## Key Configuration Files

### CDK Configuration ([cdk.json](../../cdk-infra/cdk.json))

Contains CDK toolkit configuration, context values, and feature flags. Key settings:

- `app`: Entry point for CDK application
- `context`: Environment-specific values
- Feature flags for CDK behavior

### Package Configuration ([package.json](../../cdk-infra/package.json))

Defines npm scripts for common operations:

- `npm run build` - Compile TypeScript
- `npm run deploy` - Build and deploy main stack
- `npm run deploy:all` - Deploy all stacks
- `npm run diff` - Show deployment changes
- `npm run destroy` - Remove all stacks

### TypeScript Configuration ([tsconfig.json](../../cdk-infra/tsconfig.json))

Configures TypeScript compiler options for the project.

## Environment Variables

Create a `.env` file in the `cdk-infra/` directory if you need to override defaults:

```bash
# Example .env file
CDK_DEPLOY_ACCOUNT=123456789012
CDK_DEPLOY_REGION=eu-west-1
AWS_PROFILE=audit
STACKSET_TARGET_REGIONS=us-east-1,eu-west-1,eu-central-1
STACKSET_TARGET_OU=r-xxxx
```

**Note:** These are typically not required as the solution auto-discovers organization details.

## Next Steps

1. **Verify Prerequisites**: Ensure all steps in [PREREQUISITES.md](PREREQUISITES.md) are complete
2. **Review Architecture**: Read [PROJECT_STRUCTURE.md](../../cdk-infra/PROJECT_STRUCTURE.md) to understand components
3. **Deploy Solution**: Follow [DEPLOYMENT.md](../../cdk-infra/DEPLOYMENT.md) for deployment instructions
4. **Test Solution**: See [TESTING.md](../../cdk-infra/TESTING.md) for validation steps

## Troubleshooting

### "Unable to resolve AWS account to use"

**Cause:** CDK can't determine which AWS account to use.

**Solution:** Ensure you've run `aws sso login --profile audit` and the profile is specified in commands or environment variables.

### "Template validation error: Template format error"

**Cause:** TypeScript compilation errors or invalid CDK constructs.

**Solution:** Run `npm run build` and fix any compilation errors.

### "Policy length exceeded"

**Cause:** IAM policies in member stack exceed size limits.

**Solution:** Review inline policies and consider using managed policies. See ADR [0007-combine-config-rules-in-single-lambda.md](../architecture_decision_record/0007-combine-config-rules-in-single-lambda.md).

### SSO Session Expired

**Cause:** AWS SSO credentials have expired.

**Solution:** Run `aws sso login --profile audit` to refresh credentials.

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [AWS Config Developer Guide](https://docs.aws.amazon.com/config/latest/developerguide/)
- [AWS SSO CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [CloudFormation StackSets](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/what-is-cfnstacksets.html)
