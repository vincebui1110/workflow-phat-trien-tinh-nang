'use strict';
/**
 * env-paths.js — MỘT chỗ duy nhất để code Node hỏi "gốc repo Avada nằm ở đâu".
 *
 * VÌ SAO CÓ FILE NÀY (SYS #47, 31-08). Trước đó mỗi tool tự viết lại 1 dòng:
 *     process.env.SHOPIFY_APP_DIR || path.join(HOME, 'dev', 'Shopify app')
 * Cái fallback đó SAI trên CẢ HAI máy (`ENV.sh`: máy vince = `$HOME/dev/shopify-app`,
 * máy avada = `$HOME/Documents/Shopify app`) — nó là tàn dư của layout đã bỏ.
 *
 * Nguy ở chỗ nó KHÔNG NỔ. Tool được gọi bằng `node ~/.claude/tools/x.js` — KHÔNG ai
 * `source ENV.sh` trước — nên biến vắng, fallback trả về một thư mục không tồn tại, rồi
 * mọi phép `fs.existsSync` phía sau đều false và tool bình thản báo "không tìm thấy".
 * Người đọc thấy con số đỏ và TIN. Đo được ở `looptasks-verify.js`: 6 task 🟡 "hiện vật có
 * vấn đề" → còn 4 khi set đúng biến, tức 2 task bị vu oan bởi chính cái thước.
 *
 * HAI LUẬT của file này:
 *   1. Nguồn sự thật là `ENV.sh` (per-máy), KHÔNG phải hằng số trong code.
 *   2. Không bao giờ trả path chết TRONG IM LẶNG — resolve trượt thì kêu ra stderr.
 *      Đây mới là phần chữa bệnh; sửa chuỗi chỉ là vá triệu chứng.
 *
 * DÙNG:
 *   const { shopifyRoot, envVar } = require('<...>/lib/env-paths');
 *   const SHOPIFY = shopifyRoot();
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const CLAUDE = path.join(HOME, '.claude');

// Layout đã từng/đang tồn tại của gốc repo Avada, dùng khi ENV.sh lẫn ENV.md đều vắng.
// Chỉ chọn ứng viên NÀO CÓ THẬT trên đĩa — đó là điểm khác cốt lõi so với hằng số cũ.
const SHOPIFY_CANDIDATES = [
  path.join(HOME, 'dev', 'shopify-app'), // máy vince
  path.join(HOME, 'Documents', 'Shopify app'), // máy avada
  path.join(HOME, 'dev', 'Shopify app'), // layout cũ, giữ để không gãy máy chưa migrate
];

const warned = new Set();
function warnOnce(msg) {
  if (warned.has(msg)) return;
  warned.add(msg);
  // stderr, KHÔNG stdout: nhiều tool có stdout bị parse (json/dòng đơn).
  process.stderr.write(`WARN [env-paths] ${msg}\n`);
}

/** Nở `$HOME`, `${HOME}`, `$VAR`, `${VAR}` theo bảng biến đã biết. */
function expand(value, vars) {
  let out = String(value);
  for (let i = 0; i < 5 && /\$/.test(out); i++) {
    out = out.replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (m, name) => {
      if (name === 'HOME') return HOME;
      if (Object.prototype.hasOwnProperty.call(vars, name)) return vars[name];
      if (process.env[name]) return process.env[name];
      return m; // không biết thì để nguyên, đừng nuốt thành chuỗi rỗng
    });
  }
  return out.replace(/^~(?=\/|$)/, HOME);
}

