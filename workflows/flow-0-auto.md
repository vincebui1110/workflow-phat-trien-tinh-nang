# Flow 0 — Auto BA (Full Pipeline)

## Trigger phrases
- "flow 0"
- "auto BA"
- "full flow"
- "chạy hết"
- "auto [feature]"
- "làm hết cho [feature]"

## Input required
- `feature_name`: tên feature (bắt buộc)
- `app_code`: CB / OL / AC / AV / FF / WF (hỏi nếu chưa rõ)
- `feature_type`: New Feature / New Function / Improvement (hỏi nếu chưa rõ)

> **Ai gọi Flow 0 (PO chốt 2026-09-07):** PO không còn giao lẻ từng tính năng. Nguồn gọi chuẩn là
> `~/.claude/skills/delivery-plan/SKILL.md` — nó đọc BACKLOG (bucket) + ROADMAP (quý/mốc) của app,
> chọn **tối đa 3 tính năng mỗi lần chạy** theo đúng thứ tự roadmap rồi giao xuống đây.
> Autopilot **Delivery Loop** (08:00 · 13:00 · 18:00 full scan + 20:00 resume+sync, giờ VN, assignee `orchestrator-agent`) gọi với `auto_accept: true` — PO tăng nhịp 2026-09-14.

### App code → repo path mapping
- OL → `order-limit/`
- CB → `cookie-bar/`
- AC → `accessibility/`
- AV → `age-verification/`
- FF → `sea-fraud-filter/`
- WF → `withdrawal-forms/`

> 2026-09-07: thêm FF + WF (trước đây thiếu 2 app này nên Flow 0 không chạy được cho chúng).
> KHÔNG hardcode path: resolve bằng `~/.claude/tools/backlog-files.sh resolve <CODE>` (backlog) và
> `~/.claude/tools/roadmap-files.sh resolve <CODE>` (roadmap) — cùng map `$PROJECT_DIRS` trong ENV.sh.

---

## Pre-flight: Đọc Feature Backlog — BẮT BUỘC TRƯỚC KHI CHẠY PIPELINE

Đọc file: `$(~/.claude/tools/backlog-files.sh resolve <app_code>)`
(= `${SHOPIFY_APP_DIR}/{app_repo}/docs/Feature Backlog/List feature.md` với app Avada)

Tìm row có `feature_name` khớp → extract và lưu vào biến:
- `backlog_description`: cột Description
- `backlog_note`: cột Note (quan trọng — chứa hướng dẫn đặc biệt, Figma link, constraints)
- `backlog_priority`: cột Priority
- `backlog_level`: cột Level

Truyền các biến này vào **tất cả** agent prompts trong pipeline (Phase 1 → Phase 4).
Nếu không tìm thấy → ghi chú "Not in backlog", tiếp tục bình thường.

---

## Execution Rules

⚡ **AUTO MODE** — Sau khi user duyệt plan (Phase 0), chạy 5 phase liên tục, BỎ QUA review của user mỗi cuối phase.
- **1 checkpoint DUY NHẤT ở Phase 0** (duyệt plan toàn cảnh trước khi fan-out). Sau `[ACCEPTED]` → không dừng checkpoint giữa các phase.
- Chỉ dừng khi gặp error, QA<60, hoặc `hard_gates` trong plan. **`hard_gates` phụ thuộc đường gọi** (PO chốt 2026-09-14):
  - **`auto_accept: true` (autopilot Delivery Loop)** → `hard_gates` RỖNG. Không hỏi dev assignee (để TRỐNG), không hỏi vị trí Notion, được push thẳng. Đường tự động phải chạy tới đích.
  - **PO gọi tay (`auto_accept: false`)** → giữ nguyên gate cũ: **hỏi dev assignee** + hỏi vị trí Notion như thường.
- Phase chạy tuần tự: 1 → 2 → 3 → 4 → 5, dispatcher chạy theo `steps` trong plan
- Nếu invoke bởi autopilot với `auto_accept: true` → bỏ qua cả checkpoint Phase 0

### Vòng fix → re-review (quy ước chung, generalize từ MOCKUP VERIFY GATE Phase 3.2)

