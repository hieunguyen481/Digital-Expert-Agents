# Kế hoạch 1: Nền móng backend – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vá lỗ hổng phân quyền dữ liệu, tách Quản trị khỏi nghiệp vụ, thêm vai trò, dựng lớp quy trình (trạng thái, bước, SLA ngày làm việc, tách bạch, cấp phê duyệt) và dữ liệu mẫu SME, để các kế hoạch sau dựng 4 trang lên trên.

**Architecture:** Mọi luật quyền nằm ở database (RLS + hàm `SECURITY DEFINER`) và được lặp ở service. Quy trình lưu trạng thái hiện tại trên `credit.loan_application` và lịch sử từng bước trong bảng mới `credit.case_step`. Mọi chuyển bước đi qua một `WorkflowService` duy nhất, kiểm tra vai trò, điều kiện cổng, tách bạch và ghi nhật ký. Tính ngày làm việc có hai bản cài đặt (Python và SQL), kiểm thử chéo bằng cùng bộ ca.

**Tech Stack:** PostgreSQL 18 (Flyway 12.11, RLS), FastAPI, SQLAlchemy Core `text()` trên asyncpg, pytest + pytest-asyncio, Keycloak 26 (kcadm trong `bootstrap-users.sh`).

**Spec:** `docs/superpowers/specs/2026-11-05-tham-dinh-sme-dot-1-design.md` (đã duyệt 06/11/2026). Luật nghiệp vụ: `docs/business/rules.md` (sau Task 0). Phạm vi kế hoạch này = lát 0, 1, 2 của mục 12 trong spec. Các kế hoạch sau: 2 khung frontend + trang 03; 3 trang 04; 4 pipeline tài liệu + trang 05; 5 trang 02b + tờ trình; 6 chat; 7 gia cố.

## Global Constraints

- Không commit secret, `.env.local`, hay file nào trong `.superpowers/`. Chỉ `git add` đúng file của task; working tree đang có thay đổi không liên quan (`.gitignore`, `AGENTS.md`, `infra/scripts/generate-secrets.ps1`, `infra/versions.env`, `.archify/`, `.graphifyignore`, `CLAUDE.md`), không đụng tới.
- Làm trên nhánh `feat/dot1-backend-foundation` tạo từ HEAD hiện tại.
- Luật repo: graphify trước khi grep (`CLAUDE.md` luật 1); sau khi sửa code chạy `graphify update .`.
- Migration mới đánh số tiếp từ V019, không sửa file V001–V018 đã chạy. Seed chạy lại mỗi lần bootstrap nên phải idempotent (`ON CONFLICT … DO UPDATE`, xóa có điều kiện).
- Mọi bảng mới có RLS ngay khi tạo (`ENABLE ROW LEVEL SECURITY` + policy cho `bank_app`), quyền GRANT theo mẫu `V017`.
- Ngày làm việc: thứ Hai–thứ Sáu trừ ngày trong `credit.holiday`; hạn lúc 17:00 `Asia/Ho_Chi_Minh`; hạn = ngày bắt đầu + n ngày làm việc (không tính ngày bắt đầu). SLA: Kiểm tra hồ sơ 2 · Thẩm định 5 · Ý kiến Rủi ro 3 · Phê duyệt 2 · bổ sung của khách 5.
- Ngưỡng cấp phê duyệt (tỷ đồng, trên **tổng cấp tín dụng**): ≤ 20 Cấp 1 · ≤ 100 Cấp 2 · > 100 Cấp 3 (Hội đồng).
- Quản trị (`admin`) **không** có quyền nghiệp vụ và không qua RLS nghiệp vụ; chỉ còn `admin:manage`.
- AI không bao giờ là bên chuyển bước hay ra quyết định.

## Review Focus

1. **Vá RLS làm mất quyền đọc hợp lệ.** Người nhận việc ở chi nhánh khác (Thẩm định, Rủi ro, Phê duyệt ở HO) phải vẫn đọc được hồ sơ được giao. Test: `test_assignee_from_other_branch_reads_assigned_case` (Task 5).
2. **Tạm dừng SLA đúng lúc hạn đã qua.** Hồ sơ quá hạn rồi mới chuyển "chờ bổ sung": số ngày còn lại phải là số âm hoặc 0, khi tính tiếp hạn mới không được lùi về quá khứ một cách vô lý. Test: `test_pause_after_due_keeps_overdue` (Task 7).
3. **Ngày nghỉ rơi vào ngày nhận.** Nhận hồ sơ vào thứ Bảy hoặc ngày lễ: tính như nhận vào ngày làm việc kế tiếp. Test: `test_received_on_holiday_counts_from_next_workday` (Task 7, cả Python và SQL).
4. **Hai người cùng bấm chuyển bước.** Hai yêu cầu đồng thời trên cùng hồ sơ: chỉ một thành công, cái kia báo xung đột phiên bản. Test: `test_concurrent_transition_one_wins` (Task 9).
5. **Người bị loại trừ là người duy nhất đủ thẩm quyền.** Không được để hồ sơ không có người duyệt: chuyển người cùng cấp, hết người thì lên cấp cao hơn (Q-M). Test: `test_excluded_only_approver_escalates` (Task 8).

---

## Bản đồ file

| File | Trách nhiệm |
|---|---|
| `docs/business/rules.md`, `docs/business/glossary.md`, `docs/design/batch-1/**` | Nguồn luật và mockup trong repo (Q-A) |
| `backend/tests/integration/conftest.py`, `seed_ids.py` | Kết nối Postgres thật bằng `bank_app`, mỗi test một giao dịch rollback |
| `backend/scripts/test-integration.ps1` | Đọc `infra/.env.local`, đặt DSN, chạy `pytest -m integration` |
| `infra/database/migrations/V019__fix_rls_parameter_shadowing.sql` | Vá hàm RLS |
| `V020__separate_admin_from_business.sql` | Bỏ đường tắt admin ở RLS |
| `V021__workflow_core.sql` | Trạng thái mới, `case_step`, SLA, ngày nghỉ, cấp phê duyệt, ngoại lệ, cờ, lịch sử QHKH, `loan_decision` chỉ thêm |
| `V022__documents_cic_related.sql` | Mâu thuẫn trường, văn bản đồng ý CIC, liên kết checklist N-N, nguồn trường, nhóm liên quan, dư nợ |
| `V023__workflow_access_and_functions.sql` | Quyền theo bước, đọc của Kiểm toán, `add_workdays`, `workdays_between` |
| `V024__separation_and_exposure.sql` | Tách bạch (E8), tổng cấp tín dụng, cấp phê duyệt cần thiết |
| `backend/app/workflow/routing.py` | Chọn người duyệt theo cấp, bỏ người bị loại trừ |
| `infra/database/seeds/R__seed_roles_permissions.sql`, `R__seed_reference_data.sql` | Vai trò, quyền, nhân viên, thẩm quyền |
| `infra/database/seeds/R__seed_sme_batch1.sql` (mới, thêm vào `run-seeds.sh`) | Chính sách, §6.1, ngày nghỉ, khách và hồ sơ SME |
| `infra/keycloak/realm-bank-ai.json`, `infra/keycloak/bootstrap-users.sh` | Vai trò và người dùng mới |
| `backend/app/auth/*.py`, `backend/app/services/access.py` | Bỏ đường tắt admin |
| `backend/app/workflow/sla.py` | Tính ngày làm việc (thuần) |
| `backend/app/workflow/transitions.py` | Bảng chuyển trạng thái |
| `backend/app/workflow/gates.py` | Điều kiện từng cổng |
| `backend/app/workflow/service.py`, `backend/app/repositories/workflow_repository.py` | Chuyển bước, phân công, nhật ký |
| `backend/app/api/v1/workflow.py`, `backend/app/schemas/workflow.py` | API chuyển bước |

