#!/usr/bin/env node
/*
 * journal.js — Resume-on-crash journal (A100, port từ hermes session-DB append-only).
 *
 * VÌ SAO CẦN (triết lý hermes): persist TRƯỚC mỗi step + DONE ngay SAU; resume nhận diện
 * step đã-xong bằng NỘI DUNG (join-key) — KHÔNG bằng số thứ tự. Đúng pattern
 * join-key anh đã dùng cho Multica title, hạ xuống cấp step trong 1 run.
 *
 * Journal = 1 file JSONL append-only: ~/.claude/runs/<loop>/<run-id>.jsonl
 * Mỗi dòng: {ts, key, status:"STARTED"|"DONE", note}
 *
 * CẢNH BÁO idempotency (bắt buộc để KHÔNG double-post):
 *   Với step có side-effect KHÔNG idempotent (post Slack, tạo Jira, gửi DM):
 *   - key PHẢI mã hoá nội dung định danh (vd "slack:<channel>:<content-hash>"),
 *   - GỌI `is-done` NGAY TRƯỚC side-effect; nếu done → SKIP,
 *   - gọi `done` NGAY SAU side-effect (dòng kế tiếp), không xen việc khác.
 *   Step idempotent (ghi đè file report/KB) thì an toàn kể cả chạy lại.
 *
 * DÙNG:  node journal.js <subcommand> ...
 *   start   <loop> <run-id> <key> [note]   ghi STARTED (trước khi làm step)
 *   done    <loop> <run-id> <key> [note]   ghi DONE (ngay sau khi xong step)
 *   is-done <loop> <run-id> <key>          exit 0 nếu key đã DONE, else exit 1
 *   pending <loop> <run-id>                in các key STARTED-chưa-DONE (dở dang)
 *   status  <loop> <run-id>                in tóm tắt (done/pending/total)
 *   prune   <loop> [--days N]              xoá journal cũ hơn N ngày (mặc định 30)
 *   next-id [--state <path>] [--spawned-by <src>]  cấp A-id DUY NHẤT (max+1) + in sẵn segment ⛓ — gọi TRƯỚC khi thêm row
 *   graph   [--state <path>] [--ledger <path>] [--dangling]   dựng đồ thị task↔decision (chỉ đọc spine)
 *   edge    <A##> <key:value> [...]        GHI edge ⛓ vào dòng STATE của mình (A47 — tool hoá, đừng gõ tay)
 *
 *   -- Run-ledger (A100 §③a: autopilot tần-suất-cao log ở đây thay vì bảng STATE ACTIVE) --
 *   run-log    <loop> <status> [--task A##] <summary...>  append run-summary vào runs/<loop>/ledger.jsonl
 *                                            --task ⇒ TỰ stamp ⛓ spawned_by:<loop> lên dòng STATE đó (A47)
 *                                            status: clean | action | escalate | error
 *
 *   ⚠️ QUY ƯỚC STATUS — NGUỒN SỰ THẬT DUY NHẤT (t312, chốt 2026-08-19). Mọi caller theo đây:
 *     • `action`  = lượt này đẻ ra **KẾT QUẢ THẬT**: tìm ĐƯỢC thứ đang tìm, tạo/sửa/đẩy được
 *                   artifact, mở ticket, escalate. Tiêu chí: **có nội dung mới đáng cho người đọc**.
 *     • `clean`   = chạy xong, **KHÔNG có kết quả**: quét mà không thấy gì, 0 case, 0 signal.
 *     • `escalate`= cần người quyết ngay.   • `error` = chạy hỏng.
 *
 *   ❗ Bẫy PHẢI tránh (đo được ở t308/t312): **"đã gửi Slack" KHÔNG phải là `action`.**
 *      Con báo cáo "6/6 app sạch, đã gửi Slack" vẫn là `clean` — nó gửi đi một cái RỖNG.
 *      Lấy "có post ra ngoài" làm thước sẽ khiến mọi loop no-noise xanh giả, và cột OUT7d
 *      của `/loop-audit` (đo output THẬT thay cho `last_run`) mất sạch tác dụng.
 *      Ngược lại, tìm được 1 mail thật / pushed KB thật mà ghi `clean` là **bỏ sót output**.
 *      Hỏi 1 câu trước khi chọn: *"lượt này có gì MỚI để người đọc quan tâm không?"*
 *      Có → `action`. Không → `clean`. Đừng hỏi "mình có gửi tin nào không".
 *   run-rollup <loop> [--days N=1]           in 1 DÒNG tóm cho báo cáo đầu phiên
 *                                            (vd "support-check: 6 run/24h, 5 clean, 1 action, last 10:00")
 *
 *   -- Checkpoint bền / durable execution (t115 Nhóm II, P0) --
 *   Tổng quát hoá start/done sang state-machine per-superstep để autopilot/workflow dài
 *   RESUME đúng bước sau crash + có retry-edge + human-gate breakpoint. KHÔNG framework, chỉ file.
 *   ckpt      <loop> <run-id> <key> <status> [--next a,b] [--result ref] [--retry N] [note...]
 *             status ∈ STARTED|DONE|FAILED|WAIT_HUMAN|SKIP|RESET; --next = step kế (cạnh DAG)
 *             RESET = xoá hiệu lực checkpoint của key (rollback) — resume coi như step chưa chạy
 *   wip       <loop>                      ĐẾM WIP THẬT: mọi run chưa kết thúc (kể cả run nằm chờ
 *                                         sạch ở cạnh NEXT mà `open` bỏ sót). Dùng cho trần WIP.
 *   resume    <loop> <run-id> [--max-retry N] [--max-rounds N]   in step cần chạy tiếp; exit 0=actionable · 3=WAIT_HUMAN · 4=xong
 *             --max-retry N  (II-C): FAILED có retry ≥ N → ESCALATE (exit 3) thay vì RETRY vô hạn
 *             --max-rounds N (II-C bis): đếm SỐ VÒNG theo gốc-key (prd-verify, prd-verify2… = 1 gốc);
 *                            ≥ N → ESCALATE. Bắt được ca vòng fix→verify đúc key mới mỗi vòng nên
 *                            --retry luôn = 0 và --max-retry không bao giờ chạm.
 *   run-graph <loop> <run-id>   render chuỗi/DAG step + trạng thái (dogfood)
 *   open      [--days N=7]       quét MỌI run tìm step treo (FAILED/WAIT_HUMAN/STARTED-dở) cho rollup (II-C)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const DS = require('./decision-status');   // #75: từ điển status ledger dùng chung (case-insensitive + alias)

// env override: CHỈ dùng cho test. Thiếu nó thì mọi run-test `run-log` ghi thẳng vào ledger
// THẬT — đúng lỗi đã dính 19-08 (4 dòng test lọt vào 3 ledger, phải gỡ tay). Cùng khuôn
// DECISION_LEDGER/DECISION_AUDIT của decision-dispatch.js. `loop-output-signal.js` đọc CÙNG biến
// này nên sandbox ghi-rồi-đọc khớp nhau.
const ROOT = process.env.JOURNAL_RUNS_DIR || path.join(os.homedir(), '.claude', 'runs');

/**
 * Từ vựng status CHÍNH THỨC của `run-log` (t81, 07-09).
 *
 * VÌ SAO CÓ: đếm toàn bộ ledger dưới `runs/` ngày 07-09 ra **46 dòng mà status là một CỜ
 * DÒNG LỆNH** — `--tail` ×26 (ba-groom), `--list` ×17 (po-radar, competitor-watch), `--help` ×2,
 * `--days` ×1. Ai đó gõ `journal.js run-log <loop> --tail 5`, tool nuốt cờ vào vị trí tham số
 * `status` rồi ghi thẳng vào một file **append-only**. Ledger là nguồn của `run-rollup` và
 * `loop-output-signal.js` (thước OUT7d) ⇒ 46 dòng giả làm lệch mọi phép đếm, và vì append-only
 * nên KHÔNG xoá được — chỉ chặn được từ nay.
 *
 * VÌ SAO KHÔNG TỪ CHỐI CỨNG mọi status ngoài danh sách: khảo sát cùng ngày cho thấy loop ĐANG
 * SỐNG vẫn ghi status ngoài từ vựng — `mail-monitor` ghi `ok` (04→06/09), `po-radar` ghi `ok`
 * (05→06/09). Từ chối cứng nghĩa là làm gãy autopilot đang chạy để đổi lấy một ledger đẹp hơn;
 * đó là cái giá sai. Nên chia đôi theo mức chắc chắn:
 *   - **cờ dòng lệnh** (bắt đầu bằng `-`) — chắc chắn 100% là gõ nhầm, không ai đặt tên status
 *     bắt đầu bằng gạch ⇒ **TỪ CHỐI, exit≠0, không ghi**;
 *   - **chuỗi lạ khác** (`ok`, `done`, `feature`…) — có thể là chủ đích ⇒ **VẪN GHI** nhưng kêu
 *     ra stderr, và `run-rollup` tách chúng thành nhóm "lạ" có ĐẾM, không gộp im vào tổng.
 * Tức lỗi chắc chắn thì chặn, lỗi khả nghi thì phơi ra — đừng lọc im (bài học `looptasks-verify`:
 * thước kêu oan thì người đọc học cách lướt).
 *
 * `unknown` có mặt sẵn trong từ vựng để [[task-80]] dùng ngay: "đã quét, 0 item" (`clean`) phải
 * phân biệt được với "KHÔNG quét được" (`unknown`).
 */
