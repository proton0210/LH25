export const createProperty = /* GraphQL */ `
  mutation CreateProperty($input: CreatePropertyInput!) {
    createProperty(input: $input) {
      id
      title
      description
      price
      address
      city
      state
      zipCode
      bedrooms
      bathrooms
      squareFeet
      propertyType
      listingType
      images
      submittedBy
      submittedAt
      updatedAt
      status
      contactName
      contactEmail
      contactPhone
      amenities
      yearBuilt
      lotSize
      parkingSpaces
      isPublic
    }
  }
`;

export const updateProperty = /* GraphQL */ `
  mutation UpdateProperty($input: UpdatePropertyInput!) {
    updateProperty(input: $input) {
      id
      title
      description
      price
      address
      city
      state
      zipCode
      bedrooms
      bathrooms
      squareFeet
      propertyType
      listingType
      images
      submittedBy
      submittedAt
      updatedAt
      status
      contactName
      contactEmail
      contactPhone
      amenities
      yearBuilt
      lotSize
      parkingSpaces
      isPublic
    }
  }
`;

export const deleteProperty = /* GraphQL */ `
  mutation DeleteProperty($id: ID!) {
    deleteProperty(id: $id) {
      id
    }
  }
`;

export const getUploadUrl = /* GraphQL */ `
  mutation GetUploadUrl($fileName: String!, $contentType: String!) {
    getUploadUrl(fileName: $fileName, contentType: $contentType) {
      uploadUrl
      fileKey
    }
  }
`;

export const upgradeUserToPaid = /* GraphQL */ `
  mutation UpgradeUserToPaid($cognitoUserId: String!) {
    upgradeUserToPaid(cognitoUserId: $cognitoUserId) {
      success
      message
      executionArn
    }
  }
`;

export const generatePropertyReport = /* GraphQL */ `
  mutation GeneratePropertyReport($input: GenerateReportInput!) {
    generatePropertyReport(input: $input) {
      reportId
      reportType
      generatedAt
      content
      propertyTitle
      executiveSummary
      marketInsights
      recommendations
      metadata {
        modelUsed
        generationTimeMs
        wordCount
      }
      signedUrl
      s3Key
      executionArn
    }
  }
`;