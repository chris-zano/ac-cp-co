# ADR-0008: Implement S3 Lifecycle Policies for Config Data

## Status

Accepted

## Context

AWS Config Delivery Channel writes configuration snapshots and history to S3 buckets. With 100+ accounts across 3 regions, Config generates significant data volume over time. Each account/region combination has its own S3 bucket for Config data.

Config data characteristics:

- Frequently accessed: First 30 days (compliance audits, troubleshooting)
- Occasionally accessed: 31-365 days (historical compliance, audit reviews)
- Rarely accessed: After 365 days (long-term compliance archive)

Without lifecycle policies, all data remains in S3 Standard storage, incurring unnecessary costs for infrequently accessed historical data.

## Decision Drivers

- Cost optimization for Config storage across 300+ S3 buckets
- Compliance requirements for data retention
- Data access patterns (frequent → occasional → rare)
- Storage class cost differences
- Retrieval time requirements
- Organizational compliance policies

## Considered Options

### Option 1: No Lifecycle Policies

**Pros:**

- Simplest implementation
- Instant access to all data
- No retrieval delays

**Cons:**

- Highest storage costs
- S3 Standard pricing: $0.023/GB/month
- Wasteful for rarely accessed historical data
- Costs scale linearly with data growth
- No cost optimization

**Estimated Costs (per bucket):**

- 100GB data: $2.30/month
- 300 buckets: $690/month

### Option 2: Immediate Glacier Transition

**Pros:**

- Lowest storage costs
- Glacier pricing: $0.004/GB/month

**Cons:**

- Slow retrieval for recent compliance checks
- Standard retrieval: 3-5 hours
- Expedited retrieval: Additional cost ($0.03/GB)
- Not suitable for active compliance monitoring

### Option 3: Tiered Lifecycle Policies

**Pros:**

- Balanced cost and accessibility
- Frequent data in Standard storage
- Older data in cheaper storage classes
- Automatic transitions
- Optimized for access patterns

**Cons:**

- Slight complexity in policy definition
- May need adjustment based on actual patterns

**Storage Class Transition:**

- Days 1-90: S3 Standard ($0.023/GB)
- Days 91-365: S3 Standard-IA ($0.0125/GB)
- After 365 days: S3 Glacier ($0.004/GB)

**Estimated Costs (per bucket, 100GB total):**

- First 90 days: $0.69 (30GB)
- Days 91-365: $0.47 (40GB)
- After 365 days: $0.12 (30GB)
- **Total: $1.28/month** (44% savings vs no lifecycle)

### Option 4: Deletion After Retention Period

**Pros:**

- Further cost savings
- Enforces data retention policies

**Cons:**

- Data loss after retention period
- May conflict with compliance requirements
- Not implemented (organization prefers indefinite retention)

## Decision

Implement tiered S3 lifecycle policies with transitions to Infrequent Access (90 days) and Glacier (365 days).

## Rationale

1. **Cost Optimization**: 44% storage cost reduction compared to no lifecycle policies
2. **Access Pattern Match**: Transitions align with typical Config data access patterns
3. **Compliance Support**: Recent data readily accessible, historical data archived
4. **Scalability**: Automatic cost optimization as data grows
5. **Retrieval Balance**: 90-day window for instant access covers most use cases
6. **Industry Best Practice**: Standard pattern for compliance data storage

## Implementation

