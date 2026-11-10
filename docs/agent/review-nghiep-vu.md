# Rà soát độ phủ nghiệp vụ và 5 sản phẩm của đề bài

Ngày: 10/11/2026, HEAD `e6e5f24` (V043), engine `llm`. Chỉ rà soát, không sửa code/schema/seed.
Cách làm: đọc `docs/business/{rules,user-flows}.md`, đối chiếu mã (`backend/app/workflow/*`, `infra/database/migrations`, `frontend/src/features/shell/navigation.ts`, `agent_engine/gateway/actions.py`), và thử API thật bằng hồ sơ do crew tạo `LA-20261110-1FD1219D` (id `1fd1219d-c185-4be0-a2ac-56593e451255`) và `LA-20261110-DA639DDD` (id `da639ddd-994f-4afb-b8ef-49bb72b36e93`, đã ở "Đã rút"). Đăng nhập Keycloak thật bằng Playwright rồi gọi API bằng token của phiên (mật khẩu, token không ghi vào báo cáo). Ảnh/script: `/tmp/r2/` (không commit); log thao tác `/tmp/r2/probe.log`.
Chú giải trạng thái: **Có** (thấy trong mã và/hoặc đã thử) · **Một phần** · **Chưa có** · **Lệch** (có nhưng khác quy định). "Mã" = chỉ đọc mã/SQL, chưa thao tác giao diện; "Thử" = đã gọi API/UI trong đợt này; "QA" = kết quả của `qa-luong-nghiep-vu.md` hoặc `qa-doi-agent.md` (không báo lại lỗi L01–L16, L-01..L-05, ghi "đã biết").

## 0. Tóm tắt cho người quyết định

- Nghiệp vụ đợt 1 (Q1–Q8, Q10–Q11 một phần, E1–E9, F4–F11, Q-L..Q-O, Q-S, Q-V) đã có và chặn đúng ở cổng; cổng `rm_submit/checking_pass/appraisal_submit/risk_submit` viết thành hàm thuần kèm unit test (`gates.py:1-282`).
- **Lệch/thiếu có thể bị hỏi khi demo:** (1) không có "Gia hạn 1 lần" (Q11) nên hồ sơ trả lại không có đường gia hạn; (2) "Rút hồ sơ – Quá hạn" cho phép ngay sau khi trả, không kiểm quá hạn hay đã gia hạn (R-01, đã thử); (3) thông báo chỉ sinh ở "Báo sớm Tuân thủ", không có thông báo khi giao việc, trả lại, quyết định (R-02, đã thử); (4) không có giải ngân sau phê duyệt (R-03); (5) 4 mục thanh trái bấm không được: Nhật ký kiểm toán, Tra cứu chính sách, Khách hàng SME, Phiên Hội đồng, trong khi API `/audit-events` và `/policies` đã chạy (R-04); (6) F12 và Q12 chưa có; (7) trang Quản trị (Q9, Q-F) không có API lẫn giao diện.
- Đề bài: 5/5 sản phẩm đã có; yếu nhất là **sản phẩm 3 "hành động thật"** (agent chỉ gián tiếp đổi hồ sơ qua `decide` sau khi người duyệt, `create_loan_draft` chỉ ghi trace, giải ngân bị từ chối cố định) và **sản phẩm 5** (cột "Chatbot đơn agent" trống ở 23/42 lượt, đã biết L-05).

## 1. Ma trận quy định

### 1.1 Q1–Q12 và phiếu HĐTD (rules.md §A)

