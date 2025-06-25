import { 
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  updateUserAttributes,
  confirmUserAttribute,
  deleteUser
} from 'aws-amplify/auth';
import { USER_GROUPS } from './amplify-config';

export interface AuthUser {
  username: string;
  userId: string;
  email?: string;
  groups?: string[];
}

export async function signUp(email: string, password: string, customAttributes?: {
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
}) {
  try {
    const { isSignUpComplete, userId, nextStep } = await amplifySignUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          ...(customAttributes?.firstName && { 'custom:firstName': customAttributes.firstName }),
          ...(customAttributes?.lastName && { 'custom:lastName': customAttributes.lastName }),
          ...(customAttributes?.contactNumber && { 'custom:contactNumber': customAttributes.contactNumber }),
        },
      },
    });
    
    return { isSignUpComplete, userId, nextStep };
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}

export async function confirmSignUpCode(email: string, code: string) {
  try {
    const { isSignUpComplete, nextStep } = await confirmSignUp({
      username: email,
      confirmationCode: code,
    });
    
    return { isSignUpComplete, nextStep };
  } catch (error) {
    console.error('Error confirming sign up:', error);
    throw error;
  }
}

export async function resendConfirmationCode(email: string) {
  try {
    await resendSignUpCode({ username: email });
  } catch (error) {
    console.error('Error resending confirmation code:', error);
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  try {
    // Check if user is already signed in before attempting to sign in
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // If user is already signed in, return success
        return { isSignedIn: true, nextStep: { signInStep: 'DONE' } };
      }
    } catch {
      // No current user, proceed with sign in
    }

    const { isSignedIn, nextStep } = await amplifySignIn({
      username: email,
      password,
    });
    
    return { isSignedIn, nextStep };
  } catch (error) {
    console.error('Error signing in:', error);
    // Handle the "already signed in" error specifically
    if (error instanceof Error && error.message.includes('already a signed in user')) {
      // Return success if user is already signed in
      return { isSignedIn: true, nextStep: { signInStep: 'DONE' } };
    }
    throw error;
  }
}

export async function signOut() {
  try {
    await amplifySignOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const attributes = await fetchUserAttributes();
    
    const groups = session.tokens?.idToken?.payload['cognito:groups'] as string[] | undefined;
    
    return {
      username: user.username,
      userId: user.userId,
      email: attributes.email,
      groups: groups || [],
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return !!user;
  } catch {
    return false;
  }
}

export async function getUserGroups(): Promise<string[]> {
  try {
    const session = await fetchAuthSession();
    const groups = session.tokens?.idToken?.payload['cognito:groups'] as string[] | undefined;
    return groups || [];
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
}

export async function isUserInGroup(group: string): Promise<boolean> {
  const groups = await getUserGroups();
  return groups.includes(group);
}

export async function isAdmin(): Promise<boolean> {
  return isUserInGroup(USER_GROUPS.ADMIN);
}

export async function isPaidUser(): Promise<boolean> {
  return isUserInGroup(USER_GROUPS.PAID);
}

export async function forgotPassword(email: string) {
  try {
    const output = await resetPassword({ username: email });
    return output;
  } catch (error) {
    console.error('Error initiating password reset:', error);
    throw error;
  }
}

export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
) {
  try {
    await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword,
    });
  } catch (error) {
    console.error('Error confirming password reset:', error);
    throw error;
  }
}

export async function getIdToken(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  } catch (error) {
    console.error('Error getting ID token:', error);
    return undefined;
  }
}

export async function getAccessToken(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString();
  } catch (error) {
    console.error('Error getting access token:', error);
    return undefined;
  }
}