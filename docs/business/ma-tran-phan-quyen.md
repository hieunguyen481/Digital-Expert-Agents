# Ma trận phân quyền

Nguồn duy nhất cho câu hỏi "vai trò nào được làm gì, ở trạng thái hồ sơ nào". Mọi ô có căn cứ trong
`docs/business/rules.md` (cột cuối hoặc ghi chú dưới bảng). Các bảng đánh dấu `<!-- matrix:... -->` được test
đối chiếu với mã và dữ liệu seed: `backend/tests/integration/test_permission_matrix.py`,
`agent_engine/tests/test_permission_matrix.py`. Sửa mã mà không sửa bảng này thì test đỏ.

Vai trò (mã trong hệ thống): `credit_officer` = QHKH; `document_reviewer` = HTTD; `credit_appraiser` = Thẩm định;
`risk_officer` = Rủi ro; `compliance_officer` = Tuân thủ; `loan_approver` = Cấp phê duyệt; `credit_manager` = Trưởng phòng
(Q-B); `auditor` = Kiểm toán; `admin` = Quản trị. Ký hiệu: ✔ được, — không được.

## 1. Quyền chức năng theo vai trò (seed `R__seed_roles_permissions.sql`)

<!-- matrix:permission -->
| Quyền | credit_officer | document_reviewer | credit_appraiser | risk_officer | compliance_officer | loan_approver | credit_manager | auditor | admin | Căn cứ `rules.md` |
|---|---|---|---|---|---|---|---|---|---|---|
| account:read | ✔ | — | ✔ | ✔ | — | ✔ | ✔ | ✔ | — | Q-M (đọc theo phạm vi); Q-J loại Quản trị |
| admin:manage | — | — | — | — | — | — | — | — | ✔ | Q-J (Quản trị chỉ quản trị, không nghiệp vụ); Q9 |
| audit:read | — | — | — | — | — | — | — | ✔ | — | Q-M (Kiểm toán đọc toàn hệ thống); Q-I |
| customer:read | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | Q-M; Q-J |
| customer:search | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | Q-M (Kiểm toán chỉ đọc, không thao tác) |
| document:download | ✔ | ✔ | ✔ | — | ✔ | ✔ | ✔ | ✔ | — | Q-M (đọc theo phạm vi) |
| document:read | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | Q-M |
| document:upload | ✔ | — | — | — | — | — | — | — | — | Q6, Q11 (chỉ QHKH tải tài liệu lên) |
| document:verify | ✔ | ✔ | ✔ | — | ✔ | — | — | — | — | Q3 (HTTD kiểm tra tài liệu), Q7 |
| loan:analyze | — | — | ✔ | ✔ | ✔ | — | ✔ | — | — | Q-B, Q3 (thẩm định, rủi ro, tuân thủ phân tích) |
| loan:approve | — | — | — | — | — | ✔ | — | — | — | E8, Q4 (chỉ cấp phê duyệt) |
| loan:create | ✔ | — | — | — | — | — | — | — | — | Q1 (QHKH lập hồ sơ) |
| loan:read | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | Q-M |
| loan:submit | ✔ | — | — | — | — | — | ✔ | — | — | Q1, Q-O (QHKH gửi; QHKH hoặc trưởng phòng rút) |
| loan:update | ✔ | — | ✔ | — | — | — | ✔ | — | — | Q-M (ghi đúng bước của mình) |
| policy:read | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | Q-R (chính sách chuẩn) |
| report:export | — | — | — | — | — | ✔ | ✔ | ✔ | — | Q-L (xuất PDF là bước cuối), Q-M |
| report:generate | ✔ | — | ✔ | — | — | — | ✔ | — | — | Q-L (tờ trình thẩm định) |
| report:read | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | Q-L, Q-M |
| report:review | — | — | — | ✔ | ✔ | ✔ | ✔ | — | — | Q-L (Rủi ro và cấp phê duyệt đọc đúng bản đã chốt) |
| transaction:read | ✔ | — | ✔ | ✔ | — | ✔ | ✔ | ✔ | — | Q-M |

