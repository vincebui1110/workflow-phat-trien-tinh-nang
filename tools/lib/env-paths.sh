#!/usr/bin/env bash
# env-paths.sh — MỘT chỗ duy nhất để script shell hỏi "gốc repo Avada nằm ở đâu".
#
# VÌ SAO (SYS #47, 31-08): trước đó mỗi script tự viết `: "${SHOPIFY_APP_DIR:=$HOME/dev/Shopify app}"`.
# Cái mặc định đó SAI trên CẢ HAI máy (ENV.sh: vince=$HOME/dev/shopify-app, avada=$HOME/Documents/Shopify app)
# và nó KHÔNG NỔ — chỉ lặng lẽ trỏ vào thư mục không tồn tại rồi `cd` fail / `[ -d ]` false,
# khiến script báo "không tìm thấy" và người đọc TIN.
#
# HAI LUẬT: (1) nguồn sự thật là ENV.sh, (2) resolve trượt thì KÊU ra stderr, không im.
#
# DÙNG (source, không exec):
#   . "$HOME/.claude/tools/lib/env-paths.sh"      # tự export SHOPIFY_APP_DIR + bạn bè
#   cd "$SHOPIFY_APP_DIR/cookie-bar"
# Soi nhanh:  bash ~/.claude/tools/lib/env-paths.sh

_ep_warn() { printf 'WARN [env-paths] %s\n' "$1" >&2; }

# 1) Nguồn sự thật: ENV.sh (chính nó là shell nên source thẳng được).
#    Biến đã có sẵn trong môi trường vẫn THẮNG — ENV.sh dùng `export VAR=...` nên sẽ ghi đè,
#    vì vậy giữ lại giá trị gọi-vào trước khi source rồi khôi phục.
_ep_preset="${SHOPIFY_APP_DIR:-}"
# shellcheck disable=SC1091
[ -f "$HOME/.claude/ENV.sh" ] && . "$HOME/.claude/ENV.sh"
[ -n "$_ep_preset" ] && SHOPIFY_APP_DIR="$_ep_preset"
unset _ep_preset

# 2) Nguồn phụ: ENV.md (một số tool cũ chỉ ghi ở đây).
if [ -z "${SHOPIFY_APP_DIR:-}" ] && [ -f "$HOME/.claude/ENV.md" ]; then
  SHOPIFY_APP_DIR=$(grep -oE '\*\*SHOPIFY_APP_DIR\*\*: `[^`]+`' "$HOME/.claude/ENV.md" 2>/dev/null \
    | sed -E 's/.*`([^`]+)`.*/\1/' | head -1)
fi

# 3) Ứng viên — CHỈ nhận cái CÓ THẬT trên đĩa. Đây là điểm khác cốt lõi so với hằng số cũ.
if [ -z "${SHOPIFY_APP_DIR:-}" ] || [ ! -d "${SHOPIFY_APP_DIR:-/nonexistent}" ]; then
  _ep_bad="${SHOPIFY_APP_DIR:-}"
  SHOPIFY_APP_DIR=""
  for _ep_c in "$HOME/dev/shopify-app" "$HOME/Documents/Shopify app" "$HOME/dev/Shopify app"; do
    if [ -d "$_ep_c" ]; then SHOPIFY_APP_DIR="$_ep_c"; break; fi
  done
  if [ -n "$SHOPIFY_APP_DIR" ] && [ -n "$_ep_bad" ]; then
    _ep_warn "SHOPIFY_APP_DIR=\"$_ep_bad\" KHÔNG tồn tại — dùng \"$SHOPIFY_APP_DIR\". Sửa ~/.claude/ENV.sh cho khớp máy này."
  elif [ -z "$SHOPIFY_APP_DIR" ]; then
    SHOPIFY_APP_DIR="${_ep_bad:-$HOME/dev/shopify-app}"
    _ep_warn "Không gốc Avada nào tồn tại (thử env/ENV.sh/ENV.md/ứng viên) — trả tạm \"$SHOPIFY_APP_DIR\". Kết quả phía sau có thể SAI."
  fi
  unset _ep_bad _ep_c
fi
export SHOPIFY_APP_DIR

# VAULT_DIR: KHÔNG chỉ ":=" — ENV.sh export `VAULT_DIR="$SHOPIFY_APP_DIR/vault"` NGAY LÚC SOURCE,
# tức nó đã mang giá trị dẫn xuất từ SHOPIFY_APP_DIR CŨ (sai) trước khi ta sửa gốc ở trên.
# ":=" thấy biến đã có nên bỏ qua ⇒ gốc được chữa mà vault vẫn trỏ path chết — đúng kiểu hỏng
# âm thầm mà lib này sinh ra để diệt. Đo được ở SYS#48 khi chạy thử dưới HOME giả layout máy avada:
#   SHOPIFY_APP_DIR = .../Documents/Shopify app  (tồn tại)
#   VAULT_DIR       = .../dev/shopify-app/vault  (KHÔNG tồn tại)   <-- lỗi
# Nên: có giá trị mà KHÔNG tồn tại thì thử lại theo gốc đã chữa; vẫn trượt thì kêu.
: "${VAULT_DIR:=$SHOPIFY_APP_DIR/vault}"
if [ ! -d "$VAULT_DIR" ] && [ -d "$SHOPIFY_APP_DIR/vault" ]; then
  _ep_warn "VAULT_DIR=\"$VAULT_DIR\" KHÔNG tồn tại — dùng \"$SHOPIFY_APP_DIR/vault\" (dẫn lại từ gốc đã chữa)."
  VAULT_DIR="$SHOPIFY_APP_DIR/vault"
fi
export VAULT_DIR
: "${SECRETS_FILE:=$SHOPIFY_APP_DIR/.env.secrets}"; export SECRETS_FILE
: "${CLAUDE_DIR:=$HOME/.claude}"; export CLAUDE_DIR

# Chạy trực tiếp (không source) => in ra để soi.
if [ "${BASH_SOURCE[0]:-$0}" = "$0" ]; then
  printf 'SHOPIFY_APP_DIR = %s  %s\n' "$SHOPIFY_APP_DIR" "$([ -d "$SHOPIFY_APP_DIR" ] && echo '(tồn tại)' || echo '(KHÔNG tồn tại)')"
  printf 'VAULT_DIR       = %s  %s\n' "$VAULT_DIR" "$([ -d "$VAULT_DIR" ] && echo '(tồn tại)' || echo '(KHÔNG tồn tại)')"
fi
