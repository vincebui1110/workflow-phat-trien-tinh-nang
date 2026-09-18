#!/usr/bin/env bash
# Lens — Jira task creation pre-gate (code gate, không tin model tự khai đã set đủ field).
# SINGLE SOURCE OF TRUTH cho danh sách check J.1-J.8 khi TẠO Jira task (pc-agent + /avada-task-manager).
# Input = issue JSON REST của Jira (output `node Others/jira-cli.js get <KEY>` hoặc mcp read_jira_issue),
#         đọc LẠI issue vừa create (KHÔNG chấm JSON mình định gửi — phải là issue thật đã tồn tại).
# Usage: lens-jira-task.sh <issue.json> [--expect-doclink] [--no-tester] [--expect-mr]
#   --expect-doclink : task này CÓ PRD/UI đi kèm → description/comment BẮT BUỘC có link (GitLab/Notion/Drive).
#   --no-tester      : task đặc biệt không cần tester haptt trong assignees (mặc định dev Task PHẢI có haptt).
#   --expect-mr      : task loại [BA-Dev] đã có merge request → field Merge Request (customfield_10800)
#                      BẮT BUỘC có URL, và link MR KHÔNG được nằm trong description (PO chốt 2026-08-26).
# Exit: 0 = PASS mọi check bắt buộc
#       1 = FAIL (in rõ check nào fail) → coi như task CHƯA tạo xong, sửa field rồi verify lại
# Bài học nguồn: task-142 (reviewer kenny/tester haptt rò vào option/assignees dev) → thêm J.5 role-hygiene;
#               PO 27-07 SB-14726 MKT thiếu sprint → J.1 áp MỌI issuetype Task (không chỉ dev).
set -uo pipefail

JSON="${1:-}"
EXPECT_DOCLINK=0
NEED_TESTER=1
EXPECT_MR=0
shift || true
for a in "$@"; do
  case "$a" in
    --expect-doclink) EXPECT_DOCLINK=1 ;;
    --no-tester) NEED_TESTER=0 ;;
    --expect-mr) EXPECT_MR=1 ;;
  esac
done

if [ -z "$JSON" ] || [ ! -f "$JSON" ]; then
  echo "USAGE: lens-jira-task.sh <issue.json> [--expect-doclink] [--no-tester] [--expect-mr]"; exit 1
fi
if ! command -v jq >/dev/null 2>&1; then echo "LENS-JIRA: cần jq để parse JSON"; exit 1; fi
# `node Others/jira-cli.js get <KEY>` in 1 dòng banner "✅ Issue found: KEY" TRƯỚC JSON → file không parse được.
# Tolerate bằng cách cắt từ dấu `{` đầu tiên (verify 2026-09-16: trước đó mọi lần chạy Step 6b theo đúng lệnh
# trong SKILL.md đều FAIL J.0, tức gate coi như không chạy).
if ! jq -e . "$JSON" >/dev/null 2>&1; then
  STRIPPED="${TMPDIR:-/tmp}/lens-jira-$$.json"
  sed -n '/^[[:space:]]*{/,$p' "$JSON" > "$STRIPPED" 2>/dev/null
  if jq -e . "$STRIPPED" >/dev/null 2>&1; then
    echo "J.0 WARN - file có banner trước JSON → đã cắt từ '{' đầu tiên để chấm"
    JSON="$STRIPPED"
  else
    echo "J.0 FAIL - file không phải JSON hợp lệ"; exit 1
  fi
fi

# .fields có thể ở gốc hoặc lồng trong { fields: {...} }
F='.fields // .'
FAIL=0
pass() { echo "J.$1 PASS - $2"; }
fail() { echo "J.$1 FAIL - $2"; FAIL=1; }

TYPE=$(jq -r "($F).issuetype.name // \"\"" "$JSON")
KEY=$(jq -r '.key // "?"' "$JSON")
echo "== Lens Jira task: $KEY (issuetype='$TYPE') =="

# helper: list user identity (name|displayName|accountId) của 1 array field
users() { jq -r "[ ($F).$1[]? | (.name // .displayName // .accountId // empty) ] | join(\",\")" "$JSON" 2>/dev/null; }
count() { jq -r "( ($F).$1 | if type==\"array\" then length else 0 end ) // 0" "$JSON" 2>/dev/null; }

