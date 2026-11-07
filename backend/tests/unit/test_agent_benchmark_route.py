"""Route /agent-benchmark/latest chuyển tiếp engine, lỗi engine thành lỗi có mã rõ."""
import asyncio

import pytest

from app.api.v1 import agent_cases
from app.exceptions import AppError
from app.services.agent_engine_client import AgentEngineError


class _Req:
    def __init__(self, engine):
        class _S:
            pass
        self.app = type("A", (), {"state": _S()})()
        self.app.state.agent_engine = engine


class _Engine:
    def __init__(self, result=None, exc=None):
        self.result, self.exc = result, exc

    async def benchmark_latest(self):
        if self.exc:
            raise self.exc
        return self.result


def test_forwards_empty_and_data():
    empty = {"status": "empty", "run": None}
    assert asyncio.run(agent_cases.benchmark_latest(_Req(_Engine(empty)), None)) == empty


def test_engine_error_maps_to_app_error():
    with pytest.raises(AppError) as e:
        asyncio.run(agent_cases.benchmark_latest(_Req(_Engine(exc=AgentEngineError(403, "không đủ quyền"))), None))
    assert e.value.status_code == 403


def test_runs_and_run_forward_to_engine():
    class _E(_Engine):
        async def benchmark_runs(self):
            return {"runs": [{"run_id": "a"}]}

        async def benchmark_run(self, run_id):
            return {"status": "ok", "run": {"run_id": run_id}}

    assert asyncio.run(agent_cases.benchmark_runs(_Req(_E()), None)) == {"runs": [{"run_id": "a"}]}
    assert asyncio.run(agent_cases.benchmark_run("a", _Req(_E()), None))["run"]["run_id"] == "a"
