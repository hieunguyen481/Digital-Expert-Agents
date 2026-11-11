# Dữ liệu demo web

Đặt lại một bước (nạp lại seed; dọn ca agent và thông báo của đúng các hồ sơ demo trong bảng dưới và hồ sơ `LA-`, không đụng ca/thông báo của hồ sơ khác và không đụng `agent.benchmark_run`; chạy lại nhiều lần cho cùng kết quả):

```bash
infra/scripts/reset-demo.sh      # DEMO_PROJECT=<tên compose> nếu stack không phải bank-ai-workbench
```

Muốn hồ sơ cảnh 1 và hồ sơ cảnh 5 (màn của Cấp phê duyệt) có sẵn kết luận AI, cờ và Validation ngay khi mở (không phải bấm chạy), thêm `--warm`:

```bash
infra/scripts/reset-demo.sh --warm      # WARM_TIMEOUT=<giây> (mặc định 420); cần engine và LLM đang chạy
```

`--warm` sau khi nạp seed đăng nhập `appraiser@example.local`, gọi API `POST /loan-applications/{id}/agent-runs` của HSV-2026-00187 (VinaNova, cảnh 1) rồi chờ ca vào trạng thái kết thúc. Sau đó đăng nhập `credit.manager@example.local` (Trưởng phòng, được chạy ở bước Phê duyệt theo `ROLE_STATUSES`) và làm tương tự cho HSV-2026-00163 (cảnh 5), để người quyết định mở hồ sơ là thấy kết luận, cờ và chỉ số có nguồn. Đó là hai lượt chạy đội agent thật (tốn token LLM, 1–3 phút mỗi lượt), không chèn dữ liệu agent giả vào seed; lệnh thoát khác 0 nếu ca không kết thúc kịp. Cảnh 1 và 5 ở bảng dưới sau đó đã có lượt chạy: e2e `demo-scenes` bấm chạy thêm sẽ tạo lượt thứ hai (API giữ lượt cũ).

Khi chạy e2e, bọc trong `flock /tmp/do-an-e2e.lock`. Đừng chạy lúc có ca agent đang chạy (đang ghi sự kiện vào ca bị dọn).
Seed phát sinh lại thông báo bằng trigger, kèm dòng outbox email `PENDING`; lệnh đặt lại đánh dấu các dòng sinh từ lúc chạy lệnh là `FAILED` (`last_error = 'demo-reset: khong gui'`) để worker email không gửi dồn ra hộp thư thật.
Hồ sơ `LA-` do demo/e2e tạo không xóa được (quyết định là bảng chỉ thêm); seed gỡ người vay chính và bước mở nên chúng không còn hiện trong danh sách việc, còn dashboard ẩn ca của chúng sau bộ lọc "Hiện ca kiểm thử".

## Các cảnh

Mật khẩu tài khoản `*@example.local` là `SEED_USER_PASSWORD` trong `infra/.env.local`. Các cảnh 1–3 chạy đội agent thật (LLM), kết quả do engine quyết định nên đã kiểm bằng e2e (`frontend/e2e/demo-scenes.spec.ts`).

| # | Cảnh | Hồ sơ (khách, số liệu) | Đăng nhập | Thao tác | Kết quả mong đợi |
|---|------|------------------------|-----------|----------|------------------|
| 1 | Đề xuất phê duyệt kèm điều kiện trước giải ngân | HSV-2026-00187 · CTCP Bao bì VinaNova · 80 tỷ, Thẩm định | `tdinh` (appraiser@) | Mở `/ho-so-vay/75000000-0000-4000-8000-000000000001`, bấm Chạy đội agent | Ca `Pending Approval`; đề xuất phê duyệt; thẻ đề xuất hành động `add_disbursement_condition` (chờ người xác nhận) |
| 2 | Cần bổ sung | HSV-2026-00223 · CTCP Thực phẩm Sạch Việt Tiến · 20 tỷ, Thẩm định, chưa có BCTC (seed mới `R__seed_demo_scenes.sql`) | `tdinh` | Mở `/ho-so-vay/75000000-0000-4000-8000-000091000000`, chạy đội agent | Ca `Needs Info`; thẻ đề xuất `request_documents` yêu cầu bổ sung |
| 3 | Từ chối vì CIC nợ xấu | HSV-2026-00184 · CTCP Xây lắp Điện Sông Hàn · 22 tỷ, CIC nhóm 3 | `tdinh` | Mở `/ho-so-vay/75000000-0000-4000-8000-000000000004`, chạy đội agent | Ca `Rejected`, lý do nêu CIC/nợ xấu |
| 4 | OCR PDF scan | HSV-2026-00196 · CTCP Vật liệu Xây dựng Phú Điền · 30 tỷ, Thẩm định – chờ bổ sung | `qhkh` tải, `httd` xem | `qhkh`: `/doi-chieu/75000000-0000-4000-8000-000000000005`, Tải tài liệu bổ sung với `frontend/e2e/fixtures/scan-ho-so-lat-tam.pdf`; `httd` mở tài liệu | Trang có vùng tô, thẻ trường "AI đề xuất / chờ xác nhận" |
| 5 | Đi tới quyết định | HSV-2026-00163 · CTCP Nhựa Kỹ thuật Thành Đạt · 55 tỷ, Phê duyệt cấp 2 | `pheduyet` (approver@) | Mở hồ sơ `75000000-0000-4000-8000-000000000013`, Quyết định → Phê duyệt kèm lý do | Hồ sơ hiện Đã phê duyệt / có điều kiện, nút Quyết định biến mất |

Ghi chú:
- Cảnh 1 không nối thẳng tới quyết định vì VinaNova còn mâu thuẫn trường dữ liệu và cờ chặn (cảnh đối chiếu tài liệu) nên nút "Trình Rủi ro" khóa; vì vậy cảnh 5 dùng hồ sơ đã ở bước Phê duyệt.
- HSV-2026-00192 (Trường An) KHÔNG dùng cho cảnh phê duyệt: engine ra `Needs Info` (LTV 214% so với tài sản 30 tỷ, thiếu BCTC kiểm toán).
- Hồ sơ cấp 2 do `giamdoc` mở thì thấy nút Quyết định nhưng ghi bị 500 (vi phạm RLS `loan_decision`) thay vì 403; dùng `pheduyet`.
- Hồ sơ `HSV-2026-09xxx` là mẫu benchmark, không dùng để demo.
