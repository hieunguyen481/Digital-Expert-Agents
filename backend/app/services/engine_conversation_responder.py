"""Responder chuyển yêu cầu phân tích sâu sang Agent Engine (planner + chuyên gia).

Các route khác đi tiếp responder bên trong (LLM hoặc mock). Engine lỗi thì báo rõ cho cán bộ,
không âm thầm đổi sang LLM đơn. Mã khách hàng/hồ sơ lấy từ ngữ cảnh hội thoại, JWT của người dùng
được chuyển cho engine (engine tự xác thực lại và chạy dưới RLS).
"""
from __future__ import annotations

import re
import time
from collections.abc import Mapping, Sequence
from typing import Any
from uuid import UUID

from app.db import session as db_session
from app.db.rls_context import rls_transaction
from app.logging import get_logger
from app.repositories.customer_repository import CustomerRepository
from app.schemas.conversation import ConversationReply
from app.services.agent_engine_client import AgentEngineClient, AgentEngineError
from app.services.protocols import PrincipalLike

logger = get_logger(__name__)

DEEP_ANALYSIS_ROUTES = {"ORCHESTRATED", "SINGLE_AGENT"}

_VERDICT_LABEL = {
    "approve": "ĐỒNG Ý", "reject": "TỪ CHỐI", "need_more_info": "CẦN BỔ SUNG",
    "flag": "ĐỒNG Ý CÓ ĐIỀU KIỆN", "pass": "ĐẠT",
}
_STATE_LABEL = {
    "Draft": "Nháp", "In Analysis": "Đang phân tích", "Pending Approval": "Chờ người có thẩm quyền xác nhận",
    "Needs Info": "Cần bổ sung hồ sơ", "Rejected": "Đề xuất từ chối", "Escalated": "Đã chuyển cấp",
    "Executing": "Đang thực thi", "Completed": "Đã hoàn tất",
}
_LEVEL_LABEL = {"branch_director": "Giám đốc chi nhánh (cấp 1)", "head_office_l2": "Cấp 2 Hội sở",
                "council": "Hội đồng tín dụng"}
_AGENT_LABEL = {
    "document": "Tài liệu", "credit": "Tín dụng", "compliance": "Tuân thủ",
    "operations": "Vận hành", "validation": "Kiểm định",
}


def _uuid(value: Any) -> UUID | None:
    try:
        return UUID(str(value)) if value else None
    except ValueError:
        return None


def collect_sources(package: Mapping[str, Any]) -> list[dict[str, str]]:
    """Trích dẫn (nguồn + đoạn trích) gộp từ bằng chứng của các chuyên gia, bỏ trùng."""
    seen: set[tuple[str, str]] = set()
    out: list[dict[str, str]] = []
    for verdict in package.get("verdicts") or []:
        for ev in verdict.get("evidence") or []:
            key = (str(ev.get("source", "")), str(ev.get("quote", "")))
            if key not in seen and key[0]:
                seen.add(key)
                out.append({"agent": verdict.get("agent", ""), "source": key[0], "quote": key[1]})
    return out


def compose_engine_reply(case: Mapping[str, Any]) -> str:
    package = case.get("package") or {}
    state = str(case.get("state") or "")
    lines: list[str] = []
    if package.get("recommendation"):
        lines.append(f"**Kết luận của đội agent (đề xuất, chưa có hiệu lực):** "
                     f"{package['recommendation']}")
    limit = package.get("proposed_limit")
    if isinstance(limit, (int, float)) and limit > 0:  # không có hạn mức thì không in dòng trống số
        lines.append(f"**Hạn mức đề xuất:** {limit:,.0f} VND".replace(",", "."))
    if state:
        lines.append(f"**Trạng thái hồ sơ phân tích:** {_STATE_LABEL.get(state, state)}")
    verdicts = package.get("verdicts") or []
    if verdicts:
        lines.append("\n**Ý kiến từng chuyên gia:**")
        for v in verdicts:
            label = _VERDICT_LABEL.get(str(v.get("decision", "")).lower(), v.get("decision", "?"))
            lines.append(f"- {_AGENT_LABEL.get(v.get('agent'), v.get('agent', '?'))}: "
                         f"{label} — {v.get('summary', '')}")
    if package.get("conditions"):
        lines.append("\n**Điều kiện kèm theo:**")
        lines.extend(f"- {c}" for c in package["conditions"])
    if state == "Pending Approval":
        lines.append("\nĐang chờ người có thẩm quyền xác nhận; agent không tự phê duyệt.")
    if not lines:
        lines.append(f"Phân tích đa agent kết thúc ở trạng thái {_STATE_LABEL.get(state, state) or 'không xác định'} "
                     "nhưng chưa có gói phê duyệt.")
    return "\n".join(lines)


