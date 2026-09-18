#!/usr/bin/env bash
# Lens 0 — Release Note pre-gate (code gate, thay prompt gate).
# SINGLE SOURCE OF TRUTH cho danh sách check 0.1-0.10 (release-note-standard.md chỉ trỏ về đây).
# Usage: lens0-release-note.sh <file-rn.txt>
# Exit: 0 = PASS toàn bộ (không có claim pháp lý)
#       1 = FAIL (in rõ check nào fail) → REJECT
#       2 = check deterministic PASS nhưng CÓ claim pháp lý → NEEDS_HUMAN_VERIFY
#           (verifier/human phải đối chiếu tên luật + hiệu lực với nguồn thật — script KHÔNG tự quyết đúng/sai luật)
#       3 = format PASS nhưng Demo còn marker HOÃN (chưa có/cần chụp/khi publish) → NEEDS_DEMO/HOLD
#           (chụp demo production hoặc waiver '(không có UI...)' trước khi publish — KHÔNG coi như done). Task 143.
# Bài học nguồn: feedback_autopilot_single_send_code_gate (gate bằng code, không tin model tự khai);
# lịch sử Lens 0 bị SKIP runtime 2 lần (03/07 + 07/07) dù check tồn tại trong .md.
set -uo pipefail

RN="${1:-}"
if [ -z "$RN" ] || [ ! -f "$RN" ]; then
  echo "USAGE: lens0-release-note.sh <file-rn.txt>"; exit 1
fi

FAIL=0
LEGAL=0
NEEDS_DEMO=0
pass() { echo "0.$1 PASS - $2"; }
fail() { echo "0.$1 FAIL - $2"; FAIL=1; }

TITLE_RE='^[^ ]+ \*\[(NEW FEATURE|IMPROVEMENT)( [0-9]+)?\] .+ - .+\*$'
HEADER_RE='^\*[0-9]+ (NEW FEATURES?|IMPROVEMENTS?)'

# 0.1 Feature title đúng format `[ICON] *[TYPE] Tên - Mô tả*`
N_TITLE=$(grep -cE "$TITLE_RE" "$RN" || true)
BAD_TITLE=$(grep -E 'NEW FEATURE|IMPROVEMENT' "$RN" | grep -vE "$HEADER_RE" | grep -vE "$TITLE_RE" || true)
if [ "$N_TITLE" -ge 1 ] && [ -z "$BAD_TITLE" ]; then
  pass 1 "$N_TITLE feature title đúng format"
else
  fail 1 "title sai format (thiếu [] / thiếu ' - ' mô tả / quên bold). Dòng lỗi: ${BAD_TITLE:-<không có title hợp lệ nào>}"
fi

# 0.2 Icon whitelist 6 app (custom emoji nhân đôi, không emoji thường)
ICON_RE='^(:accessibility-logo:|:cookie-bar-logo:|:age-verify-zo-dich:|:order-limit-logo:|:fraud-filter-logo:|:logo-wf:){2} '
BAD_ICON=$(grep -E "$TITLE_RE" "$RN" | grep -vE "$ICON_RE" || true)
if [ -z "$BAD_ICON" ]; then pass 2 "icon whitelist OK"; else fail 2 "title không mở đầu bằng custom emoji app x2: $BAD_ICON"; fi

# 0.3 Dòng 1 chỉ App + Date (bold)
if head -1 "$RN" | grep -qE '^\*.+ - [0-3][0-9]/[0-1][0-9]/20[0-9]{2}\*$'; then
  pass 3 "dòng 1 = *App - DD/MM/YYYY*"
else
  fail 3 "dòng 1 phải là '*Tên app - DD/MM/YYYY*' (bold, không gộp feature type): $(head -1 "$RN")"
fi

# 0.4 Bullet đúng ký tự •◦▪ (không - hoặc *)
BAD_BULLET=$(grep -nE '^[[:space:]]*[-*] ' "$RN" || true)
if [ -z "$BAD_BULLET" ]; then pass 4 "không có bullet sai ký tự"; else fail 4 "bullet dùng -/* thay vì •◦▪: $BAD_BULLET"; fi

# 0.5 Section labels bold đủ (mỗi label >= số feature)
for LBL in 'Issue' 'Solution' 'Vị trí' 'Description'; do
  C=$(grep -c "\*$LBL" "$RN" || true)
  if [ "${C:-0}" -lt "${N_TITLE:-1}" ]; then fail 5 "label *$LBL thiếu ($C < $N_TITLE feature)"; fi
done
[ "$FAIL" -eq 0 ] && pass 5 "labels Issue/Solution/Vị trí/Description đủ" || true

# 0.6 Tag cuối
grep -q '<!channel>' "$RN" && pass 6 "<!channel> có" || fail 6 "thiếu <!channel>"
grep -q '<@U09NPDK45L5>' "$RN" && echo "0.6b PASS - tag CC có" || fail 6 "thiếu tag CC <@U09NPDK45L5>"

# 0.7 Demo không placeholder
BAD_DEMO=$(grep -nE '\*Demo:\*[[:space:]]*\(?Link\)?[[:space:]]*$' "$RN" || true)
if [ -z "$BAD_DEMO" ]; then pass 7 "demo không placeholder"; else fail 7 "demo placeholder '(Link)': $BAD_DEMO"; fi