| Mã | Quy định tóm tắt | Trạng thái | Bằng chứng |
|---|---|---|---|
| Q1 | Thiếu/hết hiệu lực chặn; chỉ cấp phê duyệt chấp thuận ngoại lệ | Có (đã sửa bởi E1) | `gates.py:134-160` (`rm_submit`), `:164-181` (`checking_pass`); danh mục rỗng cũng chặn (`:134`, L01 đã sửa) |
| Q2 | CIC do QHKH tra, HTTD chỉ kiểm hiệu lực, khách không nộp CIC | Có | `gates.py:170-174`; API `POST /cic-lookups`, `/cic-consent` (openapi); `CIC-KH` thành cờ `cickh` (`gates.py:44`) |
| Q3 | AML/PEP do Tuân thủ kết luận ở bước Rủi ro | Có | `transitions.py` (`fraud_hold`, `request_explanation` chỉ `compliance_officer`); `POST /flags/{id}/conclusion` (`case_actions.py:47`) |
| Q4 | Cấp phê duyệt theo TỔNG cấp tín dụng; vượt cấp thì "Nâng cấp phê duyệt" | Có | `routing.py:1-65` (`credit.required_tier`); `POST /approval-upgrade` (`case_actions.py:63`, `case_action_service.py:162`). Công thức tổng: xem Cần xác nhận X-1 |
| Q5 | BCTC kiểm toán khi >20 tỷ | Có (đã đổi bởi E5, tính theo tổng) | `gates.py:60`, `:157-159` (đúng 20 tỷ thì không chặn) |
| Q6 | Yêu cầu bổ sung, SLA tạm dừng, bộ lọc riêng | Một phần | `transitions.py` `request_info`/`accept_info`; `sla.py:58-70` `pause/resume`. QHKH không thấy yêu cầu và không có đường tải (L07, đã biết) |
| Q7 | AI chưa xác nhận thì chặn Gửi; "Cần xác minh" chuyển kèm | Có | `gates.py:153-156` `AI_UNCONFIRMED`, `NEEDS_VERIFICATION` |
| Q8 | SME = doanh thu năm ≤ 1.000 tỷ | Chưa có | Không thấy kiểm phân khúc trong `proposal_service.py`/`loan_service.py` (grep `1000`, `segment` rỗng); chưa thử bằng khách có doanh thu >1.000 tỷ |
| Q9 | Đổi ngưỡng phê duyệt cần 2 người (Quản trị, đợt 3) | Chưa có | Không có API quản trị trong openapi; thanh trái Quản trị bấm không được (`navigation.ts:76`). Ghi "đợt 3" nên chấp nhận được |
| Q10 | CIC/sao kê hiệu lực 30 ngày tính đến ngày trình; cờ "Cần tra cứu lại trước khi trình" | Có | `validity.py:88-111,153` (`relookup_flag`), `cic_service.py:72-74`, `gates.py:230-238` `VALIDITY_AT_APPROVAL`. QA L11: thông báo khóa sai cho hồ sơ còn hạn (đã biết) |
| Q11 | Bổ sung 5 ngày LV khi bị trả; QHKH gia hạn **1 lần** có lý do | Một phần / **Chưa có phần gia hạn** | Hạn 5 ngày có (`due_at` 17/11 sau trả 10/11, thử). Gia hạn: action `extend_deadline` → `422 Unknown workflow action` (thử); không có trong `transitions.py:60-90`, không cột đếm gia hạn trong V021–V043 (grep `extend` rỗng). Xem R-01 |
| Q12 | Phiên HĐTD chỉ hiện số đếm phiếu | Chưa có | Không có phiên Hội đồng (xem §4) |
| Phiếu HĐTD | 4 loại, bắt buộc lý do, không bỏ phiếu thay | Chưa có | Như Q12 |

### 1.2 Mục B, C, D (lịch/SLA, kịch bản dữ liệu, UI)

| Mã | Quy định | Trạng thái | Bằng chứng |
|---|---|---|---|
| B | SLA theo ngày LV, hạn 17:00, không rơi cuối tuần; lễ lấy từ bảng | Có (lệch múi giờ biểu thị) | `sla.py:1-76`; hạn trả hồ sơ `2026-11-17T10:00:00Z` = 17:00 ICT (thử). Bảng lễ có (V021/V023) nhưng không có chỗ Quản trị nhập (Q-F) |
| C | Kịch bản VinaNova, Trường An, Mekong, badge | Một phần | Seed có (QA); số badge rail "đọc từ `BANK.BADGES`" là của mockup, hệ thật tính từ `/work-items`. Không thử lại đợt này (đã nhờ crew khác rà thẩm mỹ) |
| D1 | Liên kết thật; trang chưa có thì toast "sẽ có ở đợt sau" | Lệch | Bốn mục thanh trái là `<button aria-disabled>` không toast (`Rail.tsx:92`, L13 đã biết) |
| D2 | Liên kết 02b↔05 | Có | `routes.tsx:59-61` (`/ho-so-vay`, `/doi-chieu`); cite mở tài liệu: QA e2e `loan-detail.spec.ts` |
| D3 | Trạng thái không có quyền một component | Có | `NoAccess.test.tsx` (Quản trị: "Mở Quản trị" bị khóa) |
| D4 | Nút chính chuyển bước ở header, khóa kèm lý do | Một phần | L11 (nút Trình Rủi ro/Trình phê duyệt không khóa) đã biết |
| D5 | Bố cục 1280/1440 | Ngoài phạm vi (thẩm mỹ, crew khác) | — |
| D6 | Chữ nút khóa `--text-3` | Ngoài phạm vi | — |

### 1.3 E1–E9

