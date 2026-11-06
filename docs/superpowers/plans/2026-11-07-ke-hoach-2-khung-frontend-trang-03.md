# Kế hoạch 2: Khung frontend và trang Việc của tôi – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng đăng nhập Keycloak thật, thấy khung ứng dụng đúng vai trò (rail, topbar, panel Trợ lý AI) và trang **Việc của tôi** lấy dữ liệu thật từ backend cho cả 7 vai trò.

**Architecture:** Backend thêm hai endpoint đọc: hồ sơ người dùng (`/me` mở rộng) và hàng chờ (`/work-items`), cả hai chạy dưới RLS của người gọi. Frontend dựng lại khung theo `docs/design/batch-1/design-system.md` thành một layout route (rail, topbar, page head, panel AI), suy vai trò hiển thị từ `/me`, chặn trang theo vai trò, và trang 03 hiển thị hero, hàng chờ, khối phụ từ `/work-items`. Bỏ chế độ mock mặc định.

**Tech Stack:** React 19.2, Ant Design 6.5, React Router 7, TanStack Query 5, keycloak-js 26, Vite 7, TypeScript 5.9 strict; thêm Vitest + Testing Library (unit/component) và Playwright (e2e trên stack thật). Backend FastAPI + SQLAlchemy `text()` + asyncpg, pytest.

**Spec:** `docs/superpowers/specs/2026-11-05-tham-dinh-sme-dot-1-design.md` (lát 3, 4 ở mục 12). Thiết kế: `docs/design/batch-1/design-system.md`, `docs/design/batch-1/shell.html`, `docs/design/batch-1/content/03-viec-cua-toi.html`, `content/common.js`. Luật: `docs/business/rules.md`. Việc hoãn từ Kế hoạch 1: `docs/superpowers/plans/2026-11-06-ke-hoach-1-backlog.md`.

**Thứ tự sau kế hoạch này (chốt 07/11/2026 theo `PROBLEM STATEMENT - SHB2.pdf`):** Kế hoạch 3 là đội agent theo đề bài (planner + Tín dụng, Pháp lý/Tuân thủ, Vận hành, công cụ thật, dashboard trace, so sánh một agent với nhiều agent); các trang 04, 05, 02b làm sau. Mô hình vẫn là ngân hàng chung, không riêng SHB.

## Global Constraints

- Làm trên nhánh `feat/dot1-frontend-shell` tạo từ `import/duskdash` (đang bằng `main`). Chỉ `git add` đúng file của task; không đụng `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `.archify/`, `.graphifyignore`.
- Luật repo: `graphify query` trước khi grep; sau khi sửa code chạy `graphify update .`.
- Không có dữ liệu giả trên giao diện. Khối nào chưa có nguồn dữ liệu thì không hiển thị, không dựng số. Mock (`VITE_USE_MOCK_API`) mặc định **tắt**; chỉ bật khi biến được đặt `true`.
- Quản trị (`admin`) không có trang nghiệp vụ, không có Trợ lý AI.
- Token giao diện theo `design-system.md` §1.1 và bảng AntD §7: `colorPrimary #C44D0E`, `colorLink #2F2E79`, `colorBgLayout #F6F4F0`, `colorBorderSecondary #F0EBE4`, `borderRadius 8`, `fontFamily 'Be Vietnam Pro'`, `fontSize 14`, `fontSizeHeading4 20`, `fontSizeHeading5 16`, `controlHeight 36`, `controlHeightSM 30`. Kích thước: rail 64px, topbar 56px, panel AI 408px (đẩy nội dung, không phủ).
- Văn bản giao diện tiếng Việt, thuật ngữ đúng bảng §15 của design-system.
- Bố cục: ở 1280×800 và 1440×900, panel AI mở hay đóng, không cuộn ngang, không đè chữ (§13). Màn đầu trang 03 tối đa 30 phần tử bấm được (§9).
- Badge "Việc của tôi" (dữ liệu seed): qhkh 4 · httd 3 · tdinh 3 · ruiro 2 · pheduyet 3.

## Review Focus

