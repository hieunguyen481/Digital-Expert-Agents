import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { ApiError } from '@/types/api';
import type { Me } from '@/types/me';
import { uiRoleFromRoles, type UiRole } from './roleFromMe';

export const ME_QUERY_KEY = ['me'] as const;

async function fetchMe(): Promise<Me> {
  const response = await apiClient.get<Me>('/me');
  return response.data;
}

/** Hồ sơ người đăng nhập từ backend; nguồn duy nhất cho tên, chi nhánh, vai trò hiển thị. */
export function useMe(): UseQueryResult<Me, ApiError> {
  return useQuery<Me, ApiError>({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
  });
}

/** `undefined` khi chưa có `Me`; `null` khi có nhưng không khớp vai trò nào. */
export function useUiRole(): UiRole | null | undefined {
  const { data } = useMe();
  return data ? uiRoleFromRoles(data.roles) : undefined;
}
