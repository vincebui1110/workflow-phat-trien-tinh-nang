# Automation Resume Protocol (A100 — port từ hermes append-only session-DB)

> Cơ chế resume-on-crash cho autopilot nhiều-bước. Dùng chung qua `~/.claude/tools/journal.js`.
> Triết lý hermes: **persist TRƯỚC mỗi step + DONE ngay SAU**; resume nhận diện step đã-xong
> bằng **NỘI DUNG (join-key)** — KHÔNG bằng số thứ tự. (Cùng họ với join-key title Multica anh đã dùng.)

## Khi nào dùng
- Autopilot có **≥3 step tốn kém** (BigQuery call, spawn agent, fetch) mà crash giữa chừng = phải chạy lại từ đầu.
- Đặc biệt cần cho step có **side-effect KHÔNG idempotent** (post Slack, gửi DM, tạo Jira) — journal + idempotency-key chống double-post.
- KHÔNG cần nếu autopilot chỉ 1 bước, hoặc đã tự-resume-bằng-content ở tầng thô (vd metrics tự backfill ngày thiếu — nhưng vẫn nên journal per-step để khỏi hit lại nguồn đắt).

## Định danh run
- `<loop>` = tag autopilot (vd `metrics-collect`, `support-check`).
- `<run-id>` = **join-key bền theo NỘI DUNG**, KHÔNG phải timestamp random. Ưu tiên **data-day** (`2026-07-20`) hoặc period-key. Cùng data-day chạy lại = cùng run-id → resume đúng.

## Key mỗi step = NỘI DUNG, không phải số thứ tự
Đặt key mã hoá "làm gì trên cái gì": `s1-revenue`, `s3-support`, `write-report:2026-07-20`.
Với backfill nhiều ngày: key PHẢI kèm data-day (`s1-revenue:2026-07-20`) để không lẫn giữa các ngày.

## Vòng chạy (mọi step tốn kém bọc 3 dòng)
```sh
J() { node ~/.claude/tools/journal.js "$@"; }
KEY="s1-revenue:$DATADAY"
if J is-done <loop> <run-id> "$KEY" >/dev/null 2>&1; then
  echo "SKIP $KEY (resume)"          # đã xong ở lần chạy trước → bỏ qua
else
  J start <loop> <run-id> "$KEY"     # persist TRƯỚC
  ... làm step ...                    # side-effect
  J done  <loop> <run-id> "$KEY"     # DONE NGAY SAU (dòng kế, không xen việc khác)
fi
```
Đầu run in tiến độ: `node ~/.claude/tools/journal.js status <loop> <run-id>`.

## ⚠️ CHỐNG DOUBLE-POST (bắt buộc cho step post Slack/DM/Jira)
Rủi ro: post xong → crash TRƯỚC khi ghi `done` → resume post lại. Chặn:
1. Key mã hoá **nội dung định danh** side-effect: `slack:<channel>:<hash8>` hoặc `dm:<user>:<ticket-id>`. Cùng nội dung = cùng key = resume nhận ra đã gửi.
2. `is-done` NGAY TRƯỚC khi post; done → SKIP.
3. `done` NGAY SAU khi post (cửa sổ crash tối thiểu).
4. Nếu autopilot đã có ledger dedup riêng (vd support-check open-tickets ledger) → journal là lớp BỔ SUNG, không thay thế; ưu tiên ledger content-dedup hiện có.

## Dọn
`node ~/.claude/tools/journal.js prune <loop> --days 30` (chạy cuối run hoặc trong cron dọn).

---

## v2 — Durable execution: FAILED / WAIT_HUMAN + `resume` (t115 Nhóm II, P0)

> Model cũ (`start`/`done`/`is-done`) CHỈ phân biệt được **đã-xong vs chưa**. Nó KHÔNG phân biệt
> "đã thử nhưng nguồn CHẾT" (vd A206: MCP bigquery mất) với "chưa chạy tới" → không biết nên
> **retry** hay **escalate**. v2 thêm 2 trạng thái + 1 lệnh đọc-1-phát, backward-compatible
> (start/done vẫn chạy y nguyên; `resume` đọc được cả journal cũ).

**Trạng thái mở rộng** (dùng qua `ckpt`, tổng quát hoá start/done):
`STARTED` (đang làm) · `DONE` (xong) · `FAILED` (thử nhưng lỗi → retry-edge) · `WAIT_HUMAN` (chặn, cần người) · `SKIP` (cố ý bỏ).