1. **Token hết hạn khi đang làm việc lâu.** Gọi API sau khi token truy cập hết hạn phải tự làm mới; refresh thất bại thì chuyển về đăng nhập, giữ đường dẫn quay lại. Test: `token-expiry.spec.ts` (Task 9).
2. **Người có nhiều vai trò.** Một tài khoản có cả `risk_officer` và `compliance_officer`, hoặc `credit_manager` lẫn `credit_officer`, phải ra đúng một vai trò hiển thị theo thứ tự ưu tiên, không vỡ rail. Test: `roleFromMe.test.ts` (Task 3).
3. **Hàng chờ trống.** Vai trò không có việc phải thấy trạng thái trống có câu chữ, không thấy hero rỗng hay bảng trống trơn. Test: `MyWorkPage.test.tsx` "empty" (Task 8).
4. **Backend lỗi hoặc mất mạng.** `/work-items` trả 500 hoặc mất mạng: trang hiện lỗi có nút thử lại, rail và topbar vẫn dùng được. Test: `MyWorkPage.test.tsx` "error" (Task 8).
5. **Bấm "Hỏi AI" lúc panel đang mở, hoặc Ctrl+J khi focus trong ô nhập.** Không mở hai panel, không mất chữ đang gõ, focus trả đúng chỗ khi đóng. Test: `AiPanel.test.tsx` (Task 6).

---

## Bản đồ file

| File | Trách nhiệm |
|---|---|
| `backend/app/schemas/auth.py`, `backend/app/api/v1/me.py`, `backend/app/repositories/employee_repository.py` (mới) | `/me` thêm tên, chi nhánh, cấp phê duyệt |
| `backend/app/repositories/work_item_repository.py`, `backend/app/services/work_item_service.py`, `backend/app/schemas/work_item.py`, `backend/app/api/v1/work_items.py` (mới) | Hàng chờ và số đếm |
| `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`, `frontend/playwright.config.ts`, `frontend/e2e/*` | Công cụ test |
| `frontend/src/theme/*`, `frontend/index.html`, `frontend/src/styles/global.css` | Token theo design-system |
| `frontend/src/auth/session.ts` (mới), `frontend/src/auth/RequireRole.tsx` (mới), `frontend/src/auth/keycloak.ts`, `frontend/src/services/apiClient.ts` | Phiên đăng nhập, vai trò, mock tắt mặc định |
| `frontend/src/features/shell/*` (mới: `AppLayout`, `Rail`, `Topbar`, `PageHead`, `NoAccess`, `navigation.ts`) | Khung ứng dụng |
| `frontend/src/features/ai-panel/*` (mới) | Panel Trợ lý AI, dùng lại thành phần chat có sẵn |
| `frontend/src/features/my-work/*` (mới: `MyWorkPage`, `Hero`, `QueueTable`, `SideBlock`, `useWorkItems`, `workItemService`, `types`) | Trang 03 |
| `frontend/src/app/routes.tsx` | Layout route, trang mặc định `/viec-cua-toi` |

---

### Task 1: `/me` có tên, chi nhánh, cấp phê duyệt

**Files:** Modify `backend/app/schemas/auth.py`, `backend/app/api/v1/me.py`; Create `backend/app/repositories/employee_repository.py`, `backend/tests/integration/test_me_profile.py`, `backend/tests/unit/test_me_route.py`.

**Interfaces:**
- Produces: `MeResponse` thêm `full_name: str`, `email: str | None`, `branch_code: str`, `branch_name: str`, `approval_tier: int | None` (tier còn hiệu lực cao nhất của `identity.employee_authority`, `None` nếu không có). Các trường cũ giữ nguyên.
- `EmployeeRepository.get_profile(employee_id: UUID) -> EmployeeProfile | None` chạy trong RLS session.

