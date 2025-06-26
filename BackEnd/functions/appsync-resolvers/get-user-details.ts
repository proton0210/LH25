import { AppSyncResolverHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USER_TABLE_NAME = process.env.USER_TABLE_NAME!;

interface GetUserDetailsArguments {
  cognitoUserId: string;
}

interface UserDetails {
  userId: string;
  cognitoUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  createdAt: string;
  tier: string;
}

export const handler: AppSyncResolverHandler<GetUserDetailsArguments, UserDetails | null> = async (event) => {
  const { cognitoUserId } = event.arguments;
  const identity = event.identity as any;

  // Ensure user is authenticated
  if (!identity || !identity.username) {
    throw new Error("Unauthorized");
  }

  try {
    // Query by cognitoUserId using GSI
    const response = await docClient.send(
      new QueryCommand({
        TableName: USER_TABLE_NAME,
        IndexName: "cognitoUserId",
        KeyConditionExpression: "cognitoUserId = :cognitoUserId",
        ExpressionAttributeValues: {
          ":cognitoUserId": cognitoUserId,
        },
        Limit: 1,
      })
    );

    let user: UserDetails | null = null;
    if (response.Items && response.Items.length > 0) {
      user = response.Items[0] as UserDetails;
    }

    // Check if user has permission to view the requested user's details
    // Users can only view their own details unless they are admin
    if (user) {
      const isAdmin = identity.groups && identity.groups.includes('admin');
      const isOwnProfile = user.cognitoUserId === identity.username;
      
      if (!isAdmin && !isOwnProfile) {
        throw new Error("You don't have permission to view this user's details");
      }
    }

    return user;
  } catch (error) {
    throw error;
  }
};