**3 lệnh v2:**
```sh
# ghi checkpoint giàu hơn: status + cạnh DAG (--next) + kết quả (--result) + đếm retry (--retry)
node ~/.claude/tools/journal.js ckpt <loop> <run-id> <key> <status> [--next a,b] [--result ref] [--retry N] [note]
# in (các) step CẦN CHẠY tiếp — thay cho vòng is-done thủ công. exit 0=actionable · 3=WAIT_HUMAN · 4=xong
node ~/.claude/tools/journal.js resume <loop> <run-id> --max-rounds 3
# ⚠️ LUÔN khai trần. `journal.js:362/370`: THIẾU cờ ⇒ maxRetry/maxRounds = ∞ ⇒ FAILED retry mãi,
#    im lặng, không ai biết. Doc này là bản mẫu người khác chép — dạng không-trần ở đây
#    truyền ∞ sang mọi caller. (SYS #90, 08-09; gác bởi `tools/stopcriteria-lint.js`.)
# soi chuỗi/DAG step của run bằng mắt
node ~/.claude/tools/journal.js run-graph <loop> <run-id>
```

**Vòng chạy v2 (step tốn kém + có thể FAIL nguồn):**
```sh
J(){ node ~/.claude/tools/journal.js "$@"; }
# Đầu run: đọc 1 phát xem còn gì phải làm (thay status + N lần is-done)
J resume <loop> <run-id>          # RESUME/RETRY/NEXT = làm; WAIT_HUMAN (exit 3) = dừng báo người; DONE (exit 4) = skip
# Mỗi step:
J ckpt <loop> <run-id> "$KEY" STARTED
if <gọi nguồn OK>; then J ckpt <loop> <run-id> "$KEY" DONE --result <ref>
else               J ckpt <loop> <run-id> "$KEY" FAILED --retry $((n+1)) "<lý do>"; fi
```

**Retry-edge:** step `FAILED` → lần chạy sau `resume` in `RETRY <key> retry=N`. Chính sách retry (mấy lần rồi escalate) do autopilot tự đặt: đọc `--retry` trong `run-graph`, quá ngưỡng → chuyển `WAIT_HUMAN`.

**Human-gate breakpoint:** khi cần người (vd ">3 tool fail → alert PO", hoặc chờ duyệt) → `ckpt <key> WAIT_HUMAN "<chờ gì>"`. `resume` trả exit **3** + in dòng WAIT_HUMAN → autopilot DỪNG đúng chỗ, surface STATE/Slack; phiên/run sau đọc lại thấy WAIT_HUMAN, KHÔNG chạy mù tiếp. Đây là "durable human-in-the-loop" — thay vì ghi "CHỜ PO" trong prose rồi mất mạch.

## v2.1 — II-C: retry-threshold + observability (t115 Nhóm II, chốt 2026-08-22)

> 2 mảnh vá reversible cho tầng nền durable, bổ sung `resume`/thêm `open`. Backward-compat hoàn toàn.

**1. `resume --max-retry N` — auto-escalate thay vì retry vô hạn.**
Trước: mọi step `FAILED` → `resume` in `RETRY` (exit 0) mãi; chính sách "mấy lần rồi dừng" do từng autopilot tự nhớ (metrics-collect làm tay ">3 FAILED"). Nay tập trung: step `FAILED` có `retry ≥ N` → in `ESCALATE <key>` + **exit 3** (human-gate) thay vì RETRY. Thiếu flag = `maxRetry=∞` = y như cũ.
```sh
J resume metrics-collect "$DD" --max-retry 3   # FAILED retry≥3 → ESCALATE exit 3 → dừng báo người
```

**2. `open [--days N=7]` — quét MỌI run tìm step treo.**
Trước: phải chạy `run-graph <loop> <run-id>` tay từng run mới biết con nào treo. Nay 1 lệnh quét toàn `runs/` → 1 dòng/run cho **rollup đầu phiên**:
```sh
node ~/.claude/tools/journal.js open            # RUN TREO: FAILED/WAIT_HUMAN/STARTED-dở trong 7 ngày
```
Bỏ qua `ledger.jsonl` (run-log ③a), chỉ soi file run-id có checkpoint DAG. **Đã chứng minh giá trị ngay khi build (22-08): lộ `s5-market` FAILED 5 ngày liền** trong metrics-collect (chôn trong file per-day, không ai thấy).
> ⚠️ Lưu ý tín-hiệu: step known-N/A lặp lại (vd s5-market = storeleads access-denied "thường lệ") nên ckpt `SKIP` (cố ý bỏ) thay vì `FAILED` để `open` khỏi nhiễu — `SKIP` không bị coi là treo.

## Trạng thái rollout
- Core helper `tools/journal.js`: DONE. v1 (start/done/is-done/pending/status/prune) + **v2 (ckpt/resume/run-graph)** test end-to-end (crash→RESUME, FAILED→RETRY, WAIT_HUMAN exit 3, DONE exit 4, run-graph).
- PoC #1: `metrics-collect` (steps idempotent → zero double-post risk) — đã nâng v2 (Step 0 + Error Handling). Xem `automation-metrics-collect.md` §Resume.
- Rollout post-heavy (support-check / release-note): dùng §Chống-double-post; làm khi PO soi cùng.
- Workflow tương tác (flow-0…6 dispatcher): checkpoint per-step = P2 (xem pattern trong workflow đó).
