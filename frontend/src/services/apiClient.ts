import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_ERROR_CODES, type ApiError } from '@/types/api';
import { getValidAccessToken } from '@/auth/keycloak';
import { translateServerError } from './errorMessages';

/**
 * Axios instance DUY NHẤT của ứng dụng.
 *
 * Quy tắc:
 * - Component không bao giờ import file này trực tiếp.
 *   Luồng đúng: component -> query hook -> service -> apiClient.
 * - Không log token, OTP, mật khẩu hay nội dung file.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ---------------- Request interceptor ---------------- */

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getValidAccessToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    // Chỉ log method + đường dẫn ở môi trường dev.
    // KHÔNG log headers (chứa token) và KHÔNG log body (có thể chứa dữ liệu nhạy cảm).
    if (import.meta.env.DEV) {
      console.info(`[api] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error: unknown) => Promise.reject(normalizeError(error)),
);

/* ---------------- Response interceptor ---------------- */

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    // 401: token có thể vừa hết hạn phía server. Làm mới cưỡng bức rồi gửi lại đúng một lần;
    // làm mới lỗi thì getValidAccessToken tự chuyển về /login.
    if (axios.isAxiosError(error) && error.response?.status === 401 && error.config) {
      const config = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
      if (!config._retried) {
        config._retried = true;
        try {
          const token = await getValidAccessToken(true);
          if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
            return apiClient.request(config);
          }
        } catch (refreshError) {
          return Promise.reject(normalizeError(refreshError));
        }
      }
    }
    return Promise.reject(normalizeError(error));
  },
);

/* ---------------- Error normalization ---------------- */

interface ServerErrorBody {
  code?: string;
  message?: string;
  errors?: unknown;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    trace_id?: string;
  };
}

/** Thông điệp tiếng Việt an toàn cho người dùng cuối — không lộ stack trace. */
const USER_MESSAGE: Record<string, string> = {
  [API_ERROR_CODES.timeout]: 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.',
  [API_ERROR_CODES.network]: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.',
  [API_ERROR_CODES.notFound]: 'Không tìm thấy dữ liệu yêu cầu.',
  [API_ERROR_CODES.unauthorized]: 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.',
  [API_ERROR_CODES.server]: 'Hệ thống đang bận. Vui lòng thử lại sau ít phút.',
  [API_ERROR_CODES.validation]: 'Dữ liệu gửi lên không hợp lệ.',
  [API_ERROR_CODES.unknown]: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
};

/** Mã lỗi nghiệp vụ của backend (thông điệp gốc tiếng Anh) -> câu tiếng Việt cho người dùng. */
const BACKEND_CODE_MESSAGE: Record<string, string> = {
  CUSTOMER_ALREADY_ASSIGNED: 'Khách hàng này đang do cán bộ khác phụ trách hoặc vừa thay đổi. Hãy chọn khách hàng khác hoặc tải lại danh sách.',
  CUSTOMER_NOT_FOUND: 'Không tìm thấy khách hàng hoặc khách hàng nằm ngoài phạm vi của bạn.',
};

/**
 * Chuẩn hoá mọi lỗi (Axios / network / lỗi lạ) về `ApiError`.
 * Nhờ vậy UI chỉ cần xử lý một hình dạng lỗi duy nhất.
 */
export function normalizeError(error: unknown): ApiError {
  // AxiosError cũng có `code` + `message` nên phải xử lý nhánh axios trước type guard.
  if (!axios.isAxiosError(error) && isApiError(error)) return error;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ServerErrorBody>;

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return {
        code: API_ERROR_CODES.timeout,
        message: USER_MESSAGE[API_ERROR_CODES.timeout],
      };
    }

    if (!axiosError.response) {
      return {
        code: API_ERROR_CODES.network,
        message: USER_MESSAGE[API_ERROR_CODES.network],
      };
    }

    const status = axiosError.response.status;
    const body = axiosError.response.data;
    const code = resolveCodeFromStatus(status);

    const backendError = body?.error;
    const serverCode = backendError?.code ?? body?.code;
    const serverDetails = backendError?.details ?? body?.errors;
    return {
      code: serverCode ?? code,
      // Bản dịch riêng theo mã trước; còn lại đi qua bản dịch dùng chung, không để lọt tiếng Anh thô.
      message:
        (serverCode ? BACKEND_CODE_MESSAGE[serverCode] : undefined) ??
        translateServerError({
          status,
          code: serverCode,
          message: backendError?.message ?? body?.message,
          details: serverDetails,
        }),
      status,
      details: backendError?.details ?? body?.errors,
    };
  }

  // Error thường trong codebase mang thông điệp tiếng Việt viết cho người
  // dùng (vd: "Vui lòng chọn khách hàng trước khi tải tài liệu.") — giữ nguyên
  // thay vì ép về câu chung chung.
  if (error instanceof Error && error.message) {
    return { code: API_ERROR_CODES.unknown, message: error.message };
  }

  return {
    code: API_ERROR_CODES.unknown,
    message: USER_MESSAGE[API_ERROR_CODES.unknown],
  };
}

function resolveCodeFromStatus(status: number): string {
  if (status === 401 || status === 403) return API_ERROR_CODES.unauthorized;
  if (status === 404) return API_ERROR_CODES.notFound;
  if (status === 422 || status === 400) return API_ERROR_CODES.validation;
  if (status >= 500) return API_ERROR_CODES.server;
  return API_ERROR_CODES.unknown;
}

/** Type guard — dùng ở UI để đọc `error.message` an toàn. */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as ApiError).message === 'string'
  );
}

/** Lấy thông điệp hiển thị cho người dùng từ bất kỳ lỗi nào. */
export function getErrorMessage(error: unknown): string {
  return normalizeError(error).message;
}

/** Cờ bật mock API — chỉ bật khi VITE_USE_MOCK_API đặt đúng `true`; mặc định tắt. */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export default apiClient;
