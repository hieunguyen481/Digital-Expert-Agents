"""Tờ trình: luật hoàn tất và nội dung hiệu lực (Q-L)."""

from app.workflow import memo as rules


def _secs(**bodies: str) -> dict:
    s = rules.blank_sections()
    for no, body in bodies.items():
        s[no.lstrip("s")]["body"] = body
    return s


def _ai(state: str) -> dict:
    return {"id": "b", "text": "AI", "state": state, "source": "AI"}


def test_complete_needs_all_seven() -> None:
    full = _secs(**{f"s{n}": "x" for n in range(1, 8)})
    assert rules.memo_complete(full)
    full["7"]["body"] = " "
    assert not rules.memo_complete(full) and rules.completion(full)[7] is False


def test_pending_ai_block_does_not_complete_or_enter_effective_content() -> None:
    s = _secs(**{f"s{n}": "x" for n in (1, 2, 3, 4, 6, 7)})
    s["5"]["ai_blocks"] = [_ai(rules.PENDING), _ai(rules.REJECTED)]
    assert not rules.memo_complete(s)
    assert rules.effective_content(s)["5"]["ai_blocks"] == []
    s["5"]["ai_blocks"][0]["state"] = rules.CONFIRMED
    assert rules.memo_complete(s) and len(rules.effective_content(s)["5"]["ai_blocks"]) == 1


def test_section_seven_needs_human_text_even_with_confirmed_ai() -> None:
    s = _secs(**{f"s{n}": "x" for n in range(1, 7)})
    s["7"]["ai_blocks"] = [_ai(rules.CONFIRMED)]
    assert not rules.memo_complete(s)