| Mã | Trạng thái | Bằng chứng |
|---|---|---|
| E1 Ngoại lệ do QHKH/HTTD lập, cấp phê duyệt chấp thuận/từ chối cùng quyết định; từ chối → Trả lại bổ sung | Một phần | Đề xuất: `POST /exceptions` (`proposals.py:143`); đi theo hồ sơ: `gates.py:141-143,226`. **Chấp thuận/từ chối ngoại lệ ở bước quyết định:** không có trường trong `_decision_params` (`service.py:420+`) và không thấy API; cần đọc UI quyết định (chưa thử). Xem R-05 |
| E2 Chờ bổ sung 5 ngày, SLA tính tiếp | Có (Mã) | `sla.py:58-70`, `steps` có `paused_at`, `remaining_workdays` |
| E3 Rủi ro trả về Thẩm định đủ 5 ngày | Có (Mã) | `transitions.py` `risk_return`→`APPRAISAL`; đủ 5 ngày chưa thử |
| E4 Nhóm liên quan xác nhận trước khi gửi | Có | `gates.py:155`, `PUT /related-parties/{id}` |
| E5 BCTC kiểm toán theo tổng | Có | `gates.py:157-159` |
| E6 Sao kê/xác nhận dư nợ 30 ngày tính từ ngày cấp | Có | `gates.py:50`, `validity.py:164` `statement_valid_until` |
| E7 Số liệu CIC máy-máy không cần xác nhận từng trường | Có (Mã) | nhãn "Hệ thống CIC"; chưa mở lại màn |
| E8 Tách bạch: tham gia bước khác hoặc từng là QHKH 2 năm | Có | `routing.py:1-8` (`credit.is_excluded`), V024, `agent_engine/gateway/actions.py` nhắc E8. `director.hn` đọc API mọi hồ sơ là điểm cần xác nhận (QA X-3 đã biết) |
| E9 Văn bản đồng ý CIC bắt buộc, khóa nút Tra cứu | Có | `gates.py:154` `CONSENT_MISSING`; QA mục 2 báo seed Hưng Phát thiếu văn bản (dữ liệu, đã biết) |

### 1.4 F1–F12 và F-DOC

| Mã | Trạng thái | Bằng chứng |
|---|---|---|
| F1 Bỏ nút Hỏi AI nổi | Có | Lối vào AI ở header, rail `AI`, Ctrl+J (`navigation.ts`); không thấy nút nổi trong `AppHeader.tsx` |
| F2 VinaNova đủ 16/16 | Có (QA) | seed |
| F3 TSBĐ VinaNova, LTV "Cần xác minh" | Có (QA) | seed |
| F4 8 cờ, 4 cờ Cao, cờ Cao đóng khi ghi xử lý | Có | `POST /flags/{id}/handle`; `gates.py:34` |
| F5 CIC hết hiệu lực không được ngoại lệ, trừ CIC gián đoạn | Có | `gates.py:59,143-148,165-167`; `CIC_OUTAGE` chuyển kèm, `VALIDITY_AT_APPROVAL` vẫn chặn (`:224`) |
| F6 Trả lại QHKH ở Thẩm định, lý do bắt buộc | Có (Thử) | `return_to_rm` lý do bắt buộc; HTTD trả lại → `RETURNED_TO_RM`, bước `RM_REWORK`, hạn +5 ngày LV (thử) |
| F7 SLA tính tiếp từ lúc HTTD ghi đạt | Có (Mã) | `accept_info` do HTTD (`transitions.py`) |
| F8 Tuân thủ 3 kết luận `cickh`, Thẩm định "Báo sớm" | Có | `POST /flags/{id}/conclusion`, `/early-warning`; V039 sinh thông báo `EARLY_WARNING_COMPLIANCE` |
| F9 Hình thức trả tiền thuê đất | Có | `gates.py:158-165`, `PUT /collaterals/{id}/lease-payment` |
| F10 Nhóm liên quan "Không thuộc nhóm" + Thẩm định cộng lại thì nâng cấp | Có | `gates.py:155,159`; `POST /approval-upgrade` |
| F11 Văn bản đồng ý có giá trị suốt hồ sơ | Có (Mã) | `validity.py:123` `evaluate_consent` |
| F12 Cảnh báo số tiền ≥500 tỷ, cấu hình được, không chặn | **Chưa có** | grep `AMOUNT_WARN`, `500 tỷ`, `bất thường` trong `backend/app`, `frontend/src` rỗng. L10 báo: nhập 999999 tỷ chỉ hiện "ngoài giới hạn sản phẩm"; backend giới hạn kỳ hạn 600 tháng (V043) nhưng chưa có cận trên số tiền |
| F-DOC Bộ 16 mục §6.1 | Có | `generate_loan_checklist` V043; checklist rỗng đã chặn |

### 1.5 Q-A…Q-V (bảng quyết định bổ sung)

