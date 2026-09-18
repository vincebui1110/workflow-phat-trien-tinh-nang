#!/usr/bin/env bash
# Lens 0 — Mockup technical pre-gate (code gate).
# SINGLE SOURCE OF TRUTH cho check deterministic 0.1-0.5 (mockup-standard.md chỉ trỏ về đây).
# Check 0.6 (build method: Vite esbuild JSX / template literal) là check ĐỌC TAY của verifier — không nén vào script.
# Usage: lens0-mockup.sh <UI_file.html> [marker-text]
#   marker-text: chuỗi phải xuất hiện trong DOM render (tên card/screen) — khuyến nghị truyền.
# 0.9 (T175): AI-tell đo được — 0.9a/0.9b/0.9c đều ADVISORY (locator, không tự fail gate);
#   verifier đọc thẳng output thay vì soi tay lại. Chỉ 0.1-0.5 mới quyết exit code.
# Exit: 0 = PASS · 1 = FAIL → REJECT · 2 = deterministic PASS nhưng render CHƯA verify được (Chrome thiếu) → NEEDS_HUMAN_VERIFY
set -uo pipefail

F="${1:-}"
MARKER="${2:-}"
if [ -z "$F" ] || [ ! -f "$F" ]; then echo "USAGE: lens0-mockup.sh <UI_file.html> [marker]"; exit 1; fi

FAIL=0; UNVERIFIED=0
pass() { echo "0.$1 PASS - $2"; }
fail() { echo "0.$1 FAIL - $2"; FAIL=1; }

# 0.1 đúng 1 script tag
N_SCRIPT=$(grep -c '</script' "$F" || true)
[ "$N_SCRIPT" -eq 1 ] && pass 1 "1 script tag" || fail 1 "grep -c '</script' = $N_SCRIPT (phải = 1)"

# 0.2 không ref file build ngoài
N_REF=$(grep -c 'assets/dev-preview-[A-Za-z0-9]*\.js' "$F" || true)
[ "$N_REF" -eq 0 ] && pass 2 "không ref bundle ngoài" || fail 2 "còn $N_REF ref assets/dev-preview-*.js"

# 0.3 không corruption $& backreference
N_CORRUPT=$(grep -c '<div id="app"></div>/' "$F" || true)
[ "$N_CORRUPT" -eq 0 ] && pass 3 "không corruption backreference" || fail 3 "dính corruption '<div id=\"app\"></div>/'"

# 0.4 bundle syntax OK (trích inline script → node --check)
# FIX (T110 2026-07-27): awk cũ extract THEO DÒNG (`/<script[ >]/{f=1;next} /<\/script/{f=0} f`)
# → drop/cắt CẢ dòng chứa substring '<script'/'</script' nằm trong STRING LITERAL của bundle
# React/Polaris minified → vỡ seam JS → node --check báo lỗi GIẢ (false-positive gate exit 1
# cho mockup hợp lệ). Thay bằng full-slice regex (perl slurp): trích trọn nội dung giữa
# <script...> và </script> bất kể xuống dòng, không đụng substring trong literal.
TMPJS=$(mktemp /tmp/lens0-mockup-XXXX.mjs)
perl -0777 -ne 'while(/<script\b[^>]*>(.*?)<\/script>/gis){print $1,"\n"}' "$F" > "$TMPJS"
if [ -s "$TMPJS" ] && node --check "$TMPJS" 2>/tmp/lens0-node-err.txt; then
  pass 4 "node --check OK"
else
  fail 4 "inline script syntax lỗi hoặc rỗng: $(head -3 /tmp/lens0-node-err.txt 2>/dev/null)"
fi
rm -f "$TMPJS"

# 0.5 RENDER THẬT headless (DOM không trống + có marker nếu truyền)
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -x "$CHROME" ]; then
  DOM=$(mktemp /tmp/lens0-dom-XXXX.html)
  "$CHROME" --headless --dump-dom --virtual-time-budget=4000 "file://$(cd "$(dirname "$F")" && pwd)/$(basename "$F")" > "$DOM" 2>/dev/null || true
  SIZE=$(wc -c < "$DOM" | tr -d ' ')
  if [ "$SIZE" -lt 2000 ]; then
    fail 5 "DOM render quá nhỏ ($SIZE bytes) — nghi màn trắng/JS crash"
  elif [ -n "$MARKER" ] && ! grep -qi -- "$MARKER" "$DOM"; then
    fail 5 "DOM không chứa marker '$MARKER' — screen không render"
  else
    pass 5 "render OK (DOM $SIZE bytes${MARKER:+, có marker '$MARKER'})"
  fi
  TEXTSRC="$DOM"
else
  UNVERIFIED=1
  echo "0.5 SKIP - không tìm thấy Chrome headless → render CHƯA verify, verifier phải mở thật/escalate"
fi