# 0.7b Demo publish-ready — marker HOÃN ("chưa có / cần chụp / khi publish") KHÔNG được coi là done.
#   Nguồn bug (task 143): auto-capture demo (Step 7.5) treo → RN ghi "Demo: chưa có - cần chụp production khi publish",
#   nhưng 0.7 chỉ bắt literal "(Link)" nên vẫn PASS → release thiếu demo thật vẫn coi như xong.
#   Waiver HỢP LỆ (feature không có UI để demo): "(không có UI...)" / "no UI" → cho qua, KHÔNG hold.
#   Multi-image demo (dòng *Demo:* + sub-bullet ◦ có link http) KHÔNG chứa cụm hoãn → không false-positive.
DEMO_DEFER=$(grep -niE '\*Demo:\*.*(chưa có|cần chụp|sẽ chụp|chờ chụp|sắp chụp|khi publish|khi release|update sau|bổ sung sau|TODO|TBD)|Demo:.*(chưa có|cần chụp).*publish' "$RN" || true)
DEMO_WAIVER=$(printf '%s\n' "$DEMO_DEFER" | grep -iE 'không có UI|no UI|không có demo UI|không có giao diện' || true)
DEMO_HOLD=$(printf '%s\n' "$DEMO_DEFER" | grep -ivE 'không có UI|no UI|không có demo UI|không có giao diện' || true)
if [ -z "$DEMO_HOLD" ]; then
  pass "7b" "demo publish-ready (link thật / waiver không-có-UI, không marker hoãn)"
else
  NEEDS_DEMO=1
  echo "0.7b HOLD - Demo còn marker HOÃN (chưa có / cần chụp / khi publish...), CHƯA có link thật → KHÔNG publish-ready, KHÔNG coi như done. Chụp demo production hoặc dùng waiver '(không có UI...)':"
  printf '%s\n' "$DEMO_HOLD"
fi

# 0.8 Không rò code/JSON/camelCase (hit → FAIL, Lens 2 xét nếu là thuật ngữ hợp lệ)
# Loại trừ dòng chứa URL (link Demo Drive có ID mixed-case bắt nhầm camelCase → false-positive)
BAD_CODE=$(grep -nE '\{[^}]*:[^}]*\}|`[^`]+`|[a-z]+[A-Z][a-zA-Z]*[A-Z]' "$RN" | grep -vE 'https?://' || true)
if [ -z "$BAD_CODE" ]; then pass 8 "không rò code/JSON/camelCase"; else fail 8 "nghi rò technical (Lens 2 xét nếu là thuật ngữ hợp lệ): $BAD_CODE"; fi

# 0.9 Độ dài < 3900 BYTES (Slack msg_too_long fire theo byte ~4000; tiếng Việt đa byte nên phải đếm byte, KHÔNG phải code point)
BYTES=$(wc -c < "$RN" | tr -d ' ')
if [ "$BYTES" -lt 3900 ]; then pass 9 "độ dài $BYTES bytes < 3900 (Slack limit ~4000 byte)"; else fail 9 "quá dài ($BYTES bytes >= 3900, Slack reject msg_too_long ~4000 byte - tiếng VN đa byte) → rút gọn hoặc tách message tại ranh giới section"; fi

# 0.10 Legal grounding — script CHỈ PHÁT HIỆN, không phán đúng/sai luật
LEGAL_HIT=$(grep -niwE 'Act|Law|Luật|GDPR|CCPA|APDPA|VCDPA|Directive|Regulation' "$RN" || true)
LEGAL_HIT2=$(grep -ni 'Privacy Act' "$RN" || true)
if [ -n "$LEGAL_HIT" ] || [ -n "$LEGAL_HIT2" ]; then
  LEGAL=1
  echo "0.10 LEGAL - CÓ claim pháp lý, CẦN VERIFY NGUỒN THẬT (KB legal / web) trước khi publish:"
  echo "${LEGAL_HIT}${LEGAL_HIT2:+$'\n'$LEGAL_HIT2}"
else
  pass 10 "không có claim pháp lý"
fi

# 0.11 Không rò user-ID trần (phải dùng <@U05...> chứ không viết ID trần U09NPDK45L5)
BAD_MENTION=$(grep -nE '(^|[^@<])U09NPDK45L5' "$RN" || true)
if [ -z "$BAD_MENTION" ]; then pass 11 "mention CC dạng <@ID> đúng (không rò ID trần)"; else fail 11 "rò user-ID trần, phải viết <@U09NPDK45L5>: $BAD_MENTION"; fi

# 0.12 Không rò HTML entity &amp (over-escape → merchant đọc thấy chữ '&amp')
BAD_AMP=$(grep -nE '&amp' "$RN" || true)
if [ -z "$BAD_AMP" ]; then pass 12 "không rò entity &amp (dùng ký tự & thuần)"; else fail 12 "rò &amp;/&amp, phải viết ký tự '&' thuần: $BAD_AMP"; fi

echo "---"
if [ "$FAIL" -ne 0 ]; then echo "LENS0: FAIL → REJECT"; exit 1; fi
if [ "$NEEDS_DEMO" -ne 0 ]; then echo "LENS0: PASS (format) + NEEDS_DEMO (0.7b) → HOLD: chụp demo production hoặc waiver '(không có UI...)' trước khi publish; CHƯA done"; exit 3; fi
if [ "$LEGAL" -ne 0 ]; then echo "LENS0: PASS (deterministic) + NEEDS_HUMAN_VERIFY (0.10 legal)"; exit 2; fi
echo "LENS0: PASS toàn bộ"; exit 0
