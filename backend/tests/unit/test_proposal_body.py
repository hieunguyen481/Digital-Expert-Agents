"""B4 (QA4): lý do rỗng không bị pydantic chặn bằng thông báo tiếng Anh; engine trả REASON_REQUIRED."""

from app.api.v1.agent_cases import ProposalBody


def test_empty_or_missing_reason_reaches_engine_validation() -> None:
    assert ProposalBody(reason="").reason == ""
    assert ProposalBody().reason == ""
    assert ProposalBody(reason="đủ lý do").reason == "đủ lý do"
