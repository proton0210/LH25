import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/api';
import { listMyReports } from '@/lib/graphql/queries';

interface Report {
  reportId: string;
  fileName: string;
  reportType: string;
  propertyTitle: string;
  createdAt: string;
  size: number;
  signedUrl: string;
  s3Key: string;
}

interface ReportsResponse {
  items: Report[];
  nextToken: string | null;
}

export function useReports(limit: number = 20, nextToken?: string | null) {
  const client = generateClient();

  return useQuery<ReportsResponse>({
    queryKey: ['myReports', limit, nextToken],
    queryFn: async () => {
      try {
        const response = await client.graphql({
          query: listMyReports,
          variables: { 
            limit,
            ...(nextToken && { nextToken })
          },
          authMode: 'userPool',
        });

        if ('data' in response && response.data.listMyReports) {
          return response.data.listMyReports;
        }
        
        throw new Error('Failed to fetch reports');
      } catch (error) {
        console.error('Error fetching reports:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}