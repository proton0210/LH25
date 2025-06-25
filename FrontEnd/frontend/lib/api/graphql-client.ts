import { generateClient } from "aws-amplify/api";
import { GraphQLQuery } from "@aws-amplify/api";
import * as queries from "../graphql/queries";
import * as mutations from "../graphql/mutations";

// Initialize the GraphQL client
const client = generateClient();

// Types
export interface User {
  userId: string;
  cognitoUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  createdAt: string;
  tier: string;
}

export interface Property {
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
  propertyType: PropertyType;
  listingType: ListingType;
  images: string[];
  imageUrls?: string[];
  submittedBy?: string;
  submittedAt: string;
  updatedAt: string;
  status: PropertyStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  amenities?: string[];
  yearBuilt?: number;
  lotSize?: number;
  parkingSpaces?: number;
  isPublic: boolean;
}

export enum PropertyType {
  SINGLE_FAMILY = "SINGLE_FAMILY",
  CONDO = "CONDO",
  TOWNHOUSE = "TOWNHOUSE",
  MULTI_FAMILY = "MULTI_FAMILY",
  LAND = "LAND",
  COMMERCIAL = "COMMERCIAL",
  OTHER = "OTHER",
}

export enum ListingType {
  FOR_SALE = "FOR_SALE",
  FOR_RENT = "FOR_RENT",
  SOLD = "SOLD",
  RENTED = "RENTED",
}

export enum PropertyStatus {
  PENDING_REVIEW = "PENDING_REVIEW",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  REJECTED = "REJECTED",
}

export enum ReportType {
  MARKET_ANALYSIS = "MARKET_ANALYSIS",
  INVESTMENT_ANALYSIS = "INVESTMENT_ANALYSIS",
  COMPARATIVE_MARKET_ANALYSIS = "COMPARATIVE_MARKET_ANALYSIS",
  LISTING_OPTIMIZATION = "LISTING_OPTIMIZATION",
  CUSTOM = "CUSTOM",
}

export interface PropertyConnection {
  items: Property[];
  nextToken?: string;
}

export interface PropertyFilter {
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  propertyType?: PropertyType;
  listingType?: ListingType;
  status?: PropertyStatus;
}

export interface PropertyUploadResponse {
  propertyId: string;
  message: string;
  queueMessageId?: string;
}

export interface ReportStatus {
  status: string;
  reportId?: string;
  signedUrl?: string;
  s3Key?: string;
  error?: string;
}

export interface UserReport {
  reportId: string;
  fileName: string;
  reportType: string;
  propertyTitle: string;
  createdAt: string;
  size: number;
  signedUrl: string;
  s3Key: string;
}

export interface ReportConnection {
  items: UserReport[];
  nextToken?: string;
}

export interface GenerateReportInput {
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
  propertyType: PropertyType;
  listingType: ListingType;
  yearBuilt?: number;
  lotSize?: number;
  amenities?: string[];
  reportType: ReportType;
  additionalContext?: string;
  includeDetailedAmenities?: boolean;
  cognitoUserId?: string;
}

export interface PropertyReport {
  reportId: string;
  reportType: ReportType;
  generatedAt: string;
  content: string;
  propertyTitle: string;
  executiveSummary?: string;
  marketInsights?: string;
  recommendations?: string;
  metadata?: {
    modelUsed: string;
    generationTimeMs: number;
    wordCount?: number;
  };
  signedUrl?: string;
  s3Key?: string;
  executionArn?: string;
}

export interface UpgradeUserResponse {
  success: boolean;
  message: string;
  executionArn?: string;
}