> 🔴 **Vòng 2 trở đi, verify phải THU HẸP PHẠM VI — đây là luật, không phải gợi ý** (thêm 2026-09-07).
> **Vòng 1** = audit toàn văn, đúng như thiết kế. **Vòng 2+** = chỉ trả lời 2 câu về *thay đổi vừa thực hiện*:
> (1) issue đã nêu có đóng không (từng cái, kèm bằng chứng số dòng); (2) chính lần sửa đó có gây hồi quy không.
> Thấy vấn đề khác → ghi mục **"quan sát ngoài phạm vi"**, KHÔNG nâng thành BLOCK, KHÔNG kéo dài vòng.
>
> **Vì sao:** verify toàn văn lặp lại KHÔNG hội tụ. Mỗi vòng verifier đọc lại cả tài liệu bằng mắt mới nên
> luôn tìm ra thứ mới — không phải vì tài liệu tệ dần, mà vì bề mặt soi không bao giờ cạn. Ca thật:
> run `AC-full-site-scan-quota` chạy 5 vòng verify toàn văn, vòng nào cũng "đóng sạch block cũ + đẻ block MỚI",
> đốt 10 lượt spawn trên một bản PRD. Trần `--max-rounds 3` chặn *hậu quả*; luật thu-hẹp-phạm-vi này chặn *nguyên nhân*.
> Quyết định "có đáng audit toàn văn thêm một lượt nữa không" là việc của PO, không phải của verifier tự gia hạn cho mình.

Mọi step `fix` sau khi chạy xong PHẢI **quay lại step review/verify gốc** đã sinh ra issue (đúng cách mockup gate đang loop) cho tới khi **zero open issues** HOẶC chạm `guardrail.max_iterations` → ESCALATE_HUMAN. Maker KHÔNG tự chấm rồi đi tiếp — nguyên tắc loop-verifier "the implementer must never grade its own homework".
> Vòng fix chạy nền dài (non-interactive) có thể dùng `claude -p` với `/goal <điều kiện gradable>` làm hard stop condition (Claude Code ≥ 2.1.139).

### MVP Scope Lock
Sau khi PO approve research scope, BA Agent KHÔNG được tự thêm features ngoài scope. Nếu muốn đề xuất → ghi vào "Ngoài scope" với lý do. Chỉ unlock khi PO explicitly yêu cầu thay đổi scope.

### Scope Change Protocol
Khi PO yêu cầu thay đổi scope giữa flow (thêm/bỏ feature, tách PRD):
1. Ghi nhận thay đổi scope
2. Update PRD (BA Agent)
3. Update HTML mockup (Designer Agent) + Prototype (Dev Agent) — có thể song song
4. KHÔNG cần chạy lại research trừ khi PO yêu cầu
5. Tiếp tục flow từ phase hiện tại (không restart)

### Multi-PRD Support
Khi PO yêu cầu tách PRD:
1. Tạo N PRD files riêng biệt với cross-reference và dependency
2. UI mockup: vẫn 1 file HTML chứa tất cả screens (đánh số S1-SN liên tục)
3. Release Notes: tách theo PRD (N files)
4. Jira: có thể gộp hoặc tách tasks tùy PO quyết định
5. Notion: mỗi PRD push lên page riêng

---

## Pipeline

### Phase 0: Sinh Plan + Checkpoint (BẮT BUỘC, trước fan-out)

Sau Pre-flight (đã có `backlog_*`), TRƯỚC khi spawn agent đầu tiên:

1. **Sinh plan** theo `~/.claude/loop-upgrade/plan-schema.json`. Điền: `app`, `feature`, `feature_type`, `backlog`, `multi_prd` (nếu user yêu cầu tách), `exceptions` (ngoại lệ scope user chốt), `hard_gates`, và `steps` (5 phase — dùng `flow-0-plan.example.json` làm template, chỉnh theo feature thật). Set `has_enough_context` nếu research đã có sẵn → có thể skip step 1.1.
2. **In plan cho user duyệt** dạng bảng dễ đọc: feature/app/type, backlog findings, danh sách steps theo phase, các `hard_gates` sẽ bị hỏi, các `exceptions`.
3. **Chờ user** (giao thức chuẩn hóa):
   - `[ACCEPTED]` → ghi plan vào `STATE.md` mục ACTIVE → chạy dispatcher từ Phase 1.
   - `[EDIT_PLAN] <góp ý>` → chỉnh plan theo góp ý, in lại, hỏi lại.
   - Nếu `auto_accept: true` (autopilot) → bỏ qua bước 3, chạy luôn.
