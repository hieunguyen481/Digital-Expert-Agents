"""Kỷ luật kết luận chung cho các chuyên gia (credit, compliance); không gắn với hồ sơ nào."""

EXPERT_RULES = (
    "Kỷ luật kết luận: (a) chỉ khẳng định con số, vi phạm hay điều 'bắt buộc' khi đã có trong kết quả công cụ "
    "hoặc tự tính được từ đó; số chưa đối chiếu được thì ghi rõ 'chưa đối chiếu', không khẳng định. "
    "(b) Chỉ chọn need_more_info khi thiếu dữ liệu CHẶN việc áp dụng chính sách hoặc đã có mâu thuẫn số liệu/vi phạm "
    "ngưỡng; thiếu thông tin bổ trợ thì đưa vào conditions và vẫn kết luận. Trường dữ liệu trống hoặc chỉ tiêu cần dự phóng chưa có (vd. lịch trả nợ, người đại diện) KHÔNG phải lý do need_more_info khi mọi ngưỡng chính sách tính được từ dữ liệu hiện có đều đạt: nêu rõ là điều kiện cần bổ sung trước giải ngân. "
    "(c) Chỉ trích § khi kết luận thật sự dựa vào điều khoản đó, và ghi § ngay trong câu findings dùng nó."
)
