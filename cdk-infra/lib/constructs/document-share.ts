import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import * as path from "path";

export interface DocumentShareProps {
  readonly documentNames: string[];
}

/**
 * Custom resource construct to share SSM documents with all AWS Organization accounts.
 * Handles Create, Update, and Delete lifecycle events.
 */
export class DocumentShareConstruct extends Construct {
  constructor(scope: Construct, id: string, props: DocumentShareProps) {
    super(scope, id);

    // Create Lambda function to share documents
    const shareFunction = new lambda.Function(this, "Function", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambda/document-share"),
      ),
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(300), // 5 minutes for multiple accounts
      description: "Shares SSM documents with all AWS Organization accounts",
    });

    // Grant permissions to list accounts and modify document permissions
    shareFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["organizations:ListAccounts"],
        resources: ["*"],
      }),
    );

    shareFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ssm:ModifyDocumentPermission"],
        resources: [
          `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:document/*`,
        ],
      }),
    );

    // Create custom resource provider
    const provider = new cr.Provider(this, "Provider", {
      onEventHandler: shareFunction,
    });

    // Create a custom resource for each document to be shared
    props.documentNames.forEach((documentName, index) => {
      new cdk.CustomResource(this, `ShareDocument${index}`, {
        serviceToken: provider.serviceToken,
        properties: {
          DocumentName: documentName,
        },
      });
    });
  }
}