- [ ] **Step 1:** Test thất bại `test_me_profile.py`: gọi repository như `…0005` → `approval_tier == 2`, `branch_code == "HO"`; như `…0010` → tier 1, `HN-DEMO`; như `…0001` → `approval_tier is None`; như admin `…0007` → hồ sơ của chính mình đọc được (không phải dữ liệu nghiệp vụ). Unit `test_me_route.py`: route dùng session RLS và trả đủ trường.
- [ ] **Step 2:** Chạy, FAIL. **Step 3:** Cài đặt; nếu RLS không cho đọc `identity.employee` / `employee_authority` của chính mình thì thêm hàm `SECURITY DEFINER identity.current_employee_profile()` trong `V028__current_employee_profile.sql` (chỉ trả về hàng của `identity.current_employee_id()`, theo quy ước SECURITY DEFINER của Kế hoạch 1).
- [ ] **Step 4:** PASS unit + integration. **Step 5:** Commit `feat(api): /me trả tên, chi nhánh, cấp phê duyệt`.

### Task 2: `GET /api/v1/work-items` – hàng chờ và số đếm

**Files:** Create `backend/app/schemas/work_item.py`, `backend/app/repositories/work_item_repository.py`, `backend/app/services/work_item_service.py`, `backend/app/api/v1/work_items.py`, `backend/tests/integration/test_work_items.py`, `backend/tests/unit/test_work_item_service.py`; Modify `backend/app/api/v1/feature_router.py`, `backend/app/api/dependencies.py`.

**Interfaces:**
- Produces: `GET /api/v1/work-items?filter=all|over|ret|bosung|new` (mặc định `all`), quyền `loan:read`, chạy dưới RLS. Response `WorkItemsResponse`:
  - `badge: int`: số việc đang chờ chính người gọi, đúng định nghĩa `BADGE_SQL` ở `backend/tests/integration/test_sme_seed.py:367-386` (bước mở giao cho người gọi, trừ PENDING_INFO/RISK_PENDING_INFO và bước đang tạm dừng; cộng PENDING_INFO/RISK_PENDING_INFO của khách mà người gọi là QHKH). Chuyển định nghĩa này thành một hàm dùng chung, test seed gọi lại hàm này.
  - `facts: {overdue: int, due_within_1_workday: int, returned: int, waiting_supplement: int}`.
  - `items: list[WorkItem]` với `WorkItem {loan_application_id, application_number, customer_name, requested_amount: DecimalString, status, step_code, step_received_at, due_at | None, paused: bool, remaining_workdays | None, sla_level: "over"|"today"|"soon"|"ok"|"pause"|"none", mine: bool, tags: list["new"|"ret"|"bosung"|"over"], open_flags: int, high_flags: int, fields_to_confirm: int}`.
  - Hàng `mine = true`: thuộc badge. Hàng `mine = false` ("theo dõi"): hồ sơ chưa kết thúc mà người gọi là QHKH hoặc từng xử lý một bước, tối đa 10, xếp sau.
  - Thứ tự: `mine` trước; trong đó `over` → hạn gần nhất → nhận mới nhất.
  - `sla_level`: over khi đã quá `due_at`; today khi hạn trong ngày; soon khi còn 1 ngày LV; pause khi đang tạm dừng; none khi không có hạn; còn lại ok. Ngày làm việc tính bằng `credit.workdays_between`.
  - Tag `new`: bước nhận trong ngày làm việc hiện tại. `ret`: bước mở là `RM_REWORK` hoặc bước APPRAISAL mở sau một `risk_return`/`return_for_supplement`. `bosung`: trạng thái `*_PENDING_INFO`. `over`: như sla_level.
  - Kiểm toán (`auditor`): `badge = 0`, `items` = 10 hồ sơ có quyết định hoặc chuyển bước gần nhất (chỉ đọc, `mine = false`), `facts` = 0.
- [ ] **Step 1: Test thất bại** (integration, dữ liệu seed): badge đúng 4/3/3/2/3 cho …0001/…0003/…0008/…0009/…0005; `…0001` có DX-2026-00412 và HSV-2026-00201 với tag `ret`; `…0009` có HSV-2026-00176 `sla_level == "over"`; filter `bosung` của `…0001` chỉ trả HSV-2026-00196; admin → 403; `…0004` (Tuân thủ) chỉ thấy HSV-2026-00176; VinaNova (`…0008`) có `high_flags == 4`, `open_flags == 8`; test seed cũ `test_sme_seed.py` vẫn xanh khi gọi hàm dùng chung. Unit cho `sla_level` và tag.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt; truy vấn qua RLS session (không SECURITY DEFINER trừ khi đếm cần đọc thứ RLS chặn, khi đó giải thích trong report). **Step 4:** PASS. **Step 5:** Commit `feat(api): hàng chờ Việc của tôi và số đếm theo vai trò`.

