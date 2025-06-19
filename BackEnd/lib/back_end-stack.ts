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
import * as appsync from "aws-cdk-lib/aws-appsync";
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
        contactNumber: new cognito.StringAttribute({
          minLen: 10,
          maxLen: 20,
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
          .withCustomAttributes("firstName", "lastName", "contactNumber"),
        writeAttributes: new cognito.ClientAttributes()
          .withStandardAttributes({
            email: true,
          })
          .withCustomAttributes("firstName", "lastName", "contactNumber"),
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

    // Add GSI for cognitoUserId lookups
    userTable.addGlobalSecondaryIndex({
      indexName: "cognitoUserId",
      partitionKey: {
        name: "cognitoUserId",
        type: dynamodb.AttributeType.STRING,
      },
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
      outputPath: "$[0]", // Take the first element of the parallel output array
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

    // Grant PostConfirmation Lambda permission to add users to groups
    // Using a wildcard to avoid circular dependency
    postConfirmationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminAddUserToGroup"],
        resources: [`arn:aws:cognito-idp:${this.region}:${this.account}:userpool/*`],
      })
    );

    // Add state machine ARN to PostConfirmation Lambda environment
    postConfirmationLambda.addEnvironment(
      "USER_CREATION_STATE_MACHINE_ARN",
      userCreationStateMachine.stateMachineArn
    );

    // =====================================================
    // APPSYNC API FOR REAL ESTATE PROPERTIES
    // =====================================================

    // Create DynamoDB Table for Properties
    const propertiesTable = new dynamodb.Table(this, "PropertiesTable", {
      tableName: "lh-properties",
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    // Add Global Secondary Indexes for querying
    propertiesTable.addGlobalSecondaryIndex({
      indexName: "gsi1",
      partitionKey: {
        name: "gsi1pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "gsi1sk",
        type: dynamodb.AttributeType.STRING,
      },
    });

    propertiesTable.addGlobalSecondaryIndex({
      indexName: "gsi2",
      partitionKey: {
        name: "gsi2pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "gsi2sk",
        type: dynamodb.AttributeType.STRING,
      },
    });

    propertiesTable.addGlobalSecondaryIndex({
      indexName: "gsi3",
      partitionKey: {
        name: "gsi3pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "gsi3sk",
        type: dynamodb.AttributeType.STRING,
      },
    });

    propertiesTable.addGlobalSecondaryIndex({
      indexName: "gsi4",
      partitionKey: {
        name: "gsi4pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "gsi4sk",
        type: dynamodb.AttributeType.STRING,
      },
    });

    propertiesTable.addGlobalSecondaryIndex({
      indexName: "gsi5",
      partitionKey: {
        name: "gsi5pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "gsi5sk",
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Create S3 Bucket for Property Images
    const propertyImagesBucket = new s3.Bucket(this, "PropertyImagesBucket", {
      bucketName: `lh-property-images-${this.account}-${this.region}`,
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
      lifecycleRules: [
        {
          id: "delete-old-versions",
          noncurrentVersionExpiration: cdk.Duration.days(30),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });

    // Create AppSync API
    const api = new appsync.GraphqlApi(this, "PropertyApi", {
      name: "lh-property-api",
      schema: appsync.SchemaFile.fromAsset(
        path.join(__dirname, "../schema.graphql")
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool,
          },
        },
      },
      xrayEnabled: true,
    });

    // Create Lambda Resolvers
    const resolverEnvironment = {
      PROPERTIES_TABLE_NAME: propertiesTable.tableName,
      PROPERTY_IMAGES_BUCKET_NAME: propertyImagesBucket.bucketName,
      USER_TABLE_NAME: userTable.tableName,
    };

    // Get Upload URL Lambda
    const getUploadUrlLambda = new NodejsFunction(this, "GetUploadUrlLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../functions/appsync-resolvers/get-upload-url.ts"
      ),
      bundling: {
        minify: true,
        sourceMap: true,
        sourcesContent: false,
        target: "node20",
      },
      environment: resolverEnvironment,
      timeout: cdk.Duration.seconds(10),
    });

    // Create Property Lambda
    const createPropertyLambda = new NodejsFunction(
      this,
      "CreatePropertyLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/appsync-resolvers/create-property.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: resolverEnvironment,
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Get Property Lambda
    const getPropertyLambda = new NodejsFunction(this, "GetPropertyLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../functions/appsync-resolvers/get-property.ts"
      ),
      bundling: {
        minify: true,
        sourceMap: true,
        sourcesContent: false,
        target: "node20",
      },
      environment: resolverEnvironment,
      timeout: cdk.Duration.seconds(10),
    });

    // List Properties Lambda
    const listPropertiesLambda = new NodejsFunction(
      this,
      "ListPropertiesLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/appsync-resolvers/list-properties.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: resolverEnvironment,
        timeout: cdk.Duration.seconds(10),
      }
    );

    // List My Properties Lambda
    const listMyPropertiesLambda = new NodejsFunction(
      this,
      "ListMyPropertiesLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/appsync-resolvers/list-my-properties.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: resolverEnvironment,
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Update Property Lambda
    const updatePropertyLambda = new NodejsFunction(
      this,
      "UpdatePropertyLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/appsync-resolvers/update-property.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: resolverEnvironment,
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Delete Property Lambda
    const deletePropertyLambda = new NodejsFunction(
      this,
      "DeletePropertyLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/appsync-resolvers/delete-property.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: resolverEnvironment,
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Approve Property Lambda
    const approvePropertyLambda = new NodejsFunction(
      this,
      "ApprovePropertyLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/appsync-resolvers/approve-property.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: resolverEnvironment,
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Reject Property Lambda
    const rejectPropertyLambda = new NodejsFunction(
      this,
      "RejectPropertyLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/appsync-resolvers/reject-property.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: resolverEnvironment,
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Get User Details Lambda
    const getUserDetailsLambda = new NodejsFunction(
      this,
      "GetUserDetailsLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/appsync-resolvers/get-user-details.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: resolverEnvironment,
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Grant permissions
    propertiesTable.grantReadWriteData(createPropertyLambda);
    propertiesTable.grantReadData(getPropertyLambda);
    propertiesTable.grantReadData(listPropertiesLambda);
    propertiesTable.grantReadData(listMyPropertiesLambda);
    propertiesTable.grantReadWriteData(updatePropertyLambda);
    propertiesTable.grantReadWriteData(deletePropertyLambda);
    propertiesTable.grantReadWriteData(approvePropertyLambda);
    propertiesTable.grantReadWriteData(rejectPropertyLambda);

    // Grant user table permissions
    userTable.grantReadData(getUserDetailsLambda);

    // Grant S3 permissions
    propertyImagesBucket.grantPut(getUploadUrlLambda);
    propertyImagesBucket.grantDelete(deletePropertyLambda);

    // Create Data Sources
    const getUploadUrlDataSource = api.addLambdaDataSource(
      "GetUploadUrlDataSource",
      getUploadUrlLambda
    );

    const createPropertyDataSource = api.addLambdaDataSource(
      "CreatePropertyDataSource",
      createPropertyLambda
    );

    const getPropertyDataSource = api.addLambdaDataSource(
      "GetPropertyDataSource",
      getPropertyLambda
    );

    const listPropertiesDataSource = api.addLambdaDataSource(
      "ListPropertiesDataSource",
      listPropertiesLambda
    );

    const listMyPropertiesDataSource = api.addLambdaDataSource(
      "ListMyPropertiesDataSource",
      listMyPropertiesLambda
    );

    const updatePropertyDataSource = api.addLambdaDataSource(
      "UpdatePropertyDataSource",
      updatePropertyLambda
    );

    const deletePropertyDataSource = api.addLambdaDataSource(
      "DeletePropertyDataSource",
      deletePropertyLambda
    );

    const approvePropertyDataSource = api.addLambdaDataSource(
      "ApprovePropertyDataSource",
      approvePropertyLambda
    );

    const rejectPropertyDataSource = api.addLambdaDataSource(
      "RejectPropertyDataSource",
      rejectPropertyLambda
    );

    const getUserDetailsDataSource = api.addLambdaDataSource(
      "GetUserDetailsDataSource",
      getUserDetailsLambda
    );

    // Create Resolvers
    // Queries
    getPropertyDataSource.createResolver("GetPropertyResolver", {
      typeName: "Query",
      fieldName: "getProperty",
    });

    getUserDetailsDataSource.createResolver("GetUserDetailsResolver", {
      typeName: "Query",
      fieldName: "getUserDetails",
    });

    listPropertiesDataSource.createResolver("ListPropertiesResolver", {
      typeName: "Query",
      fieldName: "listProperties",
    });

    listMyPropertiesDataSource.createResolver("ListMyPropertiesResolver", {
      typeName: "Query",
      fieldName: "listMyProperties",
    });

    // Mutations
    getUploadUrlDataSource.createResolver("GetUploadUrlResolver", {
      typeName: "Mutation",
      fieldName: "getUploadUrl",
    });

    createPropertyDataSource.createResolver("CreatePropertyResolver", {
      typeName: "Mutation",
      fieldName: "createProperty",
    });

    updatePropertyDataSource.createResolver("UpdatePropertyResolver", {
      typeName: "Mutation",
      fieldName: "updateProperty",
    });

    deletePropertyDataSource.createResolver("DeletePropertyResolver", {
      typeName: "Mutation",
      fieldName: "deleteProperty",
    });

    approvePropertyDataSource.createResolver("ApprovePropertyResolver", {
      typeName: "Mutation",
      fieldName: "approveProperty",
    });

    rejectPropertyDataSource.createResolver("RejectPropertyResolver", {
      typeName: "Mutation",
      fieldName: "rejectProperty",
    });

    // =====================================================
    // UPGRADE USER TO PAID TIER FUNCTIONALITY
    // =====================================================

    // Create Lambda functions for upgrade workflow
    const updateCognitoGroupLambda = new NodejsFunction(
      this,
      "UpdateCognitoGroupLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/upgrade-user/update-cognito-group/handler.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: {
          USER_POOL_ID: userPool.userPoolId,
        },
        timeout: cdk.Duration.seconds(10),
      }
    );

    const updateUserTierLambda = new NodejsFunction(
      this,
      "UpdateUserTierLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/upgrade-user/update-user-tier/handler.ts"
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

    const sendProWelcomeEmailLambda = new NodejsFunction(
      this,
      "SendProWelcomeEmailLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/upgrade-user/send-pro-welcome-email/handler.ts"
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
        timeout: cdk.Duration.seconds(30),
      }
    );

    // Grant permissions
    userTable.grantReadWriteData(updateUserTierLambda);
    userTable.grantReadData(sendProWelcomeEmailLambda);
    
    // Grant permission to update Cognito groups
    updateCognitoGroupLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup"
        ],
        resources: [userPool.userPoolArn],
      })
    );

    // Create Step Functions tasks for upgrade workflow
    const updateCognitoGroupTask = new tasks.LambdaInvoke(
      this,
      "UpdateCognitoGroupTask",
      {
        lambdaFunction: updateCognitoGroupLambda,
        outputPath: "$.Payload",
      }
    );

    const updateUserTierTask = new tasks.LambdaInvoke(
      this,
      "UpdateUserTierTask",
      {
        lambdaFunction: updateUserTierLambda,
        outputPath: "$.Payload",
      }
    );

    const sendProWelcomeEmailTask = new tasks.LambdaInvoke(
      this,
      "SendProWelcomeEmailTask",
      {
        lambdaFunction: sendProWelcomeEmailLambda,
        outputPath: "$.Payload",
        retryOnServiceExceptions: true,
      }
    );

    // Define the upgrade user state machine
    const upgradeUserDefinition = updateCognitoGroupTask
      .next(updateUserTierTask)
      .next(sendProWelcomeEmailTask);

    const upgradeUserStateMachine = new sfn.StateMachine(
      this,
      "UpgradeUserStateMachine",
      {
        stateMachineName: "upgrade-user-to-paid-workflow",
        definition: upgradeUserDefinition,
        timeout: cdk.Duration.minutes(5),
      }
    );

    // Create AppSync resolver Lambda for upgrade user
    const upgradeUserToPaidLambda = new NodejsFunction(
      this,
      "UpgradeUserToPaidLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/appsync-resolvers/upgrade-user-to-paid.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: {
          USER_POOL_ID: userPool.userPoolId,
          UPGRADE_USER_STATE_MACHINE_ARN: upgradeUserStateMachine.stateMachineArn,
        },
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Grant permission to start Step Functions execution
    upgradeUserStateMachine.grantStartExecution(upgradeUserToPaidLambda);

    // Create data source and resolver
    const upgradeUserToPaidDataSource = api.addLambdaDataSource(
      "UpgradeUserToPaidDataSource",
      upgradeUserToPaidLambda
    );

    upgradeUserToPaidDataSource.createResolver("UpgradeUserToPaidResolver", {
      typeName: "Mutation",
      fieldName: "upgradeUserToPaid",
    });

    // =====================================================
    // AI PROPERTY REPORT GENERATION
    // =====================================================

    // Create Lambda for property report generation
    const generatePropertyReportLambda = new NodejsFunction(
      this,
      "GeneratePropertyReportLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/appsync-resolvers/generate-property-report.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: {},
        timeout: cdk.Duration.seconds(60), // Longer timeout for AI generation
        memorySize: 1024, // More memory for AI processing
      }
    );

    // Grant permissions
    
    // Grant Bedrock permissions
    generatePropertyReportLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-lite-v1:0`
        ],
      })
    );

    // =====================================================
    // REPORT GENERATION WORKFLOW (STEP FUNCTIONS)
    // =====================================================

    // Lambda for AI content generation
    const generateAIContentLambda = new NodejsFunction(
      this,
      "GenerateAIContentLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/report-generation/generate-ai-content/handler.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: {},
        timeout: cdk.Duration.seconds(60),
        memorySize: 1024,
      }
    );

    // Lambda for PDF generation
    const generatePDFLambda = new NodejsFunction(
      this,
      "GeneratePDFLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/report-generation/generate-pdf/handler.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
          externalModules: [],
          nodeModules: ["pdfkit"],
        },
        environment: {},
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
      }
    );

    // Lambda for saving PDF to S3
    const savePDFToS3Lambda = new NodejsFunction(
      this,
      "SavePDFToS3Lambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../functions/report-generation/save-pdf-to-s3/handler.ts"
        ),
        bundling: {
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          target: "node20",
        },
        environment: {
          USER_FILES_BUCKET_NAME: userFilesBucket.bucketName,
          USER_TABLE_NAME: userTable.tableName,
        },
        timeout: cdk.Duration.seconds(30),
      }
    );

    // Grant permissions
    generateAIContentLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-lite-v1:0`
        ],
      })
    );
    
    userFilesBucket.grantWrite(savePDFToS3Lambda);
    userTable.grantReadData(savePDFToS3Lambda);

    // Create Step Functions tasks
    const generateAIContentTask = new tasks.LambdaInvoke(
      this,
      "GenerateAIContentTask",
      {
        lambdaFunction: generateAIContentLambda,
        outputPath: "$.Payload",
      }
    );

    const generatePDFTask = new tasks.LambdaInvoke(
      this,
      "GeneratePDFTask",
      {
        lambdaFunction: generatePDFLambda,
        outputPath: "$.Payload",
      }
    );

    const savePDFToS3Task = new tasks.LambdaInvoke(
      this,
      "SavePDFToS3Task",
      {
        lambdaFunction: savePDFToS3Lambda,
        outputPath: "$.Payload",
      }
    );

    // Define the report generation workflow
    const reportGenerationDefinition = generateAIContentTask
      .next(generatePDFTask)
      .next(savePDFToS3Task);

    const reportGenerationStateMachine = new sfn.StateMachine(
      this,
      "ReportGenerationStateMachine",
      {
        stateMachineName: "property-report-generation-workflow",
        definition: reportGenerationDefinition,
        timeout: cdk.Duration.minutes(5),
      }
    );

    // Grant Step Functions permission to the AppSync resolver
    reportGenerationStateMachine.grantStartExecution(generatePropertyReportLambda);
    
    // Add state machine ARN to the resolver Lambda environment
    generatePropertyReportLambda.addEnvironment(
      "REPORT_GENERATION_STATE_MACHINE_ARN",
      reportGenerationStateMachine.stateMachineArn
    );

    // Create data source and resolver
    const generatePropertyReportDataSource = api.addLambdaDataSource(
      "GeneratePropertyReportDataSource",
      generatePropertyReportLambda
    );

    generatePropertyReportDataSource.createResolver("GeneratePropertyReportResolver", {
      typeName: "Mutation",
      fieldName: "generatePropertyReport",
    });

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
      value: userGroup.groupName ?? "user",
      description: "The name of the user group",
    });

    new cdk.CfnOutput(this, "PaidGroupName", {
      value: paidGroup.groupName ?? "paid",
      description: "The name of the paid group",
    });

    new cdk.CfnOutput(this, "AdminGroupName", {
      value: adminGroup.groupName ?? "admin",
      description: "The name of the admin group",
    });

    new cdk.CfnOutput(this, "UserCreationStateMachineArn", {
      value: userCreationStateMachine.stateMachineArn,
      description: "The ARN of the User Creation Step Functions state machine",
    });

    new cdk.CfnOutput(this, "UpgradeUserStateMachineArn", {
      value: upgradeUserStateMachine.stateMachineArn,
      description: "The ARN of the Upgrade User to Paid Step Functions state machine",
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

    // AppSync API Outputs
    new cdk.CfnOutput(this, "GraphQLApiUrl", {
      value: api.graphqlUrl,
      description: "The URL of the GraphQL API",
    });

    new cdk.CfnOutput(this, "PropertiesTableName", {
      value: propertiesTable.tableName,
      description: "The name of the Properties DynamoDB table",
    });

    new cdk.CfnOutput(this, "PropertyImagesBucketName", {
      value: propertyImagesBucket.bucketName,
      description: "The name of the Property Images S3 bucket",
    });

    new cdk.CfnOutput(this, "GraphQLApiId", {
      value: api.apiId,
      description: "The ID of the GraphQL API",
    });

    new cdk.CfnOutput(this, "ReportGenerationStateMachineArn", {
      value: reportGenerationStateMachine.stateMachineArn,
      description: "The ARN of the Report Generation Step Functions state machine",
    });
  }
}
