import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { CostOptimizationMainStack } from "../../../lib/main-stack";

describe("CostOptimizationMainStack", () => {
  let app: cdk.App;
  let stack: CostOptimizationMainStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new CostOptimizationMainStack(app, "TestMainStack", {
      env: { account: "123456789012", region: "us-east-1" },
    });
    template = Template.fromStack(stack);
  });

  test("Creates organization details Lambda function", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "python3.12",
      Handler: "index.handler",
      Architectures: ["arm64"],
    });
  });

  test("Creates SSM Automation Document", () => {
    template.hasResourceProperties("AWS::SSM::Document", {
      DocumentType: "Automation",
      DocumentFormat: "YAML",
    });
  });

  test("Creates StackSet with SERVICE_MANAGED permission model", () => {
    template.hasResourceProperties("AWS::CloudFormation::StackSet", {
      PermissionModel: "SERVICE_MANAGED",
      CallAs: "DELEGATED_ADMIN",
    });
  });

  test("Creates StackSet with auto deployment enabled", () => {
    template.hasResourceProperties("AWS::CloudFormation::StackSet", {
      AutoDeployment: {
        Enabled: true,
        RetainStacksOnAccountRemoval: false,
      },
    });
  });

  test("Creates StackSet for organization-wide deployment", () => {
    template.hasResourceProperties("AWS::CloudFormation::StackSet", {
      StackSetName: "TestMainStack-StackSet",
      CallAs: "DELEGATED_ADMIN",
      PermissionModel: "SERVICE_MANAGED",
    });
  });

  test("Outputs OrganizationRootId", () => {
    template.hasOutput("OrganizationRootId", {});
  });

  test("Outputs ManagementAccountId", () => {
    template.hasOutput("ManagementAccountId", {});
  });

  test("Outputs StackSetName", () => {
    template.hasOutput("StackSetName", {});
  });

  test("StackSet has correct operation preferences", () => {
    template.hasResourceProperties("AWS::CloudFormation::StackSet", {
      OperationPreferences: {
        MaxConcurrentPercentage: 100,
        FailureTolerancePercentage: 100,
        RegionConcurrencyType: "PARALLEL",
      },
    });
  });

  test("StackSet has required capabilities", () => {
    template.hasResourceProperties("AWS::CloudFormation::StackSet", {
      Capabilities: ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM"],
    });
  });

  test("Matches snapshot", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
