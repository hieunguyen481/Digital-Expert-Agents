"""MCP server "core-banking": cổng duy nhất để agent chạm vào hệ thống nghiệp vụ (Postgres thật).

- Mỗi lời gọi chạy trong một giao dịch: SET LOCAL ROLE bank_engine (không BYPASSRLS) và đặt
  app.employee_id / app.branch_id / app.is_admin theo danh tính đã ký từ gateway.
- Danh tính lấy từ header (common.identity), KHÔNG từ tham số tool => LLM không chọn được.
- Mọi lời gọi (kể cả bị từ chối) ghi audit.engine_mcp_call: tên tool, employee_id, khóa tham số.
- Tool ghi (create_loan_draft, commit_loan, create_disbursement_schedule) chưa hỗ trợ (đợt B2).
Chạy: python -m mcp_core_banking.server
"""
from __future__ import annotations

import asyncio
import datetime as dt
import sys
import time
import uuid
from decimal import Decimal
from pathlib import Path
from typing import Any, Awaitable, Callable

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncpg  # noqa: E402
from mcp.server.fastmcp import Context, FastMCP  # noqa: E402

from common import config, identity  # noqa: E402

mcp = FastMCP("core-banking", host=config.HOST, port=config.MCP_CORE_BANKING_PORT)

NOT_SUPPORTED = ("từ chối: agent không được tự ghi quyết định hay giải ngân; hành động nghiệp vụ "
                 "chỉ chạy sau xác nhận của người có thẩm quyền qua gateway")
_pool: asyncpg.Pool | None = None


class Denied(Exception):
    pass


async def _get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(config.DATABASE_URL, min_size=1, max_size=5)
    return _pool


