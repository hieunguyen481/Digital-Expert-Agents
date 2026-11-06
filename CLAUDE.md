@AGENTS.md

## graphify

Repo có knowledge graph tại `graphify-out/` (~5.000 node: code AST + tài liệu `docs/`, `infra/docs/`, `backend/instructions.md`, `infra/intructions.md`; 235 cộng đồng đã đặt tên). Dùng nó để lấy context chính xác trước khi đọc file thô.

### Luật bắt buộc

1. **Graph trước, grep sau.** Khi `graphify-out/graph.json` tồn tại, với mọi câu hỏi/tác vụ về codebase, chạy `graphify query "<câu hỏi>"` TRƯỚC lần grep/Glob/Read source đầu tiên. Chỉ đọc file thô cho các dòng mà graph (hoặc một lần đọc trước) đã chỉ ra.
   - Quan hệ giữa hai thứ: `graphify path "<A>" "<B>"`.
   - Giải thích một khái niệm/symbol: `graphify explain "<tên>"`.
   - Kết quả quá rộng: thêm `--budget 1500`, hoặc dùng `--seed <file/symbol>` để neo điểm bắt đầu.
   - Câu hỏi bằng tiếng Việt nên kèm từ khóa tiếng Anh trong code (vd. "thẩm định tín dụng credit agent DSCR").
2. **Subagent cũng phải theo.** Mọi prompt giao cho subagent khám phá code phải chép nguyên luật số 1 vào.
3. **Kiến trúc tổng thể** mới đọc `graphify-out/GRAPH_REPORT.md` (god nodes, cộng đồng, kết nối bất ngờ) — không đọc nó cho câu hỏi cụ thể.
4. **Sau khi sửa code**, chạy `graphify update .` (chỉ AST, không tốn token) để graph không lệch. Sửa tài liệu `.md` thì graph tài liệu chỉ được cập nhật khi chạy lại `/graphify . --update`.
5. **Graph là bản đồ, không phải chân lý.** Cạnh `INFERRED`/`AMBIGUOUS` là suy luận — xác minh bằng source trước khi sửa code hoặc khẳng định với người dùng. Nếu graph và code mâu thuẫn, code đúng; nếu code mâu thuẫn `docs/business/`, dừng lại và hỏi (theo `AGENTS.md`).
6. Nếu `graphify-out/` không tồn tại (máy khác / clone mới): build bằng `/graphify .` hoặc tối thiểu `graphify update .` rồi mới áp dụng luật trên.

### Bản đồ nhanh (cộng đồng → khu vực)

| Khu vực | Cộng đồng tiêu biểu trong graph |
|---|---|
| Phân quyền / RLS | Backend Core Wiring & RLS, JWT / JWKS Validation, RLS Session Dependency, Login Rule Engine |
| Multi-agent backend | Agent Base Contracts, Agent Evaluation Coordinator, Context Router, Report Synthesizer, Document Agent (Backend) |
| Tính toán tín dụng | Affordability Calculations (DTI/DSCR/LTV), Calculation Service Ports |
| Agent Engine (`agent_engine/`) | Agent Engine Gateway API, Agent Engine Orchestrator (DAG), Agent Engine Planner, MCP Core Banking Server, Agent Engine Domain RAG |
| Sự kiện / Kafka | Event Envelope Schema, Outbox Publisher, Event Inbox Repository, Kafka Topic Registry & Worker Entrypoints, Kafka Contract Docs |
| Tài liệu & lưu trữ | Document Chunking & Classification, Embedding Pipeline, OCR Provider, MinIO Storage Adapter |
| Frontend | Chat Workspace UI, Frontend App Shell & Routes, Frontend Services & Doc Viewer, Loan Breakdown & Agent Trace UI |
| Dữ liệu / hạ tầng | Credit & Banking Data Dictionary, Postgres Migrations, Roles & Seeds, Infrastructure Architecture Docs |

God nodes (đụng vào là ảnh hưởng rộng): `PrincipalLike`, `AgentOutput`, `CurrentPrincipal`, `EventEnvelope`, `APIModel`, `require_permission()`.
