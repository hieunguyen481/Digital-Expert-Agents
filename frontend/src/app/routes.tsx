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
 * - `/` chuyển `/viec-cua-toi` (Việc của tôi); `/chat`: trò chuyện Trợ lý AI.
 * - Tất cả nằm trong layout route AppLayout (rail, topbar, panel AI).
 * - `/dashboard`    : bảng điều khiển agent.
 * - `/de-xuat-vay`   : tạo đề xuất vay (04); `/de-xuat-vay/:loanId`: soạn nháp.
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
const ProposalPage = lazy(() => import('@/features/proposal/ProposalPage'));
const NewProposalPage = lazy(() => import('@/features/proposal/NewProposalPage'));
const LoanDetailPage = lazy(() => import('@/features/loan-detail/LoanDetailPage'));
const ReconciliationPage = lazy(() => import('@/features/reconciliation/ReconciliationPage'));
const ReconciliationIndexPage = lazy(() => import('@/features/reconciliation/ReconciliationIndexPage'));
const AuditLogPage = lazy(() => import('@/features/audit/AuditLogPage'));
const PolicyPage = lazy(() => import('@/features/policy/PolicyPage'));
const CustomerListPage = lazy(() => import('@/features/customers/CustomerListPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'));
const CustomerDetailPage = lazy(() => import('@/features/customers/CustomerDetailPage'));

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
      { path: '/de-xuat-vay', element: withSuspense(<NewProposalPage />) },
      { path: '/de-xuat-vay/:loanId', element: withSuspense(<ProposalPage />) },
      { path: '/ho-so-vay/:loanId', element: withSuspense(<LoanDetailPage />) },
      { path: '/doi-chieu', element: withSuspense(<ReconciliationIndexPage />) },
      { path: '/doi-chieu/:loanId', element: withSuspense(<ReconciliationPage />) },
      { path: '/nhat-ky-kiem-toan', element: withSuspense(<AuditLogPage />) },
      { path: '/tra-cuu-chinh-sach', element: withSuspense(<PolicyPage />) },
      { path: '/chat', element: <ChatPage /> },
      { path: '/dashboard', element: withSuspense(<AgentDashboardPage />) },
      { path: '/thong-bao', element: withSuspense(<NotificationsPage />) },
      { path: '/khach-hang', element: withSuspense(<CustomerListPage />) },
      { path: '/customer/:id', element: withSuspense(<CustomerDetailPage />) },
      ...(import.meta.env.DEV ? [{ path: '/foundation', element: withSuspense(<FoundationPage />) }] : []),
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
];

export const router = createBrowserRouter(routeObjects);