---

### Task 0: Đưa luật và mockup vào repo (Q-A)

**Files:**
- Modify: `docs/business/rules.md`, `docs/business/glossary.md`, `docs/business/user-flows.md`
- Create: `docs/design/batch-1/` (chép `.superpowers/brainstorm/2612-1793811784/{design-system.md,shell.html,content/*.html,content/common.js,content/assets/*}`)

**Interfaces:**
- Produces: `docs/business/rules.md` là nguồn luật mà `AGENTS.md` dẫn chiếu; các task sau trích mã luật (Q1…, E1…, F1…) từ đây.

- [ ] **Step 1:** `git switch -c feat/dot1-backend-foundation`.
- [ ] **Step 2:** `rules.md` = nội dung `fix-dot1-decisions.md` (giữ mã luật A–F, các mục "Chốt thêm", luật Hội đồng) + mục 15 của spec (Q-A…Q-U, ghi "đã duyệt 06/11/2026"). `glossary.md` = bảng thuật ngữ §15 của `design-system.md`. `user-flows.md` = mục 5 của spec (luồng, nhánh, bảng điều kiện cổng). Không chép các file `fix-dot1-round*.md`, `fix-dot1-medium-low.md`.
- [ ] **Step 3:** Chép mockup sang `docs/design/batch-1/`, giữ cấu trúc `content/` để link tương đối còn chạy. Thêm `docs/design/batch-1/README.md` 5 dòng: cách mở (`py -m http.server` trong `content/`), "hôm nay" cố định 05/11/2026, mockup là đặc tả hành vi.
- [ ] **Step 4:** Kiểm tra: `rg -n "fix-dot1-decisions" docs` không trả gì ngoài README; mở `docs/design/batch-1/content/03-viec-cua-toi.html` qua http server, 200 cho cả 4 trang và `assets/*.jpg`.
- [ ] **Step 5:** Commit `docs: đưa luật nghiệp vụ và mockup đợt 1 vào repo`.

### Task 1: Bộ kiểm thử tích hợp trên Postgres thật + test tái hiện lỗ hổng RLS

**Files:**
- Create: `backend/tests/integration/__init__.py`, `backend/tests/integration/conftest.py`, `backend/tests/integration/seed_ids.py`, `backend/tests/integration/test_rls_scope.py`, `backend/scripts/test-integration.ps1`

**Interfaces:**
- Produces:
  - fixture `db` → `asyncpg.Connection` đăng nhập `bank_app`, đã `BEGIN`, tự `ROLLBACK` sau test.
  - `async def act_as(conn, employee_id: UUID, branch_id: UUID, *, is_admin: bool = False) -> None` (gọi `set_config` cho `app.employee_id`, `app.branch_id`, `app.is_admin`, `is_local=true`).
  - `seed_ids.py`: hằng UUID của nhân viên, chi nhánh, khách, hồ sơ trong seed (mọi task sau thêm vào đây).
  - Marker `integration`; thiếu biến `TEST_APP_DSN` thì test bị skip kèm lý do.

- [ ] **Step 1:** Chuẩn bị môi trường: `py -3.12 -m venv backend/.venv`; `backend/.venv/Scripts/python -m pip install -e "backend[dev]"`. Postgres phải nghe ở `127.0.0.1:5432`: nếu `Test-NetConnection 127.0.0.1 -Port 5432` thất bại thì chạy lại container postgres từ `infra/` bằng `docker compose --env-file versions.env --env-file .env.local -f docker-compose.infra.yml up -d postgres` (giữ volume) và kiểm tra lại.
- [ ] **Step 2:** `test-integration.ps1` đọc `POSTGRES_APP_USER`, `POSTGRES_APP_PASSWORD` từ `infra/.env.local`, đặt `TEST_APP_DSN=postgresql://<user>:<pwd>@127.0.0.1:5432/bank_ai`, chạy `backend/.venv/Scripts/python -m pytest -m integration tests/integration`. Không in mật khẩu.
- [ ] **Step 3: Viết test thất bại** trong `test_rls_scope.py`:

```python
async def test_approver_without_scope_sees_no_branch2_customer(db):
    await act_as(db, APPROVER_HO, BRANCH_HO)
    rows = await db.fetch("SELECT id FROM customer.customer WHERE home_branch_id = $1", BRANCH_HN)
    assert rows == []

async def test_can_access_customer_false_without_scope(db):
    await act_as(db, APPROVER_HO, BRANCH_HO)
    assert await db.fetchval("SELECT identity.can_access_customer($1,$2)", APPROVER_HO, CUSTOMER_A) is False

async def test_rm_sees_own_customer(db):
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    assert await db.fetchval("SELECT count(*) FROM customer.customer WHERE id = $1", CUSTOMER_A) == 1
```

  (`APPROVER_HO=10000000-0000-4000-8000-000000000005`, `BRANCH_HO=…30000000-…-0001`, `BRANCH_HN=…-0002`, `CUSTOMER_A=51000000-…-0001`, `CREDIT_OFFICER=…-0001`.)
- [ ] **Step 4:** Chạy `backend/scripts/test-integration.ps1`. Kỳ vọng: 2 test đầu FAIL (người duyệt thấy khách chi nhánh khác), test 3 PASS.
- [ ] **Step 5:** Commit `test: thêm kiểm thử tích hợp RLS trên Postgres thật` (test đang đỏ được đánh `xfail(strict=True, reason="Task 2")` trước khi commit để nhánh luôn xanh).

### Task 2: Vá hàm RLS bị che tên tham số

**Files:**
- Create: `infra/database/migrations/V019__fix_rls_parameter_shadowing.sql`
- Modify: `backend/tests/integration/test_rls_scope.py` (bỏ `xfail`)

