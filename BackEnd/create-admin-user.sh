#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Creating Admin User Script${NC}"
echo "==============================="

# Get the CDK outputs
echo -e "\n${YELLOW}Reading CDK outputs...${NC}"
if [ ! -f "cdk-outputs.json" ]; then
    echo -e "${RED}Error: cdk-outputs.json not found. Please run 'cdk deploy' first.${NC}"
    exit 1
fi

# Extract values from cdk-outputs.json
USER_POOL_ID=$(cat cdk-outputs.json | grep -o '"UserPoolId": "[^"]*"' | cut -d'"' -f4)
USER_TABLE_NAME=$(cat cdk-outputs.json | grep -o '"UserTableName": "[^"]*"' | cut -d'"' -f4)
USER_FILES_BUCKET=$(cat cdk-outputs.json | grep -o '"UserFilesBucketName": "[^"]*"' | cut -d'"' -f4)

if [ -z "$USER_POOL_ID" ] || [ -z "$USER_TABLE_NAME" ]; then
    echo -e "${RED}Error: Could not extract required values from cdk-outputs.json${NC}"
    exit 1
fi

echo "User Pool ID: $USER_POOL_ID"
echo "User Table: $USER_TABLE_NAME"
echo "User Files Bucket: $USER_FILES_BUCKET"

# Admin user details
ADMIN_EMAIL="admin@lambda.com"
ADMIN_PASSWORD="Lambda123!"
ADMIN_FIRST_NAME="Admin"
ADMIN_LAST_NAME="User"
ADMIN_PHONE="+11234567890"

echo -e "\n${YELLOW}Creating admin user in Cognito...${NC}"

# Create user in Cognito
aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --user-attributes \
        Name=email,Value="$ADMIN_EMAIL" \
        Name=email_verified,Value=true \
        Name=custom:firstName,Value="$ADMIN_FIRST_NAME" \
        Name=custom:lastName,Value="$ADMIN_LAST_NAME" \
        Name=custom:contactNumber,Value="$ADMIN_PHONE" \
    --message-action SUPPRESS \
    --temporary-password "$ADMIN_PASSWORD" 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}Error creating user in Cognito. User might already exist.${NC}"
    
    # Try to get existing user
    COGNITO_USER=$(aws cognito-idp admin-get-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$ADMIN_EMAIL" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo -e "${YELLOW}User already exists. Continuing...${NC}"
        COGNITO_USER_ID=$(echo "$COGNITO_USER" | grep -o '"Username": "[^"]*"' | head -1 | cut -d'"' -f4)
    else
        echo -e "${RED}Failed to create or find user.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}User created successfully in Cognito${NC}"
    
    # Set permanent password
    echo -e "\n${YELLOW}Setting permanent password...${NC}"
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$USER_POOL_ID" \
        --username "$ADMIN_EMAIL" \
        --password "$ADMIN_PASSWORD" \
        --permanent
    
    # Get the Cognito user ID
    COGNITO_USER=$(aws cognito-idp admin-get-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$ADMIN_EMAIL")
    
    COGNITO_USER_ID=$(echo "$COGNITO_USER" | grep -o '"Username": "[^"]*"' | head -1 | cut -d'"' -f4)
fi

echo "Cognito User ID: $COGNITO_USER_ID"

# Add user to admin group
echo -e "\n${YELLOW}Adding user to admin group...${NC}"
aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$USER_POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --group-name "admin"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}User added to admin group successfully${NC}"
else
    echo -e "${RED}Error adding user to admin group${NC}"
fi

# Generate a unique user ID using timestamp and random string
USER_ID="01$(date +%s)$(openssl rand -hex 6 | tr '[:lower:]' '[:upper:]')"
CREATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

echo -e "\n${YELLOW}Creating user in DynamoDB...${NC}"
echo "User ID: $USER_ID"

# Create user in DynamoDB
aws dynamodb put-item \
    --table-name "$USER_TABLE_NAME" \
    --item "{
        \"userId\": {\"S\": \"$USER_ID\"},
        \"cognitoUserId\": {\"S\": \"$COGNITO_USER_ID\"},
        \"email\": {\"S\": \"$ADMIN_EMAIL\"},
        \"firstName\": {\"S\": \"$ADMIN_FIRST_NAME\"},
        \"lastName\": {\"S\": \"$ADMIN_LAST_NAME\"},
        \"contactNumber\": {\"S\": \"$ADMIN_PHONE\"},
        \"createdAt\": {\"S\": \"$CREATED_AT\"},
        \"tier\": {\"S\": \"admin\"}
    }"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}User created in DynamoDB successfully${NC}"
else
    echo -e "${RED}Error creating user in DynamoDB${NC}"
    exit 1
fi

# Create S3 folder for the user
echo -e "\n${YELLOW}Creating S3 folder for admin user...${NC}"
echo "test" | aws s3 cp - "s3://$USER_FILES_BUCKET/$USER_ID/.initialized" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}S3 folder created successfully${NC}"
else
    echo -e "${YELLOW}Warning: Could not create S3 folder${NC}"
fi

echo -e "\n${GREEN}✅ Admin user created successfully!${NC}"
echo "==============================="
echo "Email: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
echo "User ID: $USER_ID"
echo "Cognito ID: $COGNITO_USER_ID"
echo "Groups: admin"
echo "Tier: admin"
echo "==============================="