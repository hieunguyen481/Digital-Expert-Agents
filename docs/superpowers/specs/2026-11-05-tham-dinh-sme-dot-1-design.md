# Thiết kế đợt 1: 4 trang thẩm định tín dụng SME trên hệ thống thật

Ngày: 05/11/2026 · Trạng thái: **đã duyệt 06/11/2026** (người dùng đồng ý cả 21 đề xuất Q-A đến Q-U)

## 1. Mục đích

Hệ thống hiện chỉ có trang chat, chưa có trang riêng theo vai trò, chưa có quy trình và chưa có liên kết giữa trang với chat. Đợt này làm thật 4 trang lõi của giai đoạn tiền phê duyệt trên backend thật, theo từng phần và xong phần nào chắc phần đó.

Mô hình là ngân hàng Việt Nam nói chung, không riêng SHB. Đây là phần đầu của giai đoạn 1 trong 3 giai đoạn (1 tiền phê duyệt, 2 hợp đồng và giải ngân, 3 giám sát sau vay).

**Thành công nghĩa là:** 7 vai trò đăng nhập thật, mỗi vai trò thấy đúng việc của mình; một hồ sơ đi được từ nháp đến quyết định cấp 1 hoặc 2 trên dữ liệu thật; mọi con số có nguồn bấm được; AI chỉ đề xuất, không quyết định; ai vượt quyền thì hệ thống chặn ở database chứ không chỉ ở giao diện.

## 2. Phạm vi

**Làm:**
- 02b Chi tiết hồ sơ vay, 03 Việc của tôi, 04 Tạo đề xuất vay, 05 Đối chiếu tài liệu.
- Lỗi nền chặn các trang này: phân quyền dữ liệu, API lỗi, worker, phân quyền frontend.
- Dữ liệu mẫu SME: VinaNova, Mekong Flex và các hồ sơ trong hàng chờ.

**Không làm trong đợt này:**
- 6 trang còn lại: Phiên Hội đồng, Khách hàng SME, Trợ lý AI toàn màn hình (đợt 2); Tra cứu chính sách, Nhật ký kiểm toán, Quản trị (đợt 3). Database vẫn phải sẵn cho Hội đồng (mục 7.3).
- Giai đoạn 2 và 3 của quy trình.
- Kết nối CIC thật. CIC là adapter giả lập, có nhãn rõ (câu hỏi Q-G).

**Tuyệt đối tránh:**
- Chạy được nhưng phân quyền chỉ ở giao diện.
- Số liệu không có nguồn, hoặc AI ghi vào hồ sơ mà không có người xác nhận.
- Làm vì demo: dữ liệu giả phải ghi rõ là giả.

## 3. Nguồn sự thật

| Nội dung | Nơi lưu |
|---|---|
| Luật nghiệp vụ đã chốt (Q1–Q12, E1–E9, F1–F12, luật Hội đồng) | `.superpowers/brainstorm/2612-1793811784/fix-dot1-decisions.md` |
| Giao diện: token, khung trang, component, nguyên tắc | `.superpowers/brainstorm/2612-1793811784/design-system.md`, `shell.html` |
| Hành vi và nội dung từng trang | `.superpowers/brainstorm/2612-1793811784/content/*.html`, `common.js` |

Thư mục `.superpowers/` đang bị `.gitignore`, và `docs/business/` chỉ có template rỗng. Trước khi code phải chuyển các nguồn này vào repo (Q-A), nếu không luật trong `AGENTS.md` ("code mâu thuẫn tài liệu nghiệp vụ thì dừng lại") không có căn cứ.

Mockup là đặc tả hành vi, không phải code để chép. Làm lại bằng React và Ant Design 6. Mockup cố định "hôm nay" là 05/11/2026 để các hạn nhất quán.

## 4. Các hướng đã cân nhắc

**Thứ tự làm.** (a) Code ngay sau đợt 1. (b) Thiết kế đủ 10 trang rồi mới code. **Người dùng chọn (a).** Đổi lại, trang Hội đồng ở đợt 2 có thể buộc sửa database, nên phần 7.3 tính trước.

