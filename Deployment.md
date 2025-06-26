# Deployment Guide

## Prerequisites

Before deploying the application, ensure you have the following configured:

1. **AWS CLI** - Install and configure the AWS Command Line Interface
2. **Node.js** - Stable version of Node.js installed
3. **AWS Account Access Keys** - Configure your AWS credentials

## Step 1 - Configure AWS Region

⚠️ **IMPORTANT: Deploy in ap-south-1 (Mumbai) Region**

The application uses the Claude 3 Haiku model (`apac.anthropic.claude-3-haiku-20240307-v1:0`) which is only available in the Asia Pacific regions. 

**You must deploy the stack in the `ap-south-1` (Mumbai) region for the AI features to work.**

```bash
# Configure your AWS CLI to use ap-south-1 region
export AWS_REGION=ap-south-1
export AWS_DEFAULT_REGION=ap-south-1

# Or configure it permanently
aws configure set region ap-south-1
```

## Step 2 - Deploy Backend

To deploy the backend stack, we use our custom deployment script:

```bash
cd backend
npm i
npm run deploy  # This is our custom script that handles CDK deployment
```

## Step 2a - Enable Amazon Bedrock and Claude Model

Before the application can generate AI-powered property reports, you need to enable Amazon Bedrock and request access to the Claude model:

### 1. Enable Amazon Bedrock in your AWS Account

1. Navigate to the [Amazon Bedrock console](https://console.aws.amazon.com/bedrock/)
2. Choose your deployment region (must match your CDK deployment region)
3. If prompted, click "Get started" to enable Bedrock in your account

### 2. Request Access to Claude Model

1. In the Bedrock console, go to **Model access** in the left navigation
2. Click **Manage model access**
3. Find **Anthropic - Claude 3 Haiku** in the list
4. Check the box next to the model
5. Click **Request model access**
6. Review and accept the End User License Agreement (EULA)
7. Click **Submit**

> **Note:** Model access is typically granted immediately, but may take a few minutes. You can check the status in the Model access page.

### 3. Verify Model Access

1. Return to the **Model access** page
2. Confirm that **Claude 3 Haiku** shows "Access granted" status
3. Make note of the model ID: `apac.anthropic.claude-3-haiku-20240307-v1:0`

> **Important:** The AI report generation feature will not work until Bedrock access is enabled and the Claude model is available in your account.

## Step 3 - Configure Frontend

After successful deployment, you will find all the CDK stack outputs in `backend/cdk-outputs.txt`. 

Use these values to fill the respective fields in `backend/frontend-variables.txt`:

- `NEXT_PUBLIC_GRAPHQL_ENDPOINT` - Use the `GraphQLApiUrl` value from cdk-outputs.txt
- `NEXT_PUBLIC_USER_POOL_ID` - Use the `UserPoolId` value from cdk-outputs.txt  
- `NEXT_PUBLIC_USER_POOL_CLIENT_ID` - Use the `UserPoolClientId` value from cdk-outputs.txt
- `NEXT_PUBLIC_AWS_REGION` - Set this to your AWS deployment region (e.g., us-east-1)

The other values in frontend-variables.txt are already pre-configured.

## Step 4 - Configure Frontend

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm i
```

### ⚠️ IMPORTANT: Create Environment File

**Create `.env.local` file and paste all the values from `backend/frontend-variables.txt` into it.**

```bash
# Create the .env.local file in the frontend directory
cp ../backend/frontend-variables.txt .env.local
```

> **Note:** Make sure all variables in `.env.local` are properly set with the values from CDK outputs before proceeding.

Then run the development server:

```bash
npm run dev
```

## Step 5 - Cleanup Resources (Optional)

When you're done with the application and want to remove all AWS resources to avoid ongoing charges:

### ⚠️ WARNING: This will permanently delete all resources

This action will delete:
- All DynamoDB tables and data
- S3 buckets and stored files
- Lambda functions
- API Gateway and AppSync endpoints
- Cognito user pool and all user accounts
- All other AWS resources created by this stack

### To destroy all resources:

```bash
cd backend
npm run destroy
```

> **Note:** You may need to manually empty S3 buckets before the destroy command can complete successfully. If the destroy fails, check the AWS CloudFormation console for specific errors.

### Post-Cleanup:
- Remove the `.env.local` file from the frontend directory
- Clear any cached credentials or tokens from your browser