### Task 3: Công cụ test frontend, phiên đăng nhập và vai trò hiển thị

**Files:** Create `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`, `frontend/src/auth/session.ts`, `frontend/src/auth/roleFromMe.ts`, `frontend/src/auth/roleFromMe.test.ts`, `frontend/src/auth/RequireRole.tsx`, `frontend/src/auth/RequireRole.test.tsx`, `frontend/src/types/me.ts`; Modify `frontend/package.json`, `frontend/src/auth/keycloak.ts`, `frontend/src/services/apiClient.ts`, `frontend/src/vite-env.d.ts` (bỏ khai báo trùng).

**Interfaces:**
- Produces:
  - `type UiRole = 'qhkh'|'httd'|'tdinh'|'ruiro'|'pheduyet'|'kiemtoan'|'quantri'`.
  - `function uiRoleFromRoles(roles: readonly string[]): UiRole | null` theo thứ tự ưu tiên: `admin`→quantri, `auditor`→kiemtoan, `loan_approver`→pheduyet, `risk_officer`|`compliance_officer`→ruiro, `credit_appraiser`→tdinh, `document_reviewer`→httd, `credit_officer`|`credit_manager`→qhkh; không khớp → `null`.
  - `type Me` khớp `MeResponse` của Task 1; `useMe(): UseQueryResult<Me, ApiError>` (key `['me']`, staleTime 5 phút).
  - `<RequireRole allow: UiRole[]>`: chưa có `Me` thì skeleton; vai trò không nằm trong `allow` thì render `<NoAccess/>` (Task 5); `null` vai trò thì `<NoAccess/>`.
  - `USE_MOCK_API` chỉ `true` khi `VITE_USE_MOCK_API === 'true'`; `isAuthenticated()` không còn trả `true` khi mock tắt.
  - Script `npm test` (vitest run), `npm run test:watch`.
- [ ] **Step 1:** Cài `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` (phiên bản ổn định hiện hành, ghi đúng số vào `package.json`).
- [ ] **Step 2: Test thất bại** `roleFromMe.test.ts`: 7 vai trò đơn; `['risk_officer','compliance_officer']` → ruiro; `['credit_manager','credit_officer']` → qhkh; `['loan_approver','auditor']` → kiemtoan; `[]` → null. `RequireRole.test.tsx`: cho phép, chặn, đang tải.
- [ ] **Step 3:** FAIL; **Step 4:** cài đặt; **Step 5:** `npm test` PASS, `npm run typecheck` sạch. **Step 6:** Commit `feat(fe): vai trò hiển thị từ /me, chặn trang theo vai trò, tắt mock mặc định`.

### Task 4: Token giao diện theo design-system

**Files:** Modify `frontend/src/theme/index.ts`, `frontend/src/theme/tokens.ts`, `frontend/src/theme/componentOverrides.ts`, `frontend/src/styles/global.css`, `frontend/index.html`; Create `frontend/src/theme/theme.test.ts`.

- [ ] **Step 1: Test thất bại** `theme.test.ts`: `shbTheme.token` có đúng các giá trị ở Global Constraints; `global.css` khai báo `--cta`, `--canvas`, `--ai`, `--rail-w: 64px`, `--topbar-h: 56px`, `--ai-w: 408px` (đọc file và so chuỗi).
- [ ] **Step 2:** FAIL. **Step 3:** Cập nhật token và biến CSS theo `design-system.md` §1.1 và §7; tải font Be Vietnam Pro qua Google Fonts trong `index.html` (weight 400/500/600/700, `display=swap`). Màn chat cũ vẫn chạy (chỉ đổi màu, kích thước).
- [ ] **Step 4:** PASS, `npm run build` sạch. **Step 5:** Commit `feat(fe): token giao diện theo design-system đợt 1`.