**Lưu quy trình** (quyết định của trợ lý):
- (a) Thêm trạng thái vào `credit.loan_application` hiện có: ít việc nhất, nhưng không lưu được hạn, tạm dừng SLA, người tham gia từng bước, nên không kiểm tra được tách bạch.
- (b) **Chọn:** giữ trạng thái hiện tại trên hồ sơ và thêm bảng `credit.case_step` lưu từng bước. Có đủ dữ liệu cho SLA, tách bạch, dòng thời gian và phiên Hội đồng.
- (c) Dùng state machine của `agent_engine`: loại, vì chạy trên SQLite riêng và gateway không có xác thực.

**Frontend** (quyết định của trợ lý):
- (a) Vá `ChatPage` 633 dòng: loại, vì nó gộp mọi thứ và hard-code `DEMO_USER`.
- (b) **Chọn:** dựng khung mới (rail, topbar, panel AI 408px), tái dùng `apiClient`, `keycloak`, hook-service, `SourceDrawer`, `MarkdownContent`.

## 5. Quy trình và trạng thái

```
Nháp (QHKH) → Kiểm tra hồ sơ (HTTD, 2 ngày LV) → Thẩm định (5) → Ý kiến Rủi ro (3)
   → Phê duyệt: Cấp 1 GĐ chi nhánh, Cấp 2 Hội sở (2 ngày LV) / Cấp 3 Hội đồng (đợt 2, theo hạn phiên)
   → Duyệt / Duyệt có điều kiện / Từ chối / Trả lại bổ sung
```

Các nhánh:
- **Trả lại QHKH** (HTTD, Thẩm định): phải sửa đề xuất, bắt buộc lý do, hạn 5 ngày LV, gia hạn 1 lần có lý do. Nhận lại thì SLA Thẩm định tính lại đủ 5 ngày.
- **Thẩm định – chờ bổ sung:** thiếu tài liệu, hồ sơ ở lại, SLA tạm dừng. QHKH có 5 ngày LV từ ngày yêu cầu, chỉ tải lên, HTTD kiểm tra. SLA tính tiếp số ngày còn lại từ lúc HTTD ghi đạt; HTTD ghi không đạt thì vẫn chờ bổ sung.
- **Rủi ro trả về Thẩm định:** tính lại đủ 5 ngày LV.
- **Nâng cấp phê duyệt:** tổng cấp tín dụng vượt cấp hiện tại.
- **Ngoại lệ:** QHKH hoặc HTTD lập đề xuất kèm lý do thì được đi tiếp, chưa có đề xuất thì chặn. Cờ đi theo hồ sơ, cấp phê duyệt chấp thuận hoặc từ chối cùng lúc với quyết định; từ chối thì Trả lại bổ sung. Không được ngoại lệ: CIC hết hiệu lực (trừ khi hệ thống CIC gián đoạn, và vẫn phải tra lại trước khi trình) và thiếu văn bản đồng ý tra cứu. Sao kê hết hiệu lực thì được.
- **Cờ CIC khách tự nộp:** Thẩm định ghi nhận và có thể báo sớm Tuân thủ; cờ vẫn mở nhưng không chặn việc trình. Tuân thủ kết luận ở bước Ý kiến Rủi ro, kết quả hiện cho cấp phê duyệt (F8, Q-N).

**Điều kiện từng cổng:**

| Cổng | Chặn khi | Không chặn nhưng chuyển kèm cờ |
|---|---|---|
| QHKH gửi HTTD | Thiếu hoặc hết hiệu lực mà chưa có đề xuất ngoại lệ (E1, F5); tài liệu hoặc trường AI đọc chưa xác nhận (Q7); nhóm liên quan chưa xác nhận (E4); chưa chọn hình thức trả tiền thuê đất (F9); BCTC chưa kiểm toán khi tổng > 20 tỷ (E5) | "Cần xác minh"; thuê đất hằng năm, hoặc một lần chưa có chứng từ; "Không thuộc nhóm" (F10) |
| HTTD chuyển Thẩm định | Mục kiểm tra chưa đạt mà chưa có đề xuất ngoại lệ | Lưu ý "Cần xác minh" |
| Thẩm định trình Rủi ro | Còn số liệu chưa xác nhận hoặc cờ chưa xử lý (trừ cờ CIC khách tự nộp); chưa có tờ trình (Q-L) | Cờ CIC khách tự nộp |
| Rủi ro trình Phê duyệt | Chưa đủ ý kiến Rủi ro và kết luận Tuân thủ; CIC hoặc sao kê hết hiệu lực tại mốc trình (Q10), trừ ngoại lệ đã có | Ngoại lệ, cờ đã kết luận |

