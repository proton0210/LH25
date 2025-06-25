import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Property, type PropertyConnection, type PropertyFilter } from '@/lib/api/graphql-client';

export function useMyProperties(limit?: number, nextToken?: string) {
  return useQuery<PropertyConnection>({
    queryKey: ['myProperties', limit, nextToken],
    queryFn: () => api.listMyProperties({ limit, nextToken }),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProperties(filter?: PropertyFilter, limit?: number, nextToken?: string) {
  return useQuery<PropertyConnection>({
    queryKey: ['properties', filter, limit, nextToken],
    queryFn: () => api.listProperties({ filter, limit, nextToken }),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProperty(id: string) {
  return useQuery<Property | null>({
    queryKey: ['property', id],
    queryFn: () => api.getProperty(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.updateProperty,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property', data.id] });
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}