ASSIGNEES=$(users customfield_10700)
REVIEWERS=$(users customfield_10900)
PO_ID=$(jq -r "($F).customfield_11000.id // \"\"" "$JSON")
# customfield_10101 có 2 dạng: (a) array of object {id:...} (MCP structured), (b) array of raw
# greenhopper string "com.atlassian.greenhopper.service.sprint.Sprint@...[...,id=NN,...]" (jira-client.js
# REST thô). jq `.id` trên string sẽ lỗi "Cannot index string with string" → dùng (.id? // .) để tolerate.
SPRINT=$(jq -r "($F).customfield_10101 // \"\" | if type==\"array\" then (map(if type==\"object\" then (.id // .) else . end) | join(\",\")) else tostring end" "$JSON" 2>/dev/null)
if [ -n "$SPRINT" ] && ! printf '%s' "$SPRINT" | grep -qE '^[0-9,]+$'; then
  # array of raw greenhopper strings → trích id=NN bằng regex, CHỈ trong nội dung field này (không scan cả file)
  SPRINT=$(printf '%s' "$SPRINT" | grep -oE 'id=[0-9]+' | grep -oE '[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')
fi

IS_SUBTASK=0
case "$TYPE" in Sub-task|Subtask|"Sub Task") IS_SUBTASK=1 ;; esac

# J.1 Sprint — MỌI issuetype Task (dev/MKT/standalone) PHẢI có sprint; BA Sub-task KHÔNG cần.
if [ "$IS_SUBTASK" -eq 1 ]; then
  pass 1 "Sub-task → không cần sprint (bỏ qua)"
elif [ -n "$SPRINT" ] && [ "$SPRINT" != "null" ]; then
  pass 1 "sprint set ($SPRINT)"
else
  fail 1 "issuetype Task nhưng THIẾU sprint (customfield_10101 rỗng/null) — PO 27-07 case SB-14726 MKT thiếu sprint"
fi

# J.2 Assignees không rỗng
if [ "$(count customfield_10700)" -ge 1 ]; then
  pass 2 "assignees có [$ASSIGNEES]"
else
  fail 2 "assignees (customfield_10700) RỖNG"
fi

# J.3 Reviewer không rỗng
if [ "$(count customfield_10900)" -ge 1 ]; then
  pass 3 "reviewer có [$REVIEWERS]"
else
  fail 3 "reviewer (customfield_10900) RỖNG"
fi

# J.4 Product Owner = Diệu BDT (id 10702)
if [ "$PO_ID" = "10702" ]; then
  pass 4 "PO = Diệu BDT (id 10702)"
else
  fail 4 "PO (customfield_11000.id) = '$PO_ID', phải = 10702 (Diệu BDT)"
fi

# J.5 Role-hygiene (task-142): reviewer KHÔNG được lọt vào assignees; dev Task PHẢI có tester haptt.
LEAK=""
for r in kenny sonnv; do
  case ",$ASSIGNEES," in *",$r,"*) LEAK="$LEAK $r" ;; esac
done
if [ -n "$LEAK" ]; then
  fail 5 "reviewer($LEAK) LỌT vào assignees (customfield_10700) — sai vai trò (task-142). Reviewer chỉ ở customfield_10900."
elif [ "$IS_SUBTASK" -eq 0 ] && [ "$NEED_TESTER" -eq 1 ] && case ",$REVIEWERS," in *",kenny,"*) true;; *) false;; esac; then
  # dev Task (reviewer kenny) → assignees phải có tester haptt
  if case ",$ASSIGNEES," in *",haptt,"*) true;; *) false;; esac; then
    pass 5 "role-hygiene OK (reviewer tách assignees; dev Task có tester haptt)"
  else
    fail 5 "dev Task (reviewer=kenny) nhưng assignees THIẾU tester haptt — assignees phải = [dev, haptt]"
  fi
else
  pass 5 "role-hygiene OK (reviewer không lọt assignees)"
fi