Quản trị chỉ có `admin:manage` (Q-J: không truy cập khẩn cấp, không đọc nghiệp vụ). Quyền chức năng là điều kiện cần; dữ liệu
nào được đọc/ghi còn do RLS quyết định (Q-M): người được phân công đọc và ghi đúng bước của mình, người đã xong bước vẫn đọc, Kiểm toán
đọc toàn hệ thống, Hội sở đọc hồ sơ được phân công, cùng chi nhánh không tự thấy nhau trừ giám đốc chi nhánh.

Ngoại lệ về che lý do (captain chốt 13/11/2026, F8/Q-M): lý do bước `FRAUD_HOLD`, kết quả `FRAUD_HOLD`/`RELEASED` và lượt Rủi ro do Tuân thủ trả lại
chỉ Tuân thủ, Rủi ro, Phê duyệt, Kiểm toán đọc. Lý do của `request_explanation` (bước `RISK_PENDING_INFO`) thì người xử lý bước Chờ giải trình
(Hỗ trợ tín dụng) được đọc để biết cần giải trình gì; vai khác không thuộc bốn vai trên vẫn không thấy.

## 2. Hành động chuyển trạng thái × vai trò × trạng thái hồ sơ

Một ô (vai trò, hành động, trạng thái) được phép khi vai trò có ✔ **và** trạng thái nằm trong cột "Từ trạng thái".
Mọi ô khác bị từ chối. Hành động ghi "Cần lý do: có" bị từ chối khi lý do rỗng (HTTP 4xx, không phải 500).
`decide` và `return_for_supplement` còn bị E8 (đã tham gia thì không phê duyệt) chặn theo từng người.

<!-- matrix:transition -->
| Hành động | Từ trạng thái | Cần lý do | credit_officer | document_reviewer | credit_appraiser | risk_officer | compliance_officer | loan_approver | credit_manager | auditor | admin | Căn cứ `rules.md` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| submit_to_checking | DRAFT,RETURNED_TO_RM | không | ✔ | — | — | — | — | — | — | — | — | Q1, E1, E4 |
| return_to_rm | CHECKING,APPRAISAL | có | — | ✔ | ✔ | — | — | — | — | — | — | F6, Q11 |
| pass_to_appraisal | CHECKING | không | — | ✔ | — | — | — | — | — | — | — | Q1, Q7 |
| request_info | APPRAISAL | có | — | — | ✔ | — | — | — | — | — | — | Q6, E2 |
| accept_info | APPRAISAL_PENDING_INFO | không | — | ✔ | — | — | — | — | — | — | — | Q6, F7 |
| submit_to_risk | APPRAISAL | không | — | — | ✔ | — | — | — | — | — | — | Q-L, Q4 |
| risk_return | RISK_REVIEW | có | — | — | — | ✔ | ✔ | — | — | — | — | E3 |
| request_explanation | RISK_REVIEW | có | — | — | — | — | ✔ | — | — | — | — | Q-N, F8 (lý do hiện cho người xử lý bước Chờ giải trình, 13/11/2026) |
| accept_explanation | RISK_PENDING_INFO | không | — | ✔ | — | — | — | — | — | — | — | Q-N, F7 |
| fraud_hold | RISK_REVIEW | có | — | — | — | — | ✔ | — | — | — | — | Q-N, F8, Q3 |
| fraud_release | RISK_HOLD_FRAUD | có | — | — | — | — | ✔ | — | — | — | — | Q-N |
| submit_to_approval | RISK_REVIEW | không | — | — | — | ✔ | — | — | — | — | — | Q4, Q-P, Q-L |
| decide | APPROVAL | có | — | — | — | — | — | ✔ | — | — | — | E8, Q-M, Q-J |
| return_for_supplement | APPROVAL | có | — | — | — | — | — | ✔ | — | — | — | Q-O |
| withdraw | RETURNED_TO_RM,APPRAISAL_PENDING_INFO | có | ✔ | — | — | — | — | — | ✔ | — | — | Q11, Q-O |

