import { useQuery } from '@tanstack/react-query';
import { api, type User } from '@/lib/api/graphql-client';
import { useUserStore } from '@/store/user-store';

export function useUserDetails() {
  const { userSub } = useUserStore();

  return useQuery<User | null>({
    queryKey: ['userDetails', userSub],
    queryFn: () => api.getUserDetails(userSub!),
    enabled: !!userSub,
    staleTime: 0, // Always consider data stale
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: false,
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: 'always', // Always refetch on mount
  });
}