_POLICY_Q = re.compile(r"điều khoản|chính sách|quy định|quy chế|§|thẩm quyền|cấp phê duyệt|ngưỡng|trần|quy trình|"
                       r"phê duyệt|quyết định|người duyệt", re.I)
# Câu hỏi về quyền quyết định: BM25 trên corpus nhỏ xếp §3.1 sau các mục khác nên thêm truy vấn theo chủ đề
# (tra thêm điều khoản thẩm quyền) thay vì chỉ tra bằng nguyên câu hỏi.
_AUTHORITY_Q = re.compile(r"phê duyệt|thẩm quyền|quyết định|cấp nào|người duyệt|ai duyệt|ký duyệt", re.I)
_AUTHORITY_TOPIC = "thẩm quyền phê duyệt theo tổng cấp tín dụng"
# Câu hỏi tổng hợp (cả kết luận, cờ rủi ro, điều kiện) mới nhận cả khối kết luận; câu hỏi một chỉ số nhận phần gọn.
_BROAD_Q = re.compile(r"kết luận|đề xuất|điều kiện|phát hiện|rủi ro|\bcờ\b|chuyên gia|đội agent|tổng quan|tóm tắt", re.I)
_POLICY_NOTE = ("\n\nĐIỀU KHOẢN CHÍNH SÁCH LIÊN QUAN (CS-TD-SME/2025; trích đúng số điều khoản khi trả lời, "
                "không có trong đây thì nói rõ là chưa tra được):\n")
_METRIC_Q = re.compile(r"dscr|ebitda|\bltv\b|nợ vay|đòn bẩy|hạn mức|tài sản bảo đảm|tsđb|định giá|kết luận|đề xuất|cấp phê duyệt|"
                       r"điều kiện|phát hiện|rủi ro|\bcờ\b|chuyên gia|đội agent|phê duyệt|quyết định|thẩm quyền", re.I)
_RERUN = re.compile(r"phân tích lại|chạy lại|đánh giá lại|thẩm định lại|làm mới|phân tích mới|tính lại từ đầu", re.I)
_PII = re.compile(r"\b(cccd|cmnd|căn cước|số điện thoại|sđt|email|địa chỉ nhà|ngày sinh)\b", re.I)
_FINAL_STATES = {"Pending Approval", "Needs Info", "Rejected", "Completed", "Executing"}
PII_REFUSAL = ("Tôi không cung cấp thông tin định danh cá nhân (CCCD, số điện thoại, email, ngày sinh) qua trợ lý. "
               "Đây là dữ liệu ngoài phạm vi thẩm định của hồ sơ đang mở; nếu có quyền, bạn xem trực tiếp ở trang hồ sơ "
               "khách hàng. Tôi chỉ trả lời về kết quả thẩm định của hồ sơ hiện tại.")


def _epoch(value: Any) -> float | None:
    try:
        return value.timestamp() if hasattr(value, "timestamp") else float(value)
    except (TypeError, ValueError):
        return None


def question_kind(message: str) -> str:
    """Loại câu hỏi về kết quả hồ sơ: authority (ai/cấp nào quyết định), broad (kết luận, cờ, điều kiện), metric (một chỉ số)."""
    if _AUTHORITY_Q.search(message):
        return "authority"
    return "broad" if _BROAD_Q.search(message) else "metric"


_KIND_GUIDE = {
    "broad": "trả lời thẳng câu hỏi, nêu số liệu và căn cứ có trong kết quả; thiếu thì nói rõ là kết quả chưa nêu",
    "metric": ("chỉ trả lời chỉ số được hỏi trong 2-4 câu: giá trị, ngưỡng, đạt hay không, nguồn; số liệu lấy đúng từ kết quả; "
               "KHÔNG chép lại kết luận, KHÔNG liệt kê điều kiện hay cờ rủi ro; thiếu thì nói rõ là kết quả chưa nêu"),
    "authority": ("trả lời theo cấp thẩm quyền và vai, không nêu tên hay mã định danh; nêu CẤP PHÊ DUYỆT ĐỀ XUẤT của đội agent "
                  "và điều khoản chính sách (số điều khoản) quy định thẩm quyền; nói rõ đây là đề xuất của AI, người có thẩm quyền "
                  "quyết định; người được phân công/QHKH của khách không được phê duyệt nếu điều khoản tách bạch nêu vậy; "
                  "tối đa 5 câu, không chép lại kết luận hay điều kiện; dùng cấp đề xuất này, không dùng trường cấp phê duyệt của hồ sơ vay"),
}