Phạm vi của Trưởng phòng (Q-D2): `loan:read` chỉ áp dụng cho hồ sơ thuộc phòng của họ (hàm `identity.loan_in_manager_department`, V053); người nhận khi chuyển phải cùng phòng. Test: `backend/tests/integration/test_manager_department_scope.py`.

Hành động ngoài bảng (Trưởng phòng chuyển người xử lý, gia hạn bổ sung của QHKH, báo sớm Tuân thủ) không đổi trạng thái: xem mục 4.

## 3. Route API của backend (118 route, quyền khai báo ở dependency)

Dấu `-` nghĩa là route không đòi quyền chức năng ở lớp route: chỉ cần đăng nhập, phạm vi đọc do RLS (Q-M), hoặc kiểm
quyền ở service (ví dụ `loan:analyze` trong chạy đội agent, `document:*`). Nhóm `-`: `/health/*`, `/me`, `/notifications` (chỉ thông báo của chính người đó), `/conversations` (chat Trợ lý AI, Q-K; chỉ chủ phiên),
`/jobs`, `/work-items` (việc của chính người đó), `/agent-cases*` và `/agent-simulations*` (API đội agent: cổng engine
`GATEWAY_ROLES`, ca engine lọc theo RLS; Q-H, Q-K). Quản trị không có quyền nghiệp vụ nào nên mọi route có quyền đều từ chối Quản trị (Q-J).
`/audit-events` yêu cầu `audit:read`: chỉ Kiểm toán (Q-M, Q-I). `/policies` yêu cầu `policy:read` (Q-R).

