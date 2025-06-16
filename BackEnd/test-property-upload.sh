#!/bin/bash

# Test script for uploading properties with authenticated users
# This script demonstrates the complete flow of property submission

# Set AWS Profile
export AWS_PROFILE=workshop

# Configuration
USER_POOL_ID="ap-south-1_0KFpHhmL7"
CLIENT_ID="5b91j4jdmcu7bfqmmberf3udfm"
REGION="ap-south-1"
GRAPHQL_URL="" # Will be filled from CDK outputs

# Test user credentials
EMAIL="vidit0210@gmail.com"
PASSWORD="Qwerty123!"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Property Upload Test Script ===${NC}"
echo "This script demonstrates how authenticated users upload properties"
echo ""

# Step 1: Authenticate the user
echo -e "${YELLOW}Step 1: Authenticating user...${NC}"
AUTH_RESULT=$(aws cognito-idp initiate-auth \
  --client-id $CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=$EMAIL,PASSWORD="$PASSWORD" \
  --region $REGION 2>&1)

if [ $? -eq 0 ]; then
    ACCESS_TOKEN=$(echo $AUTH_RESULT | jq -r '.AuthenticationResult.AccessToken')
    ID_TOKEN=$(echo $AUTH_RESULT | jq -r '.AuthenticationResult.IdToken')
    echo -e "${GREEN}✓ Authentication successful${NC}"
else
    echo -e "${RED}✗ Authentication failed: $AUTH_RESULT${NC}"
    exit 1
fi

# Step 2: Get the GraphQL URL from CDK outputs
echo -e "${YELLOW}Step 2: Getting GraphQL API URL...${NC}"
if [ -f "cdk-outputs.json" ]; then
    GRAPHQL_URL=$(jq -r '.BackEndStack.GraphQLApiUrl' cdk-outputs.json)
    echo -e "${GREEN}✓ GraphQL URL: $GRAPHQL_URL${NC}"
else
    echo -e "${RED}✗ CDK outputs not found. Please run 'npm run deploy' first${NC}"
    exit 1
fi

# Step 3: Request upload URL for property image
echo -e "${YELLOW}Step 3: Requesting upload URL for property image...${NC}"
UPLOAD_MUTATION='
mutation GetUploadUrl {
  getUploadUrl(fileName: "property-image.jpg", contentType: "image/jpeg") {
    uploadUrl
    fileKey
  }
}'

UPLOAD_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $ACCESS_TOKEN" \
  -d "{\"query\": \"$(echo $UPLOAD_MUTATION | tr '\n' ' ')\"}" \
  $GRAPHQL_URL)

echo "Upload URL Response: $UPLOAD_RESPONSE"

# Extract upload URL and file key
UPLOAD_URL=$(echo $UPLOAD_RESPONSE | jq -r '.data.getUploadUrl.uploadUrl')
FILE_KEY=$(echo $UPLOAD_RESPONSE | jq -r '.data.getUploadUrl.fileKey')

if [ "$UPLOAD_URL" != "null" ]; then
    echo -e "${GREEN}✓ Upload URL received${NC}"
    echo "File key: $FILE_KEY"
else
    echo -e "${RED}✗ Failed to get upload URL${NC}"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

# Step 4: Create property
echo -e "${YELLOW}Step 4: Creating property listing...${NC}"
CREATE_MUTATION='
mutation CreateProperty {
  createProperty(input: {
    title: "Modern 3BR Apartment in Mumbai"
    description: "Beautiful 3 bedroom apartment with sea view"
    price: 15000000
    address: "123 Marine Drive"
    city: "Mumbai"
    state: "Maharashtra"
    zipCode: "400020"
    bedrooms: 3
    bathrooms: 2
    squareFeet: 1500
    propertyType: CONDO
    listingType: FOR_SALE
    images: ["'"$FILE_KEY"'"]
    contactName: "Vidit Shah"
    contactEmail: "vidit0210@gmail.com"
    contactPhone: "+919876543210"
    amenities: ["Gym", "Swimming Pool", "Parking"]
    yearBuilt: 2020
    parkingSpaces: 2
  }) {
    id
    title
    status
    submittedAt
  }
}'

CREATE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $ACCESS_TOKEN" \
  -d "{\"query\": \"$(echo $CREATE_MUTATION | tr '\n' ' ')\"}" \
  $GRAPHQL_URL)

echo "Create Property Response: $CREATE_RESPONSE"

PROPERTY_ID=$(echo $CREATE_RESPONSE | jq -r '.data.createProperty.id')
if [ "$PROPERTY_ID" != "null" ]; then
    echo -e "${GREEN}✓ Property created successfully${NC}"
    echo "Property ID: $PROPERTY_ID"
    echo "Status: $(echo $CREATE_RESPONSE | jq -r '.data.createProperty.status')"
else
    echo -e "${RED}✗ Failed to create property${NC}"
    echo "Response: $CREATE_RESPONSE"
fi

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"
echo ""
echo "Summary:"
echo "1. Authenticated user: $EMAIL"
echo "2. Requested pre-signed S3 upload URL"
echo "3. Created property listing"
echo "4. Property is now in PENDING_REVIEW status"
echo ""
echo "Next steps:"
echo "- Admin needs to approve the property"
echo "- Once approved, it will be visible in property listings"
echo ""
echo "To list your properties, use the listMyProperties query"
echo "To list all approved properties, use the listProperties query"