4. **Dispatcher (checkpoint bền — t115 Nhóm II P2, cơ chế `automation-resume-protocol.md` §v2):** route theo `step.type` qua routing table (xem orchestrator skill), truyền `step.mcp` whitelist + `result` các step trước. Tôn trọng `depends_on`/`parallel_group`/`conditional`. Step có `verifier:true` → chạy `loop-verifier` gate sau khi xong.
   - `<loop>` = `flow-0`. `<run-id>` = `<app>-<feature-slug>` (bền theo nội dung → chạy lại cùng feature = resume đúng chỗ, KHÔNG re-spawn agent đã xong).
   - **Đầu dispatcher + sau mỗi lần bị ngắt**: `node ~/.claude/tools/journal.js resume flow-0 <run-id> --max-rounds 3` — RESUME/RETRY/NEXT (exit 0) = chạy step in ra; WAIT_HUMAN/ESCALATE (exit 3) = có gate đang chờ PO, DỪNG; DONE (exit 4) = pipeline xong.
     🔴 **`--max-rounds 3` là BẮT BUỘC, đừng bỏ.** Vòng fix→re-review đúc key MỚI mỗi vòng (`prd-verify` → `prd-verify2` → …) nên mỗi key mang `retry=0` ⇒ `--max-retry` **không bao giờ chạm** và loop chạy vô hạn. Ca thật: run `AC-full-site-scan-quota` đốt 5 vòng verify + 5 vòng fix (10 lượt spawn) trên MỘT bản PRD trước khi có người nhìn vào. `--max-rounds` đếm theo GỐC key nên mới bắt được.
   - **Mỗi step**: `ckpt <key> STARTED --next <step-kế>` trước khi spawn → `ckpt <key> DONE --result <path/Jira>` khi verify PASS → nếu step/verify FAIL thì `ckpt <key> FAILED --retry N "<lý do>"` (retry-edge: vòng fix→re-review dưới đây đọc `--retry`, chạm `max_iterations` → chuyển WAIT_HUMAN).
   - **`--result` của `logistics` phải là chuỗi TÍNH ĐƯỢC, không phải chuỗi tự soạn**: lấy nguyên
     dòng `PUSH-EV: …` từ `tools/push-evidence.js` (xem Flow 5, bước GitLab). **Cấm dán commit HEAD
     của nhánh** — đó là commit cuối của bất kỳ việc gì vừa lên nhánh, không phải commit mang
     deliverable, và ghi nhầm nó là sai IM LẶNG (ca `FF-gdpr-compliance-block` 14-09). Công cụ
     EXIT=1 ⇒ ghi `FAILED`, KHÔNG ghi `DONE`.
   - **Số Jira task cũng phải ĐỌC NGƯỢC, không đếm theo trí nhớ**: `tools/jira-deliverable-check.js`
     (xem Flow 5, bước Jira) — EXIT=1 ⇒ `FAILED`. ⚠️ Cạm bẫy đã đo: **plan của run tự nó khai hụt**
     (`logistics WAIT_HUMAN` ghi "tao Jira dev task", số ít) nên mọi thứ tự-nhất-quán mà vẫn thiếu
     nửa deliverable. Đối chiếu với DOC, đừng đối chiếu với plan của chính mình.
   - Key theo NỘI DUNG: `research` · `research-review` · `prd` · `prd-review` · `design` · `design-verify` · `code` · `finish` · `logistics`.
   - Thay cho "ghi result/status vào STATE tay": STATE chỉ giữ 1 dòng ACTIVE trỏ run-id; tiến độ per-step nằm ở journal (đọc `run-graph flow-0 <run-id>` để soi). Giảm ghi-đè STATE giữa pipeline (chống va-chạm session).