SLA tính theo ngày làm việc, hạn 17:00, múi giờ `Asia/Ho_Chi_Minh`, không rơi vào cuối tuần hay ngày nghỉ. Ca kiểm thử: 30/10+5 = 06/11; 05/11+5 = 12/11; 05/11+2 = 09/11; 04/11+2 = 06/11.

## 6. Vai trò

| Vai trò (UI) | Role hiện có | Việc cần làm |
|---|---|---|
| QHKH | `credit_officer` | Thêm quyền xác nhận AI; đổi nghĩa `loan:submit` thành gửi HTTD |
| Hỗ trợ tín dụng | `document_reviewer` | Thêm quyền chuyển bước, đọc khách |
| Thẩm định | chưa có | Thêm `credit_appraiser` (Q-B) |
| Rủi ro/Tuân thủ | `risk_officer`, `compliance_officer` | Giữ 2 role, 1 mã UI; kết luận cờ F8 và AML chỉ Tuân thủ (Q-C) |
| Cấp phê duyệt | `loan_approver` | Thêm cấp; `council_member` ở đợt 2 |
| Kiểm toán | `auditor` | Chỉ đọc; thêm quyền xem tài liệu |
| Quản trị | `admin` | **Bỏ mọi quyền nghiệp vụ**, chỉ còn `admin:manage` (Q-J) |

**Tách bạch (E8):** không được phê duyệt hoặc bỏ phiếu nếu đã tham gia bất kỳ bước nào của hồ sơ, hoặc từng là QHKH của khách trong 2 năm. Kiểm tra ở cả service và database. Cần lịch sử QHKH riêng, vì `relationship_manager_id` hiện bị API claim ghi đè.

**Cấp phê duyệt (Q4):** tính theo tổng = dư nợ hiện hữu + đề xuất mới, của khách và người liên quan. Ngưỡng ≤20 / 20–100 / >100 tỷ, có phiên bản, cấu hình được.

## 7. Dữ liệu

### 7.1 Bảng mới (đều có RLS ngay từ đầu)

| Bảng | Dùng cho |
|---|---|
| `credit.case_step` | Bước, người nhận, `received_at`, `due_at`, `paused_at`, `remaining_workdays`, `resumed_at`, kết quả, lý do |
| `credit.case_exception` | Đề xuất ngoại lệ, người lập, lý do, kết quả chấp thuận hoặc từ chối |
| `credit.case_flag` | Cờ theo hồ sơ: mức, vòng đời, kết luận Tuân thủ 3 lựa chọn, nguồn |
| `credit.case_related_party` | Nhóm liên quan: xác nhận, "Không thuộc nhóm" kèm căn cứ, ảnh chụp dư nợ |
| `credit.authority_tier` | Ngưỡng có phiên bản |
| `credit.sla_parameter`, lịch ngày nghỉ | Tham số SLA, ngày nghỉ (Q-F) |
| `document.field_conflict` | Mâu thuẫn giữa các nguồn và kết luận của người |
| `banking.cic_consent` | Văn bản đồng ý tra cứu; có hiệu lực suốt hồ sơ, trừ khi ghi khác |
| `customer.relationship_manager_history` | Phục vụ E8 |
| N-N checklist ↔ tài liệu | TSBĐ có 3 tài liệu, hợp đồng có 2 |

### 7.2 Sửa bảng cũ
- `document.extracted_field`: thêm `source_type` (AI_OCR / HUMAN / SYSTEM_CIC) và CHECK cho trạng thái.
- `document.document`: thêm `issued_date`. Hiệu lực sao kê tính từ ngày cấp; CIC từ ngày tra cứu, đến hết ngày tra + 29, xét tại ngày trình phê duyệt.
- `banking.credit_report`: thêm người tra cứu, tham chiếu văn bản đồng ý, `valid_until`.
- `credit.loan_decision`: thêm `decision_source`, `council_session_id` nullable; chuyển sang chỉ được thêm, không sửa.
- Chỉ số SME §4.2 (DSCR theo EBITDA, Nợ vay/EBITDA sau cấp TD, EBIT/lãi vay, LTV): công thức xác định, có nguồn đầu vào. `calculations/affordability.py` hiện theo thu nhập cá nhân, không dùng được.