### Task 5: Khung ứng dụng – rail, topbar, page head, không có quyền

**Files:** Create `frontend/src/features/shell/{AppLayout.tsx,Rail.tsx,Topbar.tsx,PageHead.tsx,NoAccess.tsx,navigation.ts,shell.module.css}` và test `*.test.tsx` tương ứng; Modify `frontend/src/app/routes.tsx`.

**Interfaces:**
- `navigation.ts`: `RAIL_ITEMS: Record<UiRole, RailItem[]>` đúng bảng §2.1 (`RailItem {page: number, label: string, icon: string, path: string | null}`; trang chưa có thì `path = null`). Trang 2 → `/viec-cua-toi`, trang 10 (Trợ lý AI) → mở panel AI; trang chưa làm hiển thị tooltip "sẽ có ở đợt sau" và không điều hướng.
- `<AppLayout>` là layout route (có `<Outlet/>`), dùng `useMe`. Rail hiển thị badge từ `/work-items` (`badge`) ở mục đầu.
- `<Topbar>`: tên ứng dụng, ô tìm kiếm (chưa có backend tìm kiếm: ô bị khóa kèm `title` "sẽ có ở đợt sau"), chuông từ `GET /notifications` (chấm đỏ khi có thông báo chưa đọc, không hiện số), avatar với `full_name` và nhãn vai trò, menu đăng xuất.
- `<PageHead title facts actions>`: tối đa 1 nút primary, "Hỏi AI" luôn đứng đầu nhóm nút.
- `<NoAccess>` theo §12: tiêu đề trung tính, không tên khách, đúng 1 nút có icon ("Mở Quản trị" cho quantri nhưng trang Quản trị chưa có nên nút bị khóa có `title`; vai trò khác: "Về Việc của tôi").
- Routes: `/` → chuyển `/viec-cua-toi`; layout route bọc `/viec-cua-toi` và `/chat`; `/dashboard` giữ lại trong layout route (dashboard trace theo đề bài, Q-K mới), mục điều hướng tương ứng thêm ở Kế hoạch 3; `/foundation` chỉ đăng ký khi `import.meta.env.DEV`.
- [ ] **Step 1: Test thất bại**: `Rail.test.tsx` đúng mục và nhãn cho 7 vai trò, quantri không có Trợ lý AI; badge chỉ ở mục đầu; `Topbar.test.tsx` tên, vai trò, đăng xuất; `NoAccess.test.tsx` không có tên khách, đúng 1 nút; routes: `/` chuyển hướng.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt bằng AntD 6 + CSS modules theo `docs/design/batch-1/shell.html`. **Step 4:** PASS, typecheck sạch. **Step 5:** Commit `feat(fe): khung ứng dụng theo vai trò`.

### Task 6: Panel Trợ lý AI trong khung

**Files:** Create `frontend/src/features/ai-panel/{AiPanel.tsx,AiPanelContext.tsx,useAiShortcut.ts,AiPanel.test.tsx,ai-panel.module.css}`; Modify `frontend/src/features/shell/AppLayout.tsx`.