def result_context(case: Mapping[str, Any], events: Sequence[Mapping[str, Any]], kind: str = "broad") -> str:
    """Kết quả lượt phân tích gần nhất dưới dạng văn bản để trả lời thẳng câu hỏi (gói phê duyệt, hoặc báo cáo cuối khi cần bổ sung/từ chối).

    kind=metric/authority: bản gọn, không có khối kết luận/điều kiện để câu trả lời không chép lại cả khối đó."""
    package = case.get("package") or {}
    final = next((e.get("payload") or {} for e in reversed(events) if e.get("type") == "state_changed"
                  and (e.get("payload") or {}).get("report_text")), {})
    parts = [f"Trạng thái: {_STATE_LABEL.get(str(case.get('state')), case.get('state'))}"]
    if package.get("recommendation") and kind == "broad":
        parts.append(f"Kết luận: {package['recommendation']}")
    level = package.get("required_approver_level") or ""
    if not level and kind == "authority":  # báo cáo cuối của lượt phân tích có thể ghi cấp đề xuất dạng chữ
        m = re.search(r"Cấp phê duyệt đề xuất:[^\n.]*", str(final.get("report_text") or ""))
        if m:
            parts.append(m.group(0).strip())
    if level:
        parts.append(f"Cấp phê duyệt đề xuất (của đội agent, chưa phải quyết định): {_LEVEL_LABEL.get(level, level)}")
    if kind == "authority":
        return "\n".join(parts)[:2000]
    for v in package.get("verdicts") or []:
        decision = _VERDICT_LABEL.get(str(v.get("decision", "")).lower(), v.get("decision"))
        line = f"{_AGENT_LABEL.get(v.get('agent'), v.get('agent'))} ({decision}): {v.get('summary')}; " \
               f"phát hiện: {'; '.join(v.get('findings') or [])}"
        parts.append(line + (f"; điều kiện: {'; '.join(v.get('conditions') or [])}" if kind == "broad" else ""))
    if kind != "broad":
        return "\n".join(parts)[:4000]
    for k, label in (("reason", "Lý do"), ("report_text", "Báo cáo cuối")):
        if final.get(k):
            parts.append(f"{label}: {final[k]}")
    for k, label in (("findings", "Phát hiện"), ("conditions", "Điều kiện")):
        if final.get(k) and not package:
            parts.append(f"{label}: " + "; ".join(final[k]))
    return "\n".join(parts)[:6000]