**Interfaces:**
- Produces: `identity.can_access_customer(employee_id UUID, customer_id UUID)` và `identity.can_access_loan(employee_id UUID, loan_application_id UUID)` giữ nguyên chữ ký (policy V015 phụ thuộc), nhưng mọi tham chiếu tham số đều viết đủ tên hàm.

- [ ] **Step 1:** Bỏ `xfail` ở 2 test của Task 1; chạy, xác nhận FAIL.
- [ ] **Step 2:** `V019`: `CREATE OR REPLACE FUNCTION` hai hàm, nội dung như V014:106-197 nhưng mọi chỗ dùng tham số viết `can_access_customer.employee_id`, `can_access_customer.customer_id`, `can_access_loan.employee_id`, `can_access_loan.loan_application_id`. Giữ `STABLE SECURITY DEFINER SET search_path = pg_catalog` và GRANT như V014:199-211.
- [ ] **Step 3:** Chạy migration từ `infra/`: `docker compose --env-file versions.env --env-file .env.local -f docker-compose.infra.yml run --rm flyway`. Kỳ vọng: `Successfully applied 1 migration … v019`.
- [ ] **Step 4:** Chạy `test-integration.ps1`: 3 PASS.
- [ ] **Step 5:** Chạy unit: `backend/.venv/Scripts/python -m pytest -m "not integration"` (từ `backend/`): toàn bộ PASS như trước.
- [ ] **Step 6:** Commit `fix(db): vá RLS so cột với chính nó ở can_access_customer/can_access_loan`.

### Task 3: Tách Quản trị khỏi quyền nghiệp vụ (Q-J)

**Files:**
- Create: `infra/database/migrations/V020__separate_admin_from_business.sql`, `backend/tests/integration/test_admin_isolation.py`
- Modify: `backend/app/auth/principal.py:20`, `backend/app/auth/dependencies.py:69,88`, `backend/app/services/access.py:9,16,22`, `backend/app/auth/permissions.py:11`, `backend/app/auth/resource_access.py:29`, `infra/database/seeds/R__seed_roles_permissions.sql:139-144`, `backend/tests/unit/test_auth.py`

**Interfaces:**
- Produces: `CurrentPrincipal.has_permissions` không còn ngoại lệ cho admin; `require_permissions("admin:manage")` vẫn đúng cho admin. RLS nghiệp vụ không còn nhánh `identity.current_is_admin()`.

- [ ] **Step 1: Test thất bại.**
  - Integration: `test_admin_sees_no_customer` (admin `…-0007`, `is_admin=True`: `count(*)` trên `customer.customer` = 0); `test_admin_cannot_insert_loan_decision` (INSERT vào `credit.loan_decision` với `decision_maker_id` = admin bị từ chối bởi RLS, bắt `asyncpg.InsufficientPrivilegeError`).
  - Unit trong `test_auth.py`: `test_admin_principal_lacks_business_permission` (`CurrentPrincipal(..., permissions=frozenset({"admin:manage"}), is_admin=True)`, `require_permission(p, "customer:read")` ném `PermissionError`), `test_admin_principal_has_admin_manage`.
- [ ] **Step 2:** Chạy, xác nhận FAIL.
- [ ] **Step 3:** `V020`: thay hai hàm của V019 bỏ nhánh `identity.current_is_admin() OR`; `DROP POLICY … CREATE POLICY` lại các policy V015 có `current_is_admin` (dòng 103, 163, 295, 311, 332) không còn nhánh đó. Seed: admin chỉ được `admin:manage` (thay `CROSS JOIN` ở :139-144; xóa các dòng `role_permission` cũ của admin trong cùng seed để chạy lại vẫn đúng).
- [ ] **Step 4:** Backend: xóa mọi `is_admin` bypass ở các dòng đã liệt kê. `is_admin` chỉ còn dùng để đặt GUC `app.is_admin`.
- [ ] **Step 5:** Chạy flyway, `run --rm db-seed`, rồi integration + unit: PASS. Sửa test cũ nào dựa vào bypass (ghi tên trong commit).
- [ ] **Step 6:** Commit `fix(security): Quản trị không còn quyền nghiệp vụ`.

### Task 4: Vai trò, quyền, nhân viên và người dùng Keycloak mới

**Files:**
- Modify: `infra/database/seeds/R__seed_roles_permissions.sql`, `infra/database/seeds/R__seed_reference_data.sql`, `infra/keycloak/realm-bank-ai.json`, `infra/keycloak/bootstrap-users.sh`, `backend/tests/integration/seed_ids.py`
- Create: `backend/tests/integration/test_roles_seed.py`

**Interfaces:**
- Produces:
  - Role `credit_appraiser` (id `20000000-0000-4000-8000-000000000009`).
  - Bảng `identity.employee_authority(employee_id, tier SMALLINT CHECK (tier IN (1,2,3)), unit_scope VARCHAR(10) CHECK (unit_scope IN ('BRANCH','HO')), branch_id UUID NULL, valid_from, valid_until)`; tạo trong `V021` (Task 5), seed ở đây chạy sau khi có bảng nên **Task 4 chạy sau Task 5** (giữ thứ tự số task chỉ để review; thực hiện: 5 rồi 4).
  - Nhân viên mới: `…-0008` Thẩm định (HO, `credit_appraiser`, `appraiser@example.local`), `…-0009` Rủi ro (HO, `risk_officer`, `risk@example.local`), `…-0010` GĐ chi nhánh HN (HN-DEMO, `loan_approver`, tier 1 BRANCH, `director.hn@example.local`). `…-0005` có tier 2 HO.

- [ ] **Step 1: Test thất bại** `test_roles_seed.py`: mỗi vai trò có đúng tập quyền dưới đây; `admin` chỉ `admin:manage`; nhân viên `…-0008/9/10` tồn tại, ACTIVE, đúng role; `employee_authority` của `…-0005` = (2,'HO'), `…-0010` = (1,'BRANCH', HN).
- [ ] **Step 2:** Ma trận quyền (thay ánh xạ trong seed):

| Role | Thêm so với hiện tại | Bỏ |
|---|---|---|
| credit_officer | `document:verify` (Q7) | `loan:analyze` |
| document_reviewer | `customer:search`, `policy:read`, `report:read` | |
| credit_appraiser | `customer:read`, `customer:search`, `account:read`, `transaction:read`, `document:read`, `document:download`, `document:verify`, `loan:read`, `loan:update`, `loan:analyze`, `policy:read`, `report:read`, `report:generate` | |
| risk_officer, compliance_officer | `customer:search` | |
| loan_approver | `customer:search` | |
| auditor | `document:download` | |
| admin | — | mọi quyền trừ `admin:manage` |

