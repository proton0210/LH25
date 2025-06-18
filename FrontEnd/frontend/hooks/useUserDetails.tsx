import { useQuery } from '@tanstack/react-query';
import { api, type User } from '@/lib/api/graphql-client';
import { useUserStore } from '@/store/user-store';

export function useUserDetails() {
  const { userSub } = useUserStore();

  return useQuery<User | null>({
    queryKey: ['userDetails', userSub],
    queryFn: () => api.getUserDetails(userSub!),
    enabled: !!userSub,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}