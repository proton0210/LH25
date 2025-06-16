import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";

export class BackEndStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create PostConfirmation Lambda function
    const postConfirmationLambda = new NodejsFunction(
      this,
      "PostConfirmationLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/post-confirmation/handler.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
        },
        timeout: cdk.Duration.seconds(30),
      }
    );

    const userPool = new cognito.UserPool(this, "LHUserPool", {
      userPoolName: "lh-user-pool",
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        firstName: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 50,
          mutable: true,
        }),
        lastName: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 50,
          mutable: true,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      lambdaTriggers: {
        postConfirmation: postConfirmationLambda,
      },
    });

    const userPoolClient = new cognito.UserPoolClient(
      this,
      "LHUserPoolClient",
      {
        userPool,
        userPoolClientName: "lh-web-client",
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
        generateSecret: false,
        readAttributes: new cognito.ClientAttributes()
          .withStandardAttributes({
            email: true,
            emailVerified: true,
          })
          .withCustomAttributes("firstName", "lastName"),
        writeAttributes: new cognito.ClientAttributes()
          .withStandardAttributes({
            email: true,
          })
          .withCustomAttributes("firstName", "lastName"),
      }
    );

    // Create Cognito Groups
    const userGroup = new cognito.CfnUserPoolGroup(this, "UserGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "user",
      description: "Standard user group",
      precedence: 3,
    });

    const paidGroup = new cognito.CfnUserPoolGroup(this, "PaidGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "paid",
      description: "Paid users with premium features",
      precedence: 2,
    });

    const adminGroup = new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "admin",
      description: "Administrator group with elevated privileges",
      precedence: 1,
    });

    // Create DynamoDB Tables
    const userTable = new dynamodb.Table(this, "UserTable", {
      tableName: "lh-users",
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });


    // Create S3 Bucket
    const userFilesBucket = new s3.Bucket(this, "UserFilesBucket", {
      bucketName: `lh-user-files-${this.account}-${this.region}`,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
    });

    // Create Lambda functions for Step Functions
    const generateUserIdLambda = new NodejsFunction(
      this,
      "GenerateUserIdLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/user-creation/generate-user-id/handler.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        timeout: cdk.Duration.seconds(10),
      }
    );

    const createDynamoDBUserLambda = new NodejsFunction(
      this,
      "CreateDynamoDBUserLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/user-creation/create-dynamodb-user/handler.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: {
          USER_TABLE_NAME: userTable.tableName,
        },
        timeout: cdk.Duration.seconds(10),
      }
    );

    const createS3FolderLambda = new NodejsFunction(
      this,
      "CreateS3FolderLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/user-creation/create-s3-folder/handler.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: {
          USER_FILES_BUCKET_NAME: userFilesBucket.bucketName,
        },
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Create Lambda function for sending welcome email
    const sendWelcomeEmailLambda = new NodejsFunction(
      this,
      "SendWelcomeEmailLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/user-creation/send-welcome-email/handler.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        timeout: cdk.Duration.seconds(30),
      }
    );

    // Grant permissions
    userTable.grantWriteData(createDynamoDBUserLambda);
    userFilesBucket.grantWrite(createS3FolderLambda);

    // Create Step Functions tasks
    const generateUserIdTask = new tasks.LambdaInvoke(
      this,
      "GenerateUserIdTask",
      {
        lambdaFunction: generateUserIdLambda,
        outputPath: "$.Payload",
      }
    );

    const createDynamoDBUserTask = new tasks.LambdaInvoke(
      this,
      "CreateDynamoDBUserTask",
      {
        lambdaFunction: createDynamoDBUserLambda,
        outputPath: "$.Payload",
      }
    );

    const createS3FolderTask = new tasks.LambdaInvoke(
      this,
      "CreateS3FolderTask",
      {
        lambdaFunction: createS3FolderLambda,
        outputPath: "$.Payload",
        retryOnServiceExceptions: true,
      }
    );

    const sendWelcomeEmailTask = new tasks.LambdaInvoke(
      this,
      "SendWelcomeEmailTask",
      {
        lambdaFunction: sendWelcomeEmailLambda,
        outputPath: "$.Payload",
        retryOnServiceExceptions: true,
      }
    );

    // Create parallel state for DynamoDB and S3 operations
    const parallelState = new sfn.Parallel(this, "CreateUserResources", {
      outputPath: "$[0]" // Take the first element of the parallel output array
    })
      .branch(createDynamoDBUserTask)
      .branch(createS3FolderTask);

    // Define the state machine
    const definition = generateUserIdTask
      .next(parallelState)
      .next(sendWelcomeEmailTask);

    const userCreationStateMachine = new sfn.StateMachine(
      this,
      "UserCreationStateMachine",
      {
        stateMachineName: "user-creation-workflow",
        definition,
        timeout: cdk.Duration.minutes(5),
      }
    );

    // Grant PostConfirmation Lambda permission to start executions
    userCreationStateMachine.grantStartExecution(postConfirmationLambda);

    // Add state machine ARN to PostConfirmation Lambda environment
    postConfirmationLambda.addEnvironment(
      "USER_CREATION_STATE_MACHINE_ARN",
      userCreationStateMachine.stateMachineArn
    );

    // Outputs
    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "The ID of the Cognito User Pool",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "The ID of the Cognito User Pool Client",
    });

    new cdk.CfnOutput(this, "PostConfirmationLambdaArn", {
      value: postConfirmationLambda.functionArn,
      description: "The ARN of the PostConfirmation Lambda function",
    });

    new cdk.CfnOutput(this, "UserTableName", {
      value: userTable.tableName,
      description: "The name of the User DynamoDB table",
    });


    new cdk.CfnOutput(this, "UserFilesBucketName", {
      value: userFilesBucket.bucketName,
      description: "The name of the User Files S3 bucket",
    });

    new cdk.CfnOutput(this, "UserGroupName", {
      value: userGroup.groupName || "user",
      description: "The name of the user group",
    });

    new cdk.CfnOutput(this, "PaidGroupName", {
      value: paidGroup.groupName || "paid",
      description: "The name of the paid group",
    });

    new cdk.CfnOutput(this, "AdminGroupName", {
      value: adminGroup.groupName || "admin",
      description: "The name of the admin group",
    });

    new cdk.CfnOutput(this, "UserCreationStateMachineArn", {
      value: userCreationStateMachine.stateMachineArn,
      description: "The ARN of the User Creation Step Functions state machine",
    });

    new cdk.CfnOutput(this, "ResendConfigurationNote", {
      value:
        "Remember to add your domain to Resend and configure your Resend API key",
      description: "Important: Resend Configuration Required",
    });

    new cdk.CfnOutput(this, "ResendAPIKeyNote", {
      value:
        "Deploy with: npx cdk deploy --context resendApiKey=YOUR_RESEND_API_KEY",
      description: "How to provide your Resend API key",
    });
  }
}
