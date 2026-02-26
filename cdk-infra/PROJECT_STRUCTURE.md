# CDK Cost Optimization Project Structure

## Overview

This CDK project implements an organization-wide AWS Config cost optimization solution using TypeScript for infrastructure and Python for Lambda functions.

## Directory Structure

```
cdk-infra/
├── bin/
│   └── cdk-infra.ts                    # CDK app entry point
│
├── lib/
│   ├── main-stack.ts                   # Delegated admin account stack
│   ├── member-stack.ts                 # Member account stack (via StackSet)
│   └── constructs/
│       ├── org-details.ts              # Custom resource for Org info
│       ├── document-share.ts           # SSM document sharing
│       ├── config-rules.ts             # Config rule constructs
│       └── remediation-documents.ts    # SSM automation docs
│
├── lambda/
│   ├── org-details/
│   │   └── index.py                    # Get org root/management ID
│   ├── document-share/
│   │   └── index.py                    # Share SSM docs to accounts
│   └── config-rules/
│       ├── ebs-gp3/
│       │   └── index.py                # Rule: gp2 → gp3
│       ├── ebs-unattached/
│       │   └── index.py                # Rule: unattached volumes
│       ├── s3-lifecycle/
│       │   └── index.py                # Rule: S3 lifecycle
│       └── shared/
│           └── config_rule_base.py     # Shared evaluation logic
│
├── ssm-documents/
│   └── (SSM automation documents)      # Remediation automation
│
├── test/
│   └── cdk-infra.test.ts               # CDK infrastructure tests
│
├── cdk.json                             # CDK configuration
├── package.json                         # NPM dependencies
└── tsconfig.json                        # TypeScript configuration
```

## Component Descriptions

### Main Stack (`lib/main-stack.ts`)

Deploys to the delegated admin account. Contains:

- Organization details lookup
- SSM Automation Documents
- Document sharing logic
- StackSet controller
- Organization Conformance Pack

### Member Stack (`lib/member-stack.ts`)

Deployed to all member accounts via StackSet. Contains:

- AutomationRole (for SSM remediation)
- Config rule Lambda function
- Three Config rules

### Constructs (`lib/constructs/`)

Reusable CDK components:

- **org-details.ts**: Retrieves organization root and management account IDs
- **document-share.ts**: Shares SSM documents with all org accounts
- **config-rules.ts**: Creates Config custom rules
- **remediation-documents.ts**: Creates SSM automation documents

### Lambda Functions (`lambda/`)

Python 3.12 Lambda functions:

- **org-details**: Custom resource for organization details
- **document-share**: Custom resource for SSM document sharing
- **config-rules**: Config rule evaluators (shared base + specific rules)

### SSM Documents (`ssm-documents/`)

SSM Automation Documents for remediation actions.

## Development Workflow

1. **Build TypeScript**: `npm run build`
2. **Synthesize CloudFormation**: `npm run synth`
3. **Deploy**: `npm run deploy:main`
4. **Test**: `npm test`

## Stack Architecture

```
Management Account
    │
    ├── Delegated Admin Account (CostOptimizationMainStack)
    │   ├── OrgDetails CustomResource
    │   ├── SSM Automation Documents
    │   ├── Document Share CustomResource
    │   ├── StackSet Controller
    │   └── Organization Conformance Pack
    │
    └── Member Accounts (MemberAccountStack via StackSet)
        ├── AutomationRole
        ├── Config Rule Lambda
        └── 3 Config Rules
```

## Next Steps

See TODO comments in each file for implementation details.