# J.6 (điều kiện) Description/comment có link PRD/UI khi task CÓ tài liệu đi kèm
if [ "$EXPECT_DOCLINK" -eq 1 ]; then
  DOC=$(grep -ioE 'https?://[^"[:space:]]*(gitlab|git\.avada\.net|notion\.so|drive\.google|docs\.google)[^"[:space:]]*' "$JSON" | head -3 || true)
  if [ -n "$DOC" ]; then
    pass 6 "có link PRD/UI: $(printf '%s' "$DOC" | tr '\n' ' ')"
  else
    fail 6 "task khai CÓ PRD/UI (--expect-doclink) nhưng description/comment KHÔNG có link GitLab/Notion/Drive"
  fi
else
  echo "J.6 SKIP - không yêu cầu doclink (task không có PRD/UI, hoặc chưa bật --expect-doclink)"
fi

# J.7 (điều kiện) Merge Request link phải nằm ở FIELD customfield_10800, KHÔNG nhét trong description.
#     PO chốt 2026-08-26: task [BA-Dev] tự code xong thì link MR đi vào field Merge Request để Jira/loop
#     đọc được; description chỉ mô tả việc. Trước đó đã lỡ dán link MR vào description (ca SB-16045).
if [ "$EXPECT_MR" -eq 1 ]; then
  MR_FIELD=$(jq -r "($F).customfield_10800 // \"\"" "$JSON" 2>/dev/null)
  MR_IN_DESC=$(jq -r "($F).description // \"\"" "$JSON" 2>/dev/null | grep -ioE 'https?://[^ "]*/-/merge_requests/[0-9]+' | head -2 | tr '\n' ' ' || true)
  if [ -z "$MR_FIELD" ] || [ "$MR_FIELD" = "null" ]; then
    fail 7 "field Merge Request (customfield_10800) RỖNG — link MR phải nằm ở field này, không phải description"
  elif ! printf '%s' "$MR_FIELD" | grep -qE '^https?://'; then
    fail 7 "field Merge Request = '$MR_FIELD' không phải URL hợp lệ"
  elif [ -n "$MR_IN_DESC" ]; then
    fail 7 "link MR còn nằm TRONG description ($MR_IN_DESC) — bỏ khỏi description, chỉ để ở field 10800"
  else
    pass 7 "Merge Request ở đúng field 10800 ($MR_FIELD), description sạch"
  fi
else
  echo "J.7 SKIP - task không kèm merge request (chưa bật --expect-mr)"
fi

# J.8 AI Agent — dev Task ([DEV]) PHẢI có customfield_11400 = kenny (PO chốt 2026-09-16).
#     Field userpicker ĐƠN (không phải array) → sai kiểu thì Jira bỏ qua âm thầm, task nhìn vẫn "tạo xong".
SUMMARY=$(jq -r "($F).summary // \"\"" "$JSON" 2>/dev/null)
IS_DEV=0
case "$SUMMARY" in \[DEV\]*) IS_DEV=1 ;; esac
if [ "$IS_DEV" -eq 0 ] && [ "$IS_SUBTASK" -eq 0 ] && case ",$REVIEWERS," in *",kenny,"*) true;; *) false;; esac; then
  IS_DEV=1   # fallback: Task không phải sub-task + reviewer kenny = dev task dù title lệch format
fi
if [ "$IS_DEV" -eq 1 ]; then
  AI_AGENT=$(jq -r "($F).customfield_11400 | if type==\"object\" then (.name // .displayName // .accountId // \"\") elif type==\"string\" then . else \"\" end" "$JSON" 2>/dev/null)
  if [ "$AI_AGENT" = "kenny" ]; then
    pass 8 "AI Agent (customfield_11400) = kenny"
  elif [ -z "$AI_AGENT" ] || [ "$AI_AGENT" = "null" ]; then
    fail 8 "dev Task nhưng field AI Agent (customfield_11400) RỖNG — phải = kenny (PO chốt 2026-09-16). Set bằng object đơn {\"name\":\"kenny\"}, KHÔNG phải array."
  else
    fail 8 "AI Agent (customfield_11400) = '$AI_AGENT', phải = kenny"
  fi
else
  echo "J.8 SKIP - không phải dev Task ([DEV]) → không cần AI Agent"
fi

echo "---"
if [ "$FAIL" -ne 0 ]; then echo "LENS-JIRA: FAIL → task CHƯA tạo xong, sửa field thiếu rồi verify lại"; exit 1; fi
echo "LENS-JIRA: PASS toàn bộ — field bắt buộc đầy đủ"; exit 0
