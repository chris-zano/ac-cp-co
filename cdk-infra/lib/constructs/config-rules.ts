import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as config from "aws-cdk-lib/aws-config";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

export interface ConfigRuleProps {
  readonly ruleName: string;
  readonly description: string;
  readonly lambdaFunction: lambda.IFunction;
  readonly ruleScope: config.RuleScope;
  readonly ruleParameters?: { [key: string]: any };
  readonly maximumExecutionFrequency?: config.MaximumExecutionFrequency;
}

/**
 * Creates an AWS Config custom rule with Lambda-based evaluation.
 */
export class ConfigRuleConstruct extends Construct {
  public readonly rule: config.CustomRule;

  constructor(scope: Construct, id: string, props: ConfigRuleProps) {
    super(scope, id);

    // Grant Config service permission to invoke the Lambda function
    props.lambdaFunction.addPermission(`${id}ConfigPermission`, {
      principal: new iam.ServicePrincipal("config.amazonaws.com"),
      action: "lambda:InvokeFunction",
    });

    // Create the Config custom rule
    this.rule = new config.CustomRule(this, "Rule", {
      configRuleName: props.ruleName,
      description: props.description,
      lambdaFunction: props.lambdaFunction,
      configurationChanges: true,
      periodic: true,
      maximumExecutionFrequency:
        props.maximumExecutionFrequency ||
        config.MaximumExecutionFrequency.SIX_HOURS,
      ruleScope: props.ruleScope,
      inputParameters: props.ruleParameters,
    });
  }
}