# 0.9 AI-tell / MINOR đo được (T175 — đẩy MINOR máy chấm được xuống script, đừng tiêu vòng người)
# Nguồn text: DOM render nếu có (text THẬT sau khi React chạy), fallback file nguồn.
# Bỏ <script>/<style> rồi bỏ tag → còn text người đọc thấy.
TEXTSRC="${TEXTSRC:-$F}"
VIS=$(mktemp /tmp/lens0-vis-XXXX.txt)
perl -0777 -pe 's{<script\b.*?</script>}{}gis; s{<style\b.*?</style>}{}gis; s{<[^>]*>}{ }gs' "$TEXTSRC" > "$VIS"

# 0.9a em/en-dash trong TEXT render — LOCATOR ADVISORY (KHÔNG tự fail gate).
# T175: script tìm + chỉ chỗ (rẻ, vét cạn); VERIFIER phân loại (judgment):
#   dash nằm trong COPY MERCHANT  => MAJOR (mockup-standard §3.A chống AI-tell) => REJECT
#   dash trong card DEV NOTE / thanh prototype / tên screen switcher => KHÔNG tính lỗi.
# Vì sao không fail cứng: run-test 4 mockup THẬT (OL/CB/AC/WF) => 3 cái dính dash ĐÚNG ở
# dev-note + prototype bar. Fail cứng ở đó = nitpick giả, đúng loại vòng lãng phí T175 diệt.
# Bẫy encoding: `--dump-dom` decode theo charset TRANG — thiếu <meta charset> thì em-dash
# thành mojibake ("â€”"), grep ký tự thật TRƯỢT ÂM THẦM => bắt cả dạng mojibake.
perl -CSD -0777 -ne '
  my $t=$_; my ($n,@ctx)=(0);
  while($t=~/(\x{2014}|\x{2013}|\x{00E2}\x{20AC}\x{201D}|\x{00E2}\x{20AC}\x{201C})/g){
    my $p=pos($t); my $w=substr($t,($p-70>0?$p-70:0),140); $w=~s/\s+/ /g; $n++;
    push @ctx,$w if @ctx<5;
  }
  print "N=$n\n"; print "CTX=$_\n" for @ctx;
' "$VIS" > /tmp/lens0-dash.txt 2>/dev/null
N_DASH=$(grep -m1 '^N=' /tmp/lens0-dash.txt | cut -d= -f2); N_DASH=${N_DASH:-0}
if [ "$N_DASH" -eq 0 ]; then
  echo "0.9a OK - 0 em/en-dash trong text render"
else
  echo "0.9a ADVISORY - $N_DASH em/en-dash trong text render → VERIFIER phân loại: trong copy merchant = MAJOR (REJECT); trong DEV NOTE/prototype bar = bỏ qua. Vị trí:"
  grep '^CTX=' /tmp/lens0-dash.txt | sed 's/^CTX=/      · /'
fi
rm -f /tmp/lens0-dash.txt
if ! grep -qi '<meta[^>]*charset' "$F"; then echo "0.9a! CẢNH BÁO - file thiếu <meta charset=\"utf-8\"> (dấu tiếng Việt/ký tự đặc biệt sẽ vỡ khi render thật)"; fi

# 0.9b data mẫu generic = MINOR (advisory — KHÔNG fail gate, verifier đọc thẳng dòng này)
GEN=$(grep -Eoi 'Product [0-9]|Item [0-9]|John Doe|Jane Doe|Lorem ipsum|Test Product|example\.com|foo ?bar' "$VIS" 2>/dev/null | sort -u | tr '\n' ',' | sed 's/,$//')
if [ -z "$GEN" ]; then echo "0.9b OK - không thấy data mẫu generic"; else echo "0.9b MINOR(advisory) - data mẫu generic: $GEN"; fi

# 0.9c hex màu hardcode trong style inline = MINOR advisory (đối chiếu token ở Lens 3)
N_HEX=$(grep -Eo 'style="[^"]*#[0-9a-fA-F]{3,8}' "$TEXTSRC" 2>/dev/null | wc -l | tr -d ' ')
if [ "${N_HEX:-0}" -eq 0 ]; then echo "0.9c OK - không có hex hardcode trong style inline"; else echo "0.9c MINOR(advisory) - $N_HEX chỗ hex hardcode trong style=\"...\" (soi lại ở Lens 3 token)"; fi
rm -f "$VIS" "$DOM" 2>/dev/null

echo "---"
if [ "$FAIL" -ne 0 ]; then echo "LENS0: FAIL → REJECT"; exit 1; fi
if [ "$UNVERIFIED" -ne 0 ]; then echo "LENS0: PASS (deterministic) + NEEDS_HUMAN_VERIFY (0.5 render chưa chạy)"; exit 2; fi
echo "LENS0: PASS 0.1-0.5 (0.6 build-method verifier đọc tay)"; exit 0