| Mã | Trạng thái | Bằng chứng |
|---|---|---|
| Q-A Luật vào `docs/business/`, mockup vào repo | Một phần | Luật có; mockup ở `.superpowers/` (không phải `docs/design/batch-1/`) |
| Q-B Role Thẩm định `credit_appraiser` | Có | `transitions.py:60-90` |
| Q-C Rủi ro/Tuân thủ 2 role | Có | `risk_officer`, `compliance_officer` |
| Q-D Phân công: nhóm, ít việc nhất, trưởng phòng chuyển kèm lý do | Một phần | Chọn ít việc nhất có (`routing.py`, V039 query `ORDER BY workload`); **trưởng phòng chuyển người kèm lý do: không có action** (`transitions.py` chỉ có 15 action, `credit_manager` chỉ rút hồ sơ) |
| Q-E Tạm dừng SLA giữa ngày | Có (Mã) | `sla.py:58-70` |
| Q-F Ngày nghỉ do Quản trị nhập, seed lễ 2026–2027 | Một phần | Bảng có (V021/V023), seed chưa kiểm; **không có giao diện/API nhập** |
| Q-G CIC giả lập có nhãn, OCR/LLM thật | Có | CIC "Hệ thống CIC" có nhãn; OCR thật. PDF scan chưa OCR (đã biết, mục 4) |
| Q-H Đội agent nối hệ thống thật, gateway có xác thực | Có (QA) | `qa-doi-agent.md` §3: 403/404 đúng; không giữ JWT (`actions.py:11`) |
| Q-I Kiểm toán không thấy phiếu khi phiên mở | Không áp dụng | Chưa có phiên Hội đồng |
| Q-J Quản trị không truy cập khẩn cấp | Có (Thử) | Quản trị gọi `/work-items` → 403 `loan:read`; `/audit-events` → 403 `audit:read` |
| Q-K Giữ `/chat`, `/dashboard`; ẩn `/foundation` | Có | `routes.tsx:62-65` (`foundation` chỉ DEV) |
| Q-L Tờ trình 7 mục, chốt phiên bản | Có | `memo.py`, `GET/PUT /memo`, `/memo/pdf`, `gates.py:197` `REPORT_MISSING`. L11: lý do khóa cũ (đã biết) |
| Q-M Phạm vi đọc theo RLS | Một phần | Kiểm toán đọc "toàn hệ thống" nhưng danh sách gần trống (L03, đã biết) |
| Q-N Ý kiến Rủi ro 2 ý kiến con; "không xác thực" tạm dừng | Có | `fraud_hold/fraud_release`, `risk_submit` yêu cầu 2 ý kiến (`gates.py:205`); `request_explanation` → `RISK_PENDING_INFO` |
| Q-O Đường đi còn thiếu | Một phần | `return_for_supplement` về `APPRAISAL`/`RETURNED_TO_RM` có; **Rút hồ sơ sai** (R-01); "chặn rút khi xử lý gian lận" có vì `withdraw` chỉ từ `RETURNED_TO_RM`/`APPRAISAL_PENDING_INFO` (`transitions.py:88`) |
| Q-P Vượt 100 tỷ → "Chờ phiên Hội đồng – có ở đợt 2" | Một phần | `COUNCIL_SESSION` có (`routing.py:14`); chuỗi hiển thị "Chờ phiên" không có trong `frontend/src` hay `backend/app`. Xem §4 |
| Q-Q Nạp lại seed trước nghiệm thu | Không thuộc phần mềm | Quy trình vận hành |
| Q-R `CS-TD-SME/2025` là chuẩn, RAG nạp từ đó | Có (QA) | Điều khoản trích dẫn có thật |
| Q-S Ngoại lệ chính sách tách khỏi ngoại lệ tài liệu | Một phần | Nêu trong báo cáo agent (QA); chưa thấy bảng/field riêng cho "ngoại lệ chính sách" ở `proposals.py`; chưa thử |
| Q-T Tổng cấp tín dụng gồm hạn mức chưa rút, bảo lãnh, L/C | Một phần | `credit.required_tier`, V024 `exposure`; chưa đọc công thức. Xem X-1 |
| Q-U Màn tài liệu một thẻ | Ngoài phạm vi (UI) | — |
| Q-V Thiếu tài khoản thanh toán = điều kiện bổ sung trước giải ngân | Có | `qa-doi-agent.md` §1 (Trường An "Cần bổ sung" chỉ vì chưa có TK) nhưng **giải ngân không tồn tại** nên điều kiện không có chỗ áp dụng (R-03) |

### 1.6 Cổng trong `user-flows.md` §5

| Cổng | Trạng thái | Bằng chứng |
|---|---|---|
| QHKH gửi HTTD | Có | `gates.py:134-165`; thử: `submit` thành công sau khi đủ ngoại lệ + CIC mới + consent (hồ sơ `1fd1219d`) |
| HTTD chuyển Thẩm định | Có | `gates.py:168-185` |
| Thẩm định trình Rủi ro | Có | `gates.py:188-203` |
| Rủi ro trình Phê duyệt | Có | `gates.py:206-240` |
| Nhánh Trả lại QHKH | Có (Thử) | HTTD `return_to_rm` → 200, hạn 17/11 |
| Nhánh Chờ bổ sung | Một phần | L07 |
| Nâng cấp phê duyệt | Có (Mã) | xem §3 |
| Ngoại lệ chấp thuận/từ chối | Một phần | R-05 |
| Cờ CIC khách tự nộp | Có | `gates.py:196-198` |

## 2. Ma trận 5 sản phẩm của đề bài

Đề bài (đọc từ `PROBLEM STATEMENT - SHB2.pdf`): (1) demo ≥2–3 chuyên gia cùng xử lý một yêu cầu phức tạp; (2) planner phân rã và giao cho executor; (3) dùng công cụ thật, hành động cụ thể; (4) dashboard trace, trạng thái tác vụ, quyết định, luồng phối hợp; (5) so sánh single-agent chatbot với multi-agent.