### 7.3 Chuẩn bị cho Hội đồng (đợt 2)
Đợt này chỉ cần: bước `COUNCIL_SESSION` trong `case_step`, một hàm tách bạch dùng chung cho phê duyệt và bỏ phiếu, các cột mới của `loan_decision`, và cờ "nhạy cảm tới khi đóng phiên" cho nhật ký. Các bảng phiên, thành viên, phiếu làm ở đợt 2, theo luật đã chốt: túc số hơn một nửa thành viên đủ điều kiện, thông qua theo đa số phiếu đã bỏ, hòa thì người chủ trì quyết định, phiếu ẩn tới khi đóng phiên, không bỏ phiếu thay.

## 8. API

Giữ mẫu router hiện có. Thêm hoặc sửa:

| Trang | Endpoint |
|---|---|
| Chung | `GET /me` trả vai trò, quyền, số việc |
| 03 | `GET /work-items?filter=` |
| 04 | Nháp và tự lưu; văn bản đồng ý; `POST` tra cứu CIC; nhóm liên quan; đề xuất ngoại lệ; `GET` điều kiện gửi; `POST` gửi HTTD |
| 05 | Tài liệu theo hồ sơ; mâu thuẫn và chốt nguồn; cập nhật checklist; chuyển Thẩm định |
| 02b | Dòng thời gian; cờ; Yêu cầu bổ sung; Trả lại; Trình Rủi ro; Ý kiến Rủi ro; kết luận Tuân thủ; Báo sớm; Nâng cấp; quyết định kèm ngoại lệ |
| Chat | Ngữ cảnh đối tượng; lưu metadata tin nhắn; trích dẫn trỏ tài liệu/trang/trường; thẻ hành động chờ xác nhận |

Mọi chuyển bước đi qua một service duy nhất, kiểm tra vai trò từng bước và ghi nhật ký. Bỏ đường đổi trạng thái qua `PATCH status`.

## 9. Trang và giao diện

Theo `design-system.md`. Các điểm đã chốt:
- Theo hướng lấy việc làm trung tâm: màn đầu trả lời đang ở đâu, làm gì tiếp, điều gì đáng lo nhất; tối đa 30 phần tử bấm được ở màn đầu.
- Nút chính ở góc phải header, tối đa 1 nút. Không có nút AI nổi.
- Ở 1280 và 1440, AI mở hay đóng, đều không cuộn ngang, không đè chữ.
- Không có quyền: tiêu đề trung tính, không tên khách, đúng 1 nút.
- Token AntD đổi theo design-system (hiện `colorPrimary #F37021` chữ trắng không đạt AA, đổi sang `#C44D0E`).

## 10. AI và liên kết 2 chiều

- **Trang → chat:** "Hỏi AI" gắn ngữ cảnh đối tượng (hồ sơ, chỉ số, cờ, tài liệu, chính sách).
- **Chat → trang:** trích dẫn [n] mở đúng tài liệu, trang, tô đúng vùng; có đường quay lại đúng chỉ số.
- **AI chỉ đề xuất:** nhãn "AI đề xuất" / "Đã xác nhận bởi …" / "Cần xác minh". Thẻ hành động phải có người xác nhận. AI không có nút duyệt, không gợi ý bỏ phiếu, không gợi ý kết luận Tuân thủ.
- **AI thấy không quá quyền của người hỏi.** Che thông tin cá nhân trước khi gửi LLM ngoài.

**Phải gỡ vì trái nguyên tắc:** AI tự đổi tên khách từ OCR (`llm_conversation_responder.py:350-372`); chat in "Kết luận của hội đồng agent" và "Hạn mức đề xuất" (`:93-95`); highlight gắn nhãn "ĐẠT ĐIỀU KIỆN" và tự nêu căn cứ pháp lý (`document_highlight_service.py`); số lấy từ doanh nghiệp cố định `B001` (`:405-407`).

## 11. Bảo mật

Lỗi hiện có, đã xác minh trong khảo sát ngày 05/11/2026:

