#!/usr/bin/env node
/**
 * push-evidence.js — TÍNH bằng chứng push cho từng FILE deliverable (t165, 14-09).
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO CÓ TỆP NÀY
 *
 * Run Flow 0 `FF-gdpr-compliance-block` ghi `logistics DONE · GitLab 977d33b4`. Commit đó là
 * `docs(KB): daily update 2026-09-11`, chạm đúng một file `docs/KB_FF.md`, KHÔNG liên quan GDPR —
 * nó chỉ tình cờ là **HEAD của nhánh**. Commit thật mang PRD là `e7b4b272` (09-09). Tức lượt 13:00
 * **không đẩy gì mới** (tài liệu đã nằm sẵn trên nhánh) nhưng vẫn ghi một commit-id như thể vừa đẩy.
 *
 * Gốc bệnh KHÔNG phải agent cẩu thả: chuỗi `--result` là thứ agent **tự soạn tay**, và không có gì
 * trong hệ tính ra nó. Một lời dặn "nhớ ghi đúng commit" thì vẫn là hy vọng, không phải cơ chế.
 * Nên tệp này biến nó thành **phép tính từ chính repo**: hỏi git commit NÀO chạm ĐÚNG file đó, và
 * commit ấy đã lên remote chưa. HEAD không bao giờ được dùng làm bằng chứng.
 *
 * Hai ca PHẢI phân biệt được — gộp lại là đẻ provenance sai IM LẶNG (3 tháng sau truy "PRD lên
 * GitLab lúc nào" ra ngày sai, mà không có dấu hiệu nào để nghi):
 *   ✅ PUSHED          — lượt này đẩy thật (commit chạm file MỚI hơn mốc bắt đầu run + có trên remote)
 *   ⚪ NO_PUSH_NEEDED  — không có gì để đẩy, tài liệu đã có sẵn từ <commit> <ngày>
 * Và hai ca hỏng THẬT, phải chặn Phase 5 báo DONE:
 *   🔴 MISSING         — không commit nào trên nhánh chạm file này ⇒ deliverable CHƯA hề lên
 *   🔴 LOCAL_ONLY      — có commit ở local nhưng CHƯA lên remote ⇒ "đã push" là sai
 *
 * DÙNG:
 *   node tools/push-evidence.js --repo <path> --branch feature/document \
 *        --since 2026-09-14T06:07:36Z --files docs/PRD/X.md docs/Research/Y.md [--json] [--quiet]
 *
 * EXIT: 0 nếu mọi file PUSHED/NO_PUSH_NEEDED · 1 nếu có MISSING/LOCAL_ONLY (Phase 5 KHÔNG được
 * báo DONE) · 0 kèm ⚪ BLIND nếu không đọc được repo/nhánh (không đọc được ≠ đã hỏng).
 */
'use strict';
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = n => argv.includes('--' + n);
const listFlag = n => {
  const i = argv.indexOf('--' + n); if (i < 0) return [];
  const out = []; for (let k = i + 1; k < argv.length && !argv[k].startsWith('--'); k++) out.push(argv[k]);
  return out;
};

const REPO = flag('repo', process.cwd());
const BRANCH = flag('branch', 'feature/document');
const SINCE = flag('since');
const FILES = listFlag('files');
const TAG = 'PUSH-EV:';