// `cost-kill` (t134, 11-09): lượt bị autopilot-cost-gate chặn vì vượt budget ngày. Phải có TÊN
// RIÊNG: không phải `clean` (loop chưa hề quét gì — gọi clean là false-green), không phải `error`
// (không có gì hỏng, cổng làm đúng việc), không phải `steer` (steer vẫn chạy). Cùng họ
// `stopped-idle`: dừng CÓ CHỦ ĐÍCH phải phân biệt được với loop chết. Nằm ngoài CLEAN/ERROR của
// loop-output-signal ⇒ rơi vào bucket OUTPUT, không bị chấm 🔴 SILENT cũng không kêu oan.
const RUN_STATUS_CANON = new Set([
  // `stopped-manual`: PO gõ dừng. KHÁC `stopped-idle` (hết việc) — gộp hai cái là mất khả năng
  // phân biệt "loop cạn việc" với "người tắt giữa chừng khi còn pending", hai thứ cần xử khác nhau.
  'clean', 'action', 'error', 'blocked', 'escalate', 'steer', 'stopped-idle', 'stopped-manual', 'cost-kill', 'waiting_human', 'unknown',
]);

/** Cờ dòng lệnh lọt vào vị trí tham số vị-trí = gõ nhầm, luôn luôn. */
function refuseFlag(value, label, hint) {
  if (typeof value === 'string' && /^-/.test(value)) {
    die(`${label} không được là cờ ("${value}"). ${hint}`);
  }
}

function runFile(loop, runId) {
  /* Van đặt ở ĐÂY chứ không ở từng subcommand: mọi lệnh đụng file run đều đi qua hàm này,
   * nên một chỗ là đủ. Bộ lọc charset cũ KHÔNG bắt được cờ — `-` nằm trong `[A-Za-z0-9._-]`,
   * nên `journal.js start <loop> --tail` từng tạo ra file tên `--tail.jsonl`. Cùng lỗ với
   * run-log, chỉ khác chỗ rò. */
  refuseFlag(loop, 'loop', 'dùng: journal.js <cmd> <loop> <run-id> …');
  refuseFlag(runId, 'run-id', 'dùng: journal.js <cmd> <loop> <run-id> …');
  if (!/^[A-Za-z0-9._-]+$/.test(loop) || !/^[A-Za-z0-9._-]+$/.test(runId)) {
    die('loop và run-id chỉ được chứa [A-Za-z0-9._-]');
  }
  return path.join(ROOT, loop, `${runId}.jsonl`);
}
function die(msg) { process.stderr.write('journal: ' + msg + '\n'); process.exit(2); }
function readLines(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}
function append(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(obj) + '\n');
}
function nowISO() { return new Date().toISOString(); }

// Trạng thái mới nhất của mỗi key (dòng sau ghi đè dòng trước cùng key)
function latestByKey(lines) {
  const m = new Map();
  for (const e of lines) if (e.key) m.set(e.key, e.status);
  return m;
}

// Bản ghi ĐẦY ĐỦ mới nhất của mỗi key (giữ next/result/retry/note) — cho ckpt/resume/run-graph.
// Giữ thứ tự first-seen để render graph theo trình tự chạy.
function latestEntryByKey(lines) {
  const m = new Map();
  for (const e of lines) {
    if (!e.key) continue;
    // RESET (t115, vá lỗ rollback 22-08): xoá hiệu lực key — coi như CHƯA từng có checkpoint,
    // để `resume` phát lại step đó như step mới. Ledger vẫn append-only, không xoá dòng nào.
    if (e.status === 'RESET') { m.delete(e.key); continue; }
    const prev = m.get(e.key);
    // merge: giữ next/result đã khai báo ở dòng trước nếu dòng mới không ghi lại
    m.set(e.key, {
      key: e.key,
      status: e.status,
      next: e.next != null ? e.next : (prev ? prev.next : []),
      result: e.result != null ? e.result : (prev ? prev.result : ''),
      retry: e.retry != null ? e.retry : (prev ? prev.retry : 0),
      note: e.note || (prev ? prev.note : ''),
      _seen: prev ? prev._seen : m.size,
    });
  }
  return m;
}

// Trạng thái checkpoint hợp lệ (P0 t115 Nhóm II)
const CKPT_STATUS = ['STARTED', 'DONE', 'FAILED', 'WAIT_HUMAN', 'SKIP', 'RESET'];

const [, , cmd, loop, runId, ...rest] = process.argv;