- [ ] **Step 3:** Xóa `employee_scope` BRANCH của `…-0001/2/3` (Q-M: cùng chi nhánh không tự thấy nhau); thêm BRANCH scope `customer:read` cho `…-0010` (GĐ chi nhánh).
- [ ] **Step 4:** Keycloak: thêm realm role `credit_appraiser` và 3 user vào `realm-bank-ai.json`; `bootstrap-users.sh` thêm 3 user vào danh sách đối soát (mật khẩu vẫn từ `SEED_USER_PASSWORD`), sửa câu log "seven demo identities" thành số đúng. Chạy lại bootstrap Keycloak theo `infra/scripts/bootstrap.ps1`.
- [ ] **Step 5:** Kiểm tra: test PASS; đăng nhập PKCE được bằng `appraiser@example.local` (`MSYS_NO_PATHCONV=1 py -3.12 -I <scratchpad>/login_smoke.py infra/.env.local appraiser@example.local /api/v1/me` trả 200 với role `credit_appraiser`).
- [ ] **Step 6:** Commit `feat(identity): thêm Thẩm định, Rủi ro, GĐ chi nhánh và ma trận quyền mới`.

### Task 5: Lõi quy trình trong database (V021)

**Files:**
- Create: `infra/database/migrations/V021__workflow_core.sql`, `backend/tests/integration/test_workflow_schema.py`

**Interfaces:**
- Produces (đều trong schema `credit` trừ ghi chú):
  - Trạng thái `credit.loan_application.status` thay CHECK bằng: `DRAFT, CHECKING, RETURNED_TO_RM, APPRAISAL, APPRAISAL_PENDING_INFO, RISK_REVIEW, RISK_PENDING_INFO, RISK_HOLD_FRAUD, APPROVAL, COUNCIL_SESSION, APPROVED, APPROVED_WITH_CONDITIONS, REJECTED, WITHDRAWN`. Ánh xạ dữ liệu cũ trong cùng migration: `DOCUMENT_COLLECTION→CHECKING`, `UNDER_ANALYSIS→APPRAISAL`, `NEEDS_INFORMATION→APPRAISAL_PENDING_INFO`, `READY_FOR_REVIEW→APPRAISAL`, `SUBMITTED_FOR_APPROVAL→APPROVAL`. Thêm cột `approval_tier SMALLINT NULL`, `withdraw_reason TEXT NULL`.
  - `case_step(id UUID PK, loan_application_id FK, step_code VARCHAR(30) CHECK IN ('RM_DRAFT','CHECKING','RM_REWORK','APPRAISAL','PENDING_INFO','RISK_REVIEW','RISK_PENDING_INFO','FRAUD_HOLD','APPROVAL','COUNCIL_SESSION'), assignee_employee_id FK NULL, received_at TIMESTAMPTZ, due_at TIMESTAMPTZ NULL, paused_at TIMESTAMPTZ NULL, remaining_workdays INT NULL, resumed_at TIMESTAMPTZ NULL, completed_at TIMESTAMPTZ NULL, result VARCHAR(30) NULL, reason TEXT NULL, created_by FK, created_at)`; index `(loan_application_id, completed_at)`; chỉ một bước mở mỗi hồ sơ: unique partial index `WHERE completed_at IS NULL AND step_code NOT IN ('PENDING_INFO','RISK_PENDING_INFO')`.
  - `sla_parameter(step_code PK, workdays INT CHECK > 0)` seed 2/5/3/2 và `CUSTOMER_SUPPLEMENT=5`.
  - `holiday(day DATE PK, name TEXT)`.
  - `authority_tier(version INT, tier SMALLINT, max_total_vnd NUMERIC(24,4) NULL, valid_from DATE, PRIMARY KEY(version, tier))`, seed version 1: (1, 20e9), (2, 100e9), (3, NULL).
  - `identity.employee_authority` (xem Task 4).
  - `case_exception(id, loan_application_id, checklist_code TEXT, kind VARCHAR(20) CHECK IN ('DOCUMENT','POLICY'), reason TEXT NOT NULL, proposed_by FK, proposed_at, decision VARCHAR(10) NULL CHECK IN ('ACCEPTED','REJECTED'), decided_by FK NULL, decided_at NULL)`.
  - `case_flag(id, loan_application_id, code TEXT, severity VARCHAR(10) CHECK IN ('HIGH','MEDIUM','LOW'), title TEXT, blocks_submission BOOLEAN NOT NULL, status VARCHAR(20) CHECK IN ('OPEN','HANDLED','FORWARDED_COMPLIANCE','CONCLUDED'), handling_note TEXT NULL, compliance_conclusion VARCHAR(30) NULL CHECK IN ('SUSPECTED_FRAUD','INSUFFICIENT_BASIS','NO_ISSUE'), compliance_reason TEXT NULL, source TEXT, created_by, created_at, updated_at)`; CHECK: `severity <> 'HIGH' OR status <> 'HANDLED' OR handling_note IS NOT NULL`; CHECK: `compliance_conclusion IS NULL OR compliance_reason IS NOT NULL`.
  - `customer.relationship_manager_history(customer_id, employee_id, valid_from DATE, valid_until DATE NULL, PRIMARY KEY(customer_id, employee_id, valid_from))`.
  - `loan_decision`: thêm `decision_source VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL' CHECK IN ('INDIVIDUAL','COUNCIL')`, `council_session_id UUID NULL`; `decision_type` CHECK IN `('APPROVED','APPROVED_WITH_CONDITIONS','REJECTED','RETURN_FOR_SUPPLEMENT')`; `decision_maker_id` thành NULL được khi `decision_source='COUNCIL'` (CHECK). Bỏ `loan_decision_update_policy`, `REVOKE UPDATE, DELETE` khỏi `bank_app`, trigger chặn UPDATE/DELETE như `audit.audit_event` (V012:37-40).
  - `audit.audit_event`: thêm `sensitive_until_closed BOOLEAN NOT NULL DEFAULT FALSE` (chuẩn bị Q-I); thu lại `UPDATE` mà V018 cấp cho `bank_app` **chỉ khi** đã kiểm tra hàm khóa chuỗi hash không cần nó (đọc `audit_repository.py:103+`; nếu cần thì giữ, ghi lý do trong migration).
  - RLS cho mọi bảng mới; tạm thời policy SELECT/INSERT dùng `identity.can_access_loan` (Task 6 thay bằng hàm theo bước).

