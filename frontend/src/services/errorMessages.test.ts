import { describe, expect, it } from 'vitest';
import { isVietnamese, translateServerError } from './errorMessages';

describe('translateServerError (L04)', () => {
  it('dịch lý do upload sai loại / sai kích thước', () => {
    const t = (reason: string) => translateServerError({ status: 422, code: 'VALIDATION_FAILED', message: 'The request is invalid.', details: { reason } });
    expect(t('Unsupported document MIME type')).toMatch(/Định dạng tệp/);
    expect(t('Document size is outside the permitted range')).toMatch(/Kích thước tệp/);
  });
  it('dịch theo mã, kể cả mã mới của số tiền duyệt', () => {
    expect(translateServerError({ status: 422, code: 'APPROVED_AMOUNT_EXCEEDS_REQUESTED', message: 'The approved amount must not exceed the requested amount.' })).toBe('Số tiền duyệt không được vượt số tiền đề xuất.');
    expect(translateServerError({ status: 404, code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found.' })).toMatch(/Không tìm thấy/);
  });
  it('giữ câu tiếng Việt của backend, chặn tiếng Anh lạ', () => {
    expect(translateServerError({ status: 404, code: 'LOAN_NOT_FOUND', message: 'Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem.' })).toMatch(/Không tìm thấy hồ sơ/);
    const out = translateServerError({ status: 422, code: 'VALIDATION_FAILED', message: 'The request is invalid.', details: { reason: 'objective must not be empty' } });
    expect(isVietnamese(out)).toBe(true);
  });
});
