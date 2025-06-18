export const getUserDetails = /* GraphQL */ `
  query GetUserDetails($cognitoUserId: String!) {
    getUserDetails(cognitoUserId: $cognitoUserId) {
      userId
      cognitoUserId
      email
      firstName
      lastName
      contactNumber
      createdAt
      tier
    }
  }
`;

export const listMyProperties = /* GraphQL */ `
  query ListMyProperties($limit: Int, $nextToken: String) {
    listMyProperties(limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
    }
  }
`;

export const listProperties = /* GraphQL */ `
  query ListProperties(
    $filter: PropertyFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listProperties(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
    }
  }
`;

export const getProperty = /* GraphQL */ `
  query GetProperty($id: ID!) {
    getProperty(id: $id) {
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