| Mức | Lỗi | Vị trí |
|---|---|---|
| **Nghiêm trọng** | RLS lộ dữ liệu: `employee_scope.employee_id = employee_id` so cột với chính nó, nên scope của bất kỳ ai cũng có hiệu lực với mọi người. Đã chạy thử: người duyệt 0 scope thấy 2 khách chi nhánh khác | `V014__create_rls_functions.sql:130,178` |
| **Nghiêm trọng** | Quản trị có toàn quyền nghiệp vụ, thấy mọi khách; đọc code cho thấy ghi được quyết định phê duyệt (chưa gọi API thử) | `R__seed_roles_permissions.sql:139-144`, `V014`, `V015`, `loan_service.py` |
| Cao | RLS chỉ phủ 14/77 bảng, trong khi `bank_app` có quyền toàn schema | `V017:184-186` |
| Cao | `loan_decision` sửa được; quyền UPDATE trên nhật ký bị cấp lại | `V015:300-325`, `V018:4-5` |
| Cao | Gateway `agent_engine` không xác thực, CORS `*`, tin `approver_level` từ request | `agent_engine/gateway/main.py` |
| Cao | Không có code mã hóa PII dù có `FIELD_ENCRYPTION_KEY` | `config.py:125,182` |
| Trung bình | Frontend không có RBAC, thiếu env thì tự coi là đã đăng nhập | `RequireAuth.tsx:8`, `apiClient.ts:153`, `keycloak.ts` |

**Bẫy khi vá RLS:** Rủi ro, Phê duyệt, Kiểm toán ở chi nhánh 1 đang đọc được dữ liệu chi nhánh 2 chính nhờ lỗi này. Phải cấp scope theo hồ sơ trong cùng lần thay đổi.

**Pháp lý chưa kiểm chứng, Pháp chế cần xác nhận trước khi dùng thật:** Thông tư 46/2026 về sự đồng ý tra cứu; thế chấp quyền thuê đất, gồm đất KCN; nghĩa vụ báo cáo giao dịch đáng ngờ; tỷ lệ theo Điều 136 Luật TCTD 2024 (để là tham số, không ghi cứng); quy định cấm tiết lộ thông tin AML; giới hạn cấp tín dụng có gồm khoản ngoài bảng không.

## 12. Thứ tự làm

Mỗi lát kiểm thử độc lập.

| # | Lát | Kiểm thử | Rủi ro | Cỡ |
|---|---|---|---|---|
| 0 | Vá RLS, scope theo hồ sơ, tách admin, thêm role, sửa `CAST` và `:status` | Test SQL từng role | Cao | M |
| 1 | Seed VinaNova, Mekong, §6.1, nhân viên 7 vai trò | Đếm 16/16 + 3 + 1 | Thấp | M |
| 2 | Workflow, SLA, ngoại lệ, cờ | Unit ca ngày, tạm dừng, E3, F6 | TB | M |
| 3 | Khung frontend, auth thật, RBAC, theme | 7 vai trò đăng nhập | TB | M |
| 4 | Trang 03 | Số việc đúng từng vai trò | Thấp | S |
| 5 | 04: nháp, tự lưu | Khôi phục, xung đột version | Thấp | M |
| 6 | 04: tài liệu, CIC, văn bản đồng ý | Khóa nút, hiệu lực 30 ngày | TB | M |
| 7 | 04: nhóm liên quan, cấp, điều kiện gửi, ngoại lệ | Bảng điều kiện | TB | L |
| 8 | Pipeline tài liệu thật: worker, outbox, ghi DB | Tải lên → trường có vùng tô | Cao | L |
| 9 | Trang 05 | Link 2 chiều, nhật ký | TB | L |
| 10 | 02b đọc: chỉ số SME, cờ, TSBĐ | DSCR 1,34 và ≈1,76 | TB | L |
| 10b | Tờ trình: 7 mục, tự lưu, chốt phiên bản khi trình, AI chèn có xác nhận (theo Q-L) | Bản đã chốt không sửa được; trả lại tạo bản mới | TB | L |
| 11 | 02b hành động + E8 | End-to-end, loại trừ | Cao | L |
| 12 | Chat: ngữ cảnh, trích dẫn, thẻ hành động | Không số nào thiếu nguồn | TB | M–L |
| 13 | Gia cố: PII, RLS còn lại, append-only | Test role | TB | M |