- [ ] **Step 1: Test thất bại** `test_workflow_schema.py`: (a) INSERT `loan_application` với status `DOCUMENT_COLLECTION` bị CHECK từ chối; (b) hai `case_step` mở cùng lúc cho một hồ sơ bị unique index từ chối; (c) cờ HIGH chuyển `HANDLED` không có `handling_note` bị từ chối; (d) `UPDATE credit.loan_decision` bị từ chối; (e) `sla_parameter` có đúng 5 dòng 2/5/3/2/5; (f) `authority_tier` version 1 có 3 bậc.
- [ ] **Step 2:** Chạy, xác nhận FAIL.
- [ ] **Step 3:** Viết `V021` theo Interfaces. Tìm mọi chỗ dùng tên trạng thái cũ: `graphify query "loan status DOCUMENT_COLLECTION UNDER_ANALYSIS SUBMITTED_FOR_APPROVAL"`, rồi `rg -n "DOCUMENT_COLLECTION|UNDER_ANALYSIS|NEEDS_INFORMATION|READY_FOR_REVIEW|SUBMITTED_FOR_APPROVAL" backend frontend/src infra/database/seeds agent_engine`. Sửa backend và seed theo ánh xạ; frontend chỉ đổi kiểu và nhãn hiển thị; `agent_engine` không sửa (Q-H) nhưng ghi danh sách vào commit.
- [ ] **Step 4:** flyway + db-seed, chạy integration và unit: PASS.
- [ ] **Step 5:** Commit `feat(db): lõi quy trình – trạng thái mới, bước, SLA, cấp phê duyệt, ngoại lệ, cờ`.

### Task 6: Tài liệu, CIC, nhóm liên quan, quyền theo bước (V022, V023)

**Files:**
- Create: `infra/database/migrations/V022__documents_cic_related.sql`, `infra/database/migrations/V023__workflow_access_and_functions.sql`, `backend/tests/integration/test_step_access.py`

**Interfaces:**
- Produces (V022):
  - `document.extracted_field`: thêm `source_type VARCHAR(20) NOT NULL DEFAULT 'AI_OCR' CHECK IN ('AI_OCR','HUMAN','SYSTEM_CIC')`; CHECK `verification_status IN ('AI_PROPOSED','CONFIRMED','NEEDS_VERIFICATION')` (ánh xạ giá trị cũ trong migration sau khi đọc dữ liệu thật).
  - `document.document`: thêm `issued_date DATE NULL`, `counts_for_checklist BOOLEAN NOT NULL DEFAULT TRUE` (bản CIC khách nộp = FALSE).
  - `document.field_conflict(id, loan_application_id, code TEXT, field_ids UUID[] NOT NULL, chosen_field_id UUID NULL, resolution_reason TEXT NULL, resolved_by NULL, resolved_at NULL)`, CHECK lý do khi đã chọn.
  - `credit.checklist_item_document(checklist_item_id, document_id, PRIMARY KEY(...))`.
  - `banking.cic_consent(id, customer_id, document_id, signed_on DATE, valid_until DATE NULL, confirmed_by NULL, confirmed_at NULL)` (F11: NULL `valid_until` = hiệu lực suốt hồ sơ).
  - `banking.credit_report`: thêm `looked_up_by UUID NULL`, `consent_id UUID NULL`, `valid_until DATE NULL`, `source VARCHAR(20) NOT NULL DEFAULT 'SIMULATED'`.
  - `credit.case_related_party(loan_application_id, party_id, proposed_by_ai BOOLEAN, status VARCHAR(20) CHECK IN ('PROPOSED','CONFIRMED','NOT_IN_GROUP'), basis TEXT NULL, decided_by NULL, decided_at NULL)`; CHECK `status <> 'NOT_IN_GROUP' OR basis IS NOT NULL`.
  - `credit.customer_exposure(id, customer_id, exposure_type VARCHAR(20) CHECK IN ('UNDRAWN_LIMIT','GUARANTEE','LC'), amount NUMERIC(24,4) CHECK >= 0, as_of_date DATE, source VARCHAR(20) DEFAULT 'SEED')`.
- Produces (V023):
  - `identity.can_access_loan` thêm điều kiện: nhân viên là `assignee_employee_id` của **bất kỳ** `case_step` của hồ sơ (đọc); bỏ nhánh `customer_record.home_branch_id = identity.current_branch_id()` ở `can_access_customer` (quyền chi nhánh chỉ còn qua BRANCH scope).
  - `identity.can_write_loan(employee_id, loan_id) BOOLEAN`: người nhận bước đang mở, hoặc QHKH của hồ sơ khi trạng thái là `DRAFT`/`RETURNED_TO_RM`/`APPRAISAL_PENDING_INFO`. Policy UPDATE của `loan_application` và INSERT/UPDATE các bảng quy trình dùng hàm này.
  - `identity.can_read_loan(employee_id, loan_id)` = `can_access_loan` OR có role `auditor`; mọi policy SELECT liên quan hồ sơ dùng hàm này.
  - `credit.add_workdays(start TIMESTAMPTZ, n INT) RETURNS TIMESTAMPTZ` (17:00 Asia/Ho_Chi_Minh, bỏ cuối tuần và `credit.holiday`, ngày bắt đầu không phải ngày làm việc thì tính từ ngày làm việc kế tiếp).
  - `credit.workdays_between(a DATE, b DATE) RETURNS INT` (số ngày làm việc sau `a` đến hết `b`; âm nếu `b < a`).

- [ ] **Step 1: Test thất bại** `test_step_access.py`:
  - `test_assignee_from_other_branch_reads_assigned_case` (Review Focus 1): tạo hồ sơ chi nhánh HN, `case_step` APPRAISAL giao `…-0008` (HO); act_as `…-0008` đọc được hồ sơ và khách.
  - `test_same_branch_colleague_cannot_read`: `…-0003` (HN) không có bước nào → không đọc được hồ sơ của `…-0001`.
  - `test_past_assignee_reads_but_cannot_write`: bước đã `completed_at` → SELECT được, UPDATE `loan_application` bị RLS chặn.
  - `test_auditor_reads_all_cannot_write`.
  - `test_director_reads_branch_customers` (`…-0010`).
- [ ] **Step 2:** Chạy, FAIL.
- [ ] **Step 3:** Viết V022, V023. Tất cả hàm mới `STABLE SECURITY DEFINER SET search_path = pg_catalog`, viết đủ tên hàm khi dùng tham số (bài học V019).
- [ ] **Step 4:** flyway, integration + unit PASS.
- [ ] **Step 5:** Commit `feat(db): quyền theo bước xử lý, CIC và văn bản đồng ý, nhóm liên quan, mâu thuẫn trường`.

### Task 7: Tính ngày làm việc và SLA (Python + SQL, kiểm chéo)

**Files:**
- Create: `backend/app/workflow/__init__.py`, `backend/app/workflow/sla.py`, `backend/tests/unit/test_sla.py`, `backend/tests/integration/test_sla_sql.py`

