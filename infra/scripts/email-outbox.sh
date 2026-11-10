#!/usr/bin/env bash
# Bat/tat hang gui email (integration.email_outbox_setting). Mac dinh TAT: thong bao khong sinh dong cho gui.
# Dung:  email-outbox.sh on | off | status     Bien: DEMO_PROJECT (mac dinh bank-ai-workbench).
# Muon gui that con can EMAIL_SEND_ENABLED=true + SMTP_APP_PASSWORD trong infra/.env.local va khoi dong backend-email-worker
# (docker compose ... --profile backend-workers up -d backend-email-worker). Truoc khi chay e2e/seed/reset hay `off`.
set -euo pipefail
infra_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="${DEMO_PROJECT:-bank-ai-workbench}"
cd "$infra_dir"
psql_in() {
  docker compose -p "$project" --env-file versions.env --env-file .env.local -f docker-compose.infra.yml \
    exec -T postgres psql -U postgres -d bank_ai -Atq -c "$1"
}
case "${1:-status}" in
  on)  psql_in "UPDATE integration.email_outbox_setting SET enabled = TRUE, updated_at = now()" ;;
  off) psql_in "UPDATE integration.email_outbox_setting SET enabled = FALSE, updated_at = now()" ;;
  status) ;;
  *) echo "dung: $0 on|off|status" >&2; exit 2 ;;
esac
psql_in "SELECT 'hang gui email: ' || CASE WHEN enabled THEN 'BAT' ELSE 'TAT' END FROM integration.email_outbox_setting"
