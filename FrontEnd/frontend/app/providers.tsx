'use client';

import { Amplify } from 'aws-amplify';
import amplifyConfig from '@/lib/amplify-config';
import { ReactNode, useEffect } from 'react';
import { AuthProvider } from '@/hooks/useAuth';

Amplify.configure(amplifyConfig);

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Any additional initialization can go here
  }, []);

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}