switch (cmd) {
  case 'start':
  case 'done': {
    if (!loop || !runId || !rest[0]) die(`dùng: journal.js ${cmd} <loop> <run-id> <key> [note]`);
    const key = rest[0];
    const note = rest.slice(1).join(' ') || '';
    append(runFile(loop, runId), { ts: nowISO(), key, status: cmd.toUpperCase(), note });
    process.stdout.write(`${cmd.toUpperCase()} ${key}\n`);
    break;
  }
  case 'is-done': {
    if (!loop || !runId || !rest[0]) die('dùng: journal.js is-done <loop> <run-id> <key>');
    const m = latestByKey(readLines(runFile(loop, runId)));
    const done = m.get(rest[0]) === 'DONE';
    process.stdout.write(done ? 'DONE\n' : 'PENDING\n');
    process.exit(done ? 0 : 1);
    break;
  }
  case 'pending': {
    if (!loop || !runId) die('dùng: journal.js pending <loop> <run-id>');
    const m = latestByKey(readLines(runFile(loop, runId)));
    const p = [...m.entries()].filter(([, s]) => s !== 'DONE').map(([k]) => k);
    process.stdout.write(p.length ? p.join('\n') + '\n' : '');
    break;
  }
  case 'status': {
    if (!loop || !runId) die('dùng: journal.js status <loop> <run-id>');
    const m = latestByKey(readLines(runFile(loop, runId)));
    let done = 0, pend = 0;
    for (const s of m.values()) (s === 'DONE' ? done++ : pend++);
    process.stdout.write(`run=${runId} total_keys=${m.size} done=${done} pending=${pend}\n`);
    [...m.entries()].forEach(([k, s]) => process.stdout.write(`  [${s === 'DONE' ? 'x' : ' '}] ${k}\n`));
    break;
  }
  case 'prune': {
    if (!loop) die('dùng: journal.js prune <loop> [--days N]');
    const i = rest.indexOf('--days');
    const days = i >= 0 ? parseInt(rest[i + 1], 10) : 30;
    const dir = path.join(ROOT, loop);
    if (!fs.existsSync(dir)) { process.stdout.write('0 pruned\n'); break; }
    const cutoff = Date.now() - days * 86400000;
    let n = 0;
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).mtimeMs < cutoff) { fs.unlinkSync(fp); n++; }
    }
    process.stdout.write(`${n} pruned (>${days}d)\n`);
    break;
  }
  case 'run-log': {
    // run-log <loop> <status> <summary...>
    const status = runId; // đối số thứ 2
    const summary = rest.join(' ');
    if (!loop || !status) die('dùng: journal.js run-log <loop> <status> <summary...>');
    // Guard 1 — cờ dòng lệnh: TỪ CHỐI. Ledger append-only, ghi sai là ghi vĩnh viễn.
    // (Bản cũ chỉ bắt `--x`, lọt `-x`; nay dùng chung refuseFlag với runFile.)
    refuseFlag(status, 'status', `Từ vựng: ${[...RUN_STATUS_CANON].join('|')}. Đọc lịch sử: tail runs/${loop}/ledger.jsonl · thống kê: journal.js run-rollup ${loop} [--days N]`);
    // Guard 2 — ngoài từ vựng: VẪN GHI (loop đang sống có thể cố ý) nhưng phơi ra, không im.
    if (!RUN_STATUS_CANON.has(status)) {
      process.stderr.write(`journal: ⚠ status "${status}" ngoài từ vựng (${[...RUN_STATUS_CANON].join('|')}) — vẫn ghi, nhưng run-rollup sẽ đếm riêng là "lạ".\n`);
    }
    // A47: --task A## ⇒ vừa log run, vừa TỰ stamp edge spawned_by:<loop> lên dòng STATE đó.
    // Cơ chế gánh việc ghi edge; agent không phải nhớ cú pháp ⛓.
    const ti = rest.indexOf('--task');
    const task = ti >= 0 ? rest[ti + 1] : null;
    const drop = new Set();
    for (const f of ['--task', '--state']) { const k = rest.indexOf(f); if (k >= 0) { drop.add(k); drop.add(k + 1); } }
    const summary2 = drop.size ? rest.filter((_, k) => !drop.has(k)).join(' ') : summary;
    const file = path.join(ROOT, loop, 'ledger.jsonl');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify({ ts: nowISO(), status, summary: summary2, ...(task ? { task } : {}) }) + '\n');
    process.stdout.write(`run-log ${loop} ${status}${task ? ' (task ' + task + ')' : ''}\n`);
    if (task && /^A\d+$/.test(task)) {
      try {
        const { execFileSync } = require('child_process');
        const rsi = rest.indexOf('--state');
        const stArgs = rsi >= 0 ? ['--state', rest[rsi + 1]] : [];
        const out = execFileSync(process.execPath, [__filename, 'edge', task, `spawned_by:${loop}`, ...stArgs], { encoding: 'utf8' });
        process.stdout.write('  ' + out.trim() + '\n');
      } catch (e) { process.stderr.write(`  (edge bỏ qua: ${String(e.stderr || e.message).trim().split('\n').pop()})\n`); }
    }
    break;
  }
  case 'run-rollup': {
    if (!loop) die('dùng: journal.js run-rollup <loop> [--days N]');
    const argv = [runId, ...rest].filter(Boolean);
    const di = argv.indexOf('--days');
    const days = di >= 0 ? parseInt(argv[di + 1], 10) : 1;
    const file = path.join(ROOT, loop, 'ledger.jsonl');
    const lines = readLines(file);
    const cutoff = Date.now() - days * 86400000;
    const recent = lines.filter(e => e.ts && Date.parse(e.ts) >= cutoff);
    if (!recent.length) { process.stdout.write(`${loop}: 0 run/${days*24}h\n`); break; }
    /* Tách từ-vựng-chuẩn khỏi phần lạ. Lạ thì BỎ khỏi tổng nhưng PHẢI báo số — lọc im là cách
     * một ledger bẩn tự trình bày mình như một ledger sạch (t81). */
    const canon = recent.filter(e => RUN_STATUS_CANON.has(e.status));
    const strange = recent.filter(e => !RUN_STATUS_CANON.has(e.status));
    const by = {};
    for (const e of canon) by[e.status] = (by[e.status] || 0) + 1;
    const last = recent[recent.length - 1];
    const lastHHMM = new Date(last.ts).toISOString().slice(11, 16);
    const parts = Object.entries(by).map(([s, n]) => `${n} ${s}`).join(', ') || '0 dòng hợp lệ';
    const flag = (by.action || by.escalate || by.error) ? ' ⚠' : '';
    let tail = '';
    if (strange.length) {
      const bys = {};
      for (const e of strange) bys[e.status] = (bys[e.status] || 0) + 1;
      const top = Object.entries(bys).sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([s, n]) => `${JSON.stringify(s)}×${n}`).join(', ');
      tail = ` · ⚠ ${strange.length} dòng status lạ, đã bỏ qua: ${top}`;
    }
    process.stdout.write(`${loop}: ${canon.length} run/${days*24}h — ${parts}, last ${lastHHMM} UTC${flag}${tail}\n`);
    break;
  }
  case 'next-id': {
    // A47: --spawned-by <src> ⇒ in kèm segment ⛓ dán-sẵn, khỏi phải nhớ cú pháp.
    // Cấp A-id DUY NHẤT (max+1) cho dòng STATE mới — chống va-chạm id giữa các autopilot
    // (root-cause đợt dọn 06/08-07/08: nhiều loop chọn id thấp/tuỳ tiện → trùng). Gọi TRƯỚC khi thêm row.
    const nargs = [loop, runId, ...rest].filter(Boolean);
    const nsi = nargs.indexOf('--state');
    // A47 fix: chỉ coi đối số đầu là path khi nó KHÔNG phải cờ — trước đây
    // `next-id --spawned-by X` khiến sp='--spawned-by' ⇒ đọc hụt STATE ⇒ cấp lại A1 (va-chạm id).
    const sp = (nsi >= 0 ? nargs[nsi + 1] : (loop && !loop.startsWith('--') ? loop : null)) || path.join(os.homedir(), '.claude', 'STATE.md');
    const spi = nargs.indexOf('--spawned-by');
    const src = spi >= 0 ? nargs[spi + 1] : null;
    // A47 fix (2026-08-26): quét CẢ STATE-ARCHIVE.md. Trước đây chỉ đọc STATE.md ⇒ id của
    // dòng ĐÃ ARCHIVE được cấp lại cho việc mới ⇒ trùng id xuyên thời gian (case thật: A40 tồn tại
    // 3 lần — 2 dòng live + 1 dòng "MCP server dev-zone" đã archive 07-07). Archive chỉ ĐỌC, không sửa.
    const archives = [sp.replace(/STATE\.md$/, 'STATE-ARCHIVE.md')];
    let max = 0;
    for (const f of [sp, ...archives]) {
      if (!fs.existsSync(f)) continue;
      for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        // bảng STATE dạng "| A## |" · archive dạng "## A## — tiêu đề"
        const m = line.match(/^\|\s*A(\d+)\s*\|/) || line.match(/^#{1,3}\s*A(\d+)\s*[—-]/);
        if (m) max = Math.max(max, parseInt(m[1], 10));
      }
    }
    const nid = `A${max + 1}`;
    process.stdout.write(nid + '\n');
    if (src) process.stdout.write(`⛓ spawned_by:${src}\n  (dán segment trên vào CUỐI ô "chờ gì"; hoặc sau khi thêm row: journal.js edge ${nid} spawned_by:${src})\n`);
    break;
  }
  case 'ckpt': {
    // Checkpoint bền per-superstep (P0 t115 Nhóm II). Tổng quát hoá start/done:
    //   ckpt <loop> <run-id> <key> <status> [--next a,b,c] [--result <ref>] [--retry N] [note...]
    // status ∈ STARTED|DONE|FAILED|WAIT_HUMAN|SKIP|RESET. next = các step kế (cạnh DAG).
    if (!loop || !runId || !rest[0] || !rest[1]) {
      die('dùng: journal.js ckpt <loop> <run-id> <key> <status> [--next a,b] [--result ref] [--retry N] [note...]');
    }
    // GUARD read-only theo loop (2026-09-07, PO chốt): tiến trình nào export JOURNAL_READONLY_LOOPS=<loop,...>
    // thì ĐƯỢC ĐỌC (resume/run-graph/open) nhưng KHÔNG được GHI checkpoint cho các loop đó.
    // Vì sao: đã có tiến trình NGOÀI Delivery Loop tự lái run flow-0 và ghi đè checkpoint của nó
    // (ca thật 07-09: `prd-verify6` bị lật từ DONE về STARTED 75 giây sau khi phiên chính ghi DONE).
    // Hai driver trên một run = trùng agent, trùng token, trần WIP đếm sai. Chặn bằng cơ chế, không bằng
    // lời nhắc trong prompt. Đặt SAU khối die ở trên — đặt BÊN TRONG nó thì guard không bao giờ chạy.
    {
      const ro = (process.env.JOURNAL_READONLY_LOOPS || '').split(',').map(s => s.trim()).filter(Boolean);
      if (ro.includes(loop)) {
        die(`TU CHOI ghi ckpt cho loop "${loop}": tien trinh nay chay o che do READ-ONLY voi loop do `
          + `(JOURNAL_READONLY_LOOPS=${process.env.JOURNAL_READONLY_LOOPS}). Doc trang thai thi dung `
          + `resume/run-graph/open. Muon LAI run nay thi di qua /delivery-plan, dung tu ghi checkpoint.`);
      }
    }
    const key = rest[0];
    const status = rest[1].toUpperCase();
    if (!CKPT_STATUS.includes(status)) die(`status không hợp lệ: ${status} (phải là ${CKPT_STATUS.join('|')})`);
    const flags = rest.slice(2);
    const takeFlag = (name) => { const i = flags.indexOf(name); if (i < 0) return null; const v = flags[i + 1]; flags.splice(i, 2); return v; };
    const nextRaw = takeFlag('--next');
    const result = takeFlag('--result');
    const retryRaw = takeFlag('--retry');
    const rec = { ts: nowISO(), key, status, note: flags.join(' ') || '' };
    if (nextRaw != null) rec.next = nextRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (result != null) rec.result = result;
    if (retryRaw != null) rec.retry = parseInt(retryRaw, 10) || 0;
    append(runFile(loop, runId), rec);
    process.stdout.write(`ckpt ${key} ${status}${rec.next ? ' →' + rec.next.join(',') : ''}\n`);
    break;
  }
  case 'resume': {
    // In (các) step CẦN CHẠY tiếp cho 1 run — trái tim resume-on-crash cho autopilot/workflow.
    //   resume <loop> <run-id>
    // exit 0 = có việc actionable (RESUME/RETRY/NEXT) · 3 = chờ người (WAIT_HUMAN) · 4 = xong sạch.
    if (!loop || !runId) die('dùng: journal.js resume <loop> <run-id> [--max-retry N]');
    // II-C (t115 Nhóm II): --max-retry N → step FAILED có retry ≥ N tự chuyển ESCALATE (human-gate)
    // thay vì RETRY vô hạn. Thiếu flag = maxRetry=∞ = hành vi cũ (mọi FAILED → RETRY). Backward-compat.
    const mrIdx = rest.indexOf('--max-retry');
    const maxRetry = mrIdx >= 0 ? (parseInt(rest[mrIdx + 1], 10) || 0) : Infinity;
    // II-C bis (2026-09-07): trần theo SỐ VÒNG, không chỉ theo --retry của một key.
    // Vì sao cần: vòng fix→re-review thực tế KHÔNG tăng --retry trên cùng một key mà đúc key MỚI mỗi vòng
    // (prd-verify → prd-verify2 → prd-verify3 …). Mỗi key mới mang retry=0 nên phép so `retry >= maxRetry`
    // KHÔNG BAO GIỜ đúng ⇒ guardrail chết về mặt cấu trúc, loop chạy vô hạn. Ca thật: run
    // flow-0/AC-full-site-scan-quota chạy 5 vòng prd-verify, `resume` vẫn in RETRY cho cả 5.
    // Cách đếm: gom key theo GỐC (bỏ hậu tố số ở cuối) rồi đếm số biến thể đã có bản ghi.
    const roundIdx = rest.indexOf('--max-rounds');
    const maxRounds = roundIdx >= 0 ? (parseInt(rest[roundIdx + 1], 10) || 0) : Infinity;
    const baseOf = k => k.replace(/\d+$/, '');
    const m = latestEntryByKey(readLines(runFile(loop, runId)));
    if (!m.size) { process.stdout.write('EMPTY — chưa có checkpoint nào cho run này (bắt đầu từ step đầu)\n'); process.exit(0); }
    const waits = [], resumes = [], retries = [], escalated = [];
    const doneKeys = new Set();
    const rounds = new Map();                       // gốc-key -> số vòng đã có bản ghi
    for (const k of m.keys()) rounds.set(baseOf(k), (rounds.get(baseOf(k)) || 0) + 1);
    // Vòng CŨ đã bị vòng SAU thay thế thì coi như xong, đừng bắt chạy lại. Không có luật này thì 5 bản ghi
    // prd-verify..prd-verify5 (FAILED) sẽ RETRY/ESCALATE mãi mãi kể cả khi prd-verify6 đã DONE — dispatcher
    // quay lại chạy những vòng đã bị thay thế, và run không bao giờ đi tiếp được. (Lỗi có sẵn, lộ ra 07-09.)
    const roundNo = k => { const mm = k.match(/(\d+)$/); return mm ? parseInt(mm[1], 10) : 1; };
    const settledAt = new Map();                    // gốc-key -> vòng CAO NHẤT đã DONE/SKIP
    for (const [k, e] of m) {
      if (e.status !== 'DONE' && e.status !== 'SKIP') continue;
      const b = baseOf(k), n = roundNo(k);
      if (n > (settledAt.get(b) || 0)) settledAt.set(b, n);
    }
    const superseded = k => roundNo(k) < (settledAt.get(baseOf(k)) || 0);
    const nextPred = new Map(); // next-target -> predecessor đã DONE
    for (const [k, e] of m) {
      if (e.status === 'WAIT_HUMAN') waits.push(e);
      else if (e.status === 'STARTED') { if (!superseded(k)) resumes.push(e); } // dở giữa chừng (crash)
      else if (e.status === 'FAILED') {
        if (superseded(k)) continue;                // vòng sau đã DONE → bản ghi này là lịch sử, bỏ qua
        const nRound = rounds.get(baseOf(k)) || 1;
        if ((e.retry || 0) >= maxRetry || nRound >= maxRounds) { e._rounds = nRound; escalated.push(e); }
        else retries.push(e);
      }
      if (e.status === 'DONE' || e.status === 'SKIP') { doneKeys.add(k); for (const t of (e.next || [])) if (!nextPred.has(t)) nextPred.set(t, k); }
    }
    const nexts = [...nextPred.entries()].filter(([t]) => !m.has(t)); // step kế CHƯA có bản ghi nào
    let out = '', exit = 4;
    for (const e of waits) { out += `WAIT_HUMAN ${e.key} — ${e.note || 'chờ người duyệt/hành động'}\n`; }
    for (const e of escalated) {
      const why = e._rounds >= maxRounds
        ? `${e._rounds} vòng "${baseOf(e.key)}*" ≥ max-rounds=${maxRounds}`
        : `FAILED retry=${e.retry || 0} ≥ max-retry=${maxRetry}`;
      out += `ESCALATE ${e.key} — ${why}, cần người (${e.note || 'vòng fix→verify không hội tụ'})\n`;
    }
    for (const e of resumes) { out += `RESUME ${e.key} — dở giữa chừng (STARTED chưa DONE), chạy lại step này\n`; }
    for (const e of retries) { out += `RETRY ${e.key} — FAILED (retry=${e.retry || 0})${e.note ? ': ' + e.note : ''}\n`; }
    for (const [t, pred] of nexts) { out += `NEXT ${t} — sau khi ${pred} DONE\n`; }
    if (waits.length || escalated.length) exit = 3;
    else if (resumes.length || retries.length || nexts.length) exit = 0;
    if (exit === 4) out = `DONE — 0 việc chờ (${doneKeys.size} step DONE/SKIP)\n`;
    process.stdout.write(out);
    process.exit(exit);
    break;
  }
  case 'run-graph': {
    // Render chuỗi/DAG step của 1 run (dogfood cho durable execution — soi bằng mắt).
    //   run-graph <loop> <run-id>
    if (!loop || !runId) die('dùng: journal.js run-graph <loop> <run-id>');
    const m = latestEntryByKey(readLines(runFile(loop, runId)));
    if (!m.size) { process.stdout.write('(run rỗng)\n'); break; }
    const mark = { DONE: 'x', SKIP: '-', FAILED: '✗', WAIT_HUMAN: '⏸', STARTED: '·' };
    const ordered = [...m.values()].sort((a, b) => a._seen - b._seen);
    process.stdout.write(`RUN ${runId} — ${m.size} step\n`);
    for (const e of ordered) {
      const extra = [];
      if (e.retry) extra.push(`retry=${e.retry}`);
      if (e.result) extra.push(e.result);
      const nx = (e.next && e.next.length) ? `  --next--> ${e.next.join(',')}` : '';
      process.stdout.write(`  [${mark[e.status] || '?'}] ${e.key}${extra.length ? ' (' + extra.join(', ') + ')' : ''}${nx}\n`);
    }
    break;
  }
  case 'wip': {
    // ĐẾM WIP THẬT cho một loop (2026-09-07). Khác `open`: `open` chỉ bắt run có step FAILED/WAIT_HUMAN/
    // STARTED-dở, nên BỎ SÓT run đang nằm chờ sạch ở cạnh NEXT (mọi step DONE, step kế chưa khởi động).
    // Run kiểu đó vẫn là việc-đang-mở theo mọi nghĩa. Ca thật 07-09: 3 run FF (R1/R2/R3) đều đứng ở
    // "research-review DONE → prd chưa chạy"; `open` báo 0 ⇒ trần WIP=3 của /delivery-plan tưởng còn trống
    // và sẵn sàng mở thêm run thứ 4, 5. Định nghĩa đúng: run CHƯA kết thúc = run chiếm suất.
    //   wip <loop>            → mỗi dòng 1 run đang mở + lý do
    const lp = loop;
    if (!lp) die('dùng: journal.js wip <loop>');
    const dir = path.join(ROOT, lp);
    if (!fs.existsSync(dir)) { process.stdout.write('0\n'); break; }
    const openRuns = [];
    const heldRuns = [];
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.jsonl') || f.startsWith('ledger')) continue;
      const lines = readLines(path.join(dir, f));
      if (!lines.length) continue;
      const mm = latestEntryByKey(lines);
      const baseOf3 = k => k.replace(/\d+$/, '');
      const roundNo3 = k => { const r = k.match(/(\d+)$/); return r ? parseInt(r[1], 10) : 1; };
      const settled3 = new Map();
      for (const [k, e] of mm) {
        if (e.status !== 'DONE' && e.status !== 'SKIP') continue;
        const b = baseOf3(k), n = roundNo3(k);
        if (n > (settled3.get(b) || 0)) settled3.set(b, n);
      }
      const live = [...mm.entries()].filter(([k]) => roundNo3(k) >= (settled3.get(baseOf3(k)) || 0));
      const stuck = live.filter(([, e]) => e.status === 'FAILED' || e.status === 'STARTED');
      const waits = live.filter(([, e]) => e.status === 'WAIT_HUMAN');
      const doneKeys = new Set([...mm].filter(([, e]) => e.status === 'DONE' || e.status === 'SKIP').map(([k]) => k));
      const pendingNext = [];
      for (const [k, e] of mm) {
        if (e.status !== 'DONE' && e.status !== 'SKIP') continue;
        for (const nx of (e.next || [])) if (!mm.has(nx)) pendingNext.push(`${nx} (sau ${k})`);
      }
      if (!stuck.length && !waits.length && !pendingNext.length) continue;   // run đã xong sạch
      const why = [];
      if (stuck.length) why.push(`dở: ${stuck.map(([k, e]) => k + ':' + e.status).join(', ')}`);
      if (waits.length) why.push(`chờ người: ${waits.map(([k]) => k).join(', ')}`);
      if (pendingNext.length) why.push(`chờ chạy: ${pendingNext.join(', ')}`);
      const line = `  ${lp}/${f.replace(/\.jsonl$/, '')} — ${why.join(' · ')}`;
      // PO chốt 2026-09-14: run mà lý do mở DUY NHẤT là đang chờ người thì KHÔNG chiếm suất WIP —
      // nó không tiêu tài nguyên máy, chỉ nằm chờ PO. Đếm gộp nó vào WIP làm cả loop đứng im
      // (ca thật 09-09→14-09: 5 ngày `clean` liên tiếp, 3/5 run chỉ đang chờ PO trả lời).
      if (!stuck.length && !pendingNext.length && waits.length) heldRuns.push(line);
      else openRuns.push(line);
    }
    const head = openRuns.length
      ? `WIP ${openRuns.length} run đang mở:\n${openRuns.join('\n')}\n`
      : `WIP 0 — không có run nào đang mở\n`;
    const tail = heldRuns.length
      ? `\nTREO CHỜ NGƯỜI ${heldRuns.length} run (KHÔNG tính vào WIP — cứ mở việc khác):\n${heldRuns.join('\n')}\n`
      : '';
    process.stdout.write(head + tail);
    break;
  }
  case 'open': {
    // II-C observability (t115 Nhóm II): quét MỌI run tìm step treo (FAILED/WAIT_HUMAN/STARTED-dở)
    // → 1 dòng/run cho rollup đầu phiên, thay vì chạy run-graph tay từng run-id. Đọc-only.
    //   open [--days N=7]
    const daysIdx = rest.indexOf('--days');
    const days = daysIdx >= 0 ? (parseInt(rest[daysIdx + 1], 10) || 7) : 7;
    const cutoff = Date.now() - days * 864e5;
    if (!fs.existsSync(ROOT)) { process.stdout.write('(chưa có run nào)\n'); break; }
    const rows = [];
    for (const lp of fs.readdirSync(ROOT)) {
      const dir = path.join(ROOT, lp);
      let st; try { st = fs.statSync(dir); } catch { continue; }
      if (!st.isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) {
        // Bỏ ledger.jsonl (run-log ③a) — chỉ soi file run-id có checkpoint DAG.
        if (!f.endsWith('.jsonl') || f.startsWith('ledger')) continue;
        const lines = readLines(path.join(dir, f));
        if (!lines.length) continue;
        const lastTs = Date.parse(lines[lines.length - 1].ts || '') || 0;
        if (lastTs < cutoff) continue;
        const mm = latestEntryByKey(lines);
        // Cùng luật superseded như `resume`: vòng CŨ đã bị vòng SAU thay thế thì không còn treo.
        // Thiếu luật này, `open` báo run treo VĨNH VIỄN vì 5 bản ghi prd-verify..prd-verify5 (FAILED)
        // không bao giờ mất đi — mà `open` chính là lệnh ĐẾM WIP của /delivery-plan (§2.1) ⇒ trần WIP
        // đầy giả, loop không mở được việc mới cho bất kỳ app nào. (Lộ ra 07-09 khi đếm suất cho FF.)
        const baseOf2 = k => k.replace(/\d+$/, '');
        const roundNo2 = k => { const r = k.match(/(\d+)$/); return r ? parseInt(r[1], 10) : 1; };
        const settled2 = new Map();
        for (const [k, e] of mm) {
          if (e.status !== 'DONE' && e.status !== 'SKIP') continue;
          const b = baseOf2(k), n = roundNo2(k);
          if (n > (settled2.get(b) || 0)) settled2.set(b, n);
        }
        const stuck = [...mm.entries()]
          .filter(([k]) => roundNo2(k) >= (settled2.get(baseOf2(k)) || 0))
          .map(([, e]) => e)
          .filter(e => e.status === 'FAILED' || e.status === 'WAIT_HUMAN' || e.status === 'STARTED');
        if (!stuck.length) continue;
        const tag = stuck.map(e => `${e.key}:${e.status}${e.retry ? '(r' + e.retry + ')' : ''}`).join(', ');
        rows.push(`${lp}/${f.replace(/\.jsonl$/, '')} — ${tag}`);
      }
    }
    if (!rows.length) process.stdout.write(`✓ 0 run treo trong ${days} ngày (mọi step DONE/SKIP)\n`);
    else { process.stdout.write(`RUN TREO (${rows.length}) — FAILED/WAIT_HUMAN/STARTED-dở, ${days} ngày:\n`); for (const r of rows) process.stdout.write(`  ${r}\n`); }
    break;
  }
  case 'edge': {
    // A47 (2026-08-25) — GHI edge ⛓ vào dòng STATE bằng TOOL thay vì gõ tay.
    // Vì sao: graph v1 (06-08) chọn "human-curated, không auto-extract" → sau 19 ngày typed_edges=0.
    // Ma sát gõ markdown đúng chỗ là nguyên nhân; tool hoá bước ghi để cơ chế gánh, không trông chờ trí nhớ agent.
    // dùng: journal.js edge <A##> <key:value> [key:value ...] [--state <path>] [--dry]
    const home = os.homedir();
    const args = [loop, runId, ...rest].filter(Boolean);
    const si = args.indexOf('--state');
    const statePath = si >= 0 ? args[si + 1] : path.join(home, '.claude', 'STATE.md');
    const dry = args.includes('--dry');
    const id = args[0];
    const EDGE_KEYS = ['blocks', 'blocked_by', 'spawned_by', 'decided_by', 'learned_from', 'supersedes', 'affects'];
    const toks = args.slice(1).filter(t => !t.startsWith('--') && t !== statePath);
    if (!id || !/^A\d+$/.test(id) || !toks.length) {
      die('dùng: journal.js edge <A##> <key:value> [...]  · key ∈ ' + EDGE_KEYS.join('|'));
    }
    for (const t of toks) {
      const m = t.match(/^([a-z_]+):(.+)$/);
      if (!m || !EDGE_KEYS.includes(m[1])) die(`token sai: "${t}" — phải là <key>:<value>, key ∈ ${EDGE_KEYS.join('|')}`);
    }
    if (!fs.existsSync(statePath)) die(`không thấy STATE: ${statePath}`);
    const lines = fs.readFileSync(statePath, 'utf8').split('\n');
    const hits = [];
    lines.forEach((l, i) => { if (new RegExp('^\\|\\s*' + id + '\\s*\\|').test(l)) hits.push(i); });
    if (!hits.length) die(`không thấy dòng ${id} trong ${statePath}`);
    // Trùng id = va-chạm session → KHÔNG đoán, bắt người renumber (đúng luật "chỉ sửa dòng của mình").
    if (hits.length > 1) die(`${id} xuất hiện ${hits.length} lần (trùng id) — renumber trước, tool không đoán dòng nào`);
    const li = hits[0];
    const cells = lines[li].split('|');
    // ô đích = ô "chờ gì" = ô ngay TRƯỚC ô ngày (nếu có), else ô cuối có nội dung
    let target = -1;
    // (1) Ưu tiên TUYỆT ĐỐI: ô đã CÓ segment ⛓ — gộp vào đó. Chống ca dòng bị xẻ thêm cell do
    //     prose lỡ chứa ký tự "|" (dính thật 26-08 ở A47: chuỗi "|| echo" cắt ô "chờ gì" làm đôi
    //     ⇒ tool nhắm ô sai ⇒ tạo segment ⛓ THỨ HAI, parser chỉ đọc cái cuối ⇒ edge cũ biến mất khỏi graph).
    for (let i = cells.length - 1; i >= 0; i--) if (cells[i].includes('⛓')) { target = i; break; }
    // (2) Chưa có edge nào: ô ngay TRƯỚC ô ngày.
    if (target < 0) for (let i = cells.length - 1; i >= 0; i--) {
      if (/^\s*\d{4}-\d{2}-\d{2}\s*$/.test(cells[i])) { target = i - 1; break; }
    }
    // (3) Không có ô ngày: ô cuối còn nội dung.
    if (target < 0) { for (let i = cells.length - 1; i >= 0; i--) if (cells[i].trim()) { target = i; break; } }
    // Cảnh báo dòng nghi bị xẻ cell (bảng STATE chuẩn 8 cell) — ghi vẫn chạy, chỉ nhắc người soi.
    if (cells.length > 8) process.stderr.write(`  ⚠ dòng ${id} có ${cells.length} cell (chuẩn 8) — có thể prose chứa ký tự "|" chưa escape\n`);
    if (target < 1) die(`không xác định được ô "chờ gì" của ${id}`);
    let cell = cells[target];
    const ci = cell.lastIndexOf('⛓');
    const existing = new Set();
    if (ci >= 0) for (const t of cell.slice(ci + 1).split(/[·,]/)) { const v = t.trim(); if (v) existing.add(v); }
    const added = toks.filter(t => !existing.has(t));
    if (!added.length) { process.stdout.write(`edge ${id}: đã có sẵn, không đổi\n`); break; }
    cell = ci >= 0 ? (cell.replace(/\s*$/, '') + ' · ' + added.join(' · ') + ' ')
                   : (cell.replace(/\s*$/, '') + ' ⛓ ' + added.join(' · ') + ' ');
    cells[target] = cell;
    const out = cells.join('|');
    if (dry) { process.stdout.write(out.slice(0, 400) + '\n'); break; }
    lines[li] = out;
    // A47b (2026-09-08): KHÔNG `fs.writeFileSync(statePath, ...)` nữa. Đó là ghi ĐÈ CẢ FILE
    // lên spine — đúng thứ luật (B) trong CLAUDE.md cấm, và là hình dạng đã xoá rỗng
    // STATE.md 227KB hôm 2026-09-01. Nay đi qua cổng an toàn `state-write.js` (chụp backup
    // vào .state-backups/ + từ chối nếu bản mới < 50% bản cũ). Phát hiện khi hook
    // state-truncate-gate được vá để đọc THÂN file script chứ không chỉ chuỗi lệnh.
    if (statePath === path.join(home, '.claude', 'STATE.md')) {
      const cong = path.join(home, '.claude', 'tools', 'state-write.js');
      const r = require('child_process').spawnSync(
        process.execPath, [cong, '-'],
        { input: lines.join('\n'), encoding: 'utf8' }
      );
      if (r.status !== 0) die('state-write.js từ chối ghi: ' + ((r.stderr || '') + (r.stdout || '')).trim());
    } else {
      // Nhánh này CHẮC CHẮN không phải spine (đã loại ở điều kiện trên): --state trỏ file khác,
      // dùng cho test/bản sao. state-write.js chỉ biết đúng một đích cố định nên không dùng được.
      const dichKhac = statePath;
      fs.writeFileSync(dichKhac, lines.join('\n'));
    }
    process.stdout.write(`edge ${id} += ${added.join(' · ')}\n`);
    break;
  }
  case 'graph': {
    // Nhóm I (task 115, PO chốt 06-08): reader dựng đồ thị task↔task, task↔decision
    // từ STATE.md + ledger. KHÔNG sửa spine — chỉ đọc. Phát hiện "việc trôi" (nỗi đau #2).
    // dùng: journal.js graph [--state <path>] [--ledger <path>] [--dangling]
    const home = os.homedir();
    const args = [loop, runId, ...rest].filter(Boolean);
    const statePath = args.indexOf('--state') >= 0 ? args[args.indexOf('--state') + 1] : path.join(home, '.claude', 'STATE.md');
    const ledgerPath = args.indexOf('--ledger') >= 0 ? args[args.indexOf('--ledger') + 1] : path.join(home, '.claude', '.decisions-ledger.json');
    const dangling = args.includes('--dangling');
    const EDGE_KEYS = ['blocks', 'blocked_by', 'spawned_by', 'decided_by', 'learned_from', 'supersedes', 'affects'];
    const STATUS_RE = /(WAITING_HUMAN|IN_PROGRESS|DONE|WATCH)/;
    const nodes = new Map(); // id -> {status, date, edges:[{rel,to}], mentions:Set}
    if (fs.existsSync(statePath)) {
      for (const line of fs.readFileSync(statePath, 'utf8').split('\n')) {
        const idm = line.match(/^\|\s*(A\d+)\s*\|/);
        if (!idm) continue;
        const id = idm[1];
        const status = (line.match(STATUS_RE) || [, '?'])[1];
        const date = (line.match(/\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*$/) || [, ''])[1];
        const edges = [];
        // Neo vào ⛓ CUỐI cùng (spec: edge đặt cuối ô "chờ gì") → robust nếu prose cũng chứa ⛓.
        const ci = line.lastIndexOf('⛓');
        if (ci >= 0) {
          let seg = line.slice(ci + 1);
          const bar = seg.indexOf('|');
          if (bar >= 0) seg = seg.slice(0, bar);
          for (const tok of seg.split(/[·,]/)) {
            const m = tok.trim().match(/^([a-z_]+):(.+)$/);
            // A47 (26-08): CẮT value ở khoảng trắng đầu tiên. Trước đây value ăn tới hết token ⇒ prose
            // viết thêm vào ô "chờ gì" SAU segment ⛓ bị nuốt thành giá trị edge (bắt tại chỗ: edge
            // learned_from của A47 nuốt cả đoạn "**ĐÃ PUSH + verify..."). Value thật luôn là id/slug, không có dấu cách.
            if (m && EDGE_KEYS.includes(m[1])) {
              const val = m[2].trim().split(/\s+/)[0];
              if (val) edges.push({ rel: m[1], to: val });
            }
          }
        }
        const mentions = new Set();
        for (const mm of line.matchAll(/\bA\d+\b/g)) if (mm[0] !== id) mentions.add(mm[0]);
        // Chống trùng-id (2 dòng cùng A## do va-chạm session): MERGE edges/mentions thay vì đè,
        // + đánh dấu dup để cảnh báo (KHÔNG âm thầm mất edge — chính là lỗi vừa gặp khi build).
        const prev = nodes.get(id);
        if (prev) { prev.edges.push(...edges); for (const x of mentions) prev.mentions.add(x); prev.dup = true; }
        else nodes.set(id, { status, date, edges, mentions, dup: false });
      }
    }
    const decisions = [];
    if (fs.existsSync(ledgerPath)) {
      try {
        const j = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
        for (const e of (j.entries || [])) decisions.push({ id: e.id, status: e.status || '?', canon: DS.normalize(e.status), dLevel: e.dLevel || 'D3', source: e.source || '', supersedes: e.supersedes || '', title: (e.title || '').slice(0, 60) });
      } catch (err) { process.stderr.write('graph: ledger parse lỗi — bỏ qua\n'); }
    }
    const dups = [...nodes.entries()].filter(([, n]) => n.dup).map(([id]) => id);
    if (dups.length) process.stdout.write(`⚠ TRÙNG ID (${dups.length}, va-chạm session — cần renumber): ${dups.join(', ')}\n\n`);
    if (dangling) {
      const stuck = [...nodes.entries()].filter(([, n]) => n.status === 'WAITING_HUMAN' || n.status === 'IN_PROGRESS');
      process.stdout.write(`VIỆC TRÔI — ${stuck.length} task đang chờ/dở (nỗi đau #2):\n`);
      for (const [id, n] of stuck) {
        const bb = n.edges.filter(e => e.rel === 'blocked_by').map(e => e.to).join(',') || '—';
        process.stdout.write(`  ${id} [${n.status}] ${n.date}  blocked_by:${bb}\n`);
      }
      // #75: KHÔNG so khớp chính xác `status === 'PENDING'` nữa — entry ghi OPEN/proposed/
      // ESCALATED từng vô hình với bảng này. isWaitingHuman() gom cả D3+ còn mở LẪN mọi
      // entry đã ESCALATE (kể cả D2: agent giơ tay xin người thì đó là việc của PO).
      const pend = decisions.filter(d => DS.isWaitingHuman(d));
      process.stdout.write(`\nDECISIONS PENDING — ${pend.length} chờ PO:\n`);
      for (const d of pend) process.stdout.write(`  ${d.id}  [${d.canon}${d.canon === String(d.status).toUpperCase() ? '' : ' ←' + d.status}]  ${d.title}\n`);
      const oddD = decisions.filter(d => DS.isUnknown(d.status));
      if (oddD.length) process.stdout.write(`⚠ ${oddD.length} entry status KHÔNG có trong từ điển (coi như đang mở): ${oddD.map(d => d.id + '=' + d.status).join(', ')}\n`);
      break;
    }
    // A47: cạnh SUY RA (không cần ai gõ) — ledger.source có nhắc A## ⇒ task --decided_by--> decision.
    const derived = [];
    for (const d of decisions) {
      for (const mm of (d.source || '').matchAll(/\bA\d+\b/g)) derived.push({ from: mm[0], rel: 'decided_by', to: d.id, live: nodes.has(mm[0]) });
      if (d.supersedes) derived.push({ from: d.id, rel: 'supersedes', to: d.supersedes, live: true });
    }
    let typed = 0;
    process.stdout.write(`GRAPH (STATE + ledger)\nNodes: ${nodes.size} task · ${decisions.length} decision\n\nTYPED EDGES (⛓):\n`);
    for (const [id, n] of nodes) for (const e of n.edges) { typed++; process.stdout.write(`  ${id} --${e.rel}--> ${e.to}\n`); }
    if (!typed) process.stdout.write(`  (chưa có edge ⛓ — dùng cú pháp "⛓ key:value" trong dòng STATE của mình)\n`);
    process.stdout.write(`\nDECISION → TASK (source):\n`);
    for (const d of decisions) if (d.source) process.stdout.write(`  ${d.id} [${d.status}] --source--> ${d.source}\n`);
    process.stdout.write(`\nCẠNH SUY RA (từ ledger.source — không cần gõ tay):\n`);
    if (!derived.length) process.stdout.write('  (không có)\n');
    for (const e of derived) process.stdout.write(`  ${e.from} --${e.rel}--> ${e.to}${e.live ? '' : '  (task đã archive)'}\n`);
    process.stdout.write(`\ntyped_edges=${typed} · derived_edges=${derived.length} · ghi edge: journal.js edge <A##> <key:value> · --dangling xem việc trôi\n`);
    break;
  }
  // ============================================================================
  // OWN-YOUR-COMPUTE (t323 mảnh 1a, 08-09) — nguồn: round-table personal-AGI
  // `vault/projects/2026-08-07-personal-agi-garry-tan-round-table-t243.md` §4.
  //
  // VÌ SAO: việc có ĐÁP ÁN ĐÚNG-SAI kiểm được (đếm · dedupe · so ngày · ràng-buộc-cứng ·
  // top-N) mà để model tính nhẩm trong latent space thì sai KHÔNG có tiếng động — không
  // exception, không exit code, chỉ một con số trông hợp lý. Subcommand này biến "nên viết
  // code" thành "có sẵn MỘT đường chạy code", tức hạ chi phí làm-đúng xuống dưới chi phí
  // đoán. Nó CỐ Ý nhỏ: 5 verb khớp đúng 5 nhóm trigger hay gặp nhất, không phải một thư viện.
  //
  // Đọc được: .jsonl (mỗi dòng 1 object) HOẶC .json (mảng object). Không đoán schema.
  case 'latent-check': {
    const verb = loop;
    const arg = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
    const loadRows = (f) => {
      if (!f) die('thiếu <file> — dùng: journal.js latent-check ' + verb + ' <file.jsonl|.json> …');
      let raw; try { raw = fs.readFileSync(f, 'utf8'); } catch (e) { die('không đọc được: ' + f); }
      const t = raw.trim();
      if (t.startsWith('[')) { try { return JSON.parse(t); } catch { die('JSON hỏng: ' + f); } }
      const out = [];
      for (const l of t.split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch { /* dòng hỏng: bỏ, có đếm bên dưới */ } }
      return out;
    };
    const get = (o, p) => String(p).split('.').reduce((a, k) => (a == null ? a : a[k]), o);
    if (verb === 'count') {
      const rows = loadRows(runId);
      const w = arg('--where', null);
      let sel = rows;
      if (w) { const i = w.indexOf('='); const k = w.slice(0, i), v = w.slice(i + 1); sel = rows.filter((r) => String(get(r, k)) === v); }
      const sumF = arg('--sum', null);
      if (sumF) {
        const nums = sel.map((r) => Number(get(r, sumF))).filter((n) => Number.isFinite(n));
        const s = nums.reduce((a, b) => a + b, 0);
        process.stdout.write(`n=${sel.length}/${rows.length} · sum(${sumF})=${s} · avg=${nums.length ? (s / nums.length).toFixed(3) : 'NaN'} · bỏ ${sel.length - nums.length} dòng không phải số\n`);
      } else process.stdout.write(`n=${sel.length}/${rows.length}${w ? ` (where ${w})` : ''}\n`);
      break;
    }
    if (verb === 'dedupe') {
      const rows = loadRows(runId);
      const k = arg('--key', null); if (!k) die('dùng: journal.js latent-check dedupe <file> --key <field>');
      const seen = new Map();
      for (const r of rows) { const v = String(get(r, k)); seen.set(v, (seen.get(v) || 0) + 1); }
      const dup = [...seen.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
      process.stdout.write(`rows=${rows.length} · unique(${k})=${seen.size} · trùng=${rows.length - seen.size}\n`);
      for (const [v, c] of dup.slice(0, 20)) process.stdout.write(`  ×${c}  ${v}\n`);
      break;
    }
    if (verb === 'age') {
      if (!runId) die('dùng: journal.js latent-check age <ISO|YYYY-MM-DD> [--now <ISO>]');
      const t = Date.parse(runId.length === 10 ? runId + 'T00:00:00Z' : runId);
      if (!Number.isFinite(t)) die('ngày không parse được: ' + runId);
      const nowArg = arg('--now', null);
      const now = nowArg ? Date.parse(nowArg.length === 10 ? nowArg + 'T00:00:00Z' : nowArg) : Date.now();
      if (!Number.isFinite(now)) die('--now không parse được');
      const d = (now - t) / 864e5;
      process.stdout.write(`${d >= 0 ? '' : '-'}${Math.abs(d).toFixed(2)} ngày (${d >= 0 ? 'đã qua' : 'còn tới'}) · mốc=${new Date(t).toISOString()} · now=${new Date(now).toISOString()}\n`);
      break;
    }
    if (verb === 'cap') {
      const rows = loadRows(runId);
      const g = arg('--group', null), v = arg('--value', null), cap = Number(arg('--cap', NaN));
      if (!g || !v || !Number.isFinite(cap)) die('dùng: journal.js latent-check cap <file> --group <f> --value <f> --cap <N>');
      const agg = new Map();
      for (const r of rows) { const key = String(get(r, g)); const n = Number(get(r, v)); if (!Number.isFinite(n)) continue; agg.set(key, (agg.get(key) || 0) + n); }
      let vi = 0;
      for (const [k2, s] of [...agg.entries()].sort((a, b) => b[1] - a[1])) {
        const over = s > cap; if (over) vi++;
        process.stdout.write(`  ${over ? '🔴 VƯỢT' : '✅ ok   '}  ${k2}: ${s}/${cap}\n`);
      }
      process.stdout.write(`nhóm=${agg.size} · vượt cap=${vi}\n`);
      process.exit(vi ? 1 : 0);
    }
    if (verb === 'topn') {
      const rows = loadRows(runId);
      const by = arg('--by', null), n = Number(arg('--n', 5));
      if (!by) die('dùng: journal.js latent-check topn <file> --by <field> [--n 5]');
      const sorted = rows.filter((r) => Number.isFinite(Number(get(r, by)))).sort((a, b) => Number(get(b, by)) - Number(get(a, by)));
      const lbl = arg('--label', null);
      sorted.slice(0, n).forEach((r, i) => process.stdout.write(`  ${i + 1}. ${Number(get(r, by))}  ${lbl ? get(r, lbl) : JSON.stringify(r).slice(0, 90)}\n`));
      process.stdout.write(`xếp hạng trên ${sorted.length}/${rows.length} dòng có ${by} là số\n`);
      break;
    }
    die('latent-check verb: count | dedupe | age | cap | topn  (xem header DÙNG:)');
  }

  // ============================================================================
  // MEMORY-LINT (t323 mảnh 2c) — soi memory MỚI có mâu thuẫn/trùng chủ đề với memory cũ.
  //
  // VÌ SAO Ở ĐÂY chứ không phải một cron riêng: doc §5(b) chốt "rẻ nhất" = gắn vào
  // `conversation-retro` (đã chạy 2×/tuần). Inline mỗi lần ghi thì đắt và chặn luồng; cron
  // riêng thì thêm một thứ phải nuôi. Đây cũng chính là ví dụ của rule 1a: phát hiện trùng
  // là DETERMINISTIC — so chuỗi, đếm token chung — nên phải là CODE, không phải "model thấy
  // hình như giống".
  //
  // VAN CHỐNG KÊU OAN (SYS #54 — thước kêu oan dạy người đọc lướt):
  //   - chỉ so trong CÙNG `metadata.type` (feedback không bao giờ mâu thuẫn với reference);
  //   - phải chung ≥2 token ĐẶC TRƯNG (bỏ stopword + token ≤3 ký tự) mới vào danh sách;
  //   - cặp đã khai `supersedes` lẫn nhau ⇒ ĐÃ XỬ LÝ, không kêu nữa;
  //   - tool CHỈ IN RA, KHÔNG tự xoá/sửa memory nào — quyền prune vẫn của retro/PO.
  case 'memory-lint': {
    const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
    const wantJson = process.argv.includes('--json');
    let dir = arg('--dir', null);
    const rootP = path.join(os.homedir(), '.claude', 'projects');
    const demP = (md) => fs.readdirSync(md).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md').length;
    if (!dir) dir = process.env.CLAUDE_MEMORY_DIR || null;
    if (!dir) {
      // KHÔNG đoán "thư mục to nhất" / "mới nhất". Cả hai heuristic đều SAI trong run-test t323:
      // kho đời cũ `-Users-avada` (271 note, chết) vừa TO hơn vừa có mtime MỚI hơn kho đang dùng
      // `-Users-avada-dev-Shopify-app` (46). Lint nhầm kho = báo cáo về một kho không ai ghi nữa,
      // mà vẫn EXIT=0 nên không ai biết. Chỉ nhận cwd-slug ĐÚNG; không khớp thì DỪNG + liệt kê.
      const slug = process.cwd().replace(/[^A-Za-z0-9]+/g, '-');
      const uu = path.join(rootP, slug, 'memory');
      if (fs.existsSync(uu) && demP(uu) > 0) dir = uu;
    }
    if (!dir) {
      const ds = (fs.existsSync(rootP) ? fs.readdirSync(rootP) : [])
        .map((d) => path.join(rootP, d, 'memory')).filter((m) => fs.existsSync(m) && demP(m) > 0)
        .sort((a, b) => demP(b) - demP(a)).slice(0, 6);
      die('không suy ra được kho memory từ cwd (' + process.cwd() + ').\n  Truyền --dir <path> hoặc đặt CLAUDE_MEMORY_DIR. Ứng viên:\n' + ds.map((d) => '   - ' + d + ' (' + demP(d) + ')').join('\n'));
    }
    if (!dir || !fs.existsSync(dir)) die('không tìm thấy thư mục memory — truyền --dir <path>');
    const STOP = new Set(['của','cho','khi','thì','này','đó','một','các','những','với','vào','ra','là','có','không','được','phải','đừng','nên','mà','và','hay','theo','trong','trên','dưới','đã','sẽ','bị','tới','từ','sau','trước','the','and','for','not','with','from','that','this','are','was','you','your','use','using','only']);
    const toks = (s) => [...new Set(String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/[\s-]+/).filter((w) => w.length > 3 && !STOP.has(w)))];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md');
    const mems = [];
    for (const f of files) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const fm = raw.startsWith('---') ? raw.slice(3, raw.indexOf('\n---', 3)) : '';
      const pick = (k) => { const m = fm.match(new RegExp('^\\s*' + k + ':\\s*(.+)$', 'm')); return m ? m[1].trim() : ''; };
      mems.push({
        file: f, slug: pick('name') || f.replace(/\.md$/, ''), desc: pick('description'),
        type: pick('type') || '?', source: pick('source'), capturedAt: pick('capturedAt'),
        confidence: pick('confidence'), supersedes: pick('supersedes'),
        tok: toks(pick('name') + ' ' + pick('description')),
      });
    }
    const only = arg('--new', null);
    const nguong = parseFloat(arg('--dice', '0.34'));
    // VÌ SAO KHÔNG DÙNG "≥2 token chung" (bản đầu t323): trên 270 memory nó ném ra 2696 cặp —
    // đúng cái bệnh SYS #54, thước kêu oan dạy người đọc lướt. Token như `feedback`/`slack`/`avada`
    // có mặt ở hàng chục note nên "chung 2 cái" chẳng nói lên gì. Hai van, đều DETERMINISTIC:
    //   (a) token chỉ tính là ĐẶC TRƯNG khi xuất hiện ở ít note (df ≤ max(2, 5% tổng)) — IDF thủ công;
    //   (b) độ chồng lấn tổng thể (Dice) phải ≥ --dice, để hai note dài chung vài chữ không lọt.
    const df = new Map();
    for (const m of mems) for (const t of m.tok) df.set(t, (df.get(t) || 0) + 1);
    const tranDf = Math.max(2, Math.ceil(mems.length * 0.05));
    const canh = [];
    for (let i = 0; i < mems.length; i++) for (let j = i + 1; j < mems.length; j++) {
      const a = mems[i], b = mems[j];
      if (only && a.slug !== only && b.slug !== only) continue;
      if (a.type !== b.type) continue;
      if (a.supersedes === b.slug || b.supersedes === a.slug) continue;   // đã khai thay thế = đã xử lý
      const chungAll = a.tok.filter((t) => b.tok.includes(t));
      const chung = chungAll.filter((t) => df.get(t) <= tranDf);
      if (chung.length < 2) continue;
      const dice = (2 * chungAll.length) / (a.tok.length + b.tok.length);
      if (dice < nguong) continue;
      canh.push({ a: a.slug, b: b.slug, type: a.type, chung, dice: +dice.toFixed(2) });
    }
    canh.sort((x, y) => y.chung.length - x.chung.length);
    const thieuProv = mems.filter((m) => !m.capturedAt);
    if (wantJson) { process.stdout.write(JSON.stringify({ dir, total: mems.length, pairs: canh, missing_provenance: thieuProv.length }, null, 2) + '\n'); break; }
    process.stdout.write(`memory-lint — ${mems.length} memory ở ${dir}${only ? ` · chỉ soi quanh "${only}"` : ''}\n`);
    if (!canh.length) process.stdout.write(`✅ không cặp nào trùng chủ đề đủ ngưỡng (cùng type + ≥2 token df≤${tranDf} + dice ≥ ${nguong})\n`);
    for (const c of canh.slice(0, 25)) process.stdout.write(`  ⚠️ [${c.type}] ${c.a}  ⟷  ${c.b}   (dice ${c.dice} · riêng: ${c.chung.slice(0, 6).join(', ')})\n`);
    if (canh.length > 25) process.stdout.write(`  … còn ${canh.length - 25} cặp, xem hết bằng --json\n`);
    process.stdout.write(`\nprovenance: ${mems.length - thieuProv.length}/${mems.length} memory có \`capturedAt\` · ${thieuProv.length} chưa có (memory CŨ — CỐ Ý không backfill, suy diễn ngược = provenance bịa)\n`);
    process.stdout.write('Tool CHỈ IN — không tự xoá/sửa memory nào. Cặp thật sự thay thế nhau thì khai `supersedes:` ở memory mới, lần sau hết kêu.\n');
    break;
  }

  default:
    die('subcommand: start|done|is-done|pending|status|prune|run-log|run-rollup|graph|edge|next-id|ckpt|resume|run-graph|open|latent-check|memory-lint');
}
