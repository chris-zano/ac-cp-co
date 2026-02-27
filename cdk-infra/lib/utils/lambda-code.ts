import * as fs from "fs";
import * as path from "path";

/**
 * Utility to read Lambda function code from a file for inline deployment.
 *
 * This approach allows Lambda code to remain in .py files with proper syntax highlighting
 * and linting, while being deployed inline in CloudFormation (avoiding S3 and bootstrap requirements).
 *
 * @param relativePath - Path to the Lambda code file relative to the project root
 * @returns The Lambda code as a string
 */
export function readLambdaCode(relativePath: string): string {
  const absolutePath = path.join(__dirname, "../..", relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Lambda code file not found: ${absolutePath}`);
  }

  return fs.readFileSync(absolutePath, "utf8");
}
