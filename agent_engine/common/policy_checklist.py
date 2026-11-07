"""Checklist chính sách dùng chung cho agent thẩm định (multi-agent) và chatbot đơn (benchmark).

Nguồn: docs/business/rules.md (Q4, E5, Q-T) và CS-TD-SME/2025 §3.1, §4.1, §6.1. Cả hai chế độ nhận
cùng một văn bản này để so sánh công bằng; không viết riêng cho hồ sơ nào.
"""

POLICY_CHECKLIST = (
    "Checklist chính sách phải nêu rõ trong kết luận (findings), kể cả khi kết quả là 'không vi phạm': "
    "(1) Tổng cấp tín dụng = dư nợ hiện hữu tại ngân hàng (get_existing_loans, cộng mọi khoản) + đề xuất mới; "
    "ghi con số tổng theo tỷ đồng, so với ngưỡng cấp phê duyệt ≤20 / 20–100 / >100 tỷ và nêu cấp phê duyệt "
    "tương ứng (CS-TD-SME/2025 §3.1). "
    "(2) BCTC kiểm toán (ý kiến chấp nhận toàn phần) bắt buộc khi tổng cấp tín dụng > 20 tỷ; nêu rõ bắt buộc hay "
    "không bắt buộc và hồ sơ đã có hay chưa (CS-TD-SME/2025 §4.1, §6.1)."
)
