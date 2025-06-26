import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;

interface SavePropertyEvent {
  propertyData: {
    id: string;
    title: string;
    description: string;
    price: number;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    propertyType: string;
    listingType: string;
    images: string[];
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    amenities?: string[];
    yearBuilt?: number;
    lotSize?: number;
    parkingSpaces?: number;
    userId?: string;
    cognitoUserId?: string;
  };
}

interface SavePropertyResult {
  success: boolean;
  property?: any;
  error?: string;
}

export const handler = async (
  event: SavePropertyEvent
): Promise<SavePropertyResult> => {
  console.log('Save property event:', JSON.stringify(event, null, 2));

  try {
    const { propertyData } = event;
    const now = new Date().toISOString();

    // Determine submittedBy based on user identifiers
    const submittedBy = propertyData.cognitoUserId || propertyData.userId || undefined;
    
    console.log('User identification for property:', {
      cognitoUserId: propertyData.cognitoUserId,
      userId: propertyData.userId,
      submittedBy: submittedBy,
      hasSubmittedBy: !!submittedBy
    });

    // Create property object
    const property = {
      id: propertyData.id,
      title: propertyData.title,
      description: propertyData.description,
      price: propertyData.price,
      address: propertyData.address,
      city: propertyData.city,
      state: propertyData.state,
      zipCode: propertyData.zipCode,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      squareFeet: propertyData.squareFeet,
      propertyType: propertyData.propertyType,
      listingType: propertyData.listingType,
      images: propertyData.images,
      contactName: propertyData.contactName,
      contactEmail: propertyData.contactEmail,
      contactPhone: propertyData.contactPhone,
      amenities: propertyData.amenities || [],
      yearBuilt: propertyData.yearBuilt,
      lotSize: propertyData.lotSize,
      parkingSpaces: propertyData.parkingSpaces,
      submittedBy,
      submittedAt: now,
      updatedAt: now,
      status: 'PENDING_REVIEW', // All new properties start as pending review
      isPublic: true, // Public submissions are always public
    };

    // Add GSI attributes for querying
    const dynamoItem = {
      ...property,
      pk: `PROPERTY#${property.id}`,
      sk: `PROPERTY#${property.id}`,
      // GSI1: Query by status
      gsi1pk: `STATUS#${property.status}`,
      gsi1sk: `SUBMITTED#${property.submittedAt}`,
      // GSI2: Query by city/state
      gsi2pk: `LOCATION#${property.state}#${property.city}`,
      gsi2sk: `PRICE#${property.price.toString().padStart(10, '0')}`,
      // GSI3: Query by property type
      gsi3pk: `TYPE#${property.propertyType}`,
      gsi3sk: `SUBMITTED#${property.submittedAt}`,
      // GSI4: Query by listing type
      gsi4pk: `LISTING#${property.listingType}`,
      gsi4sk: `PRICE#${property.price.toString().padStart(10, '0')}`,
      // GSI5: Query by submittedBy (if authenticated)
      ...(submittedBy && {
        gsi5pk: `USER#${submittedBy}`,
        gsi5sk: `SUBMITTED#${property.submittedAt}`,
      }),
    };
    
    console.log('GSI5 configuration:', {
      hasSubmittedBy: !!submittedBy,
      gsi5pk: submittedBy ? `USER#${submittedBy}` : 'NOT SET',
      gsi5sk: submittedBy ? `SUBMITTED#${property.submittedAt}` : 'NOT SET'
    });

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: dynamoItem,
      ConditionExpression: 'attribute_not_exists(pk)', // Ensure uniqueness
    }));

    console.log('Property saved successfully:', {
      propertyId: property.id,
      hasGSI5: !!submittedBy,
      submittedBy: submittedBy || 'anonymous'
    });

    return {
      success: true,
      property
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save property'
    };
  }
};