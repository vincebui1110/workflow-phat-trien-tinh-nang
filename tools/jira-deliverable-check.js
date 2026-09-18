#!/usr/bin/env node
/**
 * jira-deliverable-check.js — ĐỌC NGƯỢC TỪ JIRA xem Phase 5 đã đẻ ĐỦ task chưa (t166, 14-09).
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO CÓ TỆP NÀY
 *
 * `flow-5-logistics.md` khai Phase 5 tạo HAI thứ: Dev Task `[DEV][{app}]` và BA Sub-task
 * `[BA][{app}]`. Run `FF-gdpr-compliance-block` lượt 13:00 chỉ đẻ **một** (`SB-16794`), rồi vẫn tự
 * chấm `logistics DONE`. Không thước nào kêu; PO phát hiện bằng cách hỏi tay list task của run.
 *
 * Soi ledger thì thấy chỗ lệch KHÔNG nằm ở pc-agent làm hụt, mà ở chỗ **bản kế hoạch của chính run
 * đã hụt từ trước**: dòng `logistics WAIT_HUMAN` (10-09) tự khai việc còn lại là *"tao Jira dev task
 * (assign haptt)"* — SỐ ÍT. Doc nói 2, plan nói 1, kết quả ra 1, và `--result` là chuỗi **tự soạn
 * tay** nên nó khớp với plan hụt một cách hoàn hảo. Cùng gốc bệnh t165: **không có gì TÍNH ra lời
 * khai, nên lời khai chỉ phản chiếu cái agent đang nghĩ, không phản chiếu cái thật sự tồn tại.**
 * Thêm một câu "TUYỆT ĐỐI KHÔNG bỏ qua BA Sub-task" vào doc là vá đúng chỗ nhưng **vẫn chỉ là lời
 * dặn** — đọc lại chính cái doc ấy vẫn không sinh ra một phép kiểm nào.
 *
 * Nên tệp này hỏi Jira: với tính năng này, **thật sự** có những issue nào mang tiền tố deliverable?
 *
 * PHÁN QUYẾT:
 *   ✅ COMPLETE      — đủ mọi vai khai ở `--expect`
 *   🔴 MISSING       — thiếu vai nào đó ⇒ Phase 5 **FAILED**, không được ghi DONE
 *   🔴 BA_NO_PARENT  — BA có mặt nhưng không phải Sub-task dưới parent log tháng (đúng luật
 *                      /avada-task-manager) ⇒ vẫn là hụt, chỉ hụt ở tầng khác
 *   ⚪ BLIND         — không hỏi được Jira (thiếu credential / lỗi mạng). KHÔNG phán.
 *                      "Không đọc được" ≠ "đọc được và thấy thiếu" — nhập hai cái là đẻ báo động
 *                      oan, mà thước kêu oan thì người ta học cách lướt (SYS #54).
 *
 * DÙNG:
 *   node tools/jira-deliverable-check.js --app FF --feature "GDPR Compliance block" [--expect dev,ba]
 *   [--json] [--quiet]
 * EXIT: 0 khi ✅ hoặc ⚪ BLIND · 1 khi có 🔴.
 *
 * ĐỌC-ONLY. Tệp này KHÔNG tạo/sửa gì trên Jira — mọi thao tác GHI Jira vẫn bắt buộc qua `pc-agent`
 * + `/avada-task-manager` (luật CLAUDE.md). Nó cũng không bao giờ in credential ra output.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = n => argv.includes('--' + n);

const APP = (flag('app') || '').toUpperCase();
const FEATURE = flag('feature') || '';
const EXPECT = (flag('expect', 'dev,ba')).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const TAG = 'JIRA-DLV:';

if (!APP || !FEATURE) {
  console.log('dùng: jira-deliverable-check.js --app FF --feature "<tên tính năng>" [--expect dev,ba] [--json] [--quiet]');
  process.exit(0);
}

/** Nạp secret IM LẶNG. Không in, không log, không đưa vào bất kỳ output nào. */
function loadSecrets() {
  for (const f of [
    path.join(process.env.HOME || '', 'dev/Shopify app/Others/.env.secrets'),
    path.join(process.env.HOME || '', 'dev/Shopify app/.env.secrets'),
  ]) {
    if (!fs.existsSync(f)) continue;
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = l.match(/^export\s+(\w+)=['"]?(.*?)['"]?\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  }
}

/**
 * Lấy issue ứng viên. `JDC_FIXTURE` thay Jira bằng một file JSON — đó là móc để regression chạy
 * được mà KHÔNG chạm hệ thật (test đụng Jira thật vừa chậm vừa có thể đẻ nhiễu cho team).
 * Trả `null` = KHÔNG HỎI ĐƯỢC (khác với "hỏi được và rỗng").
 */
async function fetchIssues() {
  if (process.env.JDC_FIXTURE) {
    try { return JSON.parse(fs.readFileSync(process.env.JDC_FIXTURE, 'utf8')); }
    catch { return null; }
  }
  loadSecrets();
  const user = process.env.JIRA_USERNAME || process.env.ATLASSIAN_USERNAME;
  const pass = process.env.JIRA_PASSWORD || process.env.ATLASSIAN_PASSWORD || process.env.JIRA_TOKEN;
  if (!user || !pass) return null;
  let JiraClient;
  try { JiraClient = require(path.join(process.env.HOME, 'dev/Shopify app/Others/node_modules/jira-client')); }
  catch { try { JiraClient = require('jira-client'); } catch { return null; } }
  const jira = new JiraClient({
    protocol: 'https', host: process.env.JIRA_HOST || 'space.avada.net',
    username: user, password: pass, apiVersion: '2', strictSSL: true,
  });
  const jql = `project = SB AND summary ~ "${FEATURE.replace(/"/g, '')}" ORDER BY created DESC`;
  try {
    const r = await jira.searchJira(jql, { maxResults: 50, fields: ['summary', 'issuetype', 'parent', 'created'] });
    return (r.issues || []).map(i => ({
      key: i.key, summary: i.fields.summary || '',
      issueType: (i.fields.issuetype && i.fields.issuetype.name) || '',
      parent: (i.fields.parent && i.fields.parent.key) || null,
    }));
  } catch { return null; }
}

/** Khớp theo TIỀN TỐ CÓ CẤU TRÚC `[DEV][FF]`, không khớp văn xuôi — cùng lý do với `gate:T3`
 *  của t145: lối thoát dễ nhất khỏi một cái cổng là viết cho nó nghe lọt tai. */
const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
function pick(issues, role) {
  const pre = `[${role.toUpperCase()}][${APP}]`;
  const f = norm(FEATURE);
  return issues.filter(i => norm(i.summary).startsWith(norm(pre)) && norm(i.summary).includes(f));
}

(async () => {
  const issues = await fetchIssues();
  if (issues === null) {
    console.log(`${TAG} ⚪ BLIND — không hỏi được Jira (thiếu credential hoặc lỗi mạng) ⇒ KHÔNG phán`);
    process.exit(0);
  }
  const rows = [];
  for (const role of EXPECT) {
    const hits = pick(issues, role);
    if (!hits.length) { rows.push({ role, verdict: 'MISSING', detail: `không có issue nào mang tiền tố \`[${role.toUpperCase()}][${APP}]\` cho tính năng này` }); continue; }
    const it = hits[0];
    // BA phải là Sub-task dưới parent log tháng (/avada-task-manager). Có mặt mà sai hình dạng
    // vẫn là hụt — chỉ là hụt ở tầng khác, và tầng đó mới là chỗ nó bị lạc khỏi log tháng.
    if (role === 'ba' && (it.issueType !== 'Sub-task' || !it.parent)) {
      rows.push({ role, key: it.key, verdict: 'BA_NO_PARENT', detail: `\`${it.key}\` là **${it.issueType || 'không rõ type'}**${it.parent ? '' : ', KHÔNG có parent'} — BA phải là Sub-task dưới parent log tháng` });
      continue;
    }
    rows.push({ role, key: it.key, verdict: 'OK', detail: `\`${it.key}\` ${it.issueType}${it.parent ? ` (parent ${it.parent})` : ''}` });
  }
  const BAD = rows.filter(r => r.verdict !== 'OK');
  const ICON = { OK: '✅', MISSING: '🔴', BA_NO_PARENT: '🔴' };
  const summary = BAD.length
    ? `THIẾU ${BAD.map(r => `${r.role.toUpperCase()}:${r.verdict}`).join(' · ')} — Phase 5 FAILED, KHÔNG ghi DONE`
    : `Jira ĐỦ ${rows.length} vai: ${rows.map(r => `${r.role.toUpperCase()} ${r.key}`).join(' · ')}`;
  if (has('json')) { console.log(JSON.stringify({ app: APP, feature: FEATURE, rows, summary, ok: !BAD.length }, null, 2)); process.exit(BAD.length ? 1 : 0); }
  if (!has('quiet')) for (const r of rows) console.log(`  ${ICON[r.verdict]} ${r.role.toUpperCase().padEnd(3)} ${r.verdict}  ${r.detail}`);
  console.log(`${TAG} ${summary}`);
  process.exit(BAD.length ? 1 : 0);
})();