### Phase 1: Research (Flow 1 — auto)
1. `po-agent`: Research → `docs/Research/RESEARCH_{FEATURE_NAME_UPPER}.md`
   - **Truyền vào prompt**: `backlog_description`, `backlog_note`, `backlog_priority`, `backlog_level`
   - Agent phải align research với Description, và follow các hướng dẫn trong Note
2. `qa-agent`: Review research → list issues
3. `po-agent`: Fix issues (nếu có) → update research file
→ **Không checkpoint** — tiếp Phase 2

### Phase 2: PRD (Flow 2 — auto)
1. `ba-agent`: Viết PRD → `docs/PRD/PRD_{FEATURE_NAME_UPPER}.md`
   - **Truyền vào prompt**: `backlog_description`, `backlog_note`, `backlog_priority`, `backlog_level`
   - PRD phải align với Description. Nếu Note có Figma link → tham chiếu khi viết UI Flow và Design Description.
   - **BẮT BUỘC check Impact Analysis** (PRD section 7): Pricing Plans, Settings page, Existing features, Help links, App listing — ghi kết quả vào PRD.
2. Team review song song (5 lens trực giao, maker `ba` KHÔNG review): `po-agent`(research-alignment) + `general-purpose`(merchant-advocate) + `qa-agent`(testability/edge, /review-prd) + `dev-agent`(feasibility) + `general-purpose`(/review-prd-1 adversarial-vs-code). Mỗi lens hoài nghi, ≥2 phát hiện cụ thể hoặc nói "chắc".
3. `ba-agent`: Update PRD theo feedback (gồm vs-code: vá giả định sai + ghi decision-ledger cho quyết định mắc kẹt trong code)
→ **Không checkpoint** — tiếp Phase 3

### Phase 3: Design UI (Flow 3 — auto)
1. `designer-agent` + `/design-avada-app`: Design HTML mockup (1 file duy nhất, interactive prototype) → `docs/UI-UX/{FEATURE_NAME_UPPER}/[file].html`
2. **MOCKUP VERIFY GATE (loop)** — chuẩn mạnh `~/.claude/skills/loop-verifier/mockup-standard.md` **profile `polaris`** (flow-0 chỉ chạy cho app Avada): Lens 0 technical pre-gate (fail-fast) + panel 3 lens độc lập (Completeness/UX/Design-system), PASS = /review-ui ≥90 + zero MAJOR + zero MINOR + render verified. REJECT → designer fix → verify lại (max 3 vòng) → quá thì ESCALATE_HUMAN. Chỉ qua gate mới sang code.
3. `dev-agent`: Code UI prototype vào app trên branch `prototype/[feature]` — React + Polaris thật, fake data
5. `designer-agent`: Review code Dev — kiểm tra thẩm mỹ + UX
6. Chạy app local để PO review trên localhost
→ **Không checkpoint** — tiếp Phase 4

### Phase 4: Finish (Flow 4 — auto)
1. `ba-agent`: Update PRD mục UI → thay UI phác thảo bằng bản chính thức
→ **Không checkpoint** — tiếp Phase 5

### Phase 5: Hậu cần (Flow 5 — cần input)
1. `pc-agent`: Push GitLab + Notion + Jira
   - ⚠️ **DỪNG hỏi user**: vị trí PRD trên Notion
   - Dev task assignee: **`auto_accept: true`** → để TRỐNG Dev assignees (PO tự assign sau), chỉ assign haptt (tester), KHÔNG hỏi. **PO gọi tay** → HỎI dev assignee như cũ
2. Report tất cả links
3. **Update backlog status → Done**: Sau khi Phase 5 hoàn thành, orchestrator tự update file `Feature Backlog/List feature.md` — đổi cột Status của `feature_name` từ `To do` → `Done`

---

## Final Report

