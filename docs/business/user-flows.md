# Luồng người dùng

Nguồn: mục 5 của đặc tả đợt 1 (`docs/superpowers/specs/2026-11-05-tham-dinh-sme-dot-1-design.md`).

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