class EngineConversationResponder:
    def __init__(self, inner: Any, engine: AgentEngineClient, wait_seconds: int = 90) -> None:
        self._inner = inner
        self._engine = engine
        self._wait = wait_seconds

    async def _policy_block(self, message: str) -> str:
        """Câu hỏi về chính sách: kèm điều khoản liên quan trong corpus để trả lời có căn cứ (lỗi thì bỏ qua, không chặn chat)."""
        if not _POLICY_Q.search(message):
            return ""
        try:
            hits = await self._engine.policy_search(message, k=3)
            if _AUTHORITY_Q.search(message):
                topic = await self._engine.policy_search(_AUTHORITY_TOPIC, k=2)
                hits = [*topic, *(h for h in hits if h["source"] not in {t["source"] for t in topic})]
        except Exception:  # noqa: BLE001 - thiếu điều khoản không được làm hỏng câu trả lời
            return ""
        return _POLICY_NOTE + "\n".join(f"- {h['source']}: {h['text']}" for h in hits) if hits else ""

    async def respond(self, *, principal: PrincipalLike, conversation: Mapping[str, Any],
                      message: str, route: Mapping[str, Any],
                      attachment_ids: Sequence[UUID] = ()) -> ConversationReply:
        route_type = str(route.get("route_type") or "DIRECT")
        if (route_type not in DEEP_ANALYSIS_ROUTES or route.get("intent") == "OUT_OF_SCOPE"):
            if route.get("intent") != "OUT_OF_SCOPE" and route_type != "REFUSE" and _METRIC_Q.search(message) \
                    and not _PII.search(message):
                # hỏi chỉ số/kết luận của hồ sơ đã có lượt phân tích: trả lời từ chính lượt đó để cùng một giá trị với khung đội agent
                reused = await self._reuse_for_direct(principal, conversation, message, route, attachment_ids)
                if reused is not None:
                    return reused
            return await self._inner.respond(principal=principal, conversation=conversation,
                                             message=message + await self._policy_block(message), route=route,
                                             attachment_ids=attachment_ids)
        meta: dict[str, Any] = {"responder": "agent_engine"}
        if _PII.search(message):  # xin dữ liệu cá nhân: từ chối rõ ràng, không chạy lại phân tích
            return ConversationReply(content=PII_REFUSAL, route_type="REFUSE", complexity_level=None,
                                     metadata={**meta, "refused": "PII_OUT_OF_SCOPE"})
        complexity = route.get("complexity_level")
        level = complexity if isinstance(complexity, int) else None

        def reply(content: str, **extra: Any) -> ConversationReply:
            return ConversationReply(content=content, route_type=route_type,
                                     complexity_level=level, metadata={**meta, **extra})

        customer_id = _uuid(route.get("customer_id") or conversation.get("active_customer_id"))
        if customer_id is None:
            return reply("Phân tích đa agent cần một khách hàng cụ thể. Hãy chọn khách hàng "
                         "trong hội thoại rồi gửi lại yêu cầu.", engine_error="NO_CUSTOMER")
        loan = await self._load_loan(principal, customer_id, _uuid(
            route.get("loan_application_id") or conversation.get("active_loan_application_id")))
        if loan is None:
            return reply("Khách hàng chưa có hồ sơ vay trong phạm vi bạn được xem, nên chưa thể "
                         "phân tích đa agent.", engine_error="NO_LOAN",
                         customer_id=str(customer_id))
        request = {
            "business_id": str(customer_id),
            "amount": float(loan.get("requested_amount") or loan.get("amount") or 0) or 1e9,
            "term_months": int(loan.get("requested_term_months") or loan.get("term_months") or 12),
            "purpose": str(loan.get("loan_purpose") or message)[:300],
        }
        ids = {"customer_id": str(customer_id), "loan_application_id": str(loan["id"])}
        case_id = None
        if not _RERUN.search(message):
            answered = await self._answer_from_latest(principal, conversation, message, route, attachment_ids,
                                                      customer_id, loan, request, ids)
            if answered is not None:
                return answered
        try:
            case_id = await self._engine.create_case(request)
            await self._engine.run(case_id)
            try:
                await self._engine.wait_final(case_id, timeout_s=self._wait)
            except TimeoutError:
                case = await self._engine.get_case(case_id)
                return reply(f"Đội agent vẫn đang phân tích (mã `{case_id}`, trạng thái "
                             f"{case.get('state', '?')}). Mở lại hội thoại sau ít phút.",
                             engine_case_id=case_id, engine_state=case.get("state"), **ids)
            case = await self._engine.get_case(case_id)
        except AgentEngineError as e:
            logger.warning("AGENT_ENGINE_ERROR", status=e.status)
            return reply(f"Agent engine không xử lý được yêu cầu (HTTP {e.status or 'không kết nối'}): "
                         f"{e.detail}. Hệ thống không tự chuyển sang trả lời bằng mô hình đơn.",
                         engine_error=str(e.status), engine_case_id=case_id, **ids)

        package = case.get("package") or {}
        state = case.get("state")
        confirmation = None
        if state == "Pending Approval":
            confirmation = {
                "case_id": case_id, "loan_application_id": ids["loan_application_id"],
                "required_approver_level": package.get("required_approver_level"),
                "proposed_limit": package.get("proposed_limit"),
                "term_months": request["term_months"], "conditions": package.get("conditions") or [],
                "can_decide": "loan_approver" in getattr(principal, "roles", ()),
            }
        return reply(compose_engine_reply(case), engine="agent_engine", engine_case_id=case_id,
                     engine_state=state, plan_version=package.get("plan_version"),
                     policy_version=package.get("policy_version"),
                     verdicts=package.get("verdicts") or [], sources=collect_sources(package),
                     confirmation=confirmation, **ids)

    async def _reuse_for_direct(self, principal: PrincipalLike, conversation: Mapping[str, Any], message: str,
                                route: Mapping[str, Any], attachment_ids: Sequence[UUID]) -> ConversationReply | None:
        customer_id = _uuid(route.get("customer_id") or conversation.get("active_customer_id"))
        if customer_id is None:
            return None
        loan = await self._load_loan(principal, customer_id, _uuid(
            route.get("loan_application_id") or conversation.get("active_loan_application_id")))
        if loan is None:
            return None
        request = {
            "business_id": str(customer_id),
            "amount": float(loan.get("requested_amount") or loan.get("amount") or 0) or 1e9,
            "term_months": int(loan.get("requested_term_months") or loan.get("term_months") or 12),
        }
        ids = {"customer_id": str(customer_id), "loan_application_id": str(loan["id"])}
        return await self._answer_from_latest(principal, conversation, message, route, attachment_ids,
                                              customer_id, loan, request, ids)

    async def _answer_from_latest(self, principal: PrincipalLike, conversation: Mapping[str, Any], message: str,
                                  route: Mapping[str, Any], attachment_ids: Sequence[UUID], customer_id: UUID,
                                  loan: Mapping[str, Any], request: Mapping[str, Any], ids: Mapping[str, str]
                                  ) -> ConversationReply | None:
        """L18: còn kết quả phân tích hợp lệ của hồ sơ (chưa đổi dữ liệu) thì trả lời thẳng từ đó, không chạy lại cả đội."""
        t0 = time.perf_counter()
        try:
            cases = await self._engine.list_cases(limit=20, customer_id=str(customer_id))
        except AgentEngineError:
            return None
        t_list = time.perf_counter() - t0
        loan_changed = _epoch(loan.get("updated_at"))
        latest = next((c for c in sorted(cases, key=lambda c: -(c.get("created_at") or 0))
                       if str(c.get("customer_id")) == str(customer_id) and c.get("state") in _FINAL_STATES
                       and abs(float((c.get("request") or {}).get("amount") or 0) - request["amount"]) < 1
                       and (c.get("request") or {}).get("term_months") == request["term_months"]), None)
        if latest is None or (loan_changed and loan_changed > float(latest.get("updated_at") or 0)):
            return None  # chưa có kết quả, hoặc dữ liệu hồ sơ đã đổi sau lần phân tích
        t1 = time.perf_counter()
        try:
            case = await self._engine.get_case(latest["case_id"])
            events = await self._engine.get_events(latest["case_id"])
        except AgentEngineError:
            return None
        t_case = time.perf_counter() - t1
        kind = question_kind(message)
        grounded = (f"{message}\n\nKẾT QUẢ PHÂN TÍCH GẦN NHẤT CỦA ĐỘI AGENT CHO HỒ SƠ NÀY (nguồn chính để trả lời; "
                    f"{_KIND_GUIDE[kind]}):\n"
                    f"{result_context(case, events, kind)}{await self._policy_block(message)}")
        t2 = time.perf_counter()
        inner = await self._inner.respond(principal=principal, conversation=conversation, message=grounded,
                                          route={**route, "route_type": "DIRECT"}, attachment_ids=attachment_ids)
        logger.info("CHAT_TIMING", list_cases_s=round(t_list, 2), get_case_events_s=round(t_case, 2),
                    events=len(events), inner_respond_s=round(time.perf_counter() - t2, 2), prompt_chars=len(grounded))
        package = case.get("package") or {}
        when = time.strftime("%H:%M %d/%m/%Y", time.localtime(float(latest.get("updated_at") or 0)))
        meta = {**(inner.metadata or {}), "responder": "agent_engine", "reused_result": True,
                "engine_case_id": latest["case_id"], "engine_state": case.get("state"),
                "verdicts": package.get("verdicts") or [], "sources": collect_sources(package),
                "decision_related": kind == "authority", **ids}
        return ConversationReply(
            content=f"{inner.content}\n\n_Dựa trên kết quả phân tích lúc {when}. Gõ “phân tích lại” để chạy lại cả đội agent._",
            route_type=str(route.get("route_type") or "ORCHESTRATED"),
            complexity_level=route.get("complexity_level") if isinstance(route.get("complexity_level"), int) else None,
            metadata=meta)

    async def _load_loan(self, principal: PrincipalLike, customer_id: UUID,
                         loan_id: UUID | None) -> Mapping[str, Any] | None:
        factory = db_session.AsyncSessionFactory
        if factory is None:
            return None
        async with factory() as session, rls_transaction(
                session, employee_id=principal.employee_id, branch_id=principal.branch_id,
                is_admin=principal.is_admin):
            loans = await CustomerRepository(session).list_loans(customer_id)
        if loan_id is not None:
            loans = [x for x in loans if str(x.get("id")) == str(loan_id)] or []
        return loans[0] if loans else None
