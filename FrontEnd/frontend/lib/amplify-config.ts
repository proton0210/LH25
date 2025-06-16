import { Amplify } from 'aws-amplify';

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
      signUpVerificationMethod: 'code',
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
    }
  },
  Storage: {
    S3: {
      bucket: process.env.NEXT_PUBLIC_USER_FILES_BUCKET!,
      region: process.env.NEXT_PUBLIC_AWS_REGION!,
    }
  }
};

// User groups configuration
export const USER_GROUPS = {
  ADMIN: process.env.NEXT_PUBLIC_ADMIN_GROUP!,
  PAID: process.env.NEXT_PUBLIC_PAID_GROUP!,
  USER: process.env.NEXT_PUBLIC_USER_GROUP!,
} as const;

// Table names
export const TABLES = {
  USERS: process.env.NEXT_PUBLIC_USER_TABLE_NAME!,
} as const;

// Lambda ARNs
export const LAMBDAS = {
  POST_CONFIRMATION: process.env.NEXT_PUBLIC_POST_CONFIRMATION_LAMBDA!,
} as const;

// State Machine ARNs
export const STATE_MACHINES = {
  USER_CREATION: process.env.NEXT_PUBLIC_USER_CREATION_STATE_MACHINE!,
} as const;

export default amplifyConfig;