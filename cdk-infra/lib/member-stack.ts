import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as config from "aws-cdk-lib/aws-config";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { readLambdaCode } from "./utils/lambda-code";

/**
 * Member Account Stack - Deployed to all AWS Organization accounts via StackSet.
 *
 * Creates:
 * - AWS Config Recorder and Delivery Channel
 * - AutomationRole for SSM remediation
 * - Config rule evaluation Lambda
 * - Three Config rules (EBS gp3, EBS unattached, S3 lifecycle)
 */
export class MemberAccountStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create S3 bucket for AWS Config delivery
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

    // Grant AWS Config service permission to write to bucket
    configBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AWSConfigBucketPermissionsCheck",
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("config.amazonaws.com")],
        actions: ["s3:GetBucketAcl"],
        resources: [configBucket.bucketArn],
      }),
    );

    configBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AWSConfigBucketExistenceCheck",
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("config.amazonaws.com")],
        actions: ["s3:ListBucket"],
        resources: [configBucket.bucketArn],
      }),
    );

    configBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AWSConfigBucketPutObject",
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("config.amazonaws.com")],
        actions: ["s3:PutObject"],
        resources: [`${configBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            "s3:x-amz-acl": "bucket-owner-full-control",
          },
        },
      }),
    );

    // 2. Create IAM role for Config Recorder
    const configRole = new iam.Role(this, "ConfigRole", {
      assumedBy: new iam.ServicePrincipal("config.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/ConfigRole"),
      ],
    });

    // 3. Create Config Recorder
    const configRecorder = new config.CfnConfigurationRecorder(
      this,
      "ConfigRecorder",
      {
        roleArn: configRole.roleArn,
        recordingGroup: {
          allSupported: true,
          includeGlobalResourceTypes: true,
        },
      },
    );

    // 4. Create Config Delivery Channel
    const deliveryChannel = new config.CfnDeliveryChannel(
      this,
      "ConfigDeliveryChannel",
      {
        s3BucketName: configBucket.bucketName,
      },
    );

    // Ensure delivery channel depends on recorder
    deliveryChannel.addDependency(configRecorder);

    // 5. Create AutomationRole for SSM remediation
    const automationRole = new iam.Role(this, "AutomationRole", {
      roleName: `CostOpt-Automation-${cdk.Aws.REGION}`,
      assumedBy: new iam.ServicePrincipal("ssm.amazonaws.com"),
      description:
        "Role for SSM Automation to remediate cost optimization issues",
      inlinePolicies: {
        RemediationPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["ec2:ModifyVolume"],
              resources: ["*"],
            }),
          ],
        }),
      },
    });

    // 6. Create Lambda execution role
    const lambdaRole = new iam.Role(this, "CustomConfigFunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSConfigRulesExecutionRole",
        ),
      ],
      inlinePolicies: {
        S3LifecyclePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["s3:GetLifecycleConfiguration"],
              resources: ["*"],
            }),
          ],
        }),
      },
    });

    // 7. Create Lambda function with all rule evaluators
    // Use inline Lambda code (no S3 or bootstrap required)
    const configRuleFunction = new lambda.Function(
      this,
      "CustomConfigFunction",
      {
        functionName: "CostOptimizationConformanceConfigRuleFunction",
        runtime: lambda.Runtime.PYTHON_3_12,
        handler: "index.lambda_handler",
        code: lambda.Code.fromInline(
          readLambdaCode("lambda/config-rules-combined/index.py"),
        ),
        architecture: lambda.Architecture.ARM_64,
        role: lambdaRole,
        timeout: cdk.Duration.seconds(60),
        description: "Evaluates cost optimization Config rules for EBS and S3",
      },
    );

    // Grant Config service permission to invoke Lambda
    configRuleFunction.addPermission("ConfigPermission", {
      principal: new iam.ServicePrincipal("config.amazonaws.com"),
      action: "lambda:InvokeFunction",
    });

    // 8. Create three Config rules
    // Rules depend on Config Recorder being active

    // Rule 1: EBS GP3 - Check that EBS volumes use gp3 instead of gp2
    const ebsGp3Rule = new config.CustomRule(this, "EbsGp3Rule", {
      configRuleName: "CostOpt-Ebs-Gp3",
      description: "Checks that EBS volumes use gp3 volume type instead of gp2",
      lambdaFunction: configRuleFunction,
      configurationChanges: true,
      periodic: true,
      maximumExecutionFrequency: config.MaximumExecutionFrequency.SIX_HOURS,
      ruleScope: config.RuleScope.fromResource(config.ResourceType.EBS_VOLUME),
      inputParameters: {
        customFunctionPrefix: "ebs_gp3",
        applicableResourceType: "AWS::EC2::Volume",
        desiredVolumeType: "gp3",
      },
    });
    ebsGp3Rule.node.addDependency(configRecorder);
    ebsGp3Rule.node.addDependency(deliveryChannel);

    // Rule 2: EBS Unattached - Check that EBS volumes are attached
    const ebsUnattachedRule = new config.CustomRule(this, "EbsUnattachedRule", {
      configRuleName: "CostOpt-Ebs-Unattached",
      description: "Checks that EBS volumes are attached to EC2 instances",
      lambdaFunction: configRuleFunction,
      configurationChanges: true,
      periodic: true,
      maximumExecutionFrequency: config.MaximumExecutionFrequency.SIX_HOURS,
      ruleScope: config.RuleScope.fromResource(config.ResourceType.EBS_VOLUME),
      inputParameters: {
        customFunctionPrefix: "ebs_unattached",
        applicableResourceType: "AWS::EC2::Volume",
      },
    });
    ebsUnattachedRule.node.addDependency(configRecorder);
    ebsUnattachedRule.node.addDependency(deliveryChannel);

    // Rule 3: S3 Lifecycle - Check that S3 buckets have lifecycle policies
    const s3LifecycleRule = new config.CustomRule(this, "S3LifecycleRule", {
      configRuleName: "CostOpt-S3-WithoutLifecycle",
      description:
        "Checks that S3 buckets have lifecycle configuration policies",
      lambdaFunction: configRuleFunction,
      configurationChanges: true,
      periodic: true,
      maximumExecutionFrequency: config.MaximumExecutionFrequency.SIX_HOURS,
      ruleScope: config.RuleScope.fromResource(config.ResourceType.S3_BUCKET),
      inputParameters: {
        customFunctionPrefix: "s3_withoutlifecycle",
        applicableResourceType: "AWS::S3::Bucket",
      },
    });
    s3LifecycleRule.node.addDependency(configRecorder);
    s3LifecycleRule.node.addDependency(deliveryChannel);
  }
}