| # | Mức đáp ứng | Bằng chứng | Điểm yếu giám khảo có thể hỏi |
|---|---|---|---|
| 1 Nhiều chuyên gia phối hợp | Đạt | `agent_engine/agents/`: `credit_agent`, `compliance_agent`, `operations_agent`, `document_agent`, `validation_agent`; QA §1: 6 ca đối chiếu số khớp DB, trích dẫn điều khoản có thật | Kết luận dao động theo LLM (L-03 bỏ sót EBITDA âm của Đại Thành); chat từ chối câu hỏi hợp lệ (L-01) |
| 2 Planner → executor | Đạt | `backend/app/agents/dynamic_planner.py`, `agent_engine/` orchestrator DAG (graphify cộng đồng "Agent Engine Planner"); "gọi bù `get_collateral` do orchestrator" có nhãn (QA §2) | Gọi bù luôn là một tool: giám khảo hỏi planner có thật sự quyết định hay luật cố định |
| 3 Công cụ và hành động thật | **Đạt một phần (yếu nhất)** | Đọc: MCP `mcp_core_banking/server.py` (11 tool/ca, khớp trace). Ghi: duy nhất `commit_loan` → `decide` bằng JWT người duyệt (`gateway/actions.py:5-7,18`); `create_loan_draft` chỉ ghi trace (`:4`); `create_disbursement_schedule` luôn bị từ chối (`:8`); `action_log` giữ 4 dòng, `approval_token` 0 dòng (QA §3) | "Agent đã làm gì ngoài đọc dữ liệu?" Câu trả lời trung thực: đề xuất, còn hành động cần người ký. Không có hành động như tạo nhiệm vụ, gửi thông báo, ghi cờ (R-06). Đây là thiết kế có chủ đích (kiểm soát) nên cần nói rõ khi thuyết trình |
| 4 Dashboard | Đạt, còn lỗi realtime | `/dashboard` (`routes.tsx:63`) có Tổng quan, Traces, So sánh; số khớp DB (QA §4); trace phát lại có | Trace đang chạy không cập nhật thời gian thực (L-02, đã biết); chưa có sơ đồ luồng phối hợp riêng (chưa mở lại màn để xác nhận) |
| 5 So sánh single vs multi | Một phần | `ComparisonTab.tsx`; 46 tệp `agent_engine/benchmark_results`; benchmark ngoài phạm vi rà soát này | Cột "Chatbot đơn agent" là "—" ở 23/42 lượt (L-05, đã biết), mô tả "2 chế độ" sai; hạn chế số lượt (11/20 đã dùng) |

## 3. Luồng chưa ai kiểm (thử đợt này)

Hồ sơ thử: `1fd1219d` (QHKH gửi → CHECKING, HTTD trả lại → RETURNED_TO_RM) và `da639ddd` (như trên, rồi rút). Mọi hồ sơ do crew tạo; không đụng hồ sơ seed.

| Luồng | Kết quả thử | Kết luận |
|---|---|---|
| Gia hạn hạn bổ sung (Q11) | `POST /transitions {action:"extend_deadline"}` → `422 Unknown workflow action` (QHKH, hồ sơ ở RETURNED_TO_RM) | **Chưa có** (R-01) |
| Rút hồ sơ | QHKH `withdraw` ở CHECKING → `409 not allowed from status CHECKING` (đúng, chỉ từ RETURNED_TO_RM/APPRAISAL_PENDING_INFO). Sau khi HTTD trả lại (hạn 17/11): `withdraw` với `withdraw_kind=OVERDUE` → **200, WITHDRAWN** ngay trong ngày; lần hai → 409 | Có, nhưng **Lệch**: không kiểm quá hạn, không kiểm đã gia hạn (R-01). Phân biệt khách rút/quá hạn chỉ là nhãn tham số |
| Đề xuất ngoại lệ | Dùng thật trong `createProposal` (e2e): gửi đề xuất cho các mục thiếu → gửi HTTD thành công | Có phía đề xuất. Phía **chấp thuận/từ chối của cấp phê duyệt cùng quyết định: không thấy trường nào** (R-05) |
| Nâng cấp phê duyệt khi cộng thêm | Có API `POST /approval-upgrade` (`case_actions.py:63`) chỉ dành cho Thẩm định (`case_action_service.py:162`); chưa thử vì cần hồ sơ ở APPRAISAL với nhóm liên quan (cần hồ sơ riêng) | Chưa kiểm được trong đợt này (cần ≈30 phút thiết lập hồ sơ APPRAISAL) |
| Kết luận cờ `cickh` | Có API; cần hồ sơ có cờ `cickh` (chỉ VinaNova seed, không được đổi) | Không thử; xem QA đợt trước |
| Giải ngân sau phê duyệt | `POST /loan-applications/{id}/disbursements` → 404; không có trạng thái sau `APPROVED`; không có chữ "giải ngân" trong `frontend/src`, `backend/app` (chỉ `docs/business` Q-V) | **Chưa có** (R-03) |
| Thông báo | Sau gửi, HTTD trả lại: `GET /notifications` của QHKH, HTTD, Thẩm định đều `items: []` (total 0). Chỉ `V039` chèn `EARLY_WARNING_COMPLIANCE`. Chuông ở `Topbar.tsx` đọc API này nên luôn trống | **Chưa có** cho giao việc/trả lại/quyết định (R-02) |
| Nhật ký kiểm toán | Auditor gọi `/audit-events` → 200, có `WORKFLOW_SUBMIT_TO_CHECKING`, lọc theo `entity_id` cũng ra; Quản trị 403. Nhưng thanh trái "Nhật ký kiểm toán" không bấm được (`Rail.tsx:92`) | Backend **Có**, giao diện **Chưa có** (R-04) |
| Tra cứu chính sách | `/policies` → 200 (CS-TD-SME/2025); nút thanh trái không bấm được | Backend Có, giao diện Chưa có (R-04) |
| Mở lại hồ sơ đã rút | `withdraw` lần hai → 409 `not allowed from status WITHDRAWN`; `submissions` chưa thử lại đúng schema | Một phần: chặn rút lần hai; chưa kiểm gửi lại |