**Interfaces:**
- Produces trong `sla.py` (`TZ = ZoneInfo("Asia/Ho_Chi_Minh")`, `DUE_TIME = time(17, 0)`):
  - `def add_workdays(start: datetime, n: int, holidays: frozenset[date]) -> datetime`
  - `def workdays_between(a: date, b: date, holidays: frozenset[date]) -> int`
  - `@dataclass(frozen=True) class Pause: remaining_workdays: int; paused_at: datetime`
  - `def pause(due_at: datetime, at: datetime, holidays) -> Pause` (còn lại = `workdays_between(at.date(), due_at.date())`)
  - `def resume(p: Pause, at: datetime, holidays) -> datetime` (hạn mới = `add_workdays(at, max(p.remaining_workdays, 0), holidays)`; nếu còn lại ≤ 0 thì hạn = 17:00 hôm `at`, giữ trạng thái quá hạn).
  - `def due_text(due_at: datetime, today: date, holidays) -> str` → `"hạn hôm nay"` / `"còn n ngày LV"` / `"quá hạn n ngày LV"`.

- [ ] **Step 1: Test thất bại** `test_sla.py` (holidays rỗng trừ khi ghi):
  - `add_workdays(30/10/2026 16:00, 5) == 06/11/2026 17:00`; `05/11 + 5 == 12/11`; `05/11 + 2 == 09/11`; `04/11 + 2 == 06/11`.
  - `test_received_on_holiday_counts_from_next_workday`: holidays = {02/11/2026}; `add_workdays(31/10/2026 10:00, 2) == 04/11/2026 17:00`.
  - `workdays_between(05/11, 06/11) == 1`; `(05/11, 05/11) == 0`; `(06/11, 05/11) == -1`.
  - `test_pause_after_due_keeps_overdue` (Review Focus 2): due 04/11 17:00, pause 06/11 → `remaining_workdays == -2`; resume 09/11 → due 09/11 17:00.
  - Pause/resume F7: due 06/11 17:00, pause 03/11 → remaining 3; resume 05/11 10:00 → 10/11 17:00.
  - `due_text(06/11 17:00, today=05/11) == "còn 1 ngày LV"`.
- [ ] **Step 2:** FAIL; **Step 3:** cài đặt; **Step 4:** PASS.
- [ ] **Step 5:** `test_sla_sql.py`: tham số hóa cùng bộ ca (trừ pause) gọi `credit.add_workdays` và `credit.workdays_between`, so khớp từng giá trị với Python (chèn ngày nghỉ test trong giao dịch rollback). PASS.
- [ ] **Step 6:** Commit `feat(workflow): tính ngày làm việc và SLA, khớp Python và SQL`.

### Task 8: Tách bạch (E8) và cấp phê duyệt theo tổng cấp tín dụng (Q4, Q-T, Q-M)

**Files:**
- Create: `infra/database/migrations/V024__separation_and_exposure.sql`, `backend/app/workflow/routing.py`, `backend/tests/integration/test_separation_and_tier.py`, `backend/tests/unit/test_routing.py`

**Interfaces:**
- Produces:
  - SQL `credit.is_excluded(employee_id UUID, loan_id UUID) RETURNS BOOLEAN`: TRUE nếu nhân viên là `assignee_employee_id` hoặc `created_by` của bất kỳ `case_step` của hồ sơ **trừ** bước `APPROVAL` có `result='RETURN_FOR_SUPPLEMENT'` của chính họ (Q-O), hoặc là `relationship_manager_id` hiện tại, hoặc có dòng `relationship_manager_history` với `valid_until` NULL hoặc ≥ `CURRENT_DATE - interval '2 years'`.
  - SQL `credit.total_credit_exposure(loan_id UUID) RETURNS NUMERIC` = `requested_amount` + tổng `outstanding_principal` của `loan_account` đang hiệu lực + tổng `customer_exposure.amount`, tính cho khách chính và các bên `case_related_party.status = 'CONFIRMED'` (bỏ `PROPOSED`, `NOT_IN_GROUP`).
  - SQL `credit.required_tier(loan_id UUID) RETURNS SMALLINT` theo `authority_tier` version mới nhất.
  - Python `async def pick_approver(repo: WorkflowRepository, loan_id: UUID, tier: int) -> UUID | None`: ứng viên = nhân viên có `employee_authority.tier == tier` còn hiệu lực (tier 1: cùng chi nhánh với khách), không `is_excluded`, ít bước đang mở nhất; không có ai thì thử `tier + 1`; tới tier 3 trả `None` (hồ sơ vào `COUNCIL_SESSION`).
- [ ] **Step 1: Test thất bại.**
  - Integration: `test_former_rm_within_2_years_is_excluded` (history đến 12/2024 → TRUE); `test_former_rm_over_2_years_not_excluded`; `test_approver_who_returned_can_decide_again`; `test_exposure_counts_confirmed_related_party_only` (khách 80 tỷ đề xuất + bên liên quan CONFIRMED 15,2 tỷ dư nợ = 95,2 tỷ, bên PROPOSED không cộng); `test_tier_95_2_is_2`; `test_tier_exactly_20_is_1`; `test_tier_100_000_000_001_is_3`.
  - Unit `test_routing.py` với repo giả: `test_picks_least_loaded_same_tier`; `test_excluded_only_approver_escalates` (Review Focus 5: người duy nhất tier 1 bị loại → chọn tier 2); `test_tier3_returns_none`.