Pipeline không có đường ghi DB và worker chưa chạy được (`PipelineSink` chỉ là Protocol; không có hàm factory nào). Lát 8 có thể làm sau lát 9 bằng dữ liệu seed, ghi rõ là seed.

**Lỗi nền đã xác minh, xử lý ở lát 0, 3, 8:** 409 khi claim (`customer_repository.py:270-274`); UUID vào `CAST(:x AS text)` (`report_repository.py:63-64`, `job_repository.py:178-179`); `:status` dùng lại (`report_repository.py:226-233`); thiếu `--factory`, sai đường outbox (`docker-compose.backend.yml:81,98…`); 403 `GET /customers` với 5 role.

## 13. Kiểm thử và nghiệm thu

- Backend: unit cho SLA, tách bạch, điều kiện gửi, chỉ số; test SQL phân quyền theo từng role; integration cho chuyển bước.
- Frontend: tái dùng cách kiểm tra của mockup (`qa2.js`, `qa3.js`) trên trang thật: 7 vai trò, 2 khổ màn hình, AI mở và đóng.
- End-to-end bằng đăng nhập Keycloak thật: VinaNova từ Thẩm định đến quyết định cấp 2; Mekong từ nháp đến gửi.
- Người dùng nghiệm thu sau mỗi nhóm lát.

## 14. Để người làm tự quyết
Tên cột, tên endpoint, cách chia component, cách cài hàm SLA, miễn là đúng luật trong mục 5–11.

## 15. Câu hỏi chờ người dùng chốt

