#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { CostOptimizationMainStack } from "../lib/main-stack";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../.env") });

/**
 * Validates that required environment variables are set.
 * Throws an error if any required variable is missing.
 */
function validateEnvironment(): void {
  const required = [
    "CDK_DEPLOY_ACCOUNT",
    "CDK_DEPLOY_REGION",
    "AWS_PROFILE",
    "STACKSET_TARGET_REGIONS",
    "STACKSET_TARGET_OU",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("\nMissing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("\nPlease create a .env file with the required values.");
    console.error("   See .env.example for reference.\n");
    process.exit(1);
  }

  // Validate account ID format (12 digits)
  const accountId = process.env.CDK_DEPLOY_ACCOUNT!;
  if (!/^\d{12}$/.test(accountId)) {
    console.error(
      `\nInvalid CDK_DEPLOY_ACCOUNT: "${accountId}"\n   Must be a 12-digit AWS account ID\n`,
    );
    process.exit(1);
  }

  // Validate OU ID format (r-xxxx for root or ou-xxxx-xxxxxxxx for OU)
  const ouId = process.env.STACKSET_TARGET_OU!;
  if (!/^(r-[a-z0-9]{4}|ou-[a-z0-9]{4,32}-[a-z0-9]{8,32})$/.test(ouId)) {
    console.error(
      `\nInvalid STACKSET_TARGET_OU: "${ouId}"\n   Must be either:\n   - Root ID format: r-xxxx\n   - OU ID format: ou-xxxx-xxxxxxxx\n`,
    );
    process.exit(1);
  }

  const regions = process.env.STACKSET_TARGET_REGIONS!.split(",");
  console.log("Environment configuration validated");
  console.log(`   Account: ${process.env.CDK_DEPLOY_ACCOUNT}`);
  console.log(`   Region:  ${process.env.CDK_DEPLOY_REGION}`);
  console.log(`   Profile: ${process.env.AWS_PROFILE}`);
  console.log(`   StackSet Target Regions: ${regions.join(", ")}`);
  console.log(`   StackSet Target OU: ${ouId}`);
  console.log("");
}

// Validate environment before proceeding
validateEnvironment();

const app = new cdk.App();

new CostOptimizationMainStack(app, "CostOptimizationMainStack", {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION,
  },
  description:
    "Cost Optimization Main Stack - Deploys organization-wide AWS Config cost optimization rules",
  tags: {
    Project: "CostOptimization",
    ManagedBy: "CDK",
  },
});
