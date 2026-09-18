/**
 * decision-status.js — TỪ ĐIỂN TRẠNG THÁI DÙNG CHUNG cho `.decisions-ledger.json`
 * ---------------------------------------------------------------------------
 * Sinh ra từ task SYS #75. Lỗi gốc: ba consumer (`decision-dispatch.js`,
 * `journal.js`, `dashboard-gen.js`) đều tự so khớp CHÍNH XÁC `status === 'PENDING'`,
 * nên entry ghi `OPEN` / `proposed` / `in_progress` / `ESCALATED` biến MẤT khỏi bảng
 * chờ của PO — kể cả 3 entry đã được agent ESCALATE lên cho người.
 * Ledger đang có 14 cách viết cho ~4 trạng thái thật.
 *
 * NGUYÊN TẮC:
 *   1. FAIL-OPEN. Status lạ/không nhận ra ⇒ coi là ĐANG MỞ, không phải đã đóng.
 *      Hiện thừa 1 dòng thì PO đóng mất 5 giây; giấu mất 1 quyết định thì không ai biết.
 *   2. So khớp CASE-INSENSITIVE + bỏ phần chú thích trong ngoặc + coi `-`/khoảng trắng
 *      như `_`. `done`, `DONE`, `Done`, `IMPLEMENTED_IN_CODE (ghi hồi cố)` đều về 1 mối.
 *   3. Tách 3 CÂU HỎI KHÁC NHAU, đừng nhét chung vào một phép so sánh:
 *        - isOpen()         : còn sống hay đã đóng sổ?
 *        - isDispatchable() : dispatcher có được PHÉP route/spawn lại không?
 *        - isWaitingHuman() : có phải việc PO phải nhìn không?
 *      Chính vì trộn 3 câu này vào `=== 'PENDING'` mà cả ba consumer cùng sai một kiểu.
 *
 * KHÔNG bao giờ tự suy ra "đã xong" từ một status lạ. Đóng một quyết định là quyền của PO.
 */
'use strict';

// ---------- chuẩn hoá chuỗi thô → khoá tra ----------
// "IMPLEMENTED_IN_CODE (ghi hồi cố, chưa có trong spec)" → "IMPLEMENTED_IN_CODE"
// "in_progress" / "in progress" / "In-Progress" → "IN_PROGRESS"
function key(raw) {
  return String(raw == null ? '' : raw)
    .replace(/\([^)]*\)/g, ' ')     // bỏ chú thích trong ngoặc
    .replace(/[\s\-]+/g, '_')       // khoảng trắng / gạch nối → gạch dưới
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Bảng canonical. `open`: còn trong sổ sống. `human`: phải lên bảng chờ PO dù D-level nào
 * (agent đã giơ tay xin người). `dispatch`: dispatcher được route lại.
 * `transient`: trạng thái máy sinh ra trong 1 vòng dispatch, không phải ý chí của ai.
 */
const CANON = {
  PENDING:       { open: true,  human: false, dispatch: true,  transient: false, label: 'chờ xử lý' },
  IN_PROGRESS:   { open: true,  human: false, dispatch: false, transient: false, label: 'đang làm' },
  ESCALATED:     { open: true,  human: true,  dispatch: false, transient: false, label: 'đã đẩy lên người' },
  READY_AUTO:    { open: true,  human: false, dispatch: false, transient: true,  label: 'đủ điều kiện tự làm' },
  PROCESSING:    { open: true,  human: false, dispatch: false, transient: true,  label: 'đang chạy' },
  RESOLVED:      { open: false, human: false, dispatch: false, transient: false, label: 'đã chốt' },
  RESOLVED_SLIP: { open: false, human: false, dispatch: false, transient: false, label: 'đã chốt (trượt cóc)' },
  AUTO_DONE:     { open: false, human: false, dispatch: false, transient: false, label: 'agent tự làm xong' },
  DONE:          { open: false, human: false, dispatch: false, transient: false, label: 'xong' },
  DECIDED:       { open: false, human: false, dispatch: false, transient: false, label: 'đã quyết' },
};

/**
 * ALIAS: mọi biến thể đã / có thể xuất hiện → canonical.
 * Chỉ ghi ở ĐÂY. Consumer không được tự đoán thêm.
 *
 * Lưu ý chủ ý: `IMPLEMENTED_IN_CODE` và `INVESTIGATED` map về PENDING chứ KHÔNG về closed.
 * Cả hai đều mô tả "đã làm gì đó rồi" nhưng KHÔNG có ai ghi outcome — tức quyết định chưa
 * được đóng sổ. Coi chúng là đã-đóng chính là hành vi "đóng hộ" mà task #75 cấm.
 */
