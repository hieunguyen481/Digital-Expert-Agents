#!/usr/bin/env bash
# Mo demo ra internet bang mot link https (Cloudflare quick tunnel), chay tren chinh may nay.
# Dung:  public-demo.sh on | off | url | pages
#   on  : dung web ban "cung nguon" -> proxy mot cong (localhost:8088) -> tunnel; dang ky link vao Keycloak,
#         backend va engine nhan token cap qua link do. Chay lai bat cu luc nao (vd. sau khi khoi dong lai may).
#   off : tat proxy + tunnel, dua backend/engine/Keycloak ve cau hinh chi chay local.
#   url : in link dang mo.
# Luu y: khi dang bat, URL ky san cua MinIO tro ve link cong khai, nen hay dung link cong khai (khong dung localhost:3000)
#        de tai tai lieu; chay e2e thi tat truoc. Link tunnel doi moi lan tunnel duoc tao lai.
# Link CO DINH: neu infra/.env.local co CF_API_TOKEN va CF_ACCOUNT_ID, script dang mot trang chuyen huong len
#        Cloudflare Pages (https://<CF_PAGES_PROJECT>.pages.dev, mac dinh duskdash-demo) tro toi link tunnel hien tai.
#        Gui/ghi link .pages.dev nay; moi lan "on" no tu cap nhat. "off" thay bang trang bao demo dang tat.
set -euo pipefail
infra_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_dir="$(cd "$infra_dir/.." && pwd)"
project="${DEMO_PROJECT:-bank-ai-workbench}"
url_file="$infra_dir/public/.url"
cd "$infra_dir"

dc() {
  docker compose -p "$project" --env-file versions.env --env-file .env.local \
    -f docker-compose.infra.yml -f docker-compose.tools.yml \
    -f ../backend/docker-compose.backend.yml -f ../agent_engine/docker-compose.engine.yml \
    -f docker-compose.public.yml "$@"
}

# Dang ky (hoac go) mot nguon vao client bank-ai-frontend; giu nguyen cac nguon localhost, bo link trycloudflare cu.
keycloak_origin() {
  local origin="$1"
  dc exec -T keycloak sh -c '
    set -e
    kc=/opt/keycloak/bin/kcadm.sh; cfg=/tmp/kcadm-public.config
    $kc config credentials --config $cfg --server http://localhost:8080 --realm master \
      --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD" >/dev/null
    id=$($kc get clients --config $cfg -r bank-ai -q clientId=bank-ai-frontend --fields id --format csv --noquotes)
    $kc get clients/$id --config $cfg -r bank-ai > /tmp/client.json
    echo "$id"' > /tmp/.kc-client-id
  local id; id="$(tail -1 /tmp/.kc-client-id)"; rm -f /tmp/.kc-client-id
  dc exec -T keycloak cat /tmp/client.json | python3 -c '
import json, sys
c = json.load(sys.stdin); origin = sys.argv[1]
keep = lambda xs: [x for x in xs if "trycloudflare.com" not in x and "localhost:8088" not in x]
r, w = keep(c.get("redirectUris") or []), keep(c.get("webOrigins") or [])
a = c.get("attributes") or {}
p = keep([x for x in (a.get("post.logout.redirect.uris") or "").split("##") if x])
if origin != "-":
    for o in (origin, "http://localhost:8088"):
        r.append(o + "/*"); w.append(o); p.append(o + "/*")
print(json.dumps({"redirectUris": r, "webOrigins": w, "attributes": {"post.logout.redirect.uris": "##".join(p)}}))
' "$origin" | dc exec -T keycloak sh -c "cat > /tmp/patch.json && /opt/keycloak/bin/kcadm.sh update clients/$id \
      --config /tmp/kcadm-public.config -r bank-ai -f /tmp/patch.json && rm -f /tmp/patch.json /tmp/client.json"
}