## 4. Hội đồng tín dụng và OCR scan

### 4.1 Hội đồng tín dụng (đợt 2)

- **Hiện có:** định tuyến Cấp 3 đưa hồ sơ vào `COUNCIL_SESSION` (`routing.py:14-15`, `transitions.py:35`). Không có bảng phiên/phiếu, API, trang. Thanh trái có "Phiên Hội đồng tín dụng" nhưng khóa. Chuỗi "Chờ phiên Hội đồng – có ở đợt 2" (Q-P) không thấy trong mã.
- **Phạm vi tối thiểu theo tài liệu** (rules.md "Luật Hội đồng", Q12, Q-I, Q-P): (a) bảng phiên + phiếu + thành viên đủ điều kiện (E8); (b) phiên tự mở khi vào Cấp 3, Chủ tịch (hoặc Phó) đặt hạn; (c) bỏ phiếu 4 loại, bắt buộc lý do, không bỏ thay; (d) đếm "n/m đã bỏ phiếu", ẩn tên/nội dung đến khi đóng (Q12, ẩn cả với kiểm toán và nhật ký, Q-I); (e) túc số > ½ thành viên đủ điều kiện, thông qua đa số phiếu đã bỏ, hòa thì chủ tọa quyết; hết hạn thiếu túc số thì mở lại; (f) trang `/phien-hoi-dong` + chuyển trạng thái sau đóng (`decide`).
- **Ước lượng công:** L, khoảng 2 ngày (migration + RLS ẩn phiếu: M–L; API + test: M; trang: M).
- **Rủi ro nếu không làm:** hồ sơ >100 tỷ kẹt ở `COUNCIL_SESSION` không có đường ra và không ai thấy (Q-P cấm duyệt tạm). Với demo: tránh khai báo hồ sơ >100 tỷ; nếu giám khảo hỏi "Cấp 3" chỉ nêu đã định tuyến. Ảnh hưởng chấm điểm **thấp** (đề bài nhấn agent, không nhấn Hội đồng), ảnh hưởng demo **thấp–vừa**.

### 4.2 OCR PDF scan

- **Hiện có:** PDF scan không có lớp chữ báo lỗi `O_C_R_NO_TEXT_LAYER_ERROR / PDFIUM_ERROR` (L05, L08 đã biết). Có OCR provider cho ảnh (graphify "OCR Provider") nhưng worker chặn khi không có text layer (V040 `document_pipeline_worker`).
- **Phạm vi tối thiểu:** khi không có text layer, render từng trang ra ảnh (pdfium) rồi đưa qua OCR provider hiện có; đánh dấu trường `ai_proposed` (Q7) để người xác nhận; trả bounding box cho màn đối chiếu; giữ lỗi tiếng Việt rõ ràng nếu OCR thất bại.
- **Ước lượng công:** M–L (2–5 giờ) nếu provider đã nhận ảnh; thêm 1–2 giờ nếu cần chuẩn hóa tọa độ vùng tô.
- **Rủi ro nếu không làm:** giám khảo tải PDF scan (rất thường gặp với hồ sơ doanh nghiệp) thì thấy lỗi thô và hồ sơ không có trường để đối chiếu; ảnh hưởng demo **Cao** nếu demo có thao tác tải tệp trực tiếp, nên chuẩn bị tệp có lớp chữ để dự phòng.

## 5. Phát hiện mới