<!-- matrix:route -->
| Route | Quyền yêu cầu | Căn cứ `rules.md` |
|---|---|---|
| GET /demo/accounts | - | Q-J (ngoại lệ demo: chỉ Quản trị, tắt thì 404) |
| POST /demo/switch | - | Q-J (ngoại lệ demo: chỉ Quản trị, tắt thì 404) |
| GET /agent-cases | - | Q-H, Q-M, Q-J |
| GET /agent-cases/stats | - | Q-H, Q-M, Q-J |
| GET /agent-cases/approver-names | - | Q-H, Q-M, Q-J |
| POST /agent-cases/proposals/{proposal_id}/{verb} | - | Q-H, Q-M, Q-J |
| GET /agent-cases/{case_id}/proposals | - | Q-H, Q-M, Q-J |
| GET /agent-cases/{case_id} | - | Q-H, Q-M, Q-J |
| GET /agent-cases/{case_id}/events | - | Q-H, Q-M, Q-J |
| GET /agent-cases/{case_id}/stream | - | Q-H, Q-M, Q-J |
| POST /agent-cases/{case_id}/approve | - | Q-H, Q-M, Q-J |
| POST /agent-cases/{case_id}/reject | - | Q-H, Q-M, Q-J |
| GET /agent-simulations/scenarios | - | Q-H, Q-M, Q-J |
| POST /agent-simulations/scenarios/{scenario_code}/runs | - | Q-H, Q-M, Q-J |
| GET /analysis-cases/{analysis_case_id} | loan:read | Q-M |
| GET /analysis-cases/{analysis_case_id}/tasks | loan:read | Q-M |
| GET /analysis-cases/{analysis_case_id}/findings | loan:read | Q-M |
| GET /analysis-cases/{analysis_case_id}/events | loan:read | Q-M |
| POST /analysis-cases/{analysis_case_id}/retry | loan:analyze | Q-B, Q3 (thẩm định, rủi ro, tuân thủ phân tích) |
| GET /audit-events | audit:read | Q-M (Kiểm toán đọc toàn hệ thống); Q-I |
| GET /loan-applications/{loan_id}/actions | loan:read | Q-M |
| POST /loan-applications/{loan_id}/flags/{flag_id}/handle | loan:read | Q-M |
| POST /loan-applications/{loan_id}/flags/{flag_id}/early-warning | loan:read | Q-M |
| POST /loan-applications/{loan_id}/flags/{flag_id}/conclusion | loan:read | Q-M |
| POST /loan-applications/{loan_id}/risk-opinions | loan:read | Q-M |
| POST /loan-applications/{loan_id}/approval-upgrade | loan:read | Q-M |
| POST /loan-applications/{loan_id}/agent-flags | loan:read | Q-M |
| POST /loan-applications/{loan_id}/disbursement-conditions | loan:read | Q-M |
| POST /conversations | - | Q-K |
| GET /conversations | - | Q-K |
| GET /conversations/{conversation_id} | - | Q-K |
| PATCH /conversations/{conversation_id} | - | Q-K |
| POST /conversations/{conversation_id}/close | - | Q-K |
| GET /conversations/{conversation_id}/messages | - | Q-K |
| POST /conversations/{conversation_id}/messages | - | Q-K |
| GET /customers | customer:search | Q-M (Kiểm toán chỉ đọc, không thao tác) |
| POST /customers/{customer_id}/assignment/claim | customer:read | Q-M; Q-J |
| POST /customers/{customer_id}/assignment/heartbeat | customer:read | Q-M; Q-J |
| POST /customers/{customer_id}/assignment/release | customer:read | Q-M; Q-J |
| POST /customers/{customer_id}/assignment/takeover | customer:read | Q-M; Q-J |
| GET /customers/{customer_id} | customer:read | Q-M; Q-J |
| GET /customers/{customer_id}/overview | customer:read | Q-M; Q-J |
| GET /customers/{customer_id}/accounts | account:read | Q-M (đọc theo phạm vi); Q-J loại Quản trị |
| GET /customers/{customer_id}/transactions | transaction:read | Q-M |
| GET /customers/{customer_id}/transaction-summary | transaction:read | Q-M |
| GET /customers/{customer_id}/documents | document:read | Q-M |
| GET /customers/{customer_id}/loan-applications | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/checklist/{checklist_code}/documents | document:upload | Q6, Q11 (chỉ QHKH tải tài liệu lên) |
| GET /findings/{finding_id} | loan:read | Q-M |
| GET /findings/{finding_id}/evidence | loan:read | Q-M |
| GET /health/live | - | Q-K |
| GET /health/ready | - | Q-K |
| GET /jobs/{job_id} | - | Q-M |
| GET /jobs/{job_id}/steps | - | Q-M |
| GET /jobs/{job_id}/events | - | Q-M |
| GET /jobs/{job_id}/stream | - | Q-M |
| GET /loan-applications/{loan_id}/agent-runs | loan:read | Q-M |
| POST /loan-applications/{loan_id}/agent-runs | loan:read | Q-M |
| GET /loan-applications/{loan_application_id}/overview | loan:read | Q-M |
| POST /loan-applications | loan:create | Q1 (QHKH lập hồ sơ) |
| GET /loan-applications/{loan_application_id} | loan:read | Q-M |
| PATCH /loan-applications/{loan_application_id} | loan:update | Q-M (ghi đúng bước của mình) |
| POST /loan-applications/{loan_application_id}/parties | loan:update | Q-M (ghi đúng bước của mình) |
| POST /loan-applications/{loan_application_id}/documents/{document_id} | loan:update | Q-M (ghi đúng bước của mình) |
| GET /loan-applications/{loan_application_id}/checklist | loan:read | Q-M |
| GET /loan-applications/{loan_application_id}/calculations | loan:read | Q-M |
| GET /loan-applications/{loan_application_id}/policy-checks | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/analyses | loan:analyze | Q-B, Q3 (thẩm định, rủi ro, tuân thủ phân tích) |
| GET /loan-applications/{loan_application_id}/analyses | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/decisions | loan:approve | E8, Q4 (chỉ cấp phê duyệt) |
| GET /me | - | Q-K |
| GET /loan-applications/{loan_application_id}/memo | loan:read | Q-M |
| PUT /loan-applications/{loan_application_id}/memo | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/memo/ai-blocks | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/memo/ai-blocks/{block_id}/decision | loan:read | Q-M |
| GET /loan-applications/{loan_application_id}/memo/pdf | loan:read | Q-M |
| GET /admin/ai-config | admin:manage | Q-J; M01 (chỉ đọc, không trả khóa/URL) |
| GET /admin/permissions | admin:manage | Q-J; M01 |
| GET /admin/thresholds | admin:manage | Q-J; Q4; M01 |
| GET /admin/users | admin:manage | Q-J; M01 |
| GET /notifications | - | Q-M |
| PATCH /notifications/{notification_id}/read | - | Q-M |
| GET /policies | policy:read | Q-R (chính sách chuẩn) |
| GET /policies/search | policy:read | Q-R (chính sách chuẩn) |
| GET /policy-clauses/{clause_id} | policy:read | Q-R (chính sách chuẩn) |
| GET /loan-applications/{loan_application_id}/draft | loan:read | Q-M |
| PUT /loan-applications/{loan_application_id}/draft | loan:update | Q-M (ghi đúng bước của mình) |
| GET /loan-products | loan:create | Q1 (QHKH lập hồ sơ) |
| GET /loan-applications/{loan_application_id}/proposal-documents | loan:read | Q-M |
| GET /loan-applications/{loan_application_id}/cic | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/cic-consent | loan:update | Q-M (ghi đúng bước của mình) |
| POST /loan-applications/{loan_application_id}/cic-lookups | loan:update | Q-M (ghi đúng bước của mình) |
| GET /loan-applications/{loan_application_id}/related-parties | loan:read | Q-M |
| PUT /loan-applications/{loan_application_id}/related-parties/{party_id} | loan:update | Q-M (ghi đúng bước của mình) |
| PUT /loan-applications/{loan_application_id}/collaterals/{collateral_id}/lease-payment | loan:update | Q-M (ghi đúng bước của mình) |
| POST /loan-applications/{loan_application_id}/exceptions | loan:update | Q-M (ghi đúng bước của mình) |
| POST /loan-applications/{loan_application_id}/exceptions/{exception_id}/withdraw | loan:update | Q-M (ghi đúng bước của mình) |
| GET /loan-applications/{loan_application_id}/submit-conditions | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/submissions | loan:update | Q-M (ghi đúng bước của mình) |
| GET /loan-applications/{loan_application_id}/reconciliation | loan:read | Q-M |
| GET /loan-applications/{loan_application_id}/reconciliation/documents/{document_id} | loan:read | Q-M |
| DELETE /loan-applications/{loan_application_id}/reconciliation/documents/{document_id} | loan:read | Q-M |
| GET /loan-applications/{loan_application_id}/reconciliation/log | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/reconciliation/items/{item_id}/check | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/reconciliation/conflicts/{conflict_id}/resolution | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/reconciliation/transfer | loan:read | Q-M |
| POST /analysis-cases/{analysis_case_id}/reports | report:generate | Q-L (tờ trình thẩm định) |
| GET /reports/{report_id} | report:read | Q-L, Q-M |
| GET /reports/{report_id}/claims | report:read | Q-L, Q-M |
| GET /reports/{report_id}/download-url | report:export | Q-L (xuất PDF là bước cuối), Q-M |
| PATCH /reports/{report_id}/review | report:review | Q-L (Rủi ro và cấp phê duyệt đọc đúng bản đã chốt) |
| GET /search | - | Q-M; Q-D2 (chỉ hồ sơ/khách trong phạm vi đọc, tối đa 20) |
| GET /work-items | - | Q-M |
| POST /loan-applications/{loan_application_id}/transitions | loan:read | Q-M |
| GET /loan-applications/{loan_application_id}/reassign-candidates | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/reassign | loan:read | Q-M |
| POST /loan-applications/{loan_application_id}/extend-deadline | loan:read | Q-M |
| GET /loan-applications/{loan_application_id}/steps | loan:read | Q-M |

