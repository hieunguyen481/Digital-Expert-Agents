"""Che PII trước khi ghi event/log — số CCCD, số tài khoản, SĐT."""
from __future__ import annotations

import re
from typing import Any

# Số tiền và chỉ số không được che: chỉ che chuỗi số có dấu hiệu là định danh.
_PATTERNS = [
    # CCCD 12 số (đầu số tỉnh luôn bắt đầu bằng 0)
    (re.compile(r"(?<![\d.,])(0\d{2})\d{6}(\d{3})(?![\d]|[.,]\d)"), r"\1******\2"),
    # SĐT Việt Nam: 0xxxxxxxxx hoặc +84/84xxxxxxxxx
    (re.compile(r"(?<![\d.,])(\+?84|0)(\d{2})\d{5,6}(\d{2})(?![\d]|[.,]\d)"), r"\1\2*****\3"),
    # số tài khoản đi sau từ khóa
    (re.compile(r"(?i)((?:số\s+tài\s+khoản|số\s+tk|stk|account(?:\s+number)?)\s*[:=]?\s*)(\d{2})\d{5,12}(\d{2})(?![\d]|[.,]\d)"), r"\1\2*****\3"),
]

_SENSITIVE_KEYS = {"cccd", "id_number", "account_number", "phone", "so_cccd", "so_tai_khoan"}


def mask_text(text: str) -> str:
    for pat, repl in _PATTERNS:
        text = pat.sub(repl, text)
    return text


def mask(obj: Any) -> Any:
    """Đệ quy che PII trong dict/list/str."""
    if isinstance(obj, dict):
        return {
            k: ("***" if k.lower() in _SENSITIVE_KEYS and isinstance(v, str) and v else mask(v))
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [mask(x) for x in obj]
    if isinstance(obj, str):
        return mask_text(obj)
    return obj
