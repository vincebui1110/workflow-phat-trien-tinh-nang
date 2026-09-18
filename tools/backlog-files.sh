#!/usr/bin/env bash
# backlog-files.sh — resolver BACKLOG (danh sách tính năng đã xếp bucket) cho skill /roadmap + /delivery-plan.
# Anh em với brief-files.sh (mô tả dự án) và looptasks-files.sh (việc vặt) — CÙNG map $PROJECT_DIRS.
#
# Đích theo loại dự án:
#   app Avada (CB OL AC AV FF WF) → "<dự án>/docs/Feature Backlog/List feature.md"   (vị trí lịch sử, giữ nguyên)
#   dự án khác                    → "<dự án>/docs/BACKLOG.md"
#
#   backlog-files.sh resolve <CODE>  → in path backlog (kể cả chưa tồn tại). rc=1 nếu CODE lạ.
#   backlog-files.sh all|list|missing|codes  → như brief-files.sh
set -uo pipefail
source "$HOME/.claude/ENV.sh" 2>/dev/null || { echo "ENV.sh không source được" >&2; exit 2; }
MAP="${PROJECT_DIRS:-}"
[ -n "$MAP" ] || { echo "thiếu PROJECT_DIRS trong ENV.sh" >&2; exit 2; }
AVADA_APPS=" CB OL AC AV FF WF "

_pairs() { printf '%s\n' "$MAP" | tr ';' '\n' | sed '/^$/d'; }
_path() { # $1=CODE $2=dir
  case "$AVADA_APPS" in
    *" $1 "*) printf '%s/docs/Feature Backlog/List feature.md\n' "$2" ;;
    *)        printf '%s/docs/BACKLOG.md\n' "$2" ;;
  esac
}

case "${1:-list}" in
  codes) _pairs | cut -d= -f1 ;;
  all)   _pairs | while IFS='=' read -r c d; do printf '%s\t%s\n' "$c" "$(_path "$c" "$d")"; done ;;
  resolve)
    code="${2:?cần CODE, vd: resolve FF}"
    hit="$(_pairs | awk -F= -v c="$code" '$1==c{print $2; exit}')"
    [ -n "$hit" ] || { echo "CODE lạ: $code (xem: backlog-files.sh codes)" >&2; exit 1; }
    _path "$code" "$hit" ;;
  list)
    _pairs | while IFS='=' read -r c d; do
      f="$(_path "$c" "$d")"; [ -f "$f" ] || continue
      printf '%s\t%s\t%s\t%s\n' "$c" "$f" "$(wc -l < "$f" | tr -d ' ')" "$(date -r "$f" '+%Y-%m-%d' 2>/dev/null)"
    done ;;
  missing)
    _pairs | while IFS='=' read -r c d; do
      [ -d "$d" ] || continue
      f="$(_path "$c" "$d")"; [ -f "$f" ] || printf '%s\t%s\n' "$c" "$f"
    done ;;
  *) echo "dùng: $0 {resolve <CODE>|all|list|missing|codes}" >&2; exit 2 ;;
esac