# Doc mot bien tu .env.local (khong in ra man hinh).
env_get() { grep -m1 "^$1=" "$infra_dir/.env.local" 2>/dev/null | cut -d= -f2- | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//' || true; }

# Cap nhat trang chuyen huong co dinh tren Cloudflare Pages. $1 = link tunnel, hoac "-" khi tat demo.
pages_update() {
  local token account project site
  token="$(env_get CF_API_TOKEN)"; account="$(env_get CF_ACCOUNT_ID)"; project="$(env_get CF_PAGES_PROJECT)"; project="${project:-duskdash-demo}"
  if [ -z "$token" ] || [ -z "$account" ]; then echo "   (bo qua link co dinh: chua co CF_API_TOKEN / CF_ACCOUNT_ID trong infra/.env.local)"; return 0; fi
  site="$(mktemp -d)"
  if [ "$1" = "-" ]; then
    cat > "$site/index.html" <<'HTML'
<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sổ Tín Dụng · demo</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;color:#172229">
<div style="text-align:center"><h1 style="font-size:22px">Demo đang tạm tắt</h1><p style="color:#57646B">Vui lòng thử lại sau.</p></div></body></html>
HTML
  else
    printf '/* %s/:splat 302\n' "$1" > "$site/_redirects"
    cat > "$site/index.html" <<HTML
<!doctype html><html lang="vi"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=$1/">
<title>Sổ Tín Dụng · demo</title><script>location.replace("$1/"+location.search+location.hash)</script>
<body style="font-family:system-ui,sans-serif"><p>Đang mở demo… <a href="$1/">bấm vào đây nếu không tự chuyển</a>.</p></body></html>
HTML
  fi
  local w="npx --yes wrangler@3.114.0"
  export CLOUDFLARE_API_TOKEN="$token" CLOUDFLARE_ACCOUNT_ID="$account"
  $w pages project list 2>/dev/null | grep -q " $project " || $w pages project create "$project" --production-branch main >/dev/null 2>&1 || true
  if $w pages deploy "$site" --project-name "$project" --branch main --commit-dirty=true >/tmp/.pages-deploy.log 2>&1; then
    echo "   link co dinh: https://$project.pages.dev"
  else
    echo "   cap nhat link co dinh LOI (xem /tmp/.pages-deploy.log)" >&2
  fi
  unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID; rm -rf "$site"
}

recreate_services() {
  # Bien moi truong doc khi tao container: compose chi tao lai service co cau hinh doi
  dc up -d --no-deps keycloak backend-api backend-document-worker backend-outbox-publisher engine
  for s in keycloak backend-api engine; do
    for _ in $(seq 1 60); do
      [ "$(docker inspect -f '{{.State.Health.Status}}' "$project-$s-1" 2>/dev/null)" = healthy ] && break; sleep 3
    done
  done
}

case "${1:-url}" in
  on)
    echo "1/4 dung giao dien ban cung nguon"
    (cd "$repo_dir/frontend" && VITE_USE_MOCK_API=false VITE_API_BASE_URL=/api/v1 VITE_KEYCLOAK_URL=same-origin \
      npx vite build --outDir "$infra_dir/public/site" --emptyOutDir >/dev/null)
    echo "2/4 bat proxy + tunnel"
    dc --profile public up -d --build edge tunnel >/dev/null
    url=""
    for _ in $(seq 1 40); do
      url="$(docker logs "$project-tunnel-1" 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1 || true)"
      [ -n "$url" ] && break; sleep 3
    done
    [ -n "$url" ] || { echo "khong lay duoc link tu tunnel (docker logs $project-tunnel-1)" >&2; exit 1; }
    echo "3/4 backend/engine nhan token cap qua $url"
    export KEYCLOAK_EXTRA_ISSUERS="http://keycloak:8080/realms/bank-ai,http://localhost:8088/realms/bank-ai,$url/realms/bank-ai"
    export MINIO_PUBLIC_ENDPOINT="$url"
    recreate_services
    echo "4/4 dang ky link vao Keycloak"
    keycloak_origin "$url"
    echo "$url" > "$url_file"
    for _ in $(seq 1 30); do
      code="$(curl -s -o /dev/null -w '%{http_code}' "$url/realms/bank-ai/.well-known/openid-configuration" || true)"
      [ "$code" = 200 ] && break; sleep 3
    done
    echo "Link demo: $url   (kiem tra Keycloak qua link: HTTP $code)"
    echo "5/5 cap nhat link co dinh (Cloudflare Pages)"
    pages_update "$url"
    ;;
  off)
    dc --profile public stop edge tunnel >/dev/null 2>&1 || true
    dc --profile public rm -f edge tunnel >/dev/null 2>&1 || true
    unset KEYCLOAK_EXTRA_ISSUERS MINIO_PUBLIC_ENDPOINT
    recreate_services
    keycloak_origin "-"
    rm -f "$url_file"
    pages_update "-"
    echo "Da tat link cong khai; he thong chi chay local."
    ;;
  url)
    if [ -f "$url_file" ] && [ "$(docker inspect -f '{{.State.Running}}' "$project-tunnel-1" 2>/dev/null)" = true ]; then
      cat "$url_file"
    else
      echo "Chua bat link cong khai (chay: $0 on)"
    fi
    ;;
  pages)
    # Chi cap nhat link co dinh theo link tunnel dang mo (khong dung lai gi khac).
    [ -f "$url_file" ] || { echo "Chua bat link cong khai (chay: $0 on)" >&2; exit 1; }
    pages_update "$(cat "$url_file")"
    ;;
  *) echo "dung: $0 on|off|url|pages" >&2; exit 2 ;;
esac
