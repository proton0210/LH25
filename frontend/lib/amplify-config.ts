import { Amplify } from "aws-amplify";

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
      region: process.env.NEXT_PUBLIC_AWS_REGION!,
      loginWith: {
        email: true,
        username: false,
      },
      signUpVerificationMethod: "code",
      userAttributes: {
        email: {
          required: true,
        },
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
      // Add cookie storage for better cross-tab synchronization
      cookieStorage: {
        domain:
          typeof window !== "undefined"
            ? window.location.hostname
            : "localhost",
        path: "/",
        expires: 7, // 7 days
        sameSite: "lax",
        secure:
          typeof window !== "undefined"
            ? window.location.protocol === "https:"
            : false,
      },
    },
  },

  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!,
      region: process.env.NEXT_PUBLIC_AWS_REGION!,
      defaultAuthMode: "userPool" as any,
    },
  },
};

// User groups configuration
export const USER_GROUPS = {
  ADMIN: process.env.NEXT_PUBLIC_ADMIN_GROUP!,
  PAID: process.env.NEXT_PUBLIC_PAID_GROUP!,
  USER: process.env.NEXT_PUBLIC_USER_GROUP!,
} as const;

export default amplifyConfig;
