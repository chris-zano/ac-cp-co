import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import * as path from "path";

/**
 * Custom resource construct to retrieve AWS Organization details.
 * Returns the Organization Root ID and Management Account ID.
 */
export class OrgDetailsConstruct extends Construct {
  public readonly rootId: string;
  public readonly managementAccountId: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create Lambda function to retrieve organization details
    const orgDetailsFunction = new lambda.Function(this, "Function", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambda/org-details"),
      ),
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      description:
        "Retrieves AWS Organization root ID and management account ID",
    });

    // Grant permissions to describe organization
    orgDetailsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "organizations:ListRoots",
          "organizations:DescribeOrganization",
        ],
        resources: ["*"],
      }),
    );

    // Create custom resource provider
    const provider = new cr.Provider(this, "Provider", {
      onEventHandler: orgDetailsFunction,
    });

    // Create custom resource
    const resource = new cdk.CustomResource(this, "Resource", {
      serviceToken: provider.serviceToken,
    });

    // Export values
    this.rootId = resource.ref; // Physical resource ID is the root ID
    this.managementAccountId = resource.getAttString("MasterAccountId");
  }
}