let _envSh = null;
/** Đọc `ENV.sh` bằng regex (KHÔNG spawn bash: lib này bị gọi trong hook, phải rẻ + không side effect). */
function envShVars() {
  if (_envSh) return _envSh;
  const vars = {};
  try {
    const text = fs.readFileSync(path.join(CLAUDE, 'ENV.sh'), 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let raw = m[2].trim().replace(/\s+#.*$/, '');
      if (/^"(.*)"$/.test(raw) || /^'(.*)'$/.test(raw)) raw = raw.slice(1, -1);
      vars[m[1]] = expand(raw, vars);
    }
  } catch {
    /* ENV.sh vắng ⇒ rơi xuống ENV.md rồi ứng viên */
  }
  _envSh = vars;
  return vars;
}

let _envMd = null;
/** Đọc `ENV.md` (`- **VAR**: \`giá trị\``) — nguồn phụ, vì một số tool cũ vẫn ghi ở đây. */
function envMdVars() {
  if (_envMd) return _envMd;
  const vars = {};
  try {
    const text = fs.readFileSync(path.join(CLAUDE, 'ENV.md'), 'utf8');
    for (const m of text.matchAll(/\*\*([A-Za-z_][A-Za-z0-9_]*)\*\*:\s*`([^`]+)`/g)) {
      if (!vars[m[1]]) vars[m[1]] = expand(m[2], vars);
    }
  } catch {
    /* không sao, đây là nguồn phụ */
  }
  _envMd = vars;
  return vars;
}

/**
 * Lấy 1 biến path theo thứ tự: biến môi trường > ENV.sh > ENV.md > ứng viên CÓ THẬT.
 * @param {string} name
 * @param {{candidates?: string[], mustExist?: boolean}} [opts]
 *   mustExist=true (mặc định cho path): resolve xong mà thư mục/file không tồn tại thì CẢNH BÁO.
 */
function envVar(name, opts = {}) {
  const { candidates = [], mustExist = true } = opts;
  const pick = (v, src) => ({ value: v, source: src });

  let got = null;
  if (process.env[name]) got = pick(process.env[name], 'process.env');
  if (!got && envShVars()[name]) got = pick(envShVars()[name], 'ENV.sh');
  if (!got && envMdVars()[name]) got = pick(envMdVars()[name], 'ENV.md');

  if (got && (!mustExist || fs.existsSync(got.value))) return got.value;

  const alive = candidates.find((c) => fs.existsSync(c));
  if (alive) {
    if (got) {
      warnOnce(
        `${name}="${got.value}" (từ ${got.source}) KHÔNG tồn tại — dùng ứng viên có thật "${alive}". ` +
          `Sửa ~/.claude/ENV.sh cho khớp máy này.`
      );
    }
    return alive;
  }

  if (got) {
    warnOnce(`${name}="${got.value}" (từ ${got.source}) KHÔNG tồn tại và không ứng viên nào sống. Kết quả phía sau có thể SAI.`);
    return got.value;
  }
  const guess = candidates[0] || '';
  warnOnce(`${name} không khai ở env/ENV.sh/ENV.md và không ứng viên nào tồn tại — trả tạm "${guess}". Kết quả phía sau có thể SAI.`);
  return guess;
}

/** Gốc superproject chứa 6 repo app Avada + vault/. */
function shopifyRoot() {
  return envVar('SHOPIFY_APP_DIR', { candidates: SHOPIFY_CANDIDATES });
}

/** Vault Obsidian (mặc định nằm trong gốc Avada). */
function vaultDir() {
  return envVar('VAULT_DIR', { candidates: [path.join(shopifyRoot(), 'vault')] });
}

module.exports = { HOME, CLAUDE, shopifyRoot, vaultDir, envVar, envShVars, envMdVars, SHOPIFY_CANDIDATES };

// Chạy trực tiếp để soi: `node ~/.claude/tools/lib/env-paths.js`
if (require.main === module) {
  const root = shopifyRoot();
  console.log(`SHOPIFY_APP_DIR = ${root}  ${fs.existsSync(root) ? '(tồn tại)' : '(KHÔNG tồn tại)'}`);
  const v = vaultDir();
  console.log(`VAULT_DIR       = ${v}  ${fs.existsSync(v) ? '(tồn tại)' : '(KHÔNG tồn tại)'}`);
}