| # | Câu hỏi | Đề xuất |
|---|---|---|
| Q-A | Chuyển luật và mockup vào repo? | Có: luật vào `docs/business/`, mockup vào `docs/design/batch-1/` |
| Q-B | Role Thẩm định? | Thêm `credit_appraiser`; `credit_manager` để phân công lại. Lưu ý: trưởng phòng là tác nhân thứ 8, ngoài 7 vai trò đã chốt, chỉ phân công chứ không có trang riêng |
| Q-C | Rủi ro và Tuân thủ? | 2 role, 1 mã UI; kết luận F8, AML chỉ Tuân thủ |
| Q-D | Hệ thống phân công hồ sơ thế nào? | Mỗi bước một nhóm, chọn người ít việc nhất, trưởng phòng được chuyển kèm lý do |
| Q-E | Tính SLA khi tạm dừng giữa ngày? | Còn lại = số ngày LV từ ngày tạm dừng đến hạn; hạn mới = ngày HTTD ghi đạt + số còn lại, 17:00 |
| Q-F | Ngày nghỉ lấy từ đâu? | Bảng do Quản trị nhập, seed lễ Việt Nam 2026–2027 |
| Q-G | OCR, LLM, CIC thật hay giả? | CIC giả lập có nhãn; OCR, LLM thật cấu hình được, có che PII; dữ liệu seed làm dự phòng |
| Q-H | `agent_engine` trong đợt này? | Không nối vào 4 trang; tắt `AGENT_ENGINE_URL` |
| Q-I | Kiểm toán thấy phiếu khi phiên đang mở? | Không, kể cả trong nhật ký |
| Q-J | Quản trị có truy cập khẩn cấp? | Không |
| Q-K | Giữ `/chat`, `/dashboard`? | Giữ `/chat` cho Trợ lý AI; ẩn `/dashboard`, `/foundation`; simulation chỉ dùng khi dev |
| Q-L | Tờ trình thẩm định làm đến đâu? Mockup 02b coi đây là điều kiện để trình Rủi ro và mở nút quyết định, nhưng tài liệu này chưa có bảng, API, lát nào cho nó | Có trong đợt 1: 7 mục, tự lưu, AI chèn nội dung phải xác nhận. Lúc trình chốt một phiên bản không sửa được, Rủi ro và cấp phê duyệt đọc đúng bản đó; trả lại thì tạo bản mới. Xuất PDF để cuối. Thêm 1 lát cỡ L |
| Q-M | Sau khi vá RLS, ai đọc được hồ sơ nào? | Người được phân công đọc và ghi đúng bước của mình; người đã làm xong một bước vẫn đọc được, không ghi. Cùng chi nhánh không tự thấy nhau, trừ GĐ chi nhánh. Hội sở đọc hồ sơ được phân công. Kiểm toán đọc toàn hệ thống. Cấp phê duyệt gắn theo thuộc tính nhân viên (cấp + đơn vị). Bị E8 loại thì chuyển người cùng cấp trước, hết người mới lên cấp cao hơn. QHKH và HTTD không đọc được nội dung kết luận AML/gian lận |
| Q-N | Bước Ý kiến Rủi ro xong khi nào? Tuân thủ kết luận bất lợi thì sao? | Một bước, 2 ý kiến con (Rủi ro, Tuân thủ), chung SLA 3 ngày, có thể một người giữ cả hai ở dữ liệu mẫu. "Có dấu hiệu không xác thực": **tạm dừng** chờ xử lý, không tự kết thúc và không cho rút hồ sơ; đóng xử lý thì hồ sơ vẫn tới cấp phê duyệt kèm kết luận, cấp đó quyết định. "Chưa đủ căn cứ": dùng cơ chế chờ bổ sung (5 ngày LV, HTTD kiểm tra). "Không phát hiện vấn đề": đi tiếp |
| Q-O | Các đường đi còn thiếu của quy trình? | Cấp phê duyệt "Trả lại bổ sung" về Thẩm định, hoặc về QHKH nếu phải sửa đề xuất; người đã trả lại vẫn được duyệt khi hồ sơ quay lại. QHKH nộp lại thì qua HTTD 2 ngày, chỉ kiểm phần đổi. Quá hạn bổ sung sau khi gia hạn: QHKH hoặc trưởng phòng "Rút hồ sơ", bắt buộc lý do, phân biệt khách rút và quá hạn, chặn khi đang xử lý dấu hiệu gian lận (thêm trạng thái kết thúc "Đã rút"). CIC hoặc sao kê hết hiệu lực giữa chừng: gắn cờ, QHKH tra lại, không đổi bước, không dừng SLA, chưa trình phê duyệt được, trừ sao kê có ngoại lệ và CIC khi hệ thống gián đoạn. "Ngày trình phê duyệt" là lúc Rủi ro chuyển sang Phê duyệt; với Cấp 3 là ngày mở phiên |
| Q-P | Hồ sơ vượt 100 tỷ khi chưa có trang Hội đồng? | Vẫn đi tới bước Hội đồng theo luật, hiện "Chờ phiên Hội đồng – có ở đợt 2", không tính vào việc của ai. Không có đường duyệt tạm |
| Q-Q | Tới lúc nghiệm thu, các mốc 05/11 đã qua thì sao? | Nạp lại seed trước mỗi lần nghiệm thu, dịch mọi ngày theo ngày chạy (giữ đúng khoảng ngày làm việc). Unit test dùng ngày cố định. Không dùng đồng hồ giả trong hệ thống |
| Q-R | Chính sách nào là chuẩn? Chỉ số không đạt thì sao? Dư nợ lấy từ đâu? | `CS-TD-SME/2025` là chuẩn (DSCR ≥ 1,25), RAG nạp từ văn bản này, bỏ `agent_engine/rag_corpus/credit_policy.md` (ghi 1,2). Dữ liệu dư nợ là seed có nhãn |
| Q-S | Chỉ số không đạt chính sách thì sao? | Ghi nhận là **ngoại lệ chính sách**, tách khỏi ngoại lệ tài liệu. Không chặn trình, Thẩm định nêu lý do, cấp phê duyệt quyết định rõ. Không tự nâng cấp phê duyệt |
| Q-U | Mở tài liệu từ mục lục ở trang 05: hiện đủ danh sách trường hay chỉ một thẻ? Màn này hiện 43 phần tử bấm được, vượt mức 30; mở từ Hồ sơ vay hay trích dẫn AI đã còn 21–25 | Dùng màn một thẻ cho cả trường hợp này, kèm link "n trường khác trên trang này" |
| Q-T | "Tổng cấp tín dụng" (Q4, E5) gồm những gì? | Dư nợ + hạn mức đã cấp chưa rút + bảo lãnh, L/C + đề xuất mới, của khách và người liên quan. Cách này chặt hơn chỉ tính dư nợ; Pháp chế cần xác nhận |