```typescript
const configBucket = new s3.Bucket(this, "ConfigBucket", {
  bucketName: `aws-config-bucket-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  bucketKeyEnabled: true,
  lifecycleRules: [
    {
      enabled: true,
      transitions: [
        {
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(90),
        },
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(365),
        },
      ],
    },
  ],
});
```

## Consequences

### Positive

- Storage cost reduction: ~44% compared to S3 Standard only
- Automatic cost optimization across all 300+ buckets
- Scalable solution as data volume grows
- Compliance data preserved indefinitely
- Recent data instantly accessible
- No operational overhead for transitions

### Negative

- Historical data (>90 days) has slower access times
- Glacier retrieval requires 3-5 hours (standard) or minutes (expedited at additional cost)
- Small additional complexity in bucket configuration

### Neutral

- Lifecycle policy applied uniformly across all Config buckets
- Transition timing may need adjustment based on usage patterns
- No automatic deletion (data retained indefinitely)

## Cost Analysis

### Storage Classes and Pricing

| Storage Class | Monthly Cost/GB | Retrieval | Use Case                        |
| ------------- | --------------- | --------- | ------------------------------- |
| S3 Standard   | $0.023          | Instant   | Active data (0-90 days)         |
| Standard-IA   | $0.0125         | Instant   | Occasional access (91-365 days) |
| Glacier       | $0.004          | 3-5 hours | Archive (365+ days)             |

### Per-Bucket Savings (100GB example)

- No lifecycle: $2.30/month
- With lifecycle: $1.28/month
- **Savings: $1.02/month per bucket**

### Organization-Wide Savings (300 buckets)

- No lifecycle: $690/month
- With lifecycle: $384/month
- **Savings: $306/month = $3,672/year**

### Cost Breakdown by Age

```
Month 1-3:  100% Standard    = $0.69
Month 4-12: 40% Standard-IA  = $0.38
Year 2+:    30% Glacier      = $0.12
Average monthly: $1.28
```

## Retrieval Considerations

### Standard Retrieval (Free)

- Speed: 3-5 hours
- Use: Historical compliance reviews, audit reports
- Cost: No fee beyond storage

### Expedited Retrieval

- Speed: 1-5 minutes
- Use: Urgent historical lookups
- Cost: $0.03/GB + $0.01 per request
- Rare usage expected

### Bulk Retrieval

- Speed: 5-12 hours
- Use: Large-scale historical analysis
- Cost: $0.0025/GB
- Lowest cost for large datasets

## Data Access Patterns

### Frequent Access (0-90 days)

- Compliance checks
- Active troubleshooting
- Change analysis
- Daily operations
- **Storage:** S3 Standard

### Occasional Access (91-365 days)

- Quarterly compliance audits
- Historical trend analysis
- Incident investigations
- **Storage:** S3 Standard-IA

### Rare Access (365+ days)

- Annual compliance reports
- Long-term audit requirements
- Historical baselines
- **Storage:** S3 Glacier

## Security Enhancements

Included with lifecycle implementation:

```typescript
enforceSSL: true,           // Require SSL/TLS for all access
bucketKeyEnabled: true,     // Reduce KMS costs by 99%
encryption: S3_MANAGED,     // Server-side encryption
```

### SSL Enforcement

- Bucket policy denies non-SSL requests
- Protects data in transit
- Compliance requirement

### Bucket Key

- Reduces KMS API calls
- Lowers encryption costs from ~$0.02 to ~$0.0002 per GB
- No performance impact

## Monitoring and Validation

### CloudWatch Metrics

- **StorageBytes**: Monitor per storage class
- **NumberOfObjects**: Track object count per storage class
- **TransitionMetrics**: Validate lifecycle transitions executing

### Cost Explorer Filters

```
Service: Amazon S3
Usage Type: Storage
Storage Class: Standard, Standard-IA, Glacier
```

## Compliance Considerations

### Data Retention

- No automatic deletion
- Data preserved indefinitely
- Meets regulatory requirements for historical compliance

### Access Controls

- S3 bucket policy restricts access to Config service
- IAM policies control human access
- Glacier retrieval logged in CloudTrail

## Future Considerations

### Potential Optimizations

1. **Intelligent-Tiering**: For unpredictable access patterns
2. **Deep Archive**: For data older than 2 years (further cost reduction)
3. **Expiration**: If organization defines retention limits
4. **Object Tags**: For finer-grained lifecycle policies

### Monitoring and Adjustment

- Review access patterns quarterly
- Adjust transition timings if needed
- Evaluate actual cost savings vs projected

## Related Decisions

- [ADR-0006: Enable AWS Config Recorder](0006-enable-aws-config-recorder.md)
- [ADR-0005: Use SERVICE_MANAGED StackSets](0005-use-service-managed-stacksets.md)

## References

- AWS S3 Storage Classes: https://aws.amazon.com/s3/storage-classes/
- S3 Lifecycle Configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html
- S3 Glacier Retrieval: https://docs.aws.amazon.com/amazonglacier/latest/dev/downloading-an-archive-two-steps.html
- AWS Config Data Storage: https://docs.aws.amazon.com/config/latest/developerguide/manage-delivery-channel.html
- S3 Pricing: https://aws.amazon.com/s3/pricing/
