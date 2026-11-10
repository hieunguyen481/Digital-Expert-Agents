#!/bin/sh
# Sinh lại toàn bộ mockup rồi kiểm chéo dữ liệu demo. Chạy trong docs/design/mockups-v2/_gen
set -e
cd "$(dirname "$0")"
for f in p1 p2 p3 p4 p5 p6 p7; do node $f.js; done
node check.js