- [ ] **Step 2:** FAIL; **Step 3:** cài đặt; **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(workflow): tách bạch theo E8 và định tuyến cấp phê duyệt theo tổng cấp tín dụng`.

### Task 9: Bảng chuyển trạng thái, cổng điều kiện và WorkflowService

**Files:**
- Create: `backend/app/workflow/transitions.py`, `backend/app/workflow/gates.py`, `backend/app/workflow/service.py`, `backend/app/repositories/workflow_repository.py`, `backend/app/schemas/workflow.py`, `backend/app/api/v1/workflow.py`, `backend/tests/unit/test_transitions.py`, `backend/tests/unit/test_gates.py`, `backend/tests/integration/test_workflow_service.py`
- Modify: `backend/app/api/v1/feature_router.py` (đăng ký router), `backend/app/services/loan_service.py` (bỏ đổi `status` trong `update`, bỏ `submit`; `decide` gọi WorkflowService), `backend/app/repositories/loan_repository.py:279-305` (bỏ `submit`), `backend/app/services/state_machine.py` (xóa `LOAN_TRANSITIONS`, giữ `UPLOAD_TRANSITIONS`)

**Interfaces:**
- Produces:
  - `transitions.py`: `@dataclass(frozen=True) class Transition: action: str; from_status: frozenset[str]; to_status: str | None; roles: frozenset[str]; reason_required: bool; gate: str | None` và `TRANSITIONS: Mapping[str, Transition]`. `to_status=None` nghĩa là service tự quyết (định tuyến phê duyệt).

| action | từ | tới | roles | lý do | gate |
|---|---|---|---|---|---|
| `submit_to_checking` | DRAFT, RETURNED_TO_RM | CHECKING | credit_officer | — | `rm_submit` |
| `return_to_rm` | CHECKING, APPRAISAL | RETURNED_TO_RM | document_reviewer, credit_appraiser | ✓ | — |
| `pass_to_appraisal` | CHECKING | APPRAISAL | document_reviewer | — | `checking_pass` |
| `request_info` | APPRAISAL | APPRAISAL_PENDING_INFO | credit_appraiser | ✓ | — |
| `accept_info` | APPRAISAL_PENDING_INFO | APPRAISAL | document_reviewer | — | — |
| `submit_to_risk` | APPRAISAL | RISK_REVIEW | credit_appraiser | — | `appraisal_submit` |
| `risk_return` | RISK_REVIEW | APPRAISAL | risk_officer, compliance_officer | ✓ | — |
| `request_explanation` | RISK_REVIEW | RISK_PENDING_INFO | compliance_officer | ✓ | — |
| `accept_explanation` | RISK_PENDING_INFO | RISK_REVIEW | document_reviewer | — | — |
| `fraud_hold` | RISK_REVIEW | RISK_HOLD_FRAUD | compliance_officer | ✓ | — |
| `fraud_release` | RISK_HOLD_FRAUD | RISK_REVIEW | compliance_officer | ✓ | — |
| `submit_to_approval` | RISK_REVIEW | None (APPROVAL hoặc COUNCIL_SESSION) | risk_officer | — | `risk_submit` |
| `decide` | APPROVAL | APPROVED, APPROVED_WITH_CONDITIONS, REJECTED | loan_approver | ✓ | — |
| `return_for_supplement` | APPROVAL | APPRAISAL hoặc RETURNED_TO_RM (tham số `target`) | loan_approver | ✓ | — |
| `withdraw` | RETURNED_TO_RM, APPRAISAL_PENDING_INFO | WITHDRAWN | credit_officer, credit_manager | ✓ (`withdraw_kind` ∈ CUSTOMER, OVERDUE) | — |

  - `gates.py`: `@dataclass(frozen=True) class GateResult: ok: bool; blockers: tuple[str, ...]; carried_flags: tuple[str, ...]` và `async def evaluate(gate: str, loan_id: UUID, repo: WorkflowRepository) -> GateResult`. Điều kiện theo bảng "Điều kiện từng cổng" ở mục 5 spec. Mã blocker cố định: `DOC_MISSING`, `DOC_EXPIRED`, `CIC_EXPIRED_NO_EXCEPTION`, `CONSENT_MISSING`, `AI_UNCONFIRMED`, `RELATED_PARTY_UNCONFIRMED`, `LEASE_PAYMENT_UNSET`, `AUDITED_FS_REQUIRED`, `CHECK_FAILED`, `FIELDS_UNCONFIRMED`, `FLAGS_OPEN`, `REPORT_MISSING`, `OPINIONS_MISSING`, `VALIDITY_AT_APPROVAL`. `REPORT_MISSING` kiểm tra bảng tờ trình chưa có ở kế hoạch này: trả blocker cố định `REPORT_MISSING` cho tới Kế hoạch 5 (ghi TODO có mã kế hoạch). Cờ `cickh` (CIC khách tự nộp) không tính vào `FLAGS_OPEN`.
  - `service.py`: `class WorkflowService` với `async def transition(self, principal: CurrentPrincipal, loan_id: UUID, action: str, *, expected_version: int, reason: str | None = None, params: Mapping[str, Any] | None = None) -> TransitionResult`. Trình tự: kiểm tra role → trạng thái nguồn → lý do → gate → `UPDATE … WHERE version = :expected_version` (không khớp → `ConflictError`) → đóng bước cũ, mở bước mới (`due_at` từ `credit.add_workdays` và `sla_parameter`; `request_info`/`request_explanation` tạm dừng bước đang mở bằng `sla.pause`, `accept_*` tính tiếp bằng `sla.resume`; `risk_return` và `return_for_supplement` → bước APPRAISAL mới đủ 5 ngày) → định tuyến (`submit_to_approval`: `required_tier` → `pick_approver`; None → COUNCIL_SESSION) → `decide` từ chối nếu `credit.is_excluded` → ghi `audit` action `WORKFLOW_<ACTION>` với `loan_application_id`, trạng thái trước/sau, lý do.
  - `TransitionResult(status: str, step_code: str, assignee_employee_id: UUID | None, due_at: datetime | None, carried_flags: tuple[str, ...])`.
  - API: `POST /api/v1/loan-applications/{id}/transitions` body `{action, expected_version, reason?, params?}` → 200 `TransitionResult`; 409 `VERSION_CONFLICT`; 422 `{code:"GATE_BLOCKED", blockers:[…]}`; 403 sai vai trò; `GET /api/v1/loan-applications/{id}/steps` → danh sách bước.
- [ ] **Step 1: Test thất bại.**
  - `test_transitions.py`: mọi action có trong bảng; không action nào cho phép role `admin`; mỗi `to_status` cụ thể thuộc tập trạng thái của V021.
  - `test_gates.py` (repo giả): `rm_submit` chặn `CIC_EXPIRED_NO_EXCEPTION` khi CIC hết hạn dù có `case_exception` (F5), cho qua khi `cic_outage=True`; chặn `CONSENT_MISSING` dù có ngoại lệ (E9); `DOC_EXPIRED` sao kê có ngoại lệ → không chặn, có `carried_flags`; `AUDITED_FS_REQUIRED` khi tổng cấp tín dụng 20.000.000.001 VND; không chặn ở đúng 20 tỷ; `appraisal_submit` bỏ qua cờ `cickh`.
  - `test_workflow_service.py` (Postgres thật, dữ liệu tạo trong giao dịch): đi trọn `submit_to_checking → pass_to_appraisal → request_info → accept_info` với hạn đúng ca F7; `decide` bởi người `is_excluded` → `PermissionError`; admin gọi bất kỳ action → `PermissionError`; `test_concurrent_transition_one_wins` (Review Focus 4: hai kết nối cùng `expected_version`, đúng một thành công, cái kia `ConflictError`); `withdraw` khi `RISK_HOLD_FRAUD` → bị từ chối; mỗi chuyển bước có một dòng `audit.audit_event`.
- [ ] **Step 2:** FAIL; **Step 3:** cài đặt theo Interfaces; bỏ đường đổi trạng thái qua `PATCH` (gửi `status` trong PATCH → 422 `STATUS_READ_ONLY`).
- [ ] **Step 4:** PASS toàn bộ unit + integration + `tests/contract`.
- [ ] **Step 5:** Commit `feat(workflow): một service chuyển bước duy nhất, cổng điều kiện, định tuyến phê duyệt`.

### Task 10: Sửa lỗi nền đã biết

**Files:**
- Modify: `backend/app/repositories/report_repository.py:61-80, ~215-245`, `backend/app/repositories/job_repository.py:170-194`, `backend/app/repositories/customer_repository.py:255-287`
- Create: `backend/tests/integration/test_repository_sql_types.py`; Modify: `backend/tests/unit/test_customer_assignment.py`

**Interfaces:**
- Produces: không đổi chữ ký public của repository.

- [ ] **Step 1: Test thất bại.**
  - Integration: gọi `ReportRepository.create(...)` và `review_report(...)`, `JobRepository.append_event(...)` với UUID không tồn tại trong giao dịch rollback qua `AsyncSession` thật → không ném lỗi kiểu (`DataError`, `AmbiguousParameterError`), trả `None` hoặc không dòng.
  - Unit: `test_claim_same_owner_does_not_bump_version` (đã là chủ → version giữ nguyên, trả thành công dù `expected_version` cũ một bậc); `test_claim_other_owner_conflicts`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Truyền `str(uuid)` cho các `CAST(:x AS text)`; trong `review_report` tách tham số theo kiểu (`:status` cho cột, `CAST(:status_text AS text)` trong `jsonb_build_object` và `CASE`), `CAST(:review_note AS text)`. `claim_assignment`: nếu đã là chủ thì trả bản ghi hiện tại, không `UPDATE`.
- [ ] **Step 4:** PASS; **Step 5:** Commit `fix(repo): kiểu tham số asyncpg và 409 khi nhận lại khách của chính mình`.

### Task 11: Dữ liệu mẫu SME đợt 1

**Files:**
- Create: `infra/database/seeds/R__seed_sme_batch1.sql`, `backend/tests/integration/test_sme_seed.py`
- Modify: `infra/database/seeds/run-seeds.sh` (chạy file mới cuối cùng), `infra/database/seeds/R__seed_demo_customers.sql` (giữ khách cũ, không xóa), `backend/tests/integration/seed_ids.py`

**Interfaces:**
- Consumes: `credit.add_workdays` (Task 6), các bảng V021–V022.
- Produces: dữ liệu theo `docs/business/rules.md` mục C, F-DOC và các ghi chú sau F. "Hôm nay" của seed = `anchor` = ngày làm việc gần nhất ≤ `CURRENT_DATE` (Q-Q); mọi ngày trong kịch bản tính bằng `credit.add_workdays(anchor, ±n)` theo khoảng ngày làm việc của mockup (mockup neo 05/11/2026). Mỗi dòng seed có `source='SEED'` hoặc ghi chú "dữ liệu mẫu".

- [ ] **Step 1: Test thất bại** `test_sme_seed.py` (đọc bằng role phù hợp qua `act_as`):
  - Chính sách `CS-TD-SME/2025` có §1.2, §2.3, §3.1, §3.4, §4.1, §4.2, §4.4, §5.2, §6.1, §6.3, §6.4, §7.1; DSCR tối thiểu 1,25.
  - `checklist_rule` SME có đúng 16 mục §6.1 theo thứ tự F-DOC.
  - VinaNova `HSV-2026-00187`: 80 tỷ, trạng thái `APPRAISAL`, bước APPRAISAL giao `…-0008` với `due_at - received_at` = 5 ngày làm việc, hạn còn 1 ngày LV so với `anchor`; 16/16 mục có tài liệu; 3 tài liệu bổ sung; 1 tài liệu `counts_for_checklist=FALSE` (CIC khách nộp); 8 cờ, 4 `HIGH`; `credit.required_tier` = 2; dư nợ CIC ở `banking.credit_facility` 56 và 42 tỷ, `source='SIMULATED'`.
  - Mekong Flex `DX-2026-00412`: `DRAFT`, 80 tỷ, bên liên quan Công ty CP Đầu tư Mekong `PROPOSED` với dư nợ 15,2 tỷ; tổng cấp tín dụng khi xác nhận = 95,2 tỷ.
  - `credit.holiday` có lễ Việt Nam 2026–2027 (Tết Dương lịch, Tết Nguyên đán, Giỗ Tổ, 30/4, 1/5, Quốc khánh 2/9 và ngày nghỉ kèm theo đã công bố).
  - Badge theo vai trò khớp `docs/design/batch-1/content/common.js` `BADGES` (qhkh 4, httd 3, tdinh 3, ruiro 2, pheduyet 3) khi đếm bước đang mở theo người nhận.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Viết seed: chính sách và §6.1; ngày nghỉ (ghi nguồn công bố trong comment; ngày chưa công bố chính thức đánh dấu `-- dự kiến`); nhân viên đã có từ Task 4; khách SME (`customer.party` loại ORGANIZATION + `organization_profile`) gồm VinaNova, Mekong Flex và các khách trong hàng chờ mockup 03 (Cơ khí Trường An, Phú Điền, Đông Á, Cảng Xanh, Tây Nguyên Xanh, Bắc Hà…); hồ sơ và `case_step` cho từng dòng hàng chờ; tài liệu ở mức metadata (`document`, `document_version` trỏ object MinIO chưa có thì để `storage_status='PLACEHOLDER'` nếu cột cho phép; nếu không thì chỉ tạo `document` và ghi rõ trong test là metadata); cờ, `field_conflict` (2 mâu thuẫn `debt`, `cfo`), `metricStatus` của mockup thành `extracted_field.verification_status` cho 25 trường (1 AI_PROPOSED · 15 NEEDS_VERIFICATION · 9 CONFIRMED). Idempotent: `ON CONFLICT (id) DO UPDATE`.
- [ ] **Step 4:** `run --rm db-seed` hai lần liên tiếp không lỗi; integration PASS.
- [ ] **Step 5:** Commit `feat(seed): dữ liệu mẫu SME đợt 1, ngày neo theo ngày chạy`.

### Task 12: Dọn dẹp và kiểm tra toàn bộ

**Files:**
- Modify: `infra/scripts/verify-stack.ps1:195`, `infra/scripts/verify-stack.sh:42`, `infra/database/README.md:14`, `backend/scripts/test.ps1`

- [ ] **Step 1:** Đổi số migration kỳ vọng từ 17 thành số thật (24) ở hai script verify, README liệt kê V001…V024. `test.ps1` thêm gợi ý chạy `test-integration.ps1`.
- [ ] **Step 2:** Chạy `infra/scripts/verify-stack.ps1` (hoặc `.sh`): PASS.
- [ ] **Step 3:** Chạy toàn bộ: unit + contract (`-m "not integration"`) và integration. Ghi số ca PASS vào mô tả commit.
- [ ] **Step 4:** Đăng nhập thật 10 tài khoản bằng `login_smoke.py` gọi `/api/v1/me`: 200, đúng role; admin gọi `/api/v1/customers` → 403.
- [ ] **Step 5:** `graphify update .`; commit `chore: cập nhật kiểm tra hạ tầng sau 6 migration mới`.

---

## Thứ tự thực hiện

0 → 1 → 2 → 3 → **5 → 4** → 6 → 7 → 8 → 9 → 10 → 11 → 12 (Task 4 cần bảng `employee_authority` của Task 5).
