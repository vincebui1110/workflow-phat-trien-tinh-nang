# Orchestrator · reference — Plan-Review Protocol + Routing Table cho workflow Flow 0-6

> Tách khỏi `SKILL.md` ngày 22-08 (token-opt): phần này chỉ cần ở NGỮ CẢNH HẸP, nạp mỗi lượt route là phí.
> **ĐỌC khi: chạy workflow Flow 0-6 (có checkpoint / step.type cần map sang agent+skill).**
> Nguồn gốc + lịch sử quyết định: `SKILL.md` (lõi) · bản trước khi tách: `~/.claude/.token-opt-rollback-20260822/skills/orchestrator-SKILL.md.pre7`.

### 3c. Chạy workflow (multi-step — hybrid)

**Khi nào dùng:** Flow 0-6, flow-support, flow-sprint, etc.

```
1. Read ~/.claude/workflows/[file]
2. Extract params từ user message (hỏi nếu thiếu)
3. Thực thi từng Step:
   a. Xác định step này thuộc Tầng nào:
      - Step độc lập (research, review, push docs) → 3a Multica Issue
      - Step cần interaction (viết PRD, design UI) → 3b Local Agent
   b. Execute theo mode tương ứng
   c. Chờ output → VERIFY nhãn RESULT/BLOCKED + (nếu step có verifier) maker-checker gate PASS
   d. Báo cáo kết quả cho user (1 dòng gọn, KHÔNG chặn chờ)
   e. **Auto-chain (QĐ-3=B)**: đi thẳng Step kế — kể cả cross-agent handoff (po→ba→designer…). DỪNG chờ PO CHỈ khi: (i) step kế là hard-gate (credentials·permission·code app Avada·outward·self-mod); (ii) step hiện tại BLOCKED:; (iii) đẻ quyết định D3+ (**chạy `/debate-me` vặn TRƯỚC** → rồi ghi decision-ledger + surface STATE, đính lỗ hổng + asymmetry — xem Bước 2.5b); (iv) verify FAIL 2 vòng.
4. Chuyển sang Step tiếp
```

## Plan-Review Protocol (cho workflow Flow 0-6)

Áp dụng khi route tới một workflow nhiều step (đặc biệt Flow 0). Mục tiêu: user thấy TOÀN CẢNH kế hoạch trước khi fan-out spawn 20+ agent, duyệt 1 lần, rồi chạy auto.

**Luồng:**
1. **Sinh plan** theo `~/.claude/loop-upgrade/plan-schema.json` (template: `~/.claude/loop-upgrade/flow-0-plan.example.json`). Điền app/feature/type, backlog, steps theo phase, hard_gates, exceptions.
2. **In plan** cho user dạng bảng dễ đọc.
3. **Checkpoint** (giao thức chuẩn hóa, thay "confirm tự do"):
   - `[ACCEPTED]` → ghi plan vào `STATE.md` ACTIVE → chạy dispatcher.
   - `[EDIT_PLAN] <góp ý>` → chỉnh plan, in lại, hỏi lại.
   - `auto_accept: true` (autopilot) → bỏ qua checkpoint.
4. **Dispatcher loop (checkpoint bền — t115 Nhóm II)**: route theo `step.type` qua Routing Table dưới đây. Truyền `step.mcp` whitelist (CHỈ nạp MCP đó) + `result` các step trước. Tôn trọng `depends_on` / `parallel_group` / `conditional`. Guardrail `max_iterations` chống loop vô hạn ở vòng fix/review.
   - **Tiến độ per-step ghi vào journal, KHÔNG rải STATE**: `<loop>`=tên-workflow (vd `flow-0`), `<run-id>`=feature-slug bền-theo-nội-dung. Đầu dispatcher + sau mỗi lần bị ngắt: `node ~/.claude/tools/journal.js resume <loop> <run-id> --max-rounds 3` (exit 0=chạy step in ra · 3=WAIT_HUMAN dừng chờ PO · 4=xong; **cờ trần bắt buộc** — thiếu nó `journal.js:362/370` lấy ∞ ⇒ retry mãi trong im lặng). Mỗi step: `ckpt <key> STARTED --next <kế>` → khi verify PASS `ckpt <key> DONE --result <ref>`; FAIL → `ckpt <key> FAILED --retry N`; cần người → `ckpt <key> WAIT_HUMAN "<chờ gì>"`. Cơ chế đầy đủ: `automation-resume-protocol.md` §v2.
   - **Workflow có DAG cố định → dùng driver, KHÔNG cuộn tay**: `flow-product-build` lái bằng `tools/flow-dispatch.js next|done|fail <run-id>` (driver tự route + ghi ckpt; model chỉ spawn + verify thật). Workflow có step động (Flow 0 `plan-schema.json`) giữ vòng dispatcher mô tả ở trên.
   - **STATE chỉ giữ 1 dòng ACTIVE trỏ `<run-id>`** (không ghi-đè STATE giữa pipeline → giảm va-chạm session, đúng spine loại-B). Soi tiến độ per-step: `journal.js run-graph <loop> <run-id>`. Resume sau crash KHÔNG re-spawn agent đã DONE (tiết kiệm token).

### Routing Table — `step.type` → agent + skill (mặc định)

| type | agent | skill | ghi chú |
|------|-------|-------|---------|
| `brief` | ba-agent | — (PRODUCT-BRIEF.md theo `flow-product-build.md` P0/P2) | mục 3/4/5 hỏi PO trắc nghiệm; gate `loop-verifier/brief-standard.md` |
| `research` | po-agent | `/feature-research` (hoặc `/app-research`) | MCP: avada-bigquery (dataset `storeleads.*`), bigquery |
| `review` | qa-agent | `/review-research` \| `/review-prd` \| `/review-ui` \| `/review-user-story` | chọn theo đối tượng review |
| `prd` | ba-agent | `/prd` | |
| `design` | designer-agent | **route theo `type` dự án**: `avada-app` → `/design-avada-app` · `product`/`system`/`content` → `/design-app` · landing/marketing/brand (mọi dự án) → `/design-web` | tra `type` ở `PROJECTS.md`; gate `mockup-standard` profile `polaris` (avada) hoặc `general` (còn lại) |
| `content` | ba-agent | `/avada-user-guide` \| `/avada-release-note` | doc-writing (Flow 6) |
| `code` | dev-agent | `/dev` | Flow 0 Phase 3 (prototype) · flow-product-build P5 (run mode, code thật); >3 task → run mode; gate `code-standard` |
| `test` | (qa-test) | `/qa-test` | flow-product-build P6; gate `loop-verifier/test-standard.md`; dự án không-web → harness tự viết |
| `logistics` | pc-agent | `/avada-pc` | push GitLab+Notion; MCP: notion, jira |
| `jira` | pc-agent | `/avada-task-manager` | KHÔNG curl/MCP trực tiếp |
| `fix` | (cùng agent đã tạo output) | — | dùng agent của step gốc; **xong PHẢI quay lại step review/verify gốc re-check**, không tự đi tiếp |
| `verify` | qa-agent | `loop-verifier` | spawn verifier ĐỘC LẬP (input = artifact + rubric, KHÔNG truyền reasoning maker). Step ghi rõ `agent: self` vẫn override được — chỉ dành cho verify máy móc không cần phán xử (vd chạy app local) |
| `report` / `self` | self | — | orchestrator tự xử lý |

> `agent`/`skill` ghi rõ trong step sẽ override mặc định bảng này. Mỗi agent vẫn phải đọc SKILL.md gốc trước khi chạy (quy tắc cũ).