// API functions
export const api = {
  // User queries
  async getUserDetails(cognitoUserId: string): Promise<User | null> {
    try {
      const result = await client.graphql({
        query: queries.getUserDetails,
        variables: { cognitoUserId },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.getUserDetails;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error fetching user details:", error);
      throw error;
    }
  },

  // Property queries
  async listMyProperties(variables: {
    userId: string;
    limit?: number;
    nextToken?: string;
  }): Promise<PropertyConnection> {
    try {
      const result = await client.graphql({
        query: queries.listMyProperties,
        variables,
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.listMyProperties;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error fetching my properties:", error);
      throw error;
    }
  },

  async listProperties(variables?: {
    filter?: PropertyFilter;
    limit?: number;
    nextToken?: string;
  }): Promise<PropertyConnection> {
    try {
      const result = await client.graphql({
        query: queries.listProperties,
        variables,
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.listProperties;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error fetching properties:", error);
      throw error;
    }
  },

  async getProperty(id: string): Promise<Property | null> {
    try {
      const result = await client.graphql({
        query: queries.getProperty,
        variables: { id },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.getProperty;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error fetching property:", error);
      throw error;
    }
  },

  // Property mutations
  async createProperty(
    input: Omit<
      Property,
      "id" | "submittedBy" | "submittedAt" | "updatedAt" | "status" | "isPublic"
    >
  ): Promise<PropertyUploadResponse> {
    try {
      const result = await client.graphql({
        query: mutations.createProperty,
        variables: { input },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.createProperty;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error creating property:", error);
      throw error;
    }
  },

  async updateProperty(
    input: { id: string } & Partial<Property>
  ): Promise<Property> {
    try {
      const result = await client.graphql({
        query: mutations.updateProperty,
        variables: { input },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.updateProperty;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error updating property:", error);
      throw error;
    }
  },

  async deleteProperty(id: string): Promise<{ id: string }> {
    try {
      const result = await client.graphql({
        query: mutations.deleteProperty,
        variables: { id },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.deleteProperty;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error deleting property:", error);
      throw error;
    }
  },

  async getUploadUrl(
    fileName: string,
    contentType: string
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    try {
      const result = await client.graphql({
        query: mutations.getUploadUrl,
        variables: { fileName, contentType },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.getUploadUrl;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error getting upload URL:", error);
      throw error;
    }
  },

  async upgradeUserToPaid(cognitoUserId: string): Promise<UpgradeUserResponse> {
    try {
      const result = await client.graphql({
        query: mutations.upgradeUserToPaid,
        variables: { cognitoUserId },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.upgradeUserToPaid;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error upgrading user:", error);
      throw error;
    }
  },

  async listMyReports(variables?: {
    limit?: number;
    nextToken?: string;
  }): Promise<ReportConnection> {
    try {
      const result = await client.graphql({
        query: queries.listMyReports,
        variables,
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.listMyReports;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error fetching reports:", error);
      throw error;
    }
  },

  async getReportStatus(executionArn: string): Promise<ReportStatus> {
    try {
      const result = await client.graphql({
        query: queries.getReportStatus,
        variables: { executionArn },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.getReportStatus;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error fetching report status:", error);
      throw error;
    }
  },

  async generatePropertyReport(input: GenerateReportInput): Promise<PropertyReport> {
    try {
      const result = await client.graphql({
        query: mutations.generatePropertyReport,
        variables: { input },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.generatePropertyReport;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error generating property report:", error);
      throw error;
    }
  },

  // Admin functions
  async listPendingProperties(variables?: {
    limit?: number;
    nextToken?: string;
  }): Promise<PropertyConnection> {
    try {
      const result = await client.graphql({
        query: queries.listPendingProperties,
        variables,
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.listPendingProperties;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error fetching pending properties:", error);
      throw error;
    }
  },

  async approveProperty(id: string): Promise<Property> {
    try {
      const result = await client.graphql({
        query: mutations.approveProperty,
        variables: { id },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.approveProperty;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error approving property:", error);
      throw error;
    }
  },

  async rejectProperty(id: string, reason: string): Promise<Property> {
    try {
      const result = await client.graphql({
        query: mutations.rejectProperty,
        variables: { id, reason },
        authMode: 'userPool',
      });
      if ("data" in result) {
        return result.data.rejectProperty;
      }
      throw new Error("Unexpected GraphQL result type");
    } catch (error) {
      console.error("Error rejecting property:", error);
      throw error;
    }
  },
};
