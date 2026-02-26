import * as cdk from "aws-cdk-lib";
import * as cfn from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { OrgDetailsConstruct } from "./constructs/org-details";
import { RemediationDocumentsConstruct } from "./constructs/remediation-documents";
import { DocumentShareConstruct } from "./constructs/document-share";
import { MemberAccountStack } from "./member-stack";
import * as path from "path";

/**
 * Main Stack - Deploys to delegated admin account.
 *
 * Creates:
 * - Organization details lookup
 * - SSM Automation Documents for remediation
 * - Document sharing to all accounts
 * - StackSet for organization-wide Config rule deployment
 */
export class CostOptimizationMainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create S3 bucket to host Lambda code for StackSet deployment
    const lambdaBucket = new s3.Bucket(this, "LambdaBucket", {
      bucketName: `cost-opt-lambda-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Grant organization-wide read access to Lambda bucket
    // This allows CloudFormation and Lambda service in member accounts to download code
    lambdaBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [
          new iam.ServicePrincipal("cloudformation.amazonaws.com"),
          new iam.ServicePrincipal("lambda.amazonaws.com"),
        ],
        actions: ["s3:GetObject"],
        resources: [`${lambdaBucket.bucketArn}/*`],
      }),
    );

    // 2. Upload Lambda code to S3
    new s3deploy.BucketDeployment(this, "DeployLambdaCode", {
      sources: [
        s3deploy.Source.asset(
          path.join(__dirname, "../lambda/config-rules-combined"),
        ),
      ],
      destinationBucket: lambdaBucket,
      destinationKeyPrefix: "lambda/config-rules",
    });

    // 3. Get organization details (root ID and management account ID)
    const orgDetails = new OrgDetailsConstruct(this, "OrgDetails");

    // 4. Create SSM Automation Documents for remediation
    const remediationDocs = new RemediationDocumentsConstruct(
      this,
      "RemediationDocuments",
    );

    // 3. Share SSM documents with all organization accounts
    const documentShare = new DocumentShareConstruct(this, "DocumentShare", {
      documentNames: remediationDocs.documentNames,
    });

    // Make document sharing depend on documents being created
    remediationDocs.documentNames.forEach((_, index) => {
      const shareResource = documentShare.node.findChild(
        `ShareDocument${index}`,
      );
      remediationDocs.documents.forEach((doc) => {
        shareResource.node.addDependency(doc);
      });
    });

    // 6. Create member account stack template for StackSet
    // We need to synthesize the member stack to get its CloudFormation template
    const memberStackStage = new cdk.Stage(this, "MemberStackStage");
    const memberStack = new MemberAccountStack(
      memberStackStage,
      "MemberAccountStack",
      {
        synthesizer: new cdk.BootstraplessSynthesizer(),
        env: {
          account: this.account,
          region: this.region,
        },
      },
    );

    // Synthesize the member stack to get the template
    const assembly = memberStackStage.synth();
    const memberTemplate = assembly.getStackByName(
      memberStack.stackName,
    ).template;

    // 7. Create StackSet to deploy member stack to all accounts
    const stackSet = new cfn.CfnStackSet(this, "StackSet", {
      stackSetName: `${this.stackName}-StackSet`,
      permissionModel: "SERVICE_MANAGED",
      autoDeployment: {
        enabled: true,
        retainStacksOnAccountRemoval: false,
      },
      capabilities: ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM"],
      callAs: "DELEGATED_ADMIN",
      operationPreferences: {
        maxConcurrentPercentage: 100,
        failureTolerancePercentage: 100,
        regionConcurrencyType: "PARALLEL",
      },
      stackInstancesGroup: [
        {
          deploymentTargets: {
            organizationalUnitIds: [orgDetails.rootId],
          },
          regions: [this.region],
          parameterOverrides: [
            {
              parameterKey: "LambdaBucket",
              parameterValue: lambdaBucket.bucketName,
            },
            {
              parameterKey: "LambdaKey",
              parameterValue: "lambda/config-rules/index.py",
            },
          ],
        },
      ],
      templateBody: JSON.stringify(memberTemplate),
    });

    // Make StackSet depend on organization details
    stackSet.node.addDependency(orgDetails);

    // Outputs
    new cdk.CfnOutput(this, "OrganizationRootId", {
      value: orgDetails.rootId,
      description: "AWS Organization Root ID",
    });

    new cdk.CfnOutput(this, "ManagementAccountId", {
      value: orgDetails.managementAccountId,
      description: "AWS Organization Management Account ID",
    });

    new cdk.CfnOutput(this, "StackSetName", {
      value: stackSet.stackSetName!,
      description: "Name of the StackSet deploying to member accounts",
    });
  }
}
