#!/usr/bin/env bash
# roadmap-files.sh — resolver ROADMAP (`<dự án>/docs/ROADMAP.md`) cho skill /roadmap.
# Tầng PO sở hữu: BRIEF (là gì) → BACKLOG (bucket ưu tiên) → ROADMAP (quý nào làm bucket nào).
#
#   roadmap-files.sh resolve <CODE> | all | list | missing | ensure <CODE> | codes
set -uo pipefail
source "$HOME/.claude/ENV.sh" 2>/dev/null || { echo "ENV.sh không source được" >&2; exit 2; }
MAP="${PROJECT_DIRS:-}"
[ -n "$MAP" ] || { echo "thiếu PROJECT_DIRS trong ENV.sh" >&2; exit 2; }
TEMPLATE="$HOME/.claude/templates/roadmap-project.md"

_pairs() { printf '%s\n' "$MAP" | tr ';' '\n' | sed '/^$/d'; }
_path()  { printf '%s/docs/ROADMAP.md\n' "$1"; }

case "${1:-list}" in
  codes) _pairs | cut -d= -f1 ;;
  all)   _pairs | while IFS='=' read -r c d; do printf '%s\t%s\n' "$c" "$(_path "$d")"; done ;;
  resolve)
    code="${2:?cần CODE, vd: resolve FF}"
    hit="$(_pairs | awk -F= -v c="$code" '$1==c{print $2; exit}')"
    [ -n "$hit" ] || { echo "CODE lạ: $code (xem: roadmap-files.sh codes)" >&2; exit 1; }
    _path "$hit" ;;
  list)
    _pairs | while IFS='=' read -r c d; do
      f="$(_path "$d")"; [ -f "$f" ] || continue
      printf '%s\t%s\t%s\t%s\n' "$c" "$f" "$(wc -l < "$f" | tr -d ' ')" "$(date -r "$f" '+%Y-%m-%d' 2>/dev/null)"
    done ;;
  missing)
    _pairs | while IFS='=' read -r c d; do
      [ -d "$d" ] || continue
      f="$(_path "$d")"; [ -f "$f" ] || printf '%s\t%s\n' "$c" "$f"
    done ;;
  ensure)
    code="${2:?cần CODE, vd: ensure FF}"
    f="$("$0" resolve "$code")" || exit 1
    d="$(dirname "$f")"; proj="$(dirname "$d")"
    [ -d "$proj" ] || { echo "thư mục dự án không tồn tại: $proj" >&2; exit 1; }
    mkdir -p "$d" || exit 1
    if [ ! -f "$f" ]; then
      [ -f "$TEMPLATE" ] || { echo "thiếu template: $TEMPLATE" >&2; exit 2; }
      name="$(awk -F'|' -v c="$code" '$2 ~ ("^ *" c " *$") {gsub(/^ +| +$/,"",$3); print $3; exit}' "$HOME/.claude/PROJECTS.md" 2>/dev/null)"
      [ -n "$name" ] || name="$code"
      sed -e "s|{{CODE}}|$code|g" -e "s|{{NAME}}|$name|g" -e "s|{{DATE}}|$(date '+%Y-%m-%d')|g" "$TEMPLATE" > "$f"
    fi
    printf '%s\n' "$f" ;;
  *) echo "dùng: $0 {resolve <CODE>|all|list|missing|ensure <CODE>|codes}" >&2; exit 2 ;;
esac
