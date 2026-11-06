import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApiError } from '@/types/api';
import type { QueueFilter, WorkItemsResponse } from './types';
import { fetchWorkItems } from './workItemService';

export function useWorkItems(filter: QueueFilter, enabled = true): UseQueryResult<WorkItemsResponse, ApiError> {
  return useQuery<WorkItemsResponse, ApiError>({
    queryKey: ['work-items', filter],
    queryFn: () => fetchWorkItems(filter),
    enabled,
    refetchOnWindowFocus: true,
  });
}