| Mã | Mức | Trang · vai trò | Mô tả | Căn cứ | Ảnh | Đề xuất sửa | Công |
|---|---|---|---|---|---|---|---|
| R-01 | Cao | Hồ sơ vay · QHKH, trưởng phòng | Q11 "gia hạn 1 lần có lý do" không có; "Rút hồ sơ – Quá hạn" cho phép ngay ngày trả (hạn 17/11), không kiểm quá hạn hay đã gia hạn. Gộp cùng gốc: thiếu `extend_deadline` và thiếu kiểm hạn trong `withdraw` | `rules.md` Q11, Q-O; `transitions.py:83-90`; `service.py:403-408` chỉ kiểm giá trị `withdraw_kind`; thử `/tmp/r2/probe.log` (dòng `rm extend`, `rm withdraw OVERDUE not overdue`) | Không có (thao tác API) | Thêm action `extend_deadline` (1 lần, lý do, +5 ngày LV, cột đếm); `withdraw` OVERDUE chỉ khi `due_at` đã qua và đã gia hạn hoặc quá hạn sau gia hạn; `CUSTOMER` thì cho phép; chỉ QHKH/`credit_manager`; đồng bộ `credit.apply_transition` | M |
| R-02 | Cao | Chuông thông báo · mọi vai trò | Thông báo chỉ sinh ở "Báo sớm Tuân thủ"; giao việc, trả lại, hết hạn, quyết định không có thông báo. Chuông luôn trống | `V039__case_actions.sql:130` là chỗ duy nhất `INSERT INTO integration.notification`; thử: sau `return_to_rm`, `/notifications` của QHKH `total: 0` | Không có | Sinh thông báo trong `WorkflowService` (người nhận bước mới, QHKH khi bị trả, QHKH khi có quyết định) qua outbox sẵn có; dòng trong chuông dẫn tới hồ sơ | M |
| R-03 | Cao | Hồ sơ vay · QHKH, Phê duyệt | Không có giải ngân sau phê duyệt và không có điều kiện trước giải ngân (Q-V có quyết định nhưng không có chỗ áp dụng). Trạng thái kết thúc là `APPROVED*` | `rules.md` Q-V; `gateway/actions.py:8` từ chối giải ngân; thử `POST /disbursements` → 404 | Không có | Tối thiểu: màn "Điều kiện trước giải ngân" liệt kê điều kiện (TK thanh toán, chứng từ) do agent Operations nêu, chưa tạo giải ngân. Hoặc ghi rõ ngoài phạm vi khi demo | M (hiển thị điều kiện) – L (giải ngân đủ vòng) |
| R-04 | Cao | Thanh trái · Kiểm toán, Quản trị, Phê duyệt, Thẩm định | Nhật ký kiểm toán, Tra cứu chính sách, Khách hàng SME, Phiên Hội đồng bấm không được, không giải thích, dù `/audit-events`, `/policies` đã chạy. Kiểm toán và Quản trị chỉ còn đúng vai trò "nhật ký" | `navigation.ts:56-76`, `Rail.tsx:92`; thử API 200. L13 mới nói chung, thiếu việc có sẵn API | Không có | Làm trang Nhật ký kiểm toán (bảng + lọc theo hồ sơ/hành động, API sẵn) và Tra cứu chính sách (danh sách + tìm kiếm, API sẵn); mục còn lại: toast "sẽ có ở đợt sau" (D1) | M (mỗi trang), S (toast) |
| R-05 | Vừa | Quyết định · Cấp phê duyệt | E1 yêu cầu cấp phê duyệt chấp thuận/từ chối ngoại lệ cùng quyết định; `_decision_params` chỉ nhận loại quyết định, số tiền, kỳ hạn; không thấy API `exceptions/{id}/decision`. Chưa mở giao diện quyết định để xác nhận | `rules.md` E1; `proposals.py:143-155` chỉ có tạo/rút đề xuất; `service.py:420+` | Không có | Thêm `exception_decisions` trong `params` của `decide` (mỗi ngoại lệ: chấp thuận/từ chối + lý do); từ chối bất kỳ → ép `return_for_supplement`. Cần kiểm UI trước khi kết luận | M |
| R-06 | Vừa | Đội agent · QHKH, Thẩm định | Hành động ghi của agent mỏng: chỉ `decide` sau người duyệt; `create_loan_draft` chỉ ghi trace; thiếu hành động có kiểm soát (ghi cờ, tạo việc) để thể hiện "thực thi" | `gateway/actions.py:3-9`; QA `action_log` 4 dòng | Không có | Cho phép agent đề xuất "ghi cờ" hoặc "yêu cầu bổ sung" vào `case_flag` qua gateway (cùng cơ chế token người xác nhận) và hiện trong trace | M–L |
| R-07 | Vừa | Tạo đề xuất · QHKH | F12 chưa làm; chưa có cận trên số tiền | `rules.md` F12; grep rỗng; L10 | Không có | Đặt `AMOUNT_WARN_BILLION` (cấu hình), cảnh báo ≥500 tỷ không chặn; chặn cận cứng trên ở backend | S |
| R-08 | Vừa | Hồ sơ vay · HTTD/trưởng phòng | Trưởng phòng "chuyển người kèm lý do" (Q-D) không có action; Q8 (SME ≤1.000 tỷ) không được kiểm | `transitions.py` (15 action); grep Q8 rỗng | Không có | Thêm `reassign` (credit_manager, lý do bắt buộc, chọn người không bị loại); chặn/cảnh báo khách doanh thu >1.000 tỷ ở bước tạo | M, S |
| R-09 | Nhẹ | Quản trị | Trang Quản trị (ngày nghỉ Q-F, ngưỡng Q9) không có API lẫn giao diện; Quản trị chỉ còn chọn "Nhật ký" bị khóa | `navigation.ts:76`; openapi không có đường quản trị | Không có | Ghi "đợt 3" rõ trong tài liệu demo; nếu cần, trang chỉ đọc bảng lễ và ngưỡng | M (chỉ đọc), L (nhập 2 người) |
| R-10 | Nhẹ | Cổng quản trị tài liệu | Mockup `.superpowers/` không nằm ở `docs/design/batch-1/` như Q-A | Q-A | — | Chép mockup hoặc sửa tài liệu | S |