## 4. Đội agent, đề xuất hành động, thông báo, dashboard, chat

Đề xuất hành động (V049): AI chỉ đề xuất, người đúng vai trò xác nhận hoặc bỏ, kèm lý do ≥ 5 ký tự (Q-H, Q3, Q-N).

<!-- matrix:proposal -->
| Loại đề xuất | credit_officer | document_reviewer | credit_appraiser | risk_officer | compliance_officer | loan_approver | credit_manager | auditor | admin | Căn cứ `rules.md` |
|---|---|---|---|---|---|---|---|---|---|---|
| add_risk_flag | — | ✔ | ✔ | ✔ | — | — | — | — | — | Q3, Q-N (cờ rủi ro) |
| request_documents | — | — | ✔ | — | — | — | — | — | — | Q6 (Thẩm định yêu cầu bổ sung) |
| add_disbursement_condition | — | — | ✔ | — | — | ✔ | — | — | — | Q4, Q-O (điều kiện trước giải ngân) |

Mọi vai trò đọc được ca engine của hồ sơ mình đọc được (Q-M) đều **thấy** khối đề xuất, kể cả vai trò không được xác nhận (khi đó
hiện dòng khóa kèm lý do). Quản trị không thấy ca nào (RLS, Q-J). Backend kiểm lại quyền bằng JWT của người bấm.

