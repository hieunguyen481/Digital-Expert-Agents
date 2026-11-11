#!/usr/bin/env bash
# Dat lai demo mot buoc: don ca agent + thong bao phat sinh cua ho so demo va LA- (khong dung ho so khac), nap lai seed (dua ho so mau ve dung buoc,
# ho so LA- tao khi demo/e2e bi go nguoi vay chinh nen khong con hien trong danh sach viec).
# Khong dung agent.benchmark_run. Chay nhieu lan cho cung ket qua. Khi chay e2e: boc trong flock /tmp/do-an-e2e.lock.
# Bien: DEMO_PROJECT (mac dinh bank-ai-workbench). Can stack dang chay; khong down, khong xoa volume.
# Tuy chon --warm: sau khi nap seed, chay doi agent THAT (LLM) cho 2 ho so: canh 1 (HSV-2026-00187, VinaNova, do Tham dinh) va ho so o buoc Phe duyet (HSV-2026-00163, do Truong phong), moi ho so cho xong,
# de khoi AI o chi tiet ho so (ca man cua Cap phe duyet) co ket luan, co, Validation ngay khi mo. Khong chen du lieu agent gia vao seed. Bien: WARM_TIMEOUT (giay, mac dinh 420).
set -euo pipefail
warm=0
for arg in "$@"; do case "$arg" in --warm) warm=1 ;; *) echo "Tham so khong biet: $arg (chi co --warm)" >&2; exit 2 ;; esac; done
infra_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="${DEMO_PROJECT:-bank-ai-workbench}"
cd "$infra_dir"
dc() {
  docker compose -p "$project" --env-file versions.env --env-file .env.local \
    -f docker-compose.infra.yml -f docker-compose.tools.yml -f ../backend/docker-compose.backend.yml \
    -f ../agent_engine/docker-compose.engine.yml "$@"
}
started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# Tat cong tat hang gui email: thu sinh tu seed/reset khong vao hang gui (bat lai bang email-outbox.sh on sau khi xong).
dc exec -T postgres psql -U postgres -d bank_ai -q -c "UPDATE integration.email_outbox_setting SET enabled = FALSE, updated_at = now()"
dc exec -T postgres psql -U postgres -d bank_ai -v ON_ERROR_STOP=1 -q < database/demo/reset-demo-cleanup.sql
dc --profile setup run --rm --no-deps db-seed > /tmp/reset-demo-seed.log 2>&1 || { tail -20 /tmp/reset-demo-seed.log >&2; exit 1; }
if [ "$warm" = 1 ]; then
  # Dang nhap bang tai khoan Tham dinh (appraiser@example.local), goi API chay doi agent cua ho so canh 1, doi ca vao trang thai ket thuc.
  ENV_FILE="$infra_dir/.env.local" python3 - <<'PY'
import json, os, sys, time, urllib.parse, urllib.request
env = {}
for line in open(os.environ["ENV_FILE"], encoding="utf-8"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1); env[k] = v.strip().strip('"').strip("'")
kc = os.environ.get("KEYCLOAK_URL", "http://localhost:8080"); api = os.environ.get("API_URL", "http://localhost:8000/api/v1")
# (ho so, tai khoan chay): 00187 do Tham dinh; 00163 (dang o buoc Phe duyet) do Truong phong, vai duoc phep chay theo ROLE_STATUSES.
runs = [("75000000-0000-4000-8000-000000000001", "appraiser@example.local"), ("75000000-0000-4000-8000-000000000013", "credit.manager@example.local")]
terminal = {"Pending Approval", "Needs Info", "Escalated", "Executing", "Completed", "Rejected"}
def call(method, url, form=None, token=None, body=None):
    data = urllib.parse.urlencode(form).encode() if form else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, data=data, method=method)
    if form: req.add_header("Content-Type", "application/x-www-form-urlencoded")
    elif data is not None: req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read() or b"null")
ok = True
try:
    for loan, user in runs:
        tok = call("POST", f"{kc}/realms/bank-ai/protocol/openid-connect/token", form={
            "grant_type": "password", "client_id": "bank-ai-backend", "client_secret": env["KEYCLOAK_BACKEND_CLIENT_SECRET"],
            "username": user, "password": env["SEED_USER_PASSWORD"]})["access_token"]
        ov = call("POST", f"{api}/loan-applications/{loan}/agent-runs", token=tok)
        case_id = ov["latest"]["case_id"]
        deadline = time.time() + int(os.environ.get("WARM_TIMEOUT", "420"))
        state = None
        while time.time() < deadline:
            state = call("GET", f"{api}/agent-cases/{case_id}", token=tok).get("state")
            if state in terminal: break
            time.sleep(5)
        print(f"warm: ho so {loan[-2:]} ca {case_id} trang thai {state}")
        ok = ok and state in terminal
    sys.exit(0 if ok else 1)
except Exception as e:  # khong in token/mat khau
    print(f"warm that bai: {type(e).__name__}: {e}", file=sys.stderr); sys.exit(1)
PY
fi
# Seed chay lai sinh them ban sao thong bao giao viec cua ho so mau khac: giu ban som nhat cua moi (nguoi nhan, loai, noi dung, ho so) de so thong bao khong tang qua moi lan dat lai.
dc exec -T postgres psql -U postgres -d bank_ai -q -c "DELETE FROM integration.notification n USING integration.notification o WHERE n.resource_type = 'LOAN_APPLICATION' AND o.resource_type = n.resource_type AND o.resource_id = n.resource_id AND o.employee_id = n.employee_id AND o.notification_type = n.notification_type AND o.message = n.message AND o.title = n.title AND (o.created_at, o.id) < (n.created_at, n.id)"
# Seed sinh lai thong bao (trigger) kem dong outbox PENDING (chi dong tao tu luc bat dau lenh nay): danh dau khong gui de worker email khong gui don len hop thu that.
dc exec -T postgres psql -U postgres -d bank_ai -q -c "UPDATE integration.notification_delivery SET status = 'FAILED', attempt_count = 5, locked_at = NULL, locked_by = NULL, last_error = 'demo-reset: khong gui' WHERE status IN ('PENDING', 'PROCESSING') AND created_at >= '$started'"
dc exec -T postgres psql -U postgres -d bank_ai -Atq -c "SELECT 'ho so khong LA-: ' || count(*) FILTER (WHERE application_number NOT LIKE 'LA-%') || ', ho so LA- con nguoi vay: ' || (SELECT count(*) FROM credit.loan_party lp JOIN credit.loan_application a ON a.id = lp.loan_application_id WHERE a.application_number LIKE 'LA-%') || ', ca agent gan ho so: ' || (SELECT count(*) FROM credit.loan_agent_run) || ', thong bao: ' || (SELECT count(*) FROM integration.notification) || ', outbox cho gui: ' || (SELECT count(*) FROM integration.notification_delivery WHERE status IN ('PENDING','PROCESSING')) || ', benchmark_run: ' || (SELECT count(*) FROM agent.benchmark_run) FROM credit.loan_application"