**Interfaces:**
- `AiPanelContext`: `{open: boolean, context: AiContext | null, openWith(context?: AiContext): void, close(): void}`; `AiContext {type: 'case'|'metric'|'flag'|'doc'|'policy'|'customer'|'session', id: string, label: string}`.
- Panel rộng 408px đẩy nội dung (grid), có chip ngữ cảnh, nội dung dùng lại `MessageList` và `ChatComposer` cùng các hook hội thoại có sẵn (`useConversations`, `useCreateConversation`, `useSendMessage`). Ngữ cảnh chỉ hiển thị trên chip ở kế hoạch này; gửi ngữ cảnh về backend thuộc Kế hoạch 6.
- Ctrl+J bật/tắt; Esc đóng khi focus ở trong panel; đóng thì `inert`, focus trả về nút đã mở; quantri không mở được.
- [ ] **Step 1: Test thất bại** `AiPanel.test.tsx`: mở bằng nút và Ctrl+J; mở lần hai khi đang mở chỉ đổi chip, không nhân đôi; chữ đang gõ còn nguyên khi đổi ngữ cảnh; Esc đóng và trả focus; quantri không mở.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(fe): panel Trợ lý AI trong khung`.

### Task 7: Lớp dữ liệu trang Việc của tôi

**Files:** Create `frontend/src/features/my-work/{types.ts,workItemService.ts,useWorkItems.ts,format.ts,format.test.ts,useWorkItems.test.tsx}`.

**Interfaces:**
- `types.ts`: kiểu khớp `WorkItemsResponse` (Task 2); `type QueueFilter = 'all'|'over'|'ret'|'bosung'|'new'`.
- `useWorkItems(filter: QueueFilter)` (key `['work-items', filter]`, refetch khi focus cửa sổ).
- `format.ts`: `formatBillion(amount: string): string` ("80 tỷ", "12,5 tỷ"); `slaText(item: WorkItem, today: Date): string` dùng đúng câu §15 ("quá hạn n ngày LV", "hạn hôm nay", "còn n ngày LV", "tạm dừng"); nhãn bước và trạng thái tiếng Việt cho 14 trạng thái (lấy từ `infra/docs/data-dictionary.md`).
- [ ] **Step 1: Test thất bại** cho `formatBillion`, `slaText`, nhãn 14 trạng thái; hook gọi đúng URL và filter (mock fetch).
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(fe): dữ liệu hàng chờ Việc của tôi`.

### Task 8: Trang Việc của tôi (03) cho 7 vai trò

**Files:** Create `frontend/src/features/my-work/{MyWorkPage.tsx,Hero.tsx,QueueTable.tsx,SideBlock.tsx,roleCopy.ts,my-work.module.css,MyWorkPage.test.tsx}`; Modify `frontend/src/app/routes.tsx`.

**Interfaces / hành vi (theo `03-viec-cua-toi.html`, chỉ dữ liệu thật):**
- `roleCopy.ts`: tiêu đề trang và tiêu đề hàng chờ theo vai trò (tdinh "Việc của tôi"/"Hàng chờ của tôi"; qhkh "Hồ sơ của tôi"; httd "Hồ sơ chờ kiểm tra"; ruiro "Hồ sơ chờ ý kiến"; pheduyet "Hồ sơ chờ phê duyệt"; kiemtoan "Hồ sơ vay (chỉ đọc)"/"Hồ sơ & quyết định gần đây").
- Page head: facts từ `facts` (bỏ phần nào bằng 0); actions: "Hỏi AI" (mở panel với ngữ cảnh `session`); QHKH thêm primary "Tạo đề xuất vay" bị khóa kèm lý do "sẽ có ở Kế hoạch 3"; kiểm toán có khóa "Chỉ đọc" và banner thông tin.
- Hero: việc `mine` khẩn nhất (phần tử đầu `items`): tên khách, mã, số tiền, bước, SLA, tối đa 4 việc suy từ dữ liệu (xác nhận `fields_to_confirm` số liệu khi > 0; xử lý `open_flags` cờ, trong đó `high_flags` cờ Cao khi > 0; việc theo bước hiện tại). Không có việc `mine` thì không có hero, hiện trạng thái trống "Không có việc đang chờ bạn".
- Bảng hàng chờ (§3.4, tối đa 5 cột + cột tiện ích): Khách hàng & mã hồ sơ · Số tiền · Bước · trạng thái · Hạn SLA · Việc của tôi. Bộ lọc Tất cả/Quá hạn/Bị trả lại/Chờ bổ sung/Mới ghi vào hash `#filter=`; hàng `mine = false` hiển thị nhạt với nhãn "Theo dõi". Bấm hàng: trang Hồ sơ vay chưa có nên hàng không điều hướng, cột tiện ích có "Hỏi AI" (ngữ cảnh `case`).
- Khối phụ: chỉ khi có dữ liệu thật – tdinh/httd: tổng `fields_to_confirm` và `open_flags` của các việc `mine`; pheduyet: "Thẩm quyền của bạn" từ `approval_tier` của `/me` (Cấp 1 ≤ 20 tỷ, Cấp 2 ≤ 100 tỷ). Các khối khác của mockup (cảnh báo tập trung ngành, nhắc khách, tài liệu sắp hết hạn, quyết định 7 ngày) không làm ở kế hoạch này.
- Quantri: `RequireRole` chặn, hiện `NoAccess`.
- Trạng thái tải (skeleton), lỗi (`PageError` + thử lại), trống.
- [ ] **Step 1: Test thất bại** `MyWorkPage.test.tsx` (mock service): tiêu đề đúng 7 vai trò; badge bằng `badge`; hero là việc đầu; filter đổi hash và gọi đúng filter; hàng theo dõi có nhãn; "empty"; "error" có nút thử lại và rail vẫn hiện; quantri thấy NoAccess; nút QHKH khóa có lý do.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS, typecheck sạch. **Step 5:** Commit `feat(fe): trang Việc của tôi cho 7 vai trò`.

