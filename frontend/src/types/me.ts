/** Khớp `MeResponse` của backend (GET /api/v1/me). */
export interface Me {
  employee_id: string;
  subject: string;
  branch_id: string;
  roles: string[];
  permissions: string[];
  is_admin: boolean;
  full_name: string;
  email: string | null;
  branch_code: string;
  branch_name: string;
  approval_tier: number | null;
}
