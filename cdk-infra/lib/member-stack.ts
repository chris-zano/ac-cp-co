import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as config from "aws-cdk-lib/aws-config";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as path from "path";

/**
 * Member Account Stack - Deployed to all AWS Organization accounts via StackSet.
 *
 * Creates:
 * - AutomationRole for SSM remediation
 * - Config rule evaluation Lambda
 * - Three Config rules (EBS gp3, EBS unattached, S3 lifecycle)
 */
export class MemberAccountStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // CloudFormation parameters for Lambda code location
    const lambdaBucketParam = new cdk.CfnParameter(this, "LambdaBucket", {
      type: "String",
      description: "S3 bucket containing Lambda function code",
    });

    const lambdaKeyParam = new cdk.CfnParameter(this, "LambdaKey", {
      type: "String",
      description: "S3 key for Lambda function code",
    });

    // 1. Create AutomationRole for SSM remediation
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

    // 2. Create Lambda execution role
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

    // 3. Create Lambda function with all rule evaluators
    // Use Lambda code from S3 bucket (passed as parameters)
    const configRuleFunction = new lambda.Function(
      this,
      "CustomConfigFunction",
      {
        functionName: "CostOptimizationConformanceConfigRuleFunction",
        runtime: lambda.Runtime.PYTHON_3_12,
        handler: "index.lambda_handler",
        code: lambda.Code.fromBucket(
          s3.Bucket.fromBucketName(
            this,
            "LambdaCodeBucket",
            lambdaBucketParam.valueAsString,
          ),
          lambdaKeyParam.valueAsString,
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

    // 4. Create three Config rules

    // Rule 1: EBS GP3 - Check that EBS volumes use gp3 instead of gp2
    new config.CustomRule(this, "EbsGp3Rule", {
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

    // Rule 2: EBS Unattached - Check that EBS volumes are attached
    new config.CustomRule(this, "EbsUnattachedRule", {
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

    // Rule 3: S3 Lifecycle - Check that S3 buckets have lifecycle policies
    new config.CustomRule(this, "S3LifecycleRule", {
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
  }
}
