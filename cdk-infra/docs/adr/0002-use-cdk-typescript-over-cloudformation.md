# ADR-0001: Use AWS CDK with TypeScript Instead of CloudFormation YAML

## Status

Accepted

## Context

The original cost optimization solution was implemented using CloudFormation YAML templates with manual parameter passing and complex nested stacks. The requirements included:

- Deploying AWS Config rules organization-wide across 100+ member accounts
- Managing SSM automation documents for remediation
- Sharing documents across all accounts in the organization
- Supporting multiple AWS regions (us-east-1, eu-west-1, eu-central-1)
- Maintaining clear code structure and reusability

The CloudFormation approach had limitations in terms of code reusability, type safety, and maintainability. The question was whether to continue with CloudFormation or migrate to AWS CDK.

## Decision Drivers

- Need for better code organization and reusability
- Type safety to catch errors at compile time
- Easier testing and validation
- Better developer experience with modern tooling
- Ability to use programming constructs (loops, conditionals, functions)
- Industry best practices for infrastructure as code

## Considered Options

### Option 1: Continue with CloudFormation YAML

**Pros:**

- No migration effort required
- Familiar to team already working with CloudFormation
- Direct AWS service support
- No additional dependencies

**Cons:**

- Limited code reusability (copy-paste patterns)
- No type safety
- Difficult to test
- Complex parameter passing between stacks
- Verbose YAML syntax for complex constructs
- No compile-time validation

### Option 2: Use Terraform

**Pros:**

- Multi-cloud support
- Mature ecosystem
- Strong community support

**Cons:**

- Requires learning HCL
- Less native AWS integration compared to CDK
- State management complexity
- Not as AWS-centric as CDK

### Option 3: Use AWS CDK with TypeScript

**Pros:**

- Full programming language capabilities
- Type safety with TypeScript
- Excellent IDE support and autocomplete
- Native AWS service integration
- Built-in construct library for common patterns
- Easy to write unit tests
- Compile-time validation
- Better code reusability through classes and functions
- Active development and AWS support

**Cons:**

- Learning curve for CDK abstractions
- Node.js/TypeScript dependency
- Requires CDK bootstrap in target accounts (initially)
- Generated CloudFormation templates are less readable

## Decision

Use AWS CDK with TypeScript for infrastructure implementation.

## Rationale

1. **Type Safety**: TypeScript provides compile-time type checking, catching errors before deployment
2. **Code Organization**: Object-oriented constructs allow better code structure with separate files for constructs, stacks, and utilities
3. **Reusability**: Create reusable constructs that can be shared across projects
4. **Testing**: Built-in testing framework (Jest) for infrastructure validation
5. **Development Experience**: IDE autocomplete, inline documentation, and refactoring tools
6. **AWS Native**: First-party tool maintained by AWS, ensuring latest service support
7. **Community Adoption**: Large and growing community with extensive examples and patterns

## Consequences

### Positive

- Cleaner, more maintainable codebase
- Type safety catches errors early in development
- Easier to implement complex logic (loops, conditionals)
- Better testing capabilities with snapshot tests
- Improved developer productivity with IDE support
- Clearer separation of concerns (constructs for reusable components)

### Negative

- Team requires TypeScript and CDK training
- Additional build step (TypeScript compilation)
- CDK bootstrap requirement initially caused deployment issues (later resolved)
- Generated CloudFormation templates less human-readable for debugging

### Neutral

- Project structure follows CDK conventions
- Need to maintain both TypeScript source and generated CloudFormation
- CDK version updates may require code changes

## Implementation Notes

- CDK version: 2.240.0
- Language: TypeScript 5.x
- Testing: Jest for unit tests, snapshot tests for infrastructure validation
- Code structure: Separate constructs for reusable components (OrgDetails, DocumentShare, RemediationDocuments)
- Build process: TypeScript compilation before CDK synthesis

## Related Decisions

- [ADR-0001: Use Lightweight ADR for Decisions](0001-use-lightweight-adr-for-decisions.md)
- [ADR-0003: Use Inline Lambda Code Instead of S3/Bootstrap](0003-use-inline-lambda-code.md)
- [ADR-0004: Use BootstraplessSynthesizer for Member Stacks](0004-use-bootstrapless-synthesizer.md)

## References

- AWS CDK Documentation: https://docs.aws.amazon.com/cdk/
- TypeScript Best Practices: https://typescript-eslint.io/
- Original CloudFormation templates: ../../../rules/ directory