function gitOrNull(args) {
  try { return execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch { return null; }
}

if (!FILES.length) {
  console.log('dùng: push-evidence.js --repo <path> --branch <br> --since <ISO> --files <f1> <f2>…');
  process.exit(0);
}

// Van mù: không phải git repo, hoặc nhánh remote không tồn tại ⇒ KHÔNG phán.
// "Không đọc được" khác "đọc được và thấy hỏng" — nhập hai cái làm một là đẻ báo động oan,
// mà thước kêu oan thì người đọc học cách lướt (SYS #54).
if (gitOrNull(['rev-parse', '--git-dir']) === null) {
  console.log(`${TAG} ⚪ BLIND — \`${REPO}\` không phải git repo ⇒ KHÔNG phán`);
  process.exit(0);
}
const REMOTE = `origin/${BRANCH}`;
if (gitOrNull(['rev-parse', '--verify', '--quiet', REMOTE]) === null) {
  console.log(`${TAG} ⚪ BLIND — không có ref \`${REMOTE}\` (chưa fetch?) ⇒ KHÔNG phán`);
  process.exit(0);
}

const sinceMs = SINCE ? Date.parse(SINCE) : null;

/** Commit CUỐI CÙNG chạm đúng file này trên một ref. `null` = ref đó chưa từng có file. */
function lastTouch(ref, file) {
  const out = gitOrNull(['log', '-1', '--format=%H%x1f%h%x1f%cI%x1f%s', ref, '--', file]);
  if (!out) return null;
  const [full, short, iso, subject] = out.split('\x1f');
  return { full, short, iso, subject, date: iso.slice(0, 10) };
}

// So với **nhánh local CÙNG TÊN**, KHÔNG phải `HEAD`. Repo app là submodule nên HEAD thường đang ở
// một nhánh khác hẳn (hoặc detached); lấy HEAD làm "bản local của feature/document" thì mọi commit
// của nhánh kia đều không phải tổ tiên của remote ⇒ thước hô LOCAL_ONLY cho file ĐÃ NẰM TRÊN REMOTE.
// Đã dính đúng lỗi này ở lượt RUN-TEST đầu (2 file GDPR bị vu "chưa push" trong khi có từ e7b4b272).
// Không có nhánh local cùng tên = không có việc local nào để mà "chưa đẩy" ⇒ phán thuần trên remote.
const LOCAL_REF = gitOrNull(['rev-parse', '--verify', '--quiet', `refs/heads/${BRANCH}`]) ? BRANCH : null;

const rows = [];
for (const f of FILES) {
  const remote = lastTouch(REMOTE, f);
  const local = LOCAL_REF ? lastTouch(LOCAL_REF, f) : null;
  if (!remote && !local) { rows.push({ file: f, verdict: 'MISSING', detail: `không commit nào trên \`${BRANCH}\` (remote lẫn local) chạm file này` }); continue; }
  // Câu hỏi ĐÚNG là "có việc local MỚI HƠN bản trên remote mà chưa đẩy không" — không phải
  // "commit local có nằm trong lịch sử remote không". Nhánh docs hay PHÂN KỲ (đo thật: local
  // 3 ahead / 23 behind), nên commit local cho một file thường là bản CŨ nằm ngoài lịch sử remote
  // dù remote đã có bản mới hơn. Hỏi sai câu thì mọi file như thế đều bị vu "chưa push" — thước
  // kêu oan ngay lượt RUN-TEST đầu, và đó là cách nhanh nhất để một cái cổng bị tắt (SYS #54).
  if (local && (!remote || Date.parse(local.iso) > Date.parse(remote.iso))) {
    const onRemote = gitOrNull(['merge-base', '--is-ancestor', local.full, REMOTE]) !== null;
    if (!onRemote) { rows.push({ file: f, verdict: 'LOCAL_ONLY', sha: local.short, date: local.date, detail: `commit \`${local.short}\` (${local.date}) MỚI hơn bản trên \`${REMOTE}\` mà chưa đẩy — "đã push" là sai` }); continue; }
  }
  const c = remote || local;
  // Mốc so là lúc BẮT ĐẦU run. Không khai `--since` thì không có cách nào biết commit này do lượt
  // NÀY đẻ ra hay đã nằm sẵn ⇒ nói thẳng là không phán được, đừng đoán về phía "vừa push".
  if (sinceMs === null) { rows.push({ file: f, verdict: 'UNDATED', sha: c.short, date: c.date, detail: `commit \`${c.short}\` (${c.date}) — thiếu \`--since\` nên KHÔNG biết lượt này có đẩy gì không` }); continue; }
  if (Date.parse(c.iso) >= sinceMs) rows.push({ file: f, verdict: 'PUSHED', sha: c.short, date: c.date, detail: `\`${c.short}\` (${c.date}) — ${c.subject}` });
  else rows.push({ file: f, verdict: 'NO_PUSH_NEEDED', sha: c.short, date: c.date, detail: `đã có từ \`${c.short}\` ${c.date} — lượt này không có gì để đẩy` });
}

const ICON = { PUSHED: '✅', NO_PUSH_NEEDED: '⚪', UNDATED: '⚪', MISSING: '🔴', LOCAL_ONLY: '🔴' };
const BAD = rows.filter(r => r.verdict === 'MISSING' || r.verdict === 'LOCAL_ONLY');

/** Chuỗi 1 dòng để dán vào `ckpt … --result`. **Không bao giờ chứa HEAD.** */
function summary() {
  const parts = [];
  const pushed = rows.filter(r => r.verdict === 'PUSHED');
  const kept = rows.filter(r => r.verdict === 'NO_PUSH_NEEDED');
  if (pushed.length) parts.push(`PUSHED ${pushed.length} file @ ${[...new Set(pushed.map(r => r.sha))].join(',')}`);
  if (kept.length) parts.push(`NO_PUSH_NEEDED ${kept.length} file (đã có từ ${[...new Set(kept.map(r => `${r.sha} ${r.date}`))].join('; ')})`);
  for (const b of BAD) parts.push(`${b.verdict} ${b.file}`);
  return `GitLab ${BRANCH}: ${parts.join(' · ') || 'không file nào'}`;
}

if (has('json')) { console.log(JSON.stringify({ branch: BRANCH, since: SINCE || null, rows, summary: summary(), ok: BAD.length === 0 }, null, 2)); process.exit(BAD.length ? 1 : 0); }
if (!has('quiet')) {
  for (const r of rows) console.log(`  ${ICON[r.verdict]} ${r.verdict}  ${r.file}\n       ${r.detail}`);
}
console.log(`${TAG} ${summary()}`);
process.exit(BAD.length ? 1 : 0);
