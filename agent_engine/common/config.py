"""Cấu hình tập trung cho toàn hệ thống. Đọc từ biến môi trường / file .env."""
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

# ---- Ports & URLs ----
GATEWAY_PORT = int(os.getenv("GATEWAY_PORT", "8000"))
MCP_CORE_BANKING_PORT = int(os.getenv("MCP_CORE_BANKING_PORT", "8200"))

AGENT_PORTS = {
    "document": int(os.getenv("DOCUMENT_AGENT_PORT", "8101")),
    "credit": int(os.getenv("CREDIT_AGENT_PORT", "8102")),
    "compliance": int(os.getenv("COMPLIANCE_AGENT_PORT", "8103")),
    "operations": int(os.getenv("OPERATIONS_AGENT_PORT", "8104")),
    "validation": int(os.getenv("VALIDATION_AGENT_PORT", "8105")),
}

HOST = os.getenv("BIND_HOST", "127.0.0.1")
_CONNECT = "127.0.0.1" if HOST in ("0.0.0.0", "") else HOST
GATEWAY_URL = os.getenv("GATEWAY_URL", f"http://{_CONNECT}:{GATEWAY_PORT}")
MCP_CORE_BANKING_URL = os.getenv(
    "MCP_CORE_BANKING_URL", f"http://{_CONNECT}:{MCP_CORE_BANKING_PORT}/mcp"
)


def agent_url(name: str) -> str:
    return f"http://{_CONNECT}:{AGENT_PORTS[name]}"


# ---- LLM ----
# LLM_MODE:
#   "hybrid" -> rules cho tính toán số & ngưỡng chính sách (deterministic, auditable);
#               LLM cho Planner (DAG động), Document (vision), Validation (narrative).
#               => ranh giới đúng cho ngân hàng: tin cậy tuyệt đối ở số, linh hoạt ở suy luận.
#   "llm"    -> mọi agent suy luận bằng LLM (chứng minh năng lực agentic đầy đủ).
#   "rules"  -> thuần rule, không gọi LLM (baseline benchmark / offline demo).
LLM_MODE = os.getenv("LLM_MODE", "hybrid").lower()
# OpenAI-compatible endpoint (FPT AI Marketplace mặc định)
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://mkp-api.fptcloud.com/v1")
LLM_API_KEY = os.getenv("FPT_API_KEY") or os.getenv("OPENAI_API_KEY", "")
# Phân vai model theo agent (kết quả probe năng lực trên FPT Marketplace):
#   Planner/Validation: cần reasoning + JSON structured -> gpt-oss-120b
#   Specialist tool-loop: cần tool-calling ổn định     -> Llama-3.3-70B
#   Document vision: cần đọc ảnh tài liệu               -> Qwen2.5-VL-7B
PLANNER_MODEL = os.getenv("PLANNER_MODEL", "gpt-oss-120b")
SPECIALIST_MODEL = os.getenv("SPECIALIST_MODEL", "Llama-3.3-70B-Instruct")
VISION_MODEL = os.getenv("VISION_MODEL", "Qwen2.5-VL-7B-Instruct")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))
LLM_MAX_TOOL_ITERATIONS = int(os.getenv("LLM_MAX_TOOL_ITERATIONS", "10"))

# ---- Cờ tối ưu (bench6): mỗi hướng bật/tắt độc lập, danh sách phân tách bằng dấu phẩy trong OPT_FLAGS ----
#   gate      cổng cuối do luật xác định từ dữ kiện công cụ (tách thiếu dữ liệu chặn / thiếu trường phụ)
#   facts     bảng dữ kiện chung gọi công cụ một lần; chuyên gia chỉ còn một lượt LLM, RAG hẹp theo chuyên môn
#   plan      Planner xác định (template), không gọi LLM
#   report    báo cáo cuối dựng xác định, bỏ lượt LLM tường thuật
#   challenge vòng sửa chỉ gọi khi số tính lại mâu thuẫn (không dựa vào chữ trong verdict)
#   compact   prompt chuyên gia ngắn, đầu ra có cấu trúc giới hạn độ dài
#   agent_tools  Tín dụng/Tuân thủ tự chọn và gọi công cụ thuộc chuyên môn (thay cho gọi hết trước); cần LLM_MODE=llm
OPT_ALL = ("gate", "facts", "plan", "report", "challenge", "compact", "agent_tools")
# Mặc định không bật `plan`: Planner dùng LLM để lập và giao việc (quyết định sau đo v7, docs/agent/benchmark-v3-research.md §9)
OPT_DEFAULT = tuple(x for x in OPT_ALL if x != "plan")
OPT_FLAGS = frozenset(x.strip() for x in os.getenv("OPT_FLAGS", ",".join(OPT_DEFAULT)).split(",") if x.strip())


def opt(name: str) -> bool:
    return name in OPT_FLAGS


# ---- Nghiệp vụ ----
POLICY_VERSION = os.getenv("POLICY_VERSION", "2026.07")
APPROVAL_TOKEN_TTL_SECONDS = int(os.getenv("APPROVAL_TOKEN_TTL_SECONDS", "900"))
MAX_REPLAN_ROUNDS = int(os.getenv("MAX_REPLAN_ROUNDS", "2"))
MAX_CHALLENGE_ROUNDS = int(os.getenv("MAX_CHALLENGE_ROUNDS", "2"))
APPROVAL_SLA_SECONDS = int(os.getenv("APPROVAL_SLA_SECONDS", "60"))  # rút ngắn để demo
LTV_MAX = float(os.getenv("LTV_MAX", "0.70"))
# Q-R: CS-TD-SME/2025 là chuẩn (DSCR >= 1,25); rag_corpus/credit_policy.md (ghi 1,2) không còn là nguồn.
DSCR_MIN = float(os.getenv("DSCR_MIN", "1.25"))

# ---- Danh tính & dữ liệu thật (Postgres) ----
# Engine nối bằng role bank_app rồi SET LOCAL ROLE bank_engine (không BYPASSRLS) cho từng lời gọi.
DATABASE_URL = os.getenv("DATABASE_URL", "")
# Khóa dịch vụ nội bộ: ký danh tính gateway -> agent -> MCP và bảo vệ /internal/*.
ENGINE_SERVICE_TOKEN = os.getenv("ENGINE_SERVICE_TOKEN", "")
KEYCLOAK_ISSUER_URL = os.getenv("KEYCLOAK_ISSUER_URL", "http://localhost:8080/realms/bank-ai")
KEYCLOAK_JWKS_URL = os.getenv(
    "KEYCLOAK_JWKS_INTERNAL_URL",
    "http://keycloak:8080/realms/bank-ai/protocol/openid-connect/certs")
OIDC_AUDIENCE = os.getenv("OIDC_EXPECTED_AUDIENCE", "bank-ai-api")
# Backend: nơi duy nhất thực thi chuyển bước hồ sơ (WorkflowService, E8) bằng JWT của người xác nhận.
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend-api:8000")
# Vai trò DB được phép dùng gateway / các route nhạy cảm
GATEWAY_ROLES = frozenset({
    "credit_officer", "credit_appraiser", "credit_manager", "risk_officer",
    "compliance_officer", "document_reviewer", "loan_approver", "auditor", "admin"})
# Quản trị không bao giờ phê duyệt (Q-J); backend cũng từ chối.
APPROVER_ROLES = frozenset({"loan_approver"})
AUDIT_ROLES = frozenset({"auditor", "admin"})

# ---- Paths ----
DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
RAG_CORPUS_DIR = BACKEND_DIR / "rag_corpus"
UPLOADS_DIR = DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
LOGS_DIR = BACKEND_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)
