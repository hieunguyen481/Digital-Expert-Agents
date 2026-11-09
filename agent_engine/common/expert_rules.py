"""Kỷ luật kết luận chung cho các chuyên gia (credit, compliance); không gắn với hồ sơ nào."""

EXPERT_RULES = (
    "Kỷ luật kết luận: (a) chỉ khẳng định con số, vi phạm hay điều 'bắt buộc' khi đã có trong kết quả công cụ "
    "hoặc tự tính được từ đó; số chưa đối chiếu được thì ghi rõ 'chưa đối chiếu', không khẳng định. "
    "(b) Chỉ chọn need_more_info khi thiếu dữ liệu CHẶN việc áp dụng chính sách hoặc đã có mâu thuẫn số liệu/vi phạm "
    "ngưỡng; thiếu thông tin bổ trợ thì đưa vào conditions và vẫn kết luận. Trường dữ liệu trống hoặc chỉ tiêu cần dự phóng chưa có (vd. lịch trả nợ, người đại diện) KHÔNG phải lý do need_more_info khi mọi ngưỡng chính sách tính được từ dữ liệu hiện có đều đạt: nêu rõ là điều kiện cần bổ sung trước giải ngân. "
    "(c) Chỉ trích § khi kết luận thật sự dựa vào điều khoản đó, và ghi § ngay trong câu findings dùng nó. "
    "(d) Chỉ tiêu xấu có sẵn trong số liệu (EBITDA âm, lỗ, vốn chủ sở hữu âm) thuộc chuyên môn của bạn phải được nêu "
    "thành một finding riêng, kể cả khi kết luận chính là thiếu dữ liệu khác. "
    "(e) Cờ khai TSĐB của đề nghị chỉ cho biết hồ sơ đã gắn TSĐB hay chưa; KHÔNG coi là mâu thuẫn khi core banking có "
    "hồ sơ tài sản của khách, và chỉ báo mâu thuẫn TSĐB khi hai nguồn số liệu thật sự khác nhau. Viết bằng ngôn ngữ nghiệp vụ, "
    "không dùng tên trường kỹ thuật (như has_collateral, business_id). "
    "Điều này không thay đổi nghĩa vụ nêu từng tài sản có pháp lý/định giá chưa hoàn thiện (pending) và loại nó khỏi giá trị bảo đảm đủ điều kiện."
)
