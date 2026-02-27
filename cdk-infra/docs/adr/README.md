# Architectural Decision Records (ADRs)

This directory contains Architecture Decision Records for the AWS Config Cost Optimization solution. ADRs document significant architectural and design decisions made during the project.

## Format

We use the Lightweight ADR (LADR) format as defined by Michael Nygard. This simple format includes Status, Context, Decision, and Consequences sections, providing just enough structure to capture decision rationale without bureaucratic overhead.

## Quick Reference

| ADR                                                    | Title                                                      | Status   | Date       |
| ------------------------------------------------------ | ---------------------------------------------------------- | -------- | ---------- |
| [0001](0001-use-lightweight-adr-for-decisions.md)      | Use Lightweight ADR for Recording Architectural Decisions  | Accepted | 2026-02-27 |
| [0002](0002-use-cdk-typescript-over-cloudformation.md) | Use AWS CDK with TypeScript Instead of CloudFormation YAML | Accepted | 2026-02-27 |
| [0003](0003-use-inline-lambda-code.md)                 | Use Inline Lambda Code Instead of S3/Bootstrap             | Accepted | 2026-02-27 |
| [0004](0004-use-bootstrapless-synthesizer.md)          | Use BootstraplessSynthesizer for Member Stacks             | Accepted | 2026-02-27 |
| [0005](0005-use-service-managed-stacksets.md)          | Use SERVICE_MANAGED StackSets with OU Targeting            | Accepted | 2026-02-27 |
| [0006](0006-enable-aws-config-recorder.md)             | Enable AWS Config Recorder in Member Accounts              | Accepted | 2026-02-27 |
| [0007](0007-combine-config-rules-in-single-lambda.md)  | Combine Three Config Rules in Single Lambda                | Accepted | 2026-02-27 |
| [0008](0008-s3-lifecycle-policies.md)                  | Implement S3 Lifecycle Policies for Config Data            | Accepted | 2026-02-27 |

## Decision Categories

### Meta Decisions

- **ADR-0001**: Documentation approach (ADRs)

### Infrastructure Architecture

- **ADR-0002**: Technology stack (CDK vs CloudFormation)
- **ADR-0004**: CDK synthesizer choice
- **ADR-0005**: StackSet permission model and targeting

### Deployment Strategy

- **ADR-0003**: Lambda code deployment method
- **ADR-0007**: Lambda function consolidation

### AWS Services Configuration

- **ADR-0006**: AWS Config service enablement
- **ADR-0008**: S3 storage optimization

## Key Decision Drivers

Throughout the project, the following factors influenced architectural decisions:

1. **Scale**: Deployment to 100+ AWS accounts across 3 regions
2. **Cost Optimization**: Minimizing infrastructure and operational costs
3. **Operational Simplicity**: Reducing manual intervention and maintenance
4. **Deployment Success**: Ensuring reliable deployment without bootstrap requirements
5. **Compliance**: Meeting audit and regulatory requirements

## Decision Flow

```
ADR-0001: Use Lightweight ADR (documentation approach)
    ↓
ADR-0002: Choose CDK TypeScript
    ↓
ADR-0004: Use BootstraplessSynthesizer (no bootstrap in member accounts)
    ↓
ADR-0003: Use inline Lambda code (works without bootstrap)
    ↓
ADR-0007: Combine Lambda functions (reduce deployment count)
    ↓
ADR-0005: Use SERVICE_MANAGED StackSets (AWS requirement)
    ↓
ADR-0006: Enable Config Recorder (required for rules to work)
    ↓
ADR-0008: Add S3 lifecycle policies (optimize costs)
```

## Critical Decision Points3, ADR-0004)

**Challenge**: Member accounts lacked CDK bootstrap resources
**Options Evaluated**: Bootstrap all accounts, Use S3 with parameters, Inline Lambda code
**Resolution**: Inline Lambda code with BootstraplessSynthesizer
**Impact**: Enabled successful deployment without bootstrap overhead

### Config Not Enabled (ADR-0006)

**Challenge**: Config rules deployed but not executing
**Root Cause**: AWS Config service not enabled in member accounts
**Resolution**: Include Config Recorder and Delivery Channel in member stack
**Impact**: Config rules now functional across all accounts

### StackSet Targeting Error (ADR-0005l across all accounts

### StackSet Targeting Error (ADR-0004)

**Challenge**: "OrganizationalUnitIds should be specified in DeploymentTargets"
**Root Cause**: SERVICE_MANAGED requires OU targeting, not account-based
**Resolution**: Changed to organizationalUnitIds targeting
**Impact**: Successful organization-wide deployment

## Cost Impact Summary

| Decision                | Monthly Cost Impact   | Accounts | Total        |
| ----------------------- | --------------------- | -------- | ------------ |
| CDK Bootstrap (avoided) | -$0.03/account        | 100      | -$3.00       |
| Config Recorder         | +$2.00/account/region | 300      | +$600        |
| S3 Standard Storage     | +$2.30/bucket         | 300      | +$690        |
| S3 Lifecycle (savings)  | -$1.02/bucket         | 300      | -$306        |
| **Net Monthly Cost**    |                       |          | **~$981**    |
| **Annual Cost**         |                       |          | **~$11,772** |

Cost justified by automated compliance monitoring and resource optimization across organization.

## Template ADR Structure

When adding new ADRs, use the Lightweight ADR format:

```markdown
# Title

## Status

What is the status, such as proposed, accepted, rejected, deprecated, superseded, etc.?

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?
```

## Contributing

When making significant architectural decisions:

1. Create a new ADR with the next sequential number
2. Use MADR format for structured decision documentation
3. Document all considered options with pros/cons
4. Include cost analysis where applicable
5. Link related ADRs
6. Update this README with the new ADR

## Review Process

ADRs should be:

- Reviewed by senior solution architects
- Validated against organizational standards
- Updated when superseded by new decisions
- Referenced in implementation code comments

## Status Definitions

- **Proposed**: Decision under consideration
- **Accepted**: Decision approved and implemented
- **Deprecated**: Decision no longer preferred but still in use
- **Superseded**: Decision replaced by newer ADR (link to replacement)

## Contact

For questions about architectural decisions:

- Review existing ADRs for rationale
- Consult project documentation in `/docs`
- Contact project maintainers

## References

- MADR: https://adr.github.io/madr/
- ADR Tools: https://github.com/npryce/adr-tools
- Lightweight ADR: https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
  Lightweight ADR (Michael Nygard): https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- ADR GitHub Organization: https://adr.github.io/
- ADR Tools: https://github.com/npryce/adr-tool
