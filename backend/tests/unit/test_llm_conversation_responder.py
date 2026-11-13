"""Unit tests for the real-LLM conversation responder and JSON extraction."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import BaseModel

from app.providers.llm.openai_compat import extract_json_payload
from app.services.llm_conversation_responder import LLMConversationResponder


class _Answer(BaseModel):
    content: str


def test_extract_json_payload_strips_code_fences() -> None:
    raw = '```json\n{"content": "xin chào"}\n```'
    assert extract_json_payload(raw) == '{"content": "xin chào"}'


def test_extract_json_payload_finds_embedded_object() -> None:
    raw = 'Đây là kết quả: {"content": "ok"} — hết.'
    assert extract_json_payload(raw) == '{"content": "ok"}'


class _StubLLM:
    provider = "stub"
    model_name = "stub-model"
    model_version = "stub-model"

    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.calls = 0

    async def generate_structured(self, *, system_prompt, user_prompt, response_model):
        self.calls += 1
        if self.fail:
            raise RuntimeError("upstream down")
        return response_model(content="Trả lời từ stub [nguồn: transaction_summary]")


def _principal() -> SimpleNamespace:
    return SimpleNamespace(employee_id=uuid4(), branch_id=uuid4(), is_admin=False)


@pytest.mark.asyncio
async def test_refuse_route_never_calls_llm() -> None:
    llm = _StubLLM()
    responder = LLMConversationResponder(llm)
    reply = await responder.respond(
        principal=_principal(),
        conversation={},
        message="hack hộ tôi",
        route={"route_type": "REFUSE", "intent": "OUT_OF_SCOPE"},
    )
    assert llm.calls == 0
    assert "ngoài phạm vi" in reply.content
    assert reply.metadata["responder"] == "llm"


@pytest.mark.asyncio
async def test_llm_failure_returns_degraded_reply_instead_of_raising() -> None:
    responder = LLMConversationResponder(_StubLLM(fail=True))
    reply = await responder.respond(
        principal=_principal(),
        conversation={},
        message="khách hàng này có bao nhiêu giao dịch?",
        route={"route_type": "DIRECT", "intent": "DIRECT_QUERY"},
    )
    assert reply.metadata.get("degraded") is True
    assert reply.content


def test_render_highlight_markdown_levels_and_links() -> None:
    from app.services.document_highlight_service import (
        AnnotatedImage,
        HighlightResult,
        HighlightSegment,
        render_highlight_markdown,
    )

    result = HighlightResult(
        document_summary="Giấy đăng ký kinh doanh công ty TNHH ABC.",
        answer="Hồ sơ hợp lệ nhưng có một điểm lệch.",
        segments=[
            HighlightSegment(
                document_index=0,
                text="Số CCCD 001199001234",
                level="critical",
                reason="Khác với số CCCD trong hệ thống",
                bbox_2d=[100, 200, 500, 260],
            ),
            HighlightSegment(
                document_index=0,
                text="Vốn điều lệ 5 tỷ đồng",
                level="emphasis",
                reason="Liên quan trực tiếp câu hỏi về hạn mức",
            ),
        ],
    )
    links = [AnnotatedImage(key="highlights/c/x-0.jpg", url="https://minio/presigned/x")]
    content = render_highlight_markdown(result, links)
    # Segment + link ảnh đều đi qua metadata (dẫn chứng tương tác trên client),
    # content chỉ giữ câu trả lời + tóm tắt để chat gọn gàng.
    assert "Tóm tắt hồ sơ" in content
    assert "Giấy đăng ký kinh doanh" in content
    assert "🔴 **[CẢNH BÁO]**" not in content
    assert "https://minio/presigned/x" not in content


@pytest.mark.asyncio
async def test_attachments_without_db_fall_back_to_single_llm() -> None:
    from app.services.document_highlight_service import DocumentHighlighter

    class _NoCallVision:
        provider = "stub"
        model_name = "stub-vl"
        model_version = "stub-vl"

        async def generate_structured(self, **kwargs):
            raise AssertionError("không được gọi vision khi chưa đọc được file")

    class _NoCallStorage:
        async def get_object(self, *a, **k):
            raise AssertionError("DB factory=None thì không tới bước storage")

    llm = _StubLLM()
    responder = LLMConversationResponder(
        llm,
        highlighter=DocumentHighlighter(_NoCallVision(), None),
        storage=_NoCallStorage(),
    )
    reply = await responder.respond(
        principal=_principal(),
        conversation={},
        message="kiểm tra hồ sơ đính kèm",
        route={"route_type": "DIRECT", "intent": "DIRECT_QUERY"},
        attachment_ids=(uuid4(),),
    )
    assert llm.calls == 1
    assert reply.metadata.get("attachments_used_for_llm_analysis") is False


@pytest.mark.asyncio
async def test_successful_reply_carries_model_metadata() -> None:
    responder = LLMConversationResponder(_StubLLM())
    reply = await responder.respond(
        principal=_principal(),
        conversation={},
        message="tổng quan khách hàng?",
        route={"route_type": "DIRECT", "intent": "DIRECT_QUERY", "complexity_level": 1},
    )
    assert "stub" == reply.metadata["provider"]
    assert reply.complexity_level == 1
    assert "[nguồn:" in reply.content


def test_scrub_removes_stray_non_vietnamese_letters() -> None:
    from app.services.llm_conversation_responder import scrub_raw_names
    assert scrub_raw_names("Theo hồ sơç, DSCR đạt") == "Theo hồ sơ, DSCR đạt"


def test_system_prompt_states_total_exposure_excludes_other_institutions() -> None:
    from app.services.llm_conversation_responder import _SYSTEM_PROMPT
    assert "KHÔNG cộng" in _SYSTEM_PROMPT and "tổ chức tín dụng khác" in _SYSTEM_PROMPT


def test_prompt_khong_nen_ten_ngan_hang_cu_the() -> None:
    """Mô hình ngân hàng chung: câu trả lời gọi "tại ngân hàng", không nêu tên một ngân hàng."""
    from app.services import document_highlight_service as dh
    from app.services.llm_conversation_responder import _SYSTEM_PROMPT
    assert "SHB" not in _SYSTEM_PROMPT and "tại ngân hàng" in _SYSTEM_PROMPT
    assert "SHB" not in dh._SYSTEM_PROMPT


def test_split_loans_puts_active_loan_apart_from_other_loans_of_same_customer() -> None:
    from app.services.llm_conversation_responder import split_loans

    a, b = {"id": uuid4(), "application_number": "A", "requested_amount": 1}, {"id": uuid4(), "application_number": "B"}
    ctx = split_loans([b, a], a["id"])
    assert ctx["active_loan_application"] is a
    assert ctx["other_loan_applications_of_same_customer"] == [b]
    assert "loan_applications" not in ctx and "HỒ SƠ ĐANG MỞ" in ctx["active_loan_application_note"]


def test_split_loans_without_active_loan_keeps_full_list() -> None:
    from app.services.llm_conversation_responder import split_loans

    a, b = {"id": uuid4()}, {"id": uuid4()}
    assert split_loans([a, b], None) == {"loan_applications": [a, b]}
    assert split_loans([a, b], uuid4()) == {"loan_applications": [a, b]}
