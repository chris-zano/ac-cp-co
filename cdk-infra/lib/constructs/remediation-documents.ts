import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

export interface RemediationDocumentProps {
  readonly documentName: string;
  readonly documentPath: string;
}

/**
 * Creates SSM Automation Documents for Config rule remediation.
 */
export class RemediationDocumentsConstruct extends Construct {
  public readonly documents: Map<string, ssm.CfnDocument>;
  public readonly documentNames: string[];

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.documents = new Map();
    this.documentNames = [];

    // Define remediation documents to create
    const documentConfigs = [
      {
        name: "EbsGp3Remediation",
        fileName: "ebs-gp3-remediation.yaml",
        description: "Remediation document to convert EBS gp2 volumes to gp3",
      },
    ];

    // Create SSM documents from YAML files
    documentConfigs.forEach((config) => {
      const documentPath = path.join(
        __dirname,
        "../../ssm-documents",
        config.fileName,
      );

      // Read and parse the YAML document content
      const documentContent = fs.readFileSync(documentPath, "utf8");
      const parsedContent = yaml.load(documentContent) as Record<string, any>;

      // Document name with stack prefix
      const documentName = `${cdk.Aws.STACK_NAME}-${config.name}`;

      // Create SSM Document
      const document = new ssm.CfnDocument(this, config.name, {
        name: documentName,
        documentType: "Automation",
        documentFormat: "YAML",
        content: parsedContent, // Pass as object, not string
        tags: [
          {
            key: "Purpose",
            value: "CostOptimization",
          },
        ],
      });

      this.documents.set(config.name, document);
      this.documentNames.push(documentName);
    });
  }
}
