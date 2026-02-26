import * as cdk from "aws-cdk-lib";
import * as cfn from "aws-cdk-lib";
import * as cfgconfig from "aws-cdk-lib/aws-config";
import { Construct } from "constructs";
import { OrgDetailsConstruct } from "./constructs/org-details";
import { RemediationDocumentsConstruct } from "./constructs/remediation-documents";
import { DocumentShareConstruct } from "./constructs/document-share";
import { MemberAccountStack } from "./member-stack";

/**
 * Main Stack - Deploys to delegated admin account.
 *
 * Creates:
 * - Organization details lookup
 * - SSM Automation Documents
 * - Document sharing to all accounts
 * - StackSet for member account deployment
 * - Organization Conformance Pack
 */
export class CostOptimizationMainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Get organization details (root ID and management account ID)
    const orgDetails = new OrgDetailsConstruct(this, "OrgDetails");

    // 2. Create SSM Automation Documents for remediation
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

    // 4. Create member account stack template for StackSet
    // We need to synthesize the member stack to get its CloudFormation template
    const memberStackStage = new cdk.Stage(this, "MemberStackStage");
    const memberStack = new MemberAccountStack(
      memberStackStage,
      "MemberAccountStack",
    );

    // Synthesize the member stack to get the template
    const assembly = memberStackStage.synth();
    const memberTemplate = assembly.getStackByName(
      memberStack.stackName,
    ).template;

    // 5. Create StackSet to deploy member stack to all accounts
    const stackSet = new cfn.CfnStackSet(this, "StackSet", {
      stackSetName: `${this.stackName}-StackSet`,
      permissionModel: "SERVICE_MANAGED",
      autoDeployment: {
        enabled: true,
        retainStacksOnAccountRemoval: false,
      },
      capabilities: ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM"],
      callAs: "DELEGATED_ADMIN",
      managedExecution: {
        active: true,
      },
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
        },
      ],
      templateBody: JSON.stringify(memberTemplate),
    });

    // Make StackSet depend on organization details
    stackSet.node.addDependency(orgDetails);

    // 6. Create Organization Conformance Pack
    // Note: We use an empty template because we're using custom Config rules
    // deployed via StackSet, not conformance pack managed rules
    const conformancePack = new cfgconfig.CfnOrganizationConformancePack(
      this,
      "ConformancePack",
      {
        organizationConformancePackName: "Cost-Optimization",
        excludedAccounts: [orgDetails.managementAccountId],
        templateBody: JSON.stringify({
          Parameters: {},
          Resources: {},
        }),
      },
    );

    // Make conformance pack depend on StackSet being deployed
    conformancePack.addDependency(stackSet);

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
