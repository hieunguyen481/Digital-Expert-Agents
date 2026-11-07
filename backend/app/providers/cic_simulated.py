"""Adapter tra cứu CIC mô phỏng. Chưa có nguồn CIC thật: kết quả lấy từ bản tra gần nhất của chính khách
trong dữ liệu seed, đóng dấu SIMULATED để giao diện ghi rõ "dữ liệu mô phỏng". Khách chưa có dữ liệu
thì báo không có, không bịa số."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

SOURCE = "SIMULATED"
LABEL = "Dữ liệu mô phỏng · hệ thống CIC chưa kết nối"


class CicNoDataError(LookupError):
    """Khách không có dữ liệu mô phỏng nào để trả."""


def simulate_lookup(previous_summary: Mapping[str, Any] | None) -> dict[str, Any]:
    if previous_summary is None:
        raise CicNoDataError("Khách chưa có dữ liệu CIC mô phỏng")
    return {**previous_summary, "source_label": LABEL}