## Cần xác nhận (tài liệu mâu thuẫn, quyết định thuộc Mate/captain)

- **X-1 Tổng cấp tín dụng:** Q4 ghi "dư nợ + đề xuất mới của khách và người có liên quan"; Q-T ghi thêm "hạn mức chưa rút, bảo lãnh, L/C", ghi cần Pháp chế xác nhận. Mã dùng `credit.required_tier` và `exposure` (V024); chưa kiểm công thức khớp nguồn nào. Nguồn: `rules.md` Q4 (dòng 17) và Q-T (dòng 218).
- **X-2 Ngoại lệ:** Q1 ("chỉ cấp phê duyệt được chấp thuận ngoại lệ; HTTD/QHKH chỉ đề xuất") và E1 ("có đề xuất thì được chuyển bước") nói cùng một điều theo hai cách; F5 loại CIC khỏi ngoại lệ; chốt sau vòng 3 cho phép sao kê. Mã theo E1+F5. Không mâu thuẫn thực, ghi để tránh người đọc Q1 hiểu sai.
- **X-3 Q-K ("`/dashboard` hiện trên điều hướng") và `routes.tsx:63`:** route có, nhưng chưa xác nhận mục điều hướng cho từng vai trò (không phải việc của báo cáo này).
- **X-4 Mục thanh trái cho Quản trị (Q-J "không truy cập khẩn cấp") và "Nhật ký kiểm toán" trên thanh Quản trị (`navigation.ts:76`):** Quản trị nhận 403 `audit:read` nên mục này sẽ không bao giờ dùng được; hoặc bỏ mục, hoặc cấp quyền đọc nhật ký cho Quản trị. Cần quyết định.

## 6. Bảng việc còn thiếu, xếp theo ảnh hưởng tới chấm điểm và demo

| # | Việc | Mã | Ảnh hưởng chấm điểm / demo | Công |
|---|---|---|---|---|
| 1 | Đóng L05/L08 và PDF scan OCR (render trang → OCR) | §4.2 | Demo: Cao (tải tệp trực tiếp) | M–L |
| 2 | Hành động ghi của agent có kiểm soát + hiển thị trong trace (sản phẩm 3) | R-06 | Chấm điểm: Cao (điểm yếu nhất của đề bài) | M–L |
| 3 | Thông báo khi giao việc/trả lại/quyết định | R-02 | Demo: Cao (chuông trống làm "hệ thống chết") | M |
| 4 | Gia hạn 1 lần + kiểm hạn khi rút | R-01 | Demo: Vừa; nghiệp vụ: Cao | M |
| 5 | Trang Nhật ký kiểm toán + Tra cứu chính sách (API sẵn) | R-04 | Demo: Cao (vai Kiểm toán gần trống) | M ×2 |
| 6 | Sửa so sánh single vs multi (cột trống L-05) | sản phẩm 5 | Chấm điểm: Cao | S–M |
| 7 | Trace realtime/poll dự phòng (L-02) | sản phẩm 4 | Demo: Cao | S–M |
| 8 | Xác nhận và sửa chấp thuận/từ chối ngoại lệ ở bước quyết định | R-05 | Nghiệp vụ: Vừa | M |
| 9 | Điều kiện trước giải ngân | R-03 | Demo: Vừa | M |
| 10 | Cảnh báo ≥500 tỷ và cận trên số tiền | R-07 | Vừa | S |
| 11 | Trưởng phòng chuyển người; kiểm phân khúc SME | R-08 | Vừa | M, S |
| 12 | Hội đồng tín dụng | §4.1 | Chấm điểm: Thấp; demo: Thấp–Vừa | L |
| 13 | Trang Quản trị (ngày nghỉ, ngưỡng) | R-09 | Thấp | M–L |

Phần chưa rà: nâng cấp phê duyệt khi cộng thêm, kết luận cờ `cickh`, Q-S (ngoại lệ chính sách), công thức Q-T/Q4 trong SQL, và E3 "đủ 5 ngày" chỉ đọc mã, chưa thử vì cần hồ sơ riêng (≈30–60 phút mỗi luồng); mockup đối chiếu D5/D6 ngoài phạm vi.