### Task 9: Kiểm thử end-to-end trên stack thật

**Files:** Create `frontend/playwright.config.ts`, `frontend/e2e/{auth.setup.ts,my-work.spec.ts,layout.spec.ts,token-expiry.spec.ts}`, `frontend/e2e/README.md`; Modify `frontend/package.json` (script `e2e`), `.gitignore` của `frontend/` nếu cần cho `playwright/.auth`.

- [ ] **Step 1:** Cài `@playwright/test` và trình duyệt Chromium. Đăng nhập thật qua Keycloak bằng các tài khoản `*@example.local`, mật khẩu đọc từ `infra/.env.local` (`SEED_USER_PASSWORD`) lúc chạy, không ghi ra file hay log. Lưu storage state theo vai trò trong thư mục bị gitignore.
- [ ] **Step 2:** `my-work.spec.ts`: 6 vai trò nghiệp vụ thấy đúng tiêu đề và badge (4/3/3/2/3; kiểm toán không badge); `credit.officer` lọc "Chờ bổ sung" chỉ còn HSV-2026-00196; admin thấy NoAccess, không có Trợ lý AI.
- [ ] **Step 3:** `layout.spec.ts`: 4 vai trò × 1280×800 và 1440×900 × panel AI mở/đóng: `document.documentElement.scrollWidth <= innerWidth`, không lỗi console; màn đầu trang 03 ≤ 30 phần tử bấm được theo cách đếm §9; Ctrl+J mở/đóng, Esc đóng và trả focus.
- [ ] **Step 4:** `token-expiry.spec.ts` (Review Focus 1): ép token hết hạn (xóa token trong bộ nhớ hoặc chờ với token ngắn hạn nếu cấu hình được) rồi tải lại hàng chờ: tự làm mới; xóa phiên Keycloak thì chuyển về `/login?returnTo=/viec-cua-toi`.
- [ ] **Step 5:** Chạy `npm run e2e` với stack đang bật (frontend `npm run dev` ở cổng 3000). PASS. Commit `test(fe): e2e khung và trang Việc của tôi trên stack thật`.

### Task 10: Dọn dẹp và kiểm tra toàn bộ

- [ ] **Step 1:** Xóa `DEMO_USER` khỏi `ChatPage.tsx`, dùng `useMe` cho tên người dùng; `types/user.ts` dùng `UiRole` thay `StaffRole`, sửa mọi chỗ dùng.
- [ ] **Step 2:** `npm run typecheck`, `npm run build`, `npm test`, `npm run e2e`; backend unit + integration; `infra/scripts/verify-stack.ps1 -SkipProfiles`.
- [ ] **Step 3:** Cập nhật `frontend/README.md` (cách chạy test, e2e, tài khoản demo không kèm mật khẩu). `graphify update .`. Commit `chore: dọn dẹp sau khung frontend`.

---

## Thứ tự thực hiện

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Task 1–2 là backend, có thể chạy trước khi frontend có gì.
