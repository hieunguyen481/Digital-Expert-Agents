import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { RequireAuth } from '@/auth/RequireAuth';
import { Navigate } from 'react-router-dom';
import ChatPage from '@/pages/ChatPage';
import { AppLayout } from '@/features/shell/AppLayout';

/**
 * Khai báo route TẬP TRUNG.
 * Không khai báo route rải rác trong component.
 *
 * - `/login`        : trang đăng nhập (route công khai duy nhất).
 * - `/` chuyển `/viec-cua-toi` (Việc của tôi); `/chat`: trò chuyện SH-AI.
 * - Tất cả nằm trong layout route AppLayout (rail, topbar, panel AI).
 * - `/dashboard`    : bảng điều khiển agent.
 * - `/customer/:id` : hồ sơ chi tiết khách hàng.
 * - `/foundation`   : trang kiểm thử nền tảng (chỉ khi DEV).
 * - `*`             : trang không tìm thấy.
 *
 * Mọi route nghiệp vụ đều bọc RequireAuth: chưa đăng nhập sẽ được đưa về
 * `/login?returnTo=...` và quay lại đúng trang sau khi xác thực.
 */

// Lazy-load các trang phụ: chúng không nằm trên đường đi chính của người dùng.
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const FoundationPage = lazy(() => import('@/pages/FoundationPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const AgentDashboardPage = lazy(() => import('@/pages/AgentDashboardPage'));
const MyWorkPage = lazy(() => import('@/features/my-work/MyWorkPage'));
const CustomerDetailPage = lazy(() => import('@/pages/CustomerDetailPage'));

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<LoadingScreen message="Đang tải trang" />}>{node}</Suspense>;
}

function protectedPage(node: React.ReactNode) {
  return <RequireAuth>{node}</RequireAuth>;
}

export const routeObjects: RouteObject[] = [
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    element: protectedPage(<AppLayout />),
    children: [
      { path: '/', element: <Navigate to="/viec-cua-toi" replace /> },
      { path: '/viec-cua-toi', element: withSuspense(<MyWorkPage />) },
      { path: '/chat', element: <ChatPage /> },
      { path: '/dashboard', element: withSuspense(<AgentDashboardPage />) },
      { path: '/customer/:id', element: withSuspense(<CustomerDetailPage />) },
      ...(import.meta.env.DEV ? [{ path: '/foundation', element: withSuspense(<FoundationPage />) }] : []),
    ],
  },
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
  },
];

export const router = createBrowserRouter(routeObjects);
