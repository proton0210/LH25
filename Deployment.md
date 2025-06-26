# Deployment Guide

## Prerequisites

Before deploying the application, ensure you have the following configured:

1. **AWS CLI** - Install and configure the AWS Command Line Interface
2. **Node.js** - Stable version of Node.js installed
3. **AWS Account Access Keys** - Configure your AWS credentials

## Step 2 - Deploy Backend

To deploy the backend stack, we use our custom deployment script:

```bash
cd backend
npm i
npm run deploy  # This is our custom script that handles CDK deployment
```

## Step 3 - Configure Frontend

After successful deployment, you will find all the CDK stack outputs in `backend/cdk-outputs.txt`. 

Use these values to fill the respective fields in `backend/frontend-variables.txt`:

- `NEXT_PUBLIC_GRAPHQL_ENDPOINT` - Use the `GraphQLApiUrl` value from cdk-outputs.txt
- `NEXT_PUBLIC_USER_POOL_ID` - Use the `UserPoolId` value from cdk-outputs.txt  
- `NEXT_PUBLIC_USER_POOL_CLIENT_ID` - Use the `UserPoolClientId` value from cdk-outputs.txt

The other values in frontend-variables.txt are already pre-configured.

## Step 4 - Configure Frontend

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm i
```

Create `.env.local` file and paste all the values from `backend/frontend-variables.txt` into it.

Then run the development server:

```bash
npm run dev
```