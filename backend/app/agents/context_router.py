"""Authorization-first deterministic context routing."""

from __future__ import annotations

from app.compat import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ContextStatus(StrEnum):
    SUFFICIENT = "SUFFICIENT"
    MISSING = "MISSING"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"


class RouteType(StrEnum):
    REFUSE = "REFUSE"
    DIRECT = "DIRECT"
    SINGLE_AGENT = "SINGLE_AGENT"
    ORCHESTRATED = "ORCHESTRATED"


_REPAYMENT_TERMS = (
    "dti",
    "dscr",
    "repayment",
    "affordability",
    "khả năng trả nợ",
    "năng lực trả nợ",
    "nghĩa vụ nợ",
)
_LOAN_ANALYSIS_TERMS = (
    "đánh giá khoản vay",
    "phân tích khoản vay",
    "thẩm định khoản vay",
    "loan assessment",
    "loan analysis",
)
_DEFINITION_TERMS = ("là gì", "nghĩa là gì", "what is", "define", "giải thích khái niệm")
_DOCUMENT_TERMS = (
    "document",
    "hồ sơ",
    "ocr",
    "mâu thuẫn",
    "xung đột",
    "dấu đỏ",
    "con dấu",
    "chữ ký",
)
_COMPLIANCE_TERMS = (
    "chính sách",
    "policy",
    "pháp lý",
    "pháp luật",
    "compliance",
    "quy định",
)
_CREDIT_TERMS = (
    "credit",
    "loan",
    "khoản vay",
    "tín dụng",
    "thu nhập",
    "dòng tiền",
    "giao dịch",
    "tài chính",
    "nghĩa vụ",
    "income",
    "cash flow",
    "transaction",
    "financial",
)
# Câu tra cứu thông tin hồ sơ/khách trong quyền ("hạn mức đề nghị", "trạng thái hồ sơ"...): trả lời trực tiếp
# từ dữ liệu đã xác thực, không cần đội phân tích sâu và không đòi quyền `loan:analyze`.
_LOOKUP_TERMS = (
    "dư nợ",
    "hạn mức",
    "số tiền",
    "trạng thái",
    "kỳ hạn",
    "mục đích vay",
    "lãi suất",
    "đề nghị",
    "cic",
    "tài sản bảo đảm",
    "tsđb",
    "bao nhiêu",
    "outstanding",
    "status",
    # số liệu báo cáo tài chính theo năm và tra cứu danh sách đen/trừng phạt/AML: trả lời từ dữ liệu đã xác thực
    "ebitda",
    "doanh thu",
    "lợi nhuận",
    "nợ vay",
    "tổng nợ",
    "vốn chủ",
    "bctc",
    "báo cáo tài chính",
    "danh sách đen",
    "trừng phạt",
    "cấm vận",
    "blacklist",
    "sanction",
    "aml",
    "rửa tiền",
)
# Câu hỏi về kết quả đã có của một hồ sơ (kết luận, chỉ số, cờ rủi ro, điều kiện, điều khoản, người quyết định):
# đây là từ vựng nghiệp vụ tín dụng, không cần người hỏi gõ đúng chữ "hồ sơ"; trả lời từ lượt thẩm định đã có.
_CASE_RESULT_TERMS = (
    "kết luận",
    "thẩm định",
    "phê duyệt",
    "quyết định",
    "thẩm quyền",
    "rủi ro",
    "cờ ",
    "điều kiện",
    "điều khoản",
    "ltv",
    "đề xuất",
    "phát hiện",
    "chuyên gia",
    "đội agent",
    "tài sản bảo đảm",
    "tsđb",
)
# Câu hỏi về QUY ĐỊNH CHUNG (ngưỡng, mức tối thiểu/tối đa, khi nào bắt buộc, cấp nào duyệt một mức tiền): trả lời từ
# điều khoản chính sách, không cần chọn khách/hồ sơ. Chỉ khi câu không nhắc tới hồ sơ/khách cụ thể (`_THIS_CASE_TERMS`).
_POLICY_RULE_TERMS = (
    "tối thiểu",
    "tối đa",
    "ngưỡng",
    "theo chính sách",
    "chính sách quy định",
    "quy định",
    "bắt buộc",
    "điều khoản",
    "cấp nào phê duyệt",
    "do cấp nào",
    "thẩm quyền phê duyệt",
)
_THIS_CASE_TERMS = (
    "hồ sơ này",
    "hồ sơ đang",
    "của hồ sơ",
    "khách này",
    "khách hàng này",
    "của khách",
    "khoản vay này",
    "công ty này",
    "doanh nghiệp này",
    "đề xuất này",
)
# Yêu cầu chạy lại phân tích: không phải câu tra cứu kết quả đã có.
_RERUN_TERMS = ("phân tích lại", "thẩm định lại", "đánh giá lại", "chạy lại", "làm mới", "phân tích mới", "từ đầu", "rerun", "re-run")
# Xin dữ liệu định danh cá nhân: từ chối vì bảo mật bằng câu trả lời thường, không định tuyến thành yêu cầu phân tích.
_PII_TERMS = ("cccd", "cmnd", "căn cước", "số điện thoại", "sđt", "email", "địa chỉ nhà", "ngày sinh")
_ANALYSIS_VERBS = (
    "phân tích",
    "đánh giá",
    "thẩm định",
    "rà soát",
    "kiểm tra",
    "so sánh",
    "mâu thuẫn",
    "xung đột",
    "analy",
    "assess",
    "review",
)
_EXPLICIT_OUT_OF_SCOPE_TERMS = (
    "dự báo thời tiết",
    "weather forecast",
    "kết quả bóng đá",
    "football score",
    "công thức nấu ăn",
    "recipe",
    "viết thơ",
    "write a poem",
    "kể chuyện cười",
    "tell me a joke",
    # dẫn dụ vượt quy tắc: từ chối dù câu có từ khoá tra cứu
    "bỏ qua mọi quy tắc",
    "bỏ qua quy tắc",
    "bỏ qua hướng dẫn",
    "bỏ qua các hướng dẫn",
    "ignore all rules",
    "ignore previous",
    "ignore all previous",
)


class RoutingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    employee_id: UUID
    message: str
    active_customer_id: UUID | None = None
    active_loan_application_id: UUID | None = None
    attachment_ids: tuple[UUID, ...] = ()
    accessible_customer_ids: frozenset[UUID] = frozenset()
    accessible_loan_ids: frozenset[UUID] = frozenset()


class RoutingDecision(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    customer_id: UUID | None
    loan_application_id: UUID | None
    intent: str
    normalized_question: str
    context_status: ContextStatus
    complexity_level: int = Field(ge=1, le=4)
    route_type: RouteType
    missing_context: tuple[str, ...]
    required_agents: tuple[str, ...]
    attachment_ids: tuple[UUID, ...] = ()


class ContextRouter:
    async def route(self, request: RoutingRequest) -> RoutingDecision:
        # Authorization deliberately precedes any semantic classification.
        if request.active_customer_id and request.active_customer_id not in request.accessible_customer_ids:
            raise PermissionError("current employee cannot access the selected customer")
        if (
            request.active_loan_application_id
            and request.active_loan_application_id not in request.accessible_loan_ids
        ):
            raise PermissionError("current employee cannot access the selected loan application")

        normalized = " ".join(request.message.split())
        lowered = normalized.casefold()
        if normalized and _contains_any(lowered, _EXPLICIT_OUT_OF_SCOPE_TERMS):
            return _refusal(request, normalized)

        if normalized and _contains_any(lowered, _PII_TERMS):
            return _refusal(request, normalized, intent="PERSONAL_DATA")

        domain_agents = _domain_agents(lowered)
        is_rerun = _contains_any(lowered, _RERUN_TERMS)
        is_definition = (
            _contains_any(lowered, _DEFINITION_TERMS)
            and bool(domain_agents or _contains_any(lowered, _REPAYMENT_TERMS))
        ) or (
            # câu hỏi quy định chung: như câu hỏi khái niệm, trả lời từ chính sách, không đòi khách/hồ sơ
            not is_rerun
            and _contains_any(lowered, _POLICY_RULE_TERMS)
            and not _contains_any(lowered, _THIS_CASE_TERMS)
            and not _contains_any(lowered, _ANALYSIS_VERBS)
        )
        requires_loan = (
            is_rerun
            or _contains_any(lowered, _LOAN_ANALYSIS_TERMS)
            or (
                _contains_any(lowered, _REPAYMENT_TERMS)
                and not is_definition
            )
        )

        is_lookup = (
            not requires_loan
            and not is_definition
            and _contains_any(lowered, _LOOKUP_TERMS)
            and not _contains_any(lowered, _ANALYSIS_VERBS)
        ) or (
            not requires_loan
            and not is_definition
            and _contains_any(lowered, _CASE_RESULT_TERMS)
            and not _contains_any(lowered, _RERUN_TERMS)
        )

        # An unknown prompt is not implicitly trusted as a general-purpose chat
        # request.  Refuse it before asking for customer context so prompts such
        # as "Write Python code" cannot fall through to the DIRECT route.
        if normalized and not (domain_agents or requires_loan or is_definition or is_lookup):
            return _refusal(request, normalized)

        missing: list[str] = []
        if request.active_customer_id is None and not is_definition:
            missing.append("customer_id")
        if not normalized:
            missing.append("question")
        if requires_loan and request.active_loan_application_id is None:
            missing.append("loan_application_id")
        if missing:
            return RoutingDecision(
                customer_id=request.active_customer_id,
                loan_application_id=request.active_loan_application_id,
                intent="MISSING_CONTEXT",
                normalized_question=normalized,
                context_status=ContextStatus.MISSING,
                complexity_level=1,
                route_type=RouteType.DIRECT,
                missing_context=tuple(missing),
                required_agents=(),
                attachment_ids=request.attachment_ids,
            )

        if is_definition or is_lookup:
            return RoutingDecision(
                customer_id=request.active_customer_id,
                loan_application_id=request.active_loan_application_id,
                intent="DIRECT_QUERY",
                normalized_question=normalized,
                context_status=ContextStatus.SUFFICIENT,
                complexity_level=2,
                route_type=RouteType.DIRECT,
                missing_context=(),
                required_agents=(),
                attachment_ids=request.attachment_ids,
            )

        if requires_loan or (len(domain_agents) >= 2 and not is_lookup):
            return RoutingDecision(
                customer_id=request.active_customer_id,
                loan_application_id=request.active_loan_application_id,
                intent=(
                    ("RERUN_ANALYSIS" if is_rerun else "ASSESS_REPAYMENT_CAPACITY")
                    if requires_loan
                    else "CROSS_DOMAIN_ANALYSIS"
                ),
                normalized_question=normalized,
                context_status=ContextStatus.SUFFICIENT,
                complexity_level=4,
                route_type=RouteType.ORCHESTRATED,
                missing_context=(),
                required_agents=(
                    ("DOCUMENT", "CREDIT", "LEGAL_COMPLIANCE")
                    if requires_loan
                    else domain_agents
                ),
                attachment_ids=request.attachment_ids,
            )
        agents: tuple[str, ...]
        if domain_agents == ("LEGAL_COMPLIANCE",):
            agents = ("LEGAL_COMPLIANCE",)
            route_type = RouteType.SINGLE_AGENT
            complexity = 3
            intent = "CHECK_POLICY_COMPLIANCE"
        elif domain_agents == ("DOCUMENT",):
            agents = ("DOCUMENT",)
            route_type = RouteType.SINGLE_AGENT
            complexity = 3
            intent = "REVIEW_DOCUMENTS"
        elif domain_agents == ("CREDIT",):
            agents = ("CREDIT",)
            route_type = RouteType.SINGLE_AGENT
            complexity = 3
            intent = "REVIEW_FINANCIAL_INFORMATION"
        else:
            # Empty questions are handled as missing context above.  This is a
            # defensive fallback for any future classifier extension.
            return _refusal(request, normalized)
        return RoutingDecision(
            customer_id=request.active_customer_id,
            loan_application_id=request.active_loan_application_id,
            intent=intent,
            normalized_question=normalized,
            context_status=ContextStatus.SUFFICIENT,
            complexity_level=complexity,
            route_type=route_type,
            missing_context=(),
            required_agents=agents,
            attachment_ids=request.attachment_ids,
        )


def _contains_any(message: str, terms: tuple[str, ...]) -> bool:
    return any(term in message for term in terms)


def is_rerun_request(message: str) -> bool:
    """Câu yêu cầu chạy lại cả đội agent (dùng chung với luật quyền chạy ở trang hồ sơ)."""
    return _contains_any(" ".join(message.split()).casefold(), _RERUN_TERMS)


def _domain_agents(message: str) -> tuple[str, ...]:
    """Return matched expert domains in canonical DAG order."""

    return tuple(
        agent
        for agent, terms in (
            ("DOCUMENT", _DOCUMENT_TERMS),
            ("CREDIT", _CREDIT_TERMS),
            ("LEGAL_COMPLIANCE", _COMPLIANCE_TERMS),
        )
        if _contains_any(message, terms)
    )


def _refusal(request: RoutingRequest, normalized: str, intent: str = "OUT_OF_SCOPE") -> RoutingDecision:
    return RoutingDecision(
        customer_id=request.active_customer_id,
        loan_application_id=request.active_loan_application_id,
        intent=intent,
        normalized_question=normalized,
        context_status=ContextStatus.OUT_OF_SCOPE,
        # Refusal is a simple deterministic response, not a fifth complexity
        # level in the canonical 1-4 contract.
        complexity_level=2,
        route_type=RouteType.REFUSE,
        missing_context=(),
        required_agents=(),
        attachment_ids=request.attachment_ids,
    )
