import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { RequireAuth } from '@/auth/RequireAuth';
import { Navigate } from 'react-router-dom';
import ChatPage from '@/pages/ChatPage';
import { uiRoleFromRoles } from '@/auth/roleFromMe';
import { useMe } from '@/auth/session';
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
const AdminPage = lazy(() => import('@/features/admin/AdminPage'));
const CustomerDetailPage = lazy(() => import('@/features/customers/CustomerDetailPage'));

function HomeRedirect() {
  const me = useMe();
  if (!me.data) return <PageSkeleton />;
  return <Navigate to={uiRoleFromRoles(me.data.roles) === 'quantri' ? '/quan-tri' : '/viec-cua-toi'} replace />;
}

/** Trang đăng nhập (ngoài khung): màn khởi tạo đầy đủ. */
function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<LoadingScreen message="Đang tải trang" />}>{node}</Suspense>;
}

/** Trang trong khung ứng dụng: thanh trên và menu giữ nguyên, chỉ vùng nội dung là khung xương. */
function inShell(node: React.ReactNode) {
  return <Suspense fallback={<PageSkeleton />}>{node}</Suspense>;
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
      { path: '/', element: <HomeRedirect /> },
      { path: '/viec-cua-toi', element: inShell(<MyWorkPage />) },
      { path: '/quan-tri', element: inShell(<AdminPage />) },
      { path: '/de-xuat-vay', element: inShell(<NewProposalPage />) },
      { path: '/de-xuat-vay/:loanId', element: inShell(<ProposalPage />) },
      { path: '/ho-so-vay/:loanId', element: inShell(<LoanDetailPage />) },
      { path: '/doi-chieu', element: inShell(<ReconciliationIndexPage />) },
      { path: '/doi-chieu/:loanId', element: inShell(<ReconciliationPage />) },
      { path: '/nhat-ky-kiem-toan', element: inShell(<AuditLogPage />) },
      { path: '/tra-cuu-chinh-sach', element: inShell(<PolicyPage />) },
      { path: '/chat', element: <ChatPage /> },
      { path: '/dashboard', element: inShell(<AgentDashboardPage />) },
      { path: '/thong-bao', element: inShell(<NotificationsPage />) },
      { path: '/khach-hang', element: inShell(<CustomerListPage />) },
      { path: '/customer/:id', element: inShell(<CustomerDetailPage />) },
      ...(import.meta.env.DEV ? [{ path: '/foundation', element: inShell(<FoundationPage />) }] : []),
      { path: '*', element: inShell(<NotFoundPage />) },
    ],
  },
];

export const router = createBrowserRouter(routeObjects);