def _plain(v: Any) -> Any:
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (dt.date, dt.datetime)):
        return v.isoformat()
    if isinstance(v, uuid.UUID):
        return str(v)
    if isinstance(v, dict):
        return {k: _plain(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_plain(x) for x in v]
    return v


def _rec(r: asyncpg.Record) -> dict:
    return _plain(dict(r))


def _headers(ctx: Context | None) -> dict[str, str]:
    try:
        return {k.lower(): v for k, v in ctx.request_context.request.headers.items()}  # type: ignore[union-attr]
    except Exception:  # noqa: BLE001
        return {}


async def _audit(tool: str, emp: str | None, cust: str | None, arg_keys: list[str],
                 outcome: str, detail: str | None = None) -> None:
    try:
        pool = await _get_pool()
        async with pool.acquire() as con, con.transaction():
            await con.execute("SET LOCAL ROLE bank_engine")
            await con.execute(
                "INSERT INTO audit.engine_mcp_call(tool, employee_id, customer_id, arg_keys,"
                " outcome, detail) VALUES ($1,$2,$3,$4,$5,$6)",
                tool, uuid.UUID(emp) if emp else None, uuid.UUID(cust) if cust else None,
                arg_keys, outcome, (detail or "")[:200] or None)
    except Exception:  # noqa: BLE001 - audit lỗi không được nuốt kết quả, nhưng không lộ chi tiết
        import traceback
        traceback.print_exc()


# Dùng lại kết quả đọc trong cùng một case: nhiều agent (tiến trình khác nhau) cùng hỏi một tool với
# cùng tham số thì chỉ truy vấn một lần. Khoá theo case + nhân viên + tool + tham số; lời gọi dùng lại
# vẫn ghi audit với outcome 'cache_hit' (không mất dấu truy cập) nhưng không truy vấn lại DB.
_CASE_CACHE: dict[tuple, tuple[float, "asyncio.Future[Any]"]] = {}
_CACHE_TTL_S, _CACHE_MAX = 600.0, 500


async def run_tool(tool: str, ctx: Context | None, args: dict[str, Any],
                   fn: Callable[[asyncpg.Connection, uuid.UUID | None], Awaitable[Any]],
                   customer_arg: str | None = "business_id") -> Any:
    hdr = _headers(ctx)
    case = hdr.get("x-engine-case")
    try:
        emp = identity.verify(hdr).employee_id if case else None
    except identity.IdentityError:
        emp = None
    if not case or emp is None:
        return await _run_tool(tool, ctx, args, fn, customer_arg)
    now = time.monotonic()
    for k in [k for k, (t, _) in _CASE_CACHE.items() if now - t > _CACHE_TTL_S]:
        _CASE_CACHE.pop(k, None)
    key = (case, emp, tool, repr(sorted(args.items())))
    hit = _CASE_CACHE.get(key)
    if hit is not None:
        res = await asyncio.shield(hit[1])
        if not (isinstance(res, dict) and "error" in res):
            await _audit(tool, emp, str(args.get(customer_arg)) if customer_arg else None,
                         sorted(args), "cache_hit")
            return res
    fut = asyncio.ensure_future(_run_tool(tool, ctx, args, fn, customer_arg))
    _CASE_CACHE[key] = (now, fut)
    while len(_CASE_CACHE) > _CACHE_MAX:
        _CASE_CACHE.pop(next(iter(_CASE_CACHE)), None)
    res = await fut
    if isinstance(res, dict) and "error" in res:
        _CASE_CACHE.pop(key, None)  # lỗi/từ chối không được lưu
    return res


async def _run_tool(tool: str, ctx: Context | None, args: dict[str, Any],
                    fn: Callable[[asyncpg.Connection, uuid.UUID | None], Awaitable[Any]],
                    customer_arg: str | None = "business_id") -> Any:
    """Xác thực danh tính -> giao dịch RLS -> kiểm quyền khách hàng -> chạy -> audit."""
    keys = sorted(args)
    try:
        ident = identity.verify(_headers(ctx))
    except identity.IdentityError as e:
        await _audit(tool, None, None, keys, "denied", str(e))
        return {"error": f"từ chối: {e}"}
    cust: uuid.UUID | None = None
    try:
        if customer_arg:
            try:
                cust = uuid.UUID(str(args[customer_arg]))
            except (ValueError, KeyError):
                raise Denied("business_id không hợp lệ") from None
        pool = await _get_pool()
        async with pool.acquire() as con, con.transaction():
            await con.execute("SET LOCAL ROLE bank_engine")
            await con.fetch(
                "SELECT set_config('app.employee_id',$1,true), set_config('app.branch_id',$2,true),"
                " set_config('app.is_admin',$3,true)",
                ident.employee_id, ident.branch_id, "true" if ident.is_admin else "false")
            if cust is not None and not await con.fetchval(
                    "SELECT 1 FROM customer.customer WHERE id=$1", cust):
                raise Denied("không có quyền hoặc không tìm thấy hồ sơ")
            result = await fn(con, cust)
    except Denied as e:
        await _audit(tool, ident.employee_id, str(cust) if cust else None, keys, "denied", str(e))
        return {"error": f"từ chối: {e}"}
    except Exception as e:  # noqa: BLE001
        await _audit(tool, ident.employee_id, str(cust) if cust else None, keys, "error",
                     type(e).__name__)
        return {"error": f"lỗi truy vấn: {type(e).__name__}"}
    await _audit(tool, ident.employee_id, str(cust) if cust else None, keys, "ok")
    return result


# ---------------------------------------------------------------- đọc
@mcp.tool()
async def get_business(business_id: str, ctx: Context) -> dict:
    """Thông tin pháp nhân doanh nghiệp (business_id = customer.customer.id)."""
    async def fn(con, cust):
        r = await con.fetchrow(
            """SELECT c.id, c.customer_number::text AS customer_number, c.status, c.kyc_status,
                      o.legal_name, o.industry_code, o.incorporation_date,
                      rep.full_name AS legal_rep_name,
                      (SELECT a.account_number_masked FROM banking.account_holder h
                         JOIN banking.account a ON a.id=h.account_id AND a.status='ACTIVE'
                        WHERE h.party_id=c.party_id ORDER BY a.opened_at LIMIT 1) AS account_number,
                      EXISTS (SELECT 1 FROM banking.account_holder h WHERE h.party_id=c.party_id)
                        AS is_existing_customer
                 FROM customer.customer c
                 JOIN customer.organization_profile o ON o.party_id=c.party_id
                 LEFT JOIN customer.person_profile rep ON rep.party_id=o.legal_representative_party_id
                WHERE c.id=$1""", cust)
        if not r:
            return {"error": "không tìm thấy hồ sơ doanh nghiệp"}
        d = _rec(r)
        return {
            "business_id": d["id"], "name": d["legal_name"], "customer_number": d["customer_number"],
            "status": d["status"], "kyc_status": d["kyc_status"],
            "industry": d["industry_code"],
            # Chưa có nguồn xếp hạng rủi ro ngành trong Postgres: để trống, không bịa.
            "industry_risk": None,
            "established_year": int(d["incorporation_date"][:4]) if d["incorporation_date"] else None,
            "legal_rep_name": d["legal_rep_name"] or "", "legal_rep_cccd": "",
            "is_existing_customer": bool(d["is_existing_customer"]),
            "account_number": d["account_number"],
        }
    return await run_tool("get_business", ctx, {"business_id": business_id}, fn)


def _recompute_warnings(latest: dict, reported: dict) -> list[str]:
    """Tính lại DSCR từ gốc + lãi trong hồ sơ để agent thấy mâu thuẫn với số đã ghi."""
    out: list[str] = []
    prin, intr = reported.get("prin"), reported.get("int")
    if prin and intr and latest.get("ebitda") and "dscr" in reported:
        service = abs(prin["value"]) + abs(intr["value"])
        d1 = latest["ebitda"] / service
        out.append(
            f"DSCR ghi {reported['dscr']['value']:.2f} ({reported['dscr']['status']}); tính lại từ gốc "
            f"+ lãi {service/1e9:.1f} tỷ ra {d1:.3f} với EBITDA {latest['ebitda']/1e9:.0f} tỷ")
        alt = reported["dscr"].get("note") or ""
        if "128" in alt:
            out.append(f"Với EBITDA 128 tỷ (cờ BCTC 2025) tính lại ra {128e9 / service:.3f}; "
                       "số ghi ≈1,76 — lệch, cần xác minh nguồn khoản trả nợ")
    return out


@mcp.tool()
async def get_financials(business_id: str, ctx: Context) -> list[dict]:
    """Số liệu tài chính nhiều năm (DỮ LIỆU MẪU có nhãn) kèm chỉ số đã ghi và cảnh báo."""
    async def fn(con, cust):
        rows = await con.fetch(
            """SELECT fiscal_year AS year, revenue, ebitda, total_debt, equity, current_assets,
                      current_liabilities, data_label, source_ref, missing_fields
                 FROM credit.sme_financial_year WHERE customer_id=$1 ORDER BY fiscal_year""", cust)
        out = [_rec(r) for r in rows]
        if not out:
            return out
        for r in out:
            r["debt_service"] = None  # không có nguồn: không ép số cho khớp DSCR
            if r["missing_fields"]:
                r["data_note"] = "thiếu số liệu: " + ", ".join(r["missing_fields"])
        ef = await con.fetch(
            """SELECT ef.field_name, ef.value_number, ef.verification_status, ef.source_type,
                      ef.verification_reason
                 FROM document.extracted_field ef
                 JOIN document.document_version v ON v.id=ef.document_version_id
                 JOIN document.document d ON d.id=v.document_id
                 JOIN customer.customer c ON c.party_id=d.owner_party_id
                WHERE c.id=$1 AND ef.field_name IN ('dscr','prin','int')""", cust)
        reported = {r["field_name"]: {"value": float(r["value_number"]),
                                      "status": r["verification_status"],
                                      "source": r["source_type"], "note": r["verification_reason"]}
                    for r in ef}
        latest = out[-1]
        latest["reported_ratios"] = reported
        latest["warnings"] = _recompute_warnings(latest, reported)
        return out
    res = await run_tool("get_financials", ctx, {"business_id": business_id}, fn)
    return res if isinstance(res, list) else [res]


@mcp.tool()
async def get_collateral(business_id: str, ctx: Context) -> list[dict]:
    """Tài sản bảo đảm của doanh nghiệp."""
    async def fn(con, cust):
        rows = await con.fetch(
            """SELECT col.id, col.collateral_type, col.description, col.declared_value,
                      col.appraised_value, col.eligible_value, col.valuation_status,
                      col.ownership_verification_status
                 FROM credit.collateral col JOIN customer.customer c ON c.party_id=col.owner_party_id
                WHERE c.id=$1 ORDER BY col.created_at""", cust)
        out = []
        for r in rows:
            d = _rec(r)
            val = d["appraised_value"] or d["eligible_value"] or d["declared_value"]
            basis = ("appraised" if d["appraised_value"] else
                     "eligible" if d["eligible_value"] else "declared")
            out.append({
                "collateral_id": d["id"], "business_id": business_id, "type": d["collateral_type"],
                "description": d["description"] or "", "valuation": val, "valuation_basis": basis,
                "valuation_status": d["valuation_status"],
                "legal_status": "clear" if d["ownership_verification_status"] == "VERIFIED"
                else (d["ownership_verification_status"] or "unknown").lower(),
            })
        return out
    res = await run_tool("get_collateral", ctx, {"business_id": business_id}, fn)
    return res if isinstance(res, list) else [res]


@mcp.tool()
async def check_blacklist(business_id: str, ctx: Context) -> dict:
    """Tra AML/trừng phạt theo đánh giá KYC mới nhất (customer.kyc_assessment)."""
    async def fn(con, cust):
        r = await con.fetchrow(
            """SELECT sanction_status, pep_status, aml_risk_level, assessment_date
                 FROM customer.kyc_assessment WHERE customer_id=$1
                ORDER BY assessment_date DESC LIMIT 1""", cust)
        if not r:
            return {"hit": False, "screened": False, "detail": {},
                    "note": "chưa có đánh giá KYC/AML trong hệ thống — cần tra cứu trước khi trình"}
        d = _rec(r)
        hit = (d["sanction_status"] or "CLEAR") != "CLEAR"
        return {"hit": hit, "screened": True,
                "detail": {"reason": f"sanction_status={d['sanction_status']}" if hit else "",
                           "pep_status": d["pep_status"], "aml_risk_level": d["aml_risk_level"],
                           "assessed_at": d["assessment_date"]},
                "source": "customer.kyc_assessment"}
    return await run_tool("check_blacklist", ctx, {"business_id": business_id}, fn)


@mcp.tool()
async def get_cic_status(business_id: str, ctx: Context) -> dict:
    """Kết quả CIC mới nhất (banking.credit_report + credit_facility; nguồn giả lập có nhãn)."""
    async def fn(con, cust):
        rep = await con.fetchrow(
            """SELECT id, provider, report_as_of_date, requested_at, risk_summary
                 FROM banking.credit_report WHERE customer_id=$1
                ORDER BY requested_at DESC LIMIT 1""", cust)
        if not rep:
            return {"cic_group": None, "overdue_amount": 0, "note": "chưa có kết quả tra cứu CIC"}
        fac = await con.fetch(
            "SELECT debt_group, overdue_days, outstanding_balance, lender_name"
            " FROM banking.credit_facility WHERE credit_report_id=$1", rep["id"])
        d = _rec(rep)
        rs = d["risk_summary"] if isinstance(d["risk_summary"], dict) else {}
        try:
            grp = int(rs.get("debt_group") or max((int(f["debt_group"]) for f in fac), default=1))
        except (TypeError, ValueError):
            grp = None
        overdue = sum(float(f["outstanding_balance"] or 0) for f in fac if (f["overdue_days"] or 0) > 0)
        total = rs.get("total_outstanding") or sum(float(f["outstanding_balance"] or 0) for f in fac)
        return {"cic_group": grp, "overdue_amount": overdue, "total_outstanding": total,
                "report_date": d["report_as_of_date"], "provider": d["provider"],
                "note": rs.get("source_label", "")}
    return await run_tool("get_cic_status", ctx, {"business_id": business_id}, fn)


@mcp.tool()
async def get_existing_loans(business_id: str, ctx: Context) -> list[dict]:
    """Dư nợ hiện hữu của khách (credit.existing_obligation)."""
    async def fn(con, cust):
        rows = await con.fetch(
            """SELECT o.id, o.lender_name, o.obligation_type, o.outstanding_balance,
                      o.monthly_payment, o.verified_status, o.as_of_date
                 FROM credit.existing_obligation o JOIN customer.customer c ON c.party_id=o.party_id
                WHERE c.id=$1""", cust)
        return [{"loan_id": r["id"], "lender": r["lender_name"], "type": r["obligation_type"],
                 "outstanding": r["outstanding_balance"], "monthly_payment": r["monthly_payment"],
                 "verified_status": r["verified_status"], "as_of_date": r["as_of_date"]}
                for r in map(_rec, rows)]
    res = await run_tool("get_existing_loans", ctx, {"business_id": business_id}, fn)
    return res if isinstance(res, list) else [res]


@mcp.tool()
async def get_annual_inflow(business_id: str, ctx: Context) -> dict:
    """Tiền về tài khoản 12 tháng gần nhất (banking.account_monthly_summary)."""
    async def fn(con, cust):
        r = await con.fetchrow(
            """SELECT sum(s.total_inflow) AS inflow, count(DISTINCT s.year_month) AS months
                 FROM banking.account_monthly_summary s
                 JOIN banking.account_holder h ON h.account_id=s.account_id
                 JOIN customer.customer c ON c.party_id=h.party_id
                WHERE c.id=$1 AND s.year_month > (SELECT max(year_month) FROM
                      banking.account_monthly_summary) - interval '12 months'""", cust)
        if not r or r["inflow"] is None:
            return {"verified_annual_inflow": None, "note": "không có tài khoản/sao kê tại ngân hàng"}
        return {"verified_annual_inflow": float(r["inflow"]), "months": r["months"]}
    return await run_tool("get_annual_inflow", ctx, {"business_id": business_id}, fn)


@mcp.tool()
async def get_audit_log(ctx: Context, limit: int = 30) -> list[dict]:
    """Nhật ký gọi tool (audit.engine_mcp_call). Chỉ dùng cho kiểm toán qua gateway."""
    async def fn(con, _):
        rows = await con.fetch(
            "SELECT id, called_at, tool, employee_id, customer_id, arg_keys, outcome"
            " FROM audit.engine_mcp_call ORDER BY id DESC LIMIT $1", max(1, min(int(limit), 200)))
        return [_rec(r) for r in rows]
    res = await run_tool("get_audit_log", ctx, {"limit": limit}, fn, customer_arg=None)
    return res if isinstance(res, list) else [res]


# ---------------------------------------------------------------- ghi: chỉ nháp / từ chối
@mcp.tool()
async def create_loan_draft(case_id: str, business_id: str, amount: float, term_months: int,
                            ctx: Context) -> dict:
    """Bản nháp đề xuất (không đổi hồ sơ vay, không có hiệu lực); lưu vết qua trace của case."""
    async def fn(con, cust):
        return {"draft_id": f"draft-{case_id}", "status": "DRAFT_PROPOSAL", "amount": amount,
                "term_months": term_months, "effective": False}
    return await run_tool("create_loan_draft", ctx,
                          {"case_id": case_id, "business_id": business_id, "amount": amount,
                           "term_months": term_months}, fn)


@mcp.tool()
async def commit_loan(idempotency_key: str, case_id: str, business_id: str, amount: float,
                      term_months: int, ctx: Context, rate: float = 9.5) -> dict:
    """TỪ CHỐI: agent không ghi quyết định. Chuyển bước `decide` chỉ chạy qua gateway sau khi
    người duyệt xác nhận (approval token + JWT của họ, backend kiểm E8)."""
    await _audit("commit_loan", None, None, ["case_id", "business_id", "amount", "term_months",
                                            "rate", "idempotency_key"], "denied",
                 "agent không được tự ghi")
    return {"error": NOT_SUPPORTED}


@mcp.tool()
async def get_loan_by_idempotency(idempotency_key: str, ctx: Context) -> dict:
    """Tra hành động đã thực thi theo idempotency key (agent.action_log, dưới RLS)."""
    async def fn(con, _):
        r = await con.fetchrow(
            "SELECT action, outcome, loan_application_id FROM agent.action_log"
            " WHERE idempotency_key=$1 AND outcome='EXECUTED'", idempotency_key)
        return {"found": r is not None, **(_rec(r) if r else {})}
    return await run_tool("get_loan_by_idempotency", ctx, {"idempotency_key": idempotency_key}, fn,
                          customer_arg=None)


@mcp.tool()
async def create_disbursement_schedule(loan_id: str, ctx: Context, num_tranches: int = 2) -> dict:
    """TỪ CHỐI: giải ngân không có hành động workflow và nằm ngoài quyền của agent."""
    await _audit("create_disbursement_schedule", None, None, ["loan_id", "num_tranches"],
                 "denied", "agent không giải ngân")
    return {"error": NOT_SUPPORTED}


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
