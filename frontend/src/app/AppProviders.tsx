import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './queryClient';
import { router } from './routes';
import { appTheme } from '@/theme';

/**
 * Tích hợp toàn bộ provider ở MỘT nơi duy nhất:
 * - QueryClientProvider : server state
 * - ConfigProvider      : theme Sổ Tín Dụng + locale tiếng Việt
 * - AntdApp             : context cho message / notification / modal
 * - RouterProvider      : routing
 */
export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={appTheme} locale={viVN} modal={{ closable: { 'aria-label': 'Đóng' } }} drawer={{ closable: { 'aria-label': 'Đóng' } }}>
        <AntdApp
          notification={{ placement: 'topRight', duration: 4 }}
          message={{ duration: 2.5, maxCount: 3 }}
        >
          <RouterProvider router={router} />
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
