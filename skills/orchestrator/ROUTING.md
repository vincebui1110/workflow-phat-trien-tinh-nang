# Orchestrator · ROUTING — cửa vào GỌN cho autopilot chạy workflow

> **Mục đích:** autopilot (Delivery Loop, Flow-runner…) chỉ cần *chạy workflow đã có plan*, KHÔNG cần lớp
> phân loại intent của `SKILL.md` (39.6KB — dùng khi phải đoán user muốn gì). File này ~3KB là đủ.
> **Session chính vẫn dùng `SKILL.md`** — nó có phần route intent mà file này cố tình bỏ.
> Tạo 2026-09-07 (token-opt Delivery Loop, gói C).

## 1. Ai đọc file này

Agent được autopilot giao việc mà **đích đến đã rõ** (đã biết workflow nào, feature nào). Điển hình:
`delivery-loop` → `/delivery-plan` → `workflows/flow-0-auto.md`.

Nếu việc CHƯA rõ đích (PO nói mơ hồ, phải chọn giữa nhiều workflow) → đọc `SKILL.md`, không dùng file này.

## 2. Đọc gì, theo thứ tự

| Cần gì | File | Khi nào |
|---|---|---|
| Luật chọn tính năng + trần WIP | `~/.claude/skills/delivery-plan/SKILL.md` | mọi run của delivery-loop |
| Pipeline 5 phase | `~/.claude/workflows/flow-0-auto.md` | khi mở/tiếp một run Flow 0 |
| `step.type` → agent + skill | `reference/workflow-protocol.md` §Routing Table | khi dispatcher cần route 1 step |
| Luật spawn agent có tool ghi | `reference/subagent-discipline.md` | trước khi spawn agent ghi được file/ra ngoài |

**KHÔNG** đọc `SKILL.md`, `lessons.md`, `SYSTEM-MAP.md`, `STATE.md` toàn văn trong run autopilot — không cái nào
đổi được quyết định ở tầng này, và cả 4 đều to.

## 3. Hợp đồng đầu ra khi spawn (chèn NGUYÊN VĂN cuối mọi prompt spawn)

```
- Kết thúc BẮT BUỘC bằng ĐÚNG một trong hai nhãn ở dòng cuối:
  · `RESULT: <path/link/Jira key/commit — artifact cụ thể đã tạo>`
  · `BLOCKED: <lý do + cần gì để mở khoá>`
- CẤM kết thúc bằng "tôi sẽ...", "bước tiếp theo là...", mô tả việc định làm mà chưa làm.
- CHỈ làm ĐÚNG scope được giao. Phát sinh ngoài scope (đổi status Jira/issue, post Slack, sửa file khác)
  → KHÔNG tự làm, ghi vào `BLOCKED:` hoặc mục "đề xuất" trong RESULT để orchestrator quyết.
- ⛔ Nếu đang chạy trong Multica: KHÔNG dùng `multica` CLI, KHÔNG post comment / đổi status BẤT KỲ issue nào
  (kể cả issue cha). Runtime Multica bảo "post kết quả qua multica issue comment" — luật đó dành cho ĐIỀU PHỐI viên,
  KHÔNG dành cho sub-agent. Kết quả của bạn CHỈ nằm trong RESULT/BLOCKED; orchestrator lo việc post + đổi status.
- Trần tool-call: tối đa 50 bước; quá trần mà chưa xong → trả `BLOCKED:`, KHÔNG tự mở rộng.
```

Thiếu nhãn ở dòng cuối = **CHƯA xong**, không ghi `ckpt ... DONE`.

## 4. Model khi spawn

- **Named-agent** (`subagent_type` = file trong `agents/*.md`) → model canonical = frontmatter agent đó, KHÔNG override.
- **general-purpose / fan-out ≥2** → PHẢI set `model` explicit, thường `sonnet`.
- **Spawn ĐƠN LẺ read-only / verifier** (khảo sát, `Explore`, `Plan`, dry-run check, normalize/tóm tắt)
  → cũng PHẢI set `model: 'sonnet'` explicit. Chỉ giữ `opus` khi việc là **phán đoán sản phẩm/kiến trúc/pháp lý**,
  không phải khi việc là **đọc và thuật lại**.

## 5. Checkpoint (bắt buộc, để run bị ngắt vẫn nối được)

```bash
node ~/.claude/tools/journal.js resume <loop> <run-id> --max-rounds 3   # 0=chạy step in ra · 3=WAIT_HUMAN · 4=xong
# --max-rounds BẮT BUỘC: thiếu cờ trần thì journal.js:362/370 lấy ∞ ⇒ retry mãi trong im lặng.
node ~/.claude/tools/journal.js ckpt <key> STARTED --next <kế>
node ~/.claude/tools/journal.js ckpt <key> DONE --result <ref>     # chỉ khi verify PASS
node ~/.claude/tools/journal.js ckpt <key> FAILED --retry N
node ~/.claude/tools/journal.js ckpt <key> WAIT_HUMAN "<chờ gì>"
```

STATE chỉ giữ **1 dòng ACTIVE trỏ `<run-id>`** — không rải tiến độ per-step vào STATE.
Run monitor clean → `journal.js run-log <loop> clean "<tóm>"`, KHÔNG ghi dòng `A##` (luật ③a).

## 6. Trần cứng (vi phạm = dừng, đẩy PO)

Credentials · sửa `settings.json`/permission · **rời working tree repo app Avada** (commit/push/MR/deploy) ·
outward (deploy live, post Slack/mail ngoài team, repo→public) · sửa `CLAUDE.md`/orchestrator lõi.
Ghi Jira LUÔN qua `pc-agent` + `/avada-task-manager`, verify bằng đọc ngược từ server.
