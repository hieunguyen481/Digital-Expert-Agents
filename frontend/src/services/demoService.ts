import apiClient from '@/services/apiClient';

export interface DemoAccount {
  email: string;
  full_name: string;
  roles: string[];
}
export interface DemoToken {
  access_token: string;
  expires_in: number;
  account: DemoAccount;
}

/** Chế độ demo tắt thì backend trả 404; người gọi coi đó là "không có chế độ demo". */
export async function getDemoAccounts(): Promise<DemoAccount[]> {
  return (await apiClient.get<DemoAccount[]>('/demo/accounts')).data;
}

export async function switchDemoAccount(email: string): Promise<DemoToken> {
  return (await apiClient.post<DemoToken>('/demo/switch', { email })).data;
}