const ALIAS = {
  // --- đang mở, chờ ai đó nhìn ---
  PENDING: 'PENDING',
  OPEN: 'PENDING',
  PROPOSED: 'PENDING',
  PROPOSAL: 'PENDING',
  NEW: 'PENDING',
  QUEUED: 'PENDING',
  WAITING: 'PENDING',
  WAIT: 'PENDING',
  WAITING_HUMAN: 'ESCALATED',
  INVESTIGATED: 'PENDING',
  INVESTIGATING: 'IN_PROGRESS',
  IMPLEMENTED_IN_CODE: 'PENDING',
  // --- đang chạy ---
  IN_PROGRESS: 'IN_PROGRESS',
  INPROGRESS: 'IN_PROGRESS',
  DOING: 'IN_PROGRESS',
  WIP: 'IN_PROGRESS',
  // --- máy sinh trong 1 vòng dispatch ---
  READY_AUTO: 'READY_AUTO',
  PROCESSING: 'PROCESSING',
  // --- agent giơ tay xin người ---
  ESCALATED: 'ESCALATED',
  ESCALATE: 'ESCALATED',
  ESCALATE_HUMAN: 'ESCALATED',
  BLOCKED: 'ESCALATED',
  // --- đã đóng sổ ---
  RESOLVED: 'RESOLVED',
  RESOLVED_SLIP: 'RESOLVED_SLIP',
  SLIP: 'RESOLVED_SLIP',
  AUTO_DONE: 'AUTO_DONE',
  AUTODONE: 'AUTO_DONE',
  DONE: 'DONE',
  COMPLETE: 'DONE',
  COMPLETED: 'DONE',
  CLOSED: 'DONE',
  DECIDED: 'DECIDED',
  DECIDE: 'DECIDED',
};

const UNKNOWN = 'PENDING';   // fail-open: không nhận ra ⇒ vẫn coi là đang mở

/** Chuỗi thô → canonical status. Không bao giờ ném lỗi. */
function normalize(raw) {
  const k = key(raw);
  if (!k) return UNKNOWN;
  return ALIAS[k] || UNKNOWN;
}
/** true nếu status thô KHÔNG có trong từ điển (để cảnh báo, không để chặn). */
function isUnknown(raw) {
  const k = key(raw);
  return !k || !ALIAS[k];
}
function meta(raw) { return CANON[normalize(raw)]; }

/** Còn sống trong sổ (chưa đóng). */
function isOpen(raw) { return meta(raw).open; }
/** Đã đóng sổ. Nghịch đảo của isOpen — viết ra cho consumer đọc dễ. */
function isClosed(raw) { return !meta(raw).open; }
/** Dispatcher được route/spawn lại entry này không. CHỈ `PENDING` mới được. */
function isDispatchable(raw) { return meta(raw).dispatch; }
/** Trạng thái máy sinh trong 1 vòng dispatch (không phải ý chí của người/agent). */
function isTransient(raw) { return meta(raw).transient; }

/**
 * Có phải việc PO phải nhìn trên bảng chờ không.
 *
 * Luật: (còn mở) VÀ (không phải trạng thái máy) VÀ (D3+ HOẶC agent đã ESCALATE).
 * Vế `ESCALATED` là phần sửa cốt lõi của #75: một entry D2 mà agent đã giơ tay xin người
 * thì ĐÚNG NGHĨA là việc của PO — lọc theo D-level đơn thuần sẽ nuốt mất nó.
 *
 * @param {{dLevel?:string,status?:string}} e
 */
function isWaitingHuman(e) {
  const m = meta(e && e.status);
  if (!m.open || m.transient) return false;
  return m.human || levelNum(e && e.dLevel) >= 3;
}

const LEVELS = ['D0', 'D1', 'D2', 'D3', 'D4'];
/** D-level lạ → 3 (an toàn: thà báo PO thừa còn hơn tự làm nhầm). Khớp `lvl()` của dispatcher. */
function levelNum(d) {
  const i = LEVELS.indexOf(String(d == null ? '' : d).toUpperCase());
  return i < 0 ? 3 : i;
}

/** Gom thống kê 1 lượt cho mọi consumer dùng chung một con số. */
function tally(entries) {
  const t = { total: 0, open: 0, closed: 0, waitingHuman: 0, transient: 0, unknown: [], byCanon: {}, byRaw: {} };
  for (const e of entries || []) {
    t.total++;
    const c = normalize(e.status);
    t.byCanon[c] = (t.byCanon[c] || 0) + 1;
    const r = String(e.status == null ? '' : e.status);
    t.byRaw[r] = (t.byRaw[r] || 0) + 1;
    if (isOpen(e.status)) t.open++; else t.closed++;
    if (isTransient(e.status)) t.transient++;
    if (isWaitingHuman(e)) t.waitingHuman++;
    if (isUnknown(e.status)) t.unknown.push({ id: e.id, status: r });
  }
  return t;
}

module.exports = {
  CANON, ALIAS, UNKNOWN,
  key, normalize, isUnknown, meta,
  isOpen, isClosed, isDispatchable, isTransient, isWaitingHuman,
  levelNum, tally,
};
