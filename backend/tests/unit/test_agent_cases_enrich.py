import pytest

from app.api.v1 import agent_cases


@pytest.mark.asyncio
async def test_enrich_cases_gan_ten_khach_va_ma_ho_so(monkeypatch):
    calls = []

    async def fake_fetch_all(_session, sql, params):
        calls.append(params)
        if "loan_agent_run" in sql:
            return [{"case_id": "c1", "loan_id": "L1", "application_number": "HSV-1", "customer_name": "CTCP A"}]
        return [{"id": "cust2", "display_name": "CTCP B"}]

    monkeypatch.setattr(agent_cases, "fetch_all", fake_fetch_all)
    cases = [{"case_id": "c1", "customer_id": "cust1"}, {"case_id": "c2", "customer_id": "cust2"}]
    out = await agent_cases.enrich_cases(object(), cases)
    assert out[0]["customer_name"] == "CTCP A" and out[0]["application_number"] == "HSV-1"
    assert out[1]["customer_name"] == "CTCP B" and out[1]["application_number"] is None
    assert calls[0] == {"ids": "c1,c2"}


@pytest.mark.asyncio
async def test_enrich_cases_rong_tra_nguyen():
    assert await agent_cases.enrich_cases(object(), []) == []
