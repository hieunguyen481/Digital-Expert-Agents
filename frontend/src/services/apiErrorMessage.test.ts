import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './apiClient';

describe('getErrorMessage', () => {
  it('dịch mã lỗi phân công khách sang tiếng Việt thay vì câu tiếng Anh của backend', () => {
    const err = new AxiosError('x', '409', undefined, undefined, {
      status: 409, statusText: '', headers: {}, config: {} as never,
      data: { error: { code: 'CUSTOMER_ALREADY_ASSIGNED', message: 'The customer is assigned to another employee or has changed.' } },
    });
    const msg = getErrorMessage(err);
    expect(msg).toContain('cán bộ khác');
    expect(msg).not.toMatch(/The customer/);
  });
});
