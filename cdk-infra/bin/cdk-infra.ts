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
  const required = ["CDK_DEPLOY_ACCOUNT", "CDK_DEPLOY_REGION", "AWS_PROFILE"];

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

  console.log("Environment configuration validated");
  console.log(`   Account: ${process.env.CDK_DEPLOY_ACCOUNT}`);
  console.log(`   Region:  ${process.env.CDK_DEPLOY_REGION}`);
  console.log(`   Profile: ${process.env.AWS_PROFILE}\n`);
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
