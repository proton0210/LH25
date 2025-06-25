'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Hub } from 'aws-amplify/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  signIn,
  signOut,
  signUp,
  confirmSignUpCode,
  resendConfirmationCode,
  forgotPassword,
  confirmForgotPassword,
  getAuthUser,
  isAuthenticated,
  getUserGroups,
  isAdmin,
  isPaidUser,
  type AuthUser,
} from '@/lib/auth';
import { useUserStore } from '@/store/user-store';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, customAttributes?: {
    firstName?: string;
    lastName?: string;
    contactNumber?: string;
  }) => Promise<any>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isPaidUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const { setUser: setUserInStore, clearUser } = useUserStore();
  const queryClient = useQueryClient();

  const refreshUser = async () => {
    try {
      setLoading(true);
      const authUser = await getAuthUser();
      setUser(authUser);
      if (authUser) {
        const groups = await getUserGroups();
        setUserGroups(groups);
        // Store user sub and email in Zustand store
        setUserInStore(authUser.userId, authUser.email || '');
      } else {
        setUserGroups([]);
        clearUser();
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const hubListener = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          // Invalidate cache when user signs in
          queryClient.invalidateQueries({ queryKey: ['userDetails'] });
          refreshUser();
          break;
        case 'signedOut':
          setUser(null);
          setUserGroups([]);
          clearUser();
          // Clear all cached data on sign out
          queryClient.clear();
          break;
        case 'tokenRefresh':
          // Invalidate cache on token refresh
          queryClient.invalidateQueries({ queryKey: ['userDetails'] });
          refreshUser();
          break;
        case 'tokenRefresh_failure':
          console.error('Token refresh failed');
          break;
      }
    });

    // Handle tab visibility changes to sync auth state
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When tab becomes visible, refresh user state
        refreshUser();
      }
    };

    // Handle storage events for cross-tab synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'amplify-signin-with-hostedUI' || e.key?.includes('CognitoIdentityServiceProvider')) {
        // Auth state changed in another tab
        refreshUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      hubListener();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const authSignIn = async (email: string, password: string) => {
    try {
      setError(null);
      await signIn(email, password);
      // Invalidate user details cache to force fresh fetch
      queryClient.invalidateQueries({ queryKey: ['userDetails'] });
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      throw err;
    }
  };

  const authSignOut = async () => {
    try {
      setError(null);
      await signOut();
      setUser(null);
      setUserGroups([]);
      clearUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
      throw err;
    }
  };

  const authSignUp = async (email: string, password: string, customAttributes?: {
    firstName?: string;
    lastName?: string;
    contactNumber?: string;
  }) => {
    try {
      setError(null);
      return await signUp(email, password, customAttributes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
      throw err;
    }
  };

  const authConfirmSignUp = async (email: string, code: string) => {
    try {
      setError(null);
      await confirmSignUpCode(email, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm sign up');
      throw err;
    }
  };

  const authResendConfirmationCode = async (email: string) => {
    try {
      setError(null);
      await resendConfirmationCode(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
      throw err;
    }
  };

  const authForgotPassword = async (email: string) => {
    try {
      setError(null);
      await forgotPassword(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate password reset');
      throw err;
    }
  };

  const authConfirmForgotPassword = async (
    email: string,
    code: string,
    newPassword: string
  ) => {
    try {
      setError(null);
      await confirmForgotPassword(email, code, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn: authSignIn,
    signOut: authSignOut,
    signUp: authSignUp,
    confirmSignUp: authConfirmSignUp,
    resendConfirmationCode: authResendConfirmationCode,
    forgotPassword: authForgotPassword,
    confirmForgotPassword: authConfirmForgotPassword,
    refreshUser,
    isAdmin: userGroups.includes('admin'),
    isPaidUser: userGroups.includes('paid'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}