```
🚀 AUTO BA COMPLETE — {feature_name}

━━━ Phase 1: Research ━━━
📄 docs/Research/RESEARCH_{FEATURE_NAME_UPPER}.md
📊 QA Score: [score]

━━━ Phase 2: PRD ━━━
📄 docs/PRD/PRD_{FEATURE_NAME_UPPER}.md
📊 QA Score: [score]
💬 Team consensus: [tóm tắt]

━━━ Phase 3: UI/UX ━━━
📄 docs/UI-UX/{FEATURE_NAME_UPPER}/[file].html
🌐 Đã mở Chrome
📊 QA Review: [status]

━━━ Phase 4: Finish ━━━
📄 PRD updated (UI chính thức)

━━━ Phase 5: Hậu cần ━━━
🔗 GitLab: [link]
📋 Notion: Research [link], PRD [link]
🎫 Jira: Dev [SB-XXX] (scope: dev deliverables), BA [SB-YYY] (scope: research + PRD + UI/UX)

✅ Feature {feature_name} đã hoàn tất pipeline.
Bạn có thể review từng document tại links trên.
```

---

## Error handling (checkpoint bền — P2)
- Phase fail → `ckpt <key> FAILED "<lý do>"` + DỪNG, báo user (không tiếp phase sau). Chạy lại pipeline: `resume flow-0 <run-id>` chỉ ra đúng phase FAILED để retry, các phase DONE trước đó KHÔNG chạy lại (không đốt lại agent research/PRD đã xong).
- QA score < 60 → `ckpt <key> FAILED --retry N` (vòng fix→re-review); chạm `max_iterations` → `ckpt <key> WAIT_HUMAN "QA<60 sau N vòng"` → DỪNG chờ PO quyết tiếp/redo.
- **Trần vòng CỨNG cho MỌI cặp fix→verify = 3** (không riêng mockup gate): vòng 4 trở đi phải `WAIT_HUMAN`, không tự chạy tiếp. Verify tìm ra lỗi MỚI ở vòng 4+ không có nghĩa là "sắp xong" — nó có nghĩa là verifier đọc lại toàn văn với mắt mới mỗi vòng, và việc đó không tự dừng. Người quyết dừng, không phải verifier.
- Phase 5 human-gate **CHỈ còn ở đường PO gọi tay**: `ckpt logistics WAIT_HUMAN "chờ PO chốt vị trí Notion + dev assignee"`, `resume` (exit 3) lần sau biết đang chờ input, KHÔNG tự publish mù.
- **Đường `auto_accept: true` KHÔNG treo WAIT_HUMAN ở Phase 5 nữa** (PO chốt 2026-09-14): push Notion + GitLab `feature/document` cứ chạy qua pc-agent, Dev assignees để trống. Treo lại chỉ khi pc-agent BÁO LỖI THẬT (push fail, Jira fail) — lúc đó là `FAILED`, không phải chờ người.
> Cùng pattern áp cho flow-1…6 (mỗi flow: `<loop>`=flow-N, `<run-id>`=feature-slug, key theo step của flow đó) — dùng chung protocol §v2, KHÔNG lặp lại chi tiết ở từng file.

## Rollback Rules
- Nếu Phase 3 (Design) phát hiện PRD thiếu/sai UI specs → DỪNG, rollback Phase 2:
  - `ba-agent` update PRD sections 3.3 (UI Flow) + 5 (Design Description)
  - Sau khi update → resume Phase 3 từ đầu
- Nếu Phase 4 phát hiện inconsistency giữa PRD↔UI → DỪNG, hỏi user:
  - Sửa PRD cho khớp UI? Hay sửa UI cho khớp PRD?
- User có thể yêu cầu "rollback to phase N" bất cứ lúc nào → dừng pipeline, quay lại phase N
> ⚠️ **Rollback PHẢI `ckpt <key> RESET` cho phase đích + MỌI phase sau nó** (kể cả human-gate của chúng), không chỉ ghi lại phase đích. `resume` chỉ lấy step *chưa có bản ghi*: phase sau còn `DONE` = pipeline nhảy qua, giữ nguyên output dựng trên input CŨ (probe 22-08 trên flow-product-build: rollback P2 → resume ra thẳng `NEXT P5`). `RESET` xoá hiệu lực checkpoint, ledger vẫn append-only.