| Chức năng | Ai thấy / làm | Căn cứ |
|---|---|---|
| Thông báo trong hệ thống | Chỉ người nhận, và chỉ khi người đó còn trong phạm vi đọc hồ sơ (V051) | Q-M |
| Thông báo qua Gmail | Cùng người nhận với thông báo trong hệ thống; chế độ chuyển thư demo gửi về một địa chỉ | Q-M |
| Nhật ký kiểm toán `/audit-events` | Chỉ Kiểm toán (`audit:read`); phiếu HĐTD đang mở không hiện (Q-I) | Q-M, Q-I |
| Chính sách `/policies` | Mọi vai trò nghiệp vụ đọc; Quản trị không | Q-R, Q-J |
| Chat Trợ lý AI `/chat` | Người đăng nhập, mỗi người chỉ thấy phiên của mình | Q-K |
| Dashboard trace đội agent | Vai trò ngoài Quản trị thấy ca theo RLS (Quản trị thấy rỗng) | Q-K, Q-M, Q-J |
| Chạy đội agent trên hồ sơ (`ROLE_STATUSES` trong `loan_agent_run_service.py`) | QHKH (Nháp, Trả về QHKH, Thẩm định chờ bổ sung), Thẩm định, Rủi ro, Tuân thủ khi đang giữ bước; Trưởng phòng trên hồ sơ của phòng. Kết quả chỉ là đề xuất của AI | Q-B, Q-C; quyết định 11/11/2026 (C-N2) |
| Phê duyệt / từ chối ca engine | Chỉ `loan_approver` | E8, Q4 |
| Chế độ demo đổi tài khoản | Chỉ Quản trị, chỉ khi bật cấu hình; ngoại lệ có giới hạn của Q-J | Q-J (ngoại lệ ghi ở mục "Ngoại lệ demo") |

## 5. Mục cần quyết (rules.md mâu thuẫn hoặc không nói; tạm chọn phương án chặt hơn)

1. `EARLY_WARNING_COMPLIANCE`: Tuân thủ nhận báo sớm trước khi được giao hồ sơ, nên chưa đọc được hồ sơ. Tạm cho thông báo này đi (không có thì báo sớm mất tác dụng); các thông báo khác bị chặn nếu người nhận ngoài phạm vi.
2. Quản trị nằm trong `GATEWAY_ROLES` của engine để vào API; RLS khiến Quản trị không thấy ca nào. Tạm giữ vì Q-K cho dashboard trên điều hướng; chặt hơn là bỏ Quản trị khỏi `GATEWAY_ROLES`.
3. `credit_officer` không có quyền xác nhận đề xuất nào dù thấy khối: `rules.md` không nêu QHKH có quyền này; tạm chặt (không).
4. Trưởng phòng không nằm trong bất kỳ loại đề xuất nào: `rules.md` chỉ cho phân công (Q-B); tạm chặt.
