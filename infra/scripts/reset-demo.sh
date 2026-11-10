#!/usr/bin/env bash
# Dat lai demo mot buoc: don ca agent + thong bao phat sinh, nap lai seed (dua ho so mau ve dung buoc,
# ho so LA- tao khi demo/e2e bi go nguoi vay chinh nen khong con hien trong danh sach viec).
# Khong dung agent.benchmark_run. Chay nhieu lan cho cung ket qua. Khi chay e2e: boc trong flock /tmp/do-an-e2e.lock.
# Bien: DEMO_PROJECT (mac dinh bank-ai-workbench). Can stack dang chay; khong down, khong xoa volume.
set -euo pipefail
infra_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="${DEMO_PROJECT:-bank-ai-workbench}"
cd "$infra_dir"
dc() {
  docker compose -p "$project" --env-file versions.env --env-file .env.local \
    -f docker-compose.infra.yml -f docker-compose.tools.yml -f ../backend/docker-compose.backend.yml \
    -f ../agent_engine/docker-compose.engine.yml "$@"
}
dc exec -T postgres psql -U postgres -d bank_ai -v ON_ERROR_STOP=1 -q < database/demo/reset-demo-cleanup.sql
dc --profile setup run --rm --no-deps db-seed > /tmp/reset-demo-seed.log 2>&1 || { tail -20 /tmp/reset-demo-seed.log >&2; exit 1; }
dc exec -T postgres psql -U postgres -d bank_ai -Atq -c "SELECT 'ho so khong LA-: ' || count(*) FILTER (WHERE application_number NOT LIKE 'LA-%') || ', ho so LA- con nguoi vay: ' || (SELECT count(*) FROM credit.loan_party lp JOIN credit.loan_application a ON a.id = lp.loan_application_id WHERE a.application_number LIKE 'LA-%') || ', ca agent gan ho so: ' || (SELECT count(*) FROM credit.loan_agent_run) || ', thong bao: ' || (SELECT count(*) FROM integration.notification) || ', benchmark_run: ' || (SELECT count(*) FROM agent.benchmark_run) FROM credit.loan_application"
