import apiClient from '@/services/apiClient';
import type { QueueFilter, WorkItemsResponse } from './types';

export async function fetchWorkItems(filter: QueueFilter): Promise<WorkItemsResponse> {
  const response = await apiClient.get<WorkItemsResponse>('/work-items', {
    params: { filter },
  });
  return response.data;
}
