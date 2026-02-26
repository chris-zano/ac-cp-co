import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { MemberAccountStack } from "../../../lib/member-stack";

describe("MemberAccountStack", () => {
  let app: cdk.App;
  let stack: MemberAccountStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new MemberAccountStack(app, "TestMemberStack", {
      env: { account: "123456789012", region: "us-east-1" },
    });
    template = Template.fromStack(stack);
  });

  test("Creates AutomationRole with correct properties", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              Service: "ssm.amazonaws.com",
            },
          },
        ],
      },
    });
  });

  test("Creates Lambda execution role with required managed policies", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      ManagedPolicyArns: [
        {
          "Fn::Join": [
            "",
            [
              "arn:",
              { Ref: "AWS::Partition" },
              ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            ],
          ],
        },
        {
          "Fn::Join": [
            "",
            [
              "arn:",
              { Ref: "AWS::Partition" },
              ":iam::aws:policy/service-role/AWSConfigRulesExecutionRole",
            ],
          ],
        },
      ],
    });
  });

  test("Creates Config rule Lambda function", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "CostOptimizationConformanceConfigRuleFunction",
      Runtime: "python3.12",
      Handler: "index.lambda_handler",
      Architectures: ["arm64"],
    });
  });

  test("Creates exactly 3 Config rules", () => {
    template.resourceCountIs("AWS::Config::ConfigRule", 3);
  });

  test("Creates EBS GP3 Config rule", () => {
    template.hasResourceProperties("AWS::Config::ConfigRule", {
      ConfigRuleName: "CostOpt-Ebs-Gp3",
      Description: "Checks that EBS volumes use gp3 volume type instead of gp2",
      Scope: {
        ComplianceResourceTypes: ["AWS::EC2::Volume"],
      },
    });
  });

  test("Creates EBS Unattached Config rule", () => {
    template.hasResourceProperties("AWS::Config::ConfigRule", {
      ConfigRuleName: "CostOpt-Ebs-Unattached",
      Description: "Checks that EBS volumes are attached to EC2 instances",
    });
  });

  test("Creates S3 Lifecycle Config rule", () => {
    template.hasResourceProperties("AWS::Config::ConfigRule", {
      ConfigRuleName: "CostOpt-S3-WithoutLifecycle",
      Description:
        "Checks that S3 buckets have lifecycle configuration policies",
      Scope: {
        ComplianceResourceTypes: ["AWS::S3::Bucket"],
      },
    });
  });

  test("Lambda has permission from Config service", () => {
    template.hasResourceProperties("AWS::Lambda::Permission", {
      Action: "lambda:InvokeFunction",
      Principal: "config.amazonaws.com",
    });
  });

  test("Matches snapshot", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
