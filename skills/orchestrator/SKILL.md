---
name: orchestrator
description: "Orchestrator — Phân tích lệnh user, chọn đúng workflow/skill/agent, spawn sub-agent. Kích hoạt TỰ ĐỘNG khi user đưa ra yêu cầu công việc."
---

# Orchestrator Skill

Skill này giúp tôi (parent agent) phân tích lệnh từ user, chọn đúng luồng xử lý, và spawn sub-agent phù hợp.

## Khi nào kích hoạt

Mỗi khi user đưa ra yêu cầu công việc (không phải câu hỏi đơn giản), chạy qua 4 bước:
0. **STATE** — CHỈ GHI, không đọc đầu phiên (PO chốt C′ 2026-09-10)
1. **PHÂN TÍCH** — xác định intent, extract params
2. **ROUTE** — chọn workflow hoặc agent + skill
3. **EXECUTE** — spawn sub-agent hoặc tự xử lý

## Bước 0: Đọc STATE (BẮT BUỘC, trước mọi việc)

State spine của hệ loop sống ở `~/.claude/STATE.md` (4 mục: ACTIVE / WATCH / NOISE / HUMAN OVERRIDES + `last_run`). Trước khi phân tích lệnh:

1. ~~Read `~/.claude/STATE.md`~~ — **BỎ** (PO chốt C′ 2026-09-10, SYS t102). Đầu phiên KHÔNG đọc STATE nữa: file ~530KB, đọc mỗi phiên là trùng việc + dính size-cap, mà phần lớn phiên không cần. Đọc **chỉ khi** anh hỏi trạng thái, hoặc đang nối tiếp đúng một việc dở đã biết id `A##`. Mục **5 (GHI STATE đầu việc lớn) giữ nguyên** — bỏ ĐỌC không phải bỏ GHI.
2. **Nối tiếp việc dở**: nếu lệnh user khớp một item ACTIVE đang `WAITING_HUMAN` → tiếp tục item đó (chi tiết đầy đủ ở `STATE-ARCHIVE.md` theo con trỏ `ARCHIVE#<id>` nếu ô STATE đã slim), KHÔNG tạo việc mới trùng.
   - **Định vị file/skill chưa chắc chỗ** → đọc `~/.claude/SYSTEM-MAP.md` (bản đồ spine files / skills theo nhóm / agents / workflows / docs per-app / vault / topology 2 máy) thay vì grep mò.
3. **Gapless cho việc theo thời gian**: nếu là quét theo thời gian (autopilot, monitor) → dùng cửa sổ `[last_run, now]` đọc từ frontmatter, KHÔNG fixed lookback (xem `feedback_automation_gapless_window`).
4. **Kill-switch**: nếu mục NOISE có dòng `PAUSE: all` hoặc `PAUSE: <loop-id>` khớp việc đang định chạy → DỪNG, báo user.
4b. **Chống xung đột file (song song) — route theo 3 loại GHI**: anh chạy 2-3 session + agent song song.
   - **≥2 agent cùng sửa SOURCE 1 repo** → spawn với **`isolation:'worktree'`** (Agent tool / Workflow `agent()`); sửa 1 app = worktree trong submodule app. KHÔNG LOCK. SOP: `${SHOPIFY_APP_DIR}/vault/operations/git-worktree-agent-isolation-sop.md`.
   - **Ghi SPINE** (STATE/ledger/memory/LOOPTASKS/vault) → KHÔNG worktree; append-only (`journal.js`) + Read-trước-Edit, sửa đúng dòng-của-mình.
   - **Ca không tách worktree được / dự án 1-file** → giữ `🔒 LOCK: <path>` trong STATE: trùng khoá session khác → **DỪNG hỏi anh**; là người sửa thì khoá TRƯỚC, gỡ khi xong; 1-file chạy tuần tự.
5. **GHI STATE NGAY ĐẦU VIỆC LỚN (BẮT BUỘC — không đợi xong)**: với bất kỳ việc nhiều bước / chạy lâu / có spawn agent / có thể bị ngắt giữa chừng → ghi 1 dòng ACTIVE trạng thái `IN_PROGRESS` + 1 block "Chi tiết" tối thiểu (nguồn/input, mục tiêu, bước đang làm) **TRƯỚC KHI bắt tay làm**, không chờ tới Bước 3. Lý do: STATE.md KHÔNG tự lưu — chỉ ghi khi mình chủ động Write/Edit; nếu session bị tắt trước khi ghi thì việc dở MẤT DẤU, phiên sau không surface được (xem `feedback_state_write_at_task_start`). Cập nhật dần trạng thái khi qua mốc; chỉ việc 1-bước/tức thì (trả lời nhanh, `cd`, đọc 1 file) mới được miễn.
   - **Việc dài ≥3 step tốn kém / có spawn agent nối tiếp (t115 Nhóm II)**: ngoài dòng ACTIVE, mở 1 run checkpoint (`node ~/.claude/tools/journal.js ckpt <loop> <run-id> …`) để crash giữa chừng resume đúng bước, KHÔNG chạy lại từ đầu. Dòng ACTIVE trỏ `<run-id>`; chi tiết per-step ở journal (`resume`/`run-graph`). KHÔNG bắt buộc cho việc 1–2 bước — đúng nguyên tắc "loop là graph đơn giản, đừng over-engineer". Cơ chế: `automation-resume-protocol.md` §v2.
   - **NGOẠI LỆ ③a (A100 — autopilot monitor clean-run KHÔNG vào bảng ACTIVE)**: nếu là run của autopilot MONITOR tần-suất-cao (support-check, competitor-watch, legal-watch, keyword-rank...) mà kết thúc KHÔNG sinh việc mở (clean, 0 ticket/0 action) → **KHÔNG ghi dòng A## vào ACTIVE**. Thay bằng `node ~/.claude/tools/journal.js run-log <loop> clean "<tóm 1 dòng>"`. CHỈ ghi dòng ACTIVE khi run sinh việc MỞ cần PO (ticket mới cần quyết / escalate / WAITING_HUMAN / multi-step dở). Việc lớn tương tác (research/PRD/build) vẫn ghi ACTIVE như thường. Mục tiêu: giữ bảng ACTIVE = việc MỞ thật, không phải nhật ký run (dùng `run-rollup` khi báo cáo đầu phiên).
6. Sau khi xử lý xong, ở Bước 3 phải **prune STATE** (xem cuối skill: "Cập nhật STATE sau khi xong").

## Bước 1: Phân tích lệnh

Extract từ câu user:

| Param | Cách extract | Ví dụ |
|-------|-------------|-------|
| `intent` | Hành động chính user muốn | research, viết PRD, support ticket, tạo task |
| `project_code` | Dự án liên quan — tra `~/.claude/PROJECTS.md` | "cookie bar" → CB (`avada-app`) · "game bóng đá" → FCM (`product`) · "khoá quant" → QNT (`content`) · "sửa skill/agent" → SYS (`system`) |
| `app_code` | **alias cũ của `project_code`**, chỉ dùng khi dự án là app Avada | "cookie bar" → CB |
| `feature_name` | Tính năng cụ thể | "data deletion notification" |
| `input_url` | URL đi kèm (Slack, Crisp, Notion, Jira) | https://avadaio.slack.com/... |
| `extra_context` | Thông tin bổ sung user cung cấp | "hẹn khách 3/4", "chỉ cần user story" |

Nếu thiếu param bắt buộc (`project_code` cho workflow, feature_name cho research/PRD) → hỏi user trước khi tiếp.

> **KHÔNG mặc định dự án là Avada.** Hệ này phục vụ MỌI dự án của anh, Avada chỉ là một `type`. Trước khi route, xác định `type` của dự án qua `PROJECTS.md` (`avada-app` / `product` / `content` / `system`) vì **`type` quyết định mức tự chủ**, không phải tên dự án:
> - `avada-app` → giữ nguyên toàn bộ luật hiện có (gate source code, Jira qua pc-agent, docs GitLab/Notion, gate outward).
> - `product` / `content` / `system` → **sửa source là D2, tự làm trọn**, không cần anh gõ "code"; KHÔNG tạo Jira (Jira chỉ dành cho Avada); không đẩy Notion/GitLab per-app; gate chỉ còn ở lúc ra ngoài (deploy live, publish, private→public).
> - Không suy được dự án từ câu lệnh → **HỎI**, đừng đoán.

## Bước 2: Route — Chọn luồng xử lý

### 2⚖️. Luật ưu tiên 2a (workflow) ↔ 2b (agent+skill) — ĐỌC TRƯỚC HAI BẢNG

Hai bảng dưới có nhiều intent **trùng chữ** ("viết PRD", "design UI", "chạy test", "support ticket").
Trước 22-08 mỗi bảng tự nhận, không có luật phân xử ⇒ cùng một câu route ra hai đích khác nhau tuỳ lượt
(eval `orchestrator-routing` bắt được 5/38 ca đúng kiểu này). Từ nay **chỉ có một đường quyết**:

1. Câu có **`flow N`** (flow 0–6), hoặc **"full" / "từ đầu tới cuối" / "làm hết"** → **2a workflow**. Hết, không xét tiếp.
2. Câu **gắn tracker** — **link Jira/Slack/Crisp hoặc ticket id cụ thể** — HOẶC **≥2 chặng giao nhau** ("test *rồi* báo lỗi", "viết PRD *rồi* giao dev") → **2a workflow**.
   > ⚠️ **"sprint" KHÔNG phải tín hiệu tracker.** Nó chỉ là *phạm vi thời gian* của hiện vật: "viết release note cho OL **sprint này**" vẫn là **một hiện vật** ⇒ 2b `ba-agent+/avada-release-note`. Chỉ khi việc **chính nó là cả sprint** ("retro + plan sprint N") mới là 2a. (Bản đầu của luật này liệt "sprint" vào tracker và làm tụt đúng ca đó — eval bắt được ngay, 22-08.)
3. **NGOẠI LỆ test/QA (PO chốt 22-08):** mọi lệnh **"test [X]" / "QA [X]" / "chạy test"** → **2a `testing.md`**, kể cả one-shot không ticket. Lý do: test luôn có chặng verify + báo kết quả, không có bản "một hiện vật" thật; `/qa-test` là skill workflow GỌI BÊN TRONG, KHÔNG phải đích route trực tiếp (trừ khi anh gõ thẳng `/qa-test`).
4. Còn lại — **một việc, một hiện vật, không tracker** → **2b agent+skill**.
5. Vẫn phân vân giữa đúng 2 đích → **`ask-clarify`**, nêu cả hai. KHÔNG đoán.

> Nói cách khác: **2a bán một CHUỖI có checkpoint, 2b bán một HIỆN VẬT.** Từ khoá trần ("viết PRD")
> mà không có tín hiệu 1–2 thì mặc định là 2b.

### 2a. Workflow (multi-step, có checkpoint)

| Intent matches | Workflow file | Params cần |
|---------------|---------------|------------|
| "flow 0", "auto BA", "full flow", "làm hết" | `flow-0-auto.md` | app_code, feature_name |
| "flow 1", "research [X]" | `flow-1-research.md` | app_code, feature_name |
| "flow 2", "PRD [X] rồi giao dev/push" — **CHỈ khi có tín hiệu 1–2 của luật 2⚖️**; nói trơ "viết PRD cho [X]" → 2b `ba-agent+/prd` | `flow-2-prd.md` | app_code, feature_name |
| "flow 3", "design UI [X] rồi review/giao dev" — **CHỈ khi có tín hiệu 1–2**; nói trơ "design UI mockup cho [X]" → 2b `designer-agent+/design-avada-app` | `flow-3-design.md` | app_code, feature_name |
| "flow 4", "finish PRD", "update PRD UI" | `flow-4-finish.md` | app_code, feature_name |
| "flow 5", "hậu cần", "push docs", "tạo task jira" | `flow-5-logistics.md` | app_code, feature_name |
| "flow 6", "documentation", "viết docs", "user guide + release note" | `flow-6-documentation.md` | app_code, feature_name |
| "báo cáo tình hình app" | `automation-1-report.md` | (none) |
| "daily monitor", "morning check", "sáng nay có gì" | `automation-daily-monitor.md` | (none) |
| "update KB", "cập nhật KB", "knowledge base" | `automation-kb-update.md` | (none) |
| "support ticket" / "analyze ticket" + **link Slack/Crisp** (có tracker ⇒ luật 2⚖️ nhánh 2) | `flow-support.md` | input_url |
| "test [X]", "QA [X]", "chạy test" — **MỌI lệnh test đều vào đây** (ngoại lệ 3 của luật 2⚖️), có ticket hay không | `testing.md` | ticket/feature |
| "chạy full business flow", "lifecycle business", "biz lifecycle", "khởi nghiệp đầy đủ", "build business từ đầu đến cuối" | `business-lifecycle.md` | step1_mode (A/B), idea info nếu A |
| "build [X] full", "flow product", "làm [X] từ đầu tới test", "full dev [X]" — CHỈ dự án `product`/`system` (avada-app → flow-0) | `flow-product-build.md` | project_code, feature_name |
| "retro + plan sprint N, N+1" | `flow-sprint.md` | sprint_N, sprint_N1 |
| "legal app", "luật app", "tình hình luật" | `automation-legal-app.md` | (none) |
| "legal general", "luật chung", "luật US EU", "market regulation" | `automation-legal-general.md` | (none) |
| "competitor deep", "đối thủ", "theo dõi đối thủ" | `automation-competitor-track.md` | (none) |
| "shopify news", "tin shopify", "shopify update" | `automation-shopify-news.md` | (none) |

**Khi match workflow:**
1. Read `~/.claude/workflows/[file]`
2. Thực thi từng Step theo thứ tự
3. Mỗi Step: spawn Agent → chờ output → VERIFY nhãn RESULT/BLOCKED (+ maker-checker gate nếu có) → **auto-chain sang Step kế** (QĐ-3=B: KHÔNG checkpoint PO giữa chừng, kể cả cross-agent). DỪNG chờ PO CHỈ ở: hard-gate (5 GATE) · step trả BLOCKED: · đẻ quyết định D3+ · verify FAIL 2 vòng.

### 2b. Direct agent + skill (single task, không cần workflow)

| Intent matches | Agent | Skill | Params cần |
|---------------|-------|-------|------------|
| Research thị trường toàn diện | `po-agent` | `/app-research` | app_code |
| Research tính năng cụ thể | `po-agent` | `/feature-research` | app_code, feature_name |
| Viết PRD đầy đủ ("viết PRD cho [X]" trơ — **mặc định ở đây**, xem luật 2⚖️) | `ba-agent` | `/prd` | app_code, feature_name |
| Viết User Story (nhỏ, không cần PRD) | `ba-agent` | `/user-story` | app_code, feature_name |
| Viết Release Note | `ba-agent` | `/avada-release-note` | app_code |
| Review research | `qa-agent` | `/review-research` | file path |
| Review PRD | `qa-agent` | `/review-prd` | file path |
| Review User Story | `qa-agent` | `/review-user-story` | file path |
| Review UI | `designer-agent` | `/review-ui` | file path |
| **chấm gu / nghi "vibe AI" / cổng cuối trước khi báo done mockup** | **`taste-critic-agent`** | — (đọc `design/AI-TELLS.md` + `design/REFERENCES.md`) |
| Design UI mockup ("design UI mockup cho [X]" trơ — **mặc định ở đây**, xem luật 2⚖️) | `designer-agent` | `/design-avada-app` | app_code, feature_name |
| Push GitLab + Notion | `pc-agent` | `/avada-pc` | file paths |
| Tạo Jira task | `pc-agent` | `/avada-task-manager` | summary, description |
| Technical review, code | `dev-agent` | `/dev` | app_code, feature_name |
| Phân tích support ticket | `support-agent` | `/avada-support` | input_url |
> **Support output = cho CS, KHÔNG phải merchant.** Message support-agent sinh ra là talking points để CS hành động; CS tự wording + dịch sang ngôn ngữ khách. KHÔNG viết bản nháp gửi thẳng merchant (không lời chào/chữ ký/dịch sẵn). Yêu cầu khách mơ hồ → đưa CS câu hỏi làm rõ cụ thể để hỏi lại, đừng đoán.
| Daily/monthly report | `leader-agent` | `/avada-leader` | (none) |
| Retrospective | `qa-agent` | `/retrospective` | (none) |
| QA test tính năng — ⚠️ **KHÔNG route thẳng vào đây**; `testing.md` gọi skill này bên trong. Chỉ dùng trực tiếp khi anh gõ đúng `/qa-test` | (qa-test) | `/qa-test` | ticket/feature |
| Estimate BA Point cho task | `po-agent` | `/avada-estimate-point` | Jira URL hoặc task key |
| Viết user guide / help article | (self) | `/avada-user-guide` | app_code, feature_name |
| Chụp screenshot staging app | (self) | `/screenshot` | app_code, mô tả |
| Research sâu / podcast / flashcards / study-guide từ ≥2 nguồn (PDF/URL/YouTube) | (self) | `/notebooklm` | topic, sources |
| Cross-sell banner analysis (đặt banner app A trong app B) | (self) | `/avada-cross-banner` | target_app, source_app |
| Sprint planning only, "plan sprint N", "lên kế hoạch sprint" | `leader-agent` | `/avada-sprint-planning` | sprint_number |
| Sprint retrospective only, "retro sprint N", "đánh giá sprint", "tổng kết sprint" | `leader-agent` | `/avada-sprint-retrospective` | sprint_number |
| Cày loạt task từ file / "chạy loạt task", "cày checklist", "looptasks", "chạy hàng đợi" | (self) | `/looptasks` | hàng đợi per-dự-án `LOOPTASKS.md` (resolve: `tools/looptasks-files.sh`) — skill tự spawn sub-agent cho từng task |
| Thêm việc vào hàng đợi / "thêm task", "add task", "ghi việc" | (self) | `/add-looptasks` | nội dung task (append đúng format, KHÔNG thực thi) |
| **Tài liệu tổng quan dự án** / "viết brief", "cập nhật brief", "mô tả tổng quan app", "onboard dự án" | (self) | `/brief` | `<dự án>/docs/BRIEF.md` (resolve: `tools/brief-files.sh`). ⚠️ BRIEF = *mô tả dự án*, KHÔNG phải hàng đợi việc |

> **Policy hàng đợi task (con trỏ, KHÔNG lặp):** task trong `LOOPTASKS.md` = **automation-first** — looptasks tự cày tới đạt mục tiêu, không bàn solution trước cho task nhỏ, cân bằng chất lượng↔cost; ngoại lệ = "quyết định lớn" (≈ D3/D4, **CHỜ PO chốt qua task-29**). Toàn văn ở `~/.claude/skills/looptasks/SKILL.md` mục "Policy: BRIEF queue = automation-first".

> **Routing tip:** Nếu user cần research đa nguồn (≥3 nguồn) HOẶC cần artifact phi-text (audio/slides/flashcards/study-guide), ưu tiên `/notebooklm` thay vì `/feature-research`. `/feature-research` vẫn dùng khi cần research theo template Avada (user stories, competitor matrix theo format).

### 2b-disambig. Từ đa nghĩa — chọn đúng đích (nguồn: routing eval 07-10, 4 cụm hay nhầm)

Khi lệnh chứa các từ dưới đây, ĐỪNG route theo từ khoá đơn — phân biệt theo ĐỐI TƯỢNG. Nếu vẫn mơ hồ → HỎI, đừng đoán.

| Từ | → đích A | → đích B / C |
|----|---------|-------------|
| **daily** | "bắt đầu ngày mới / ghi note / ưu tiên hôm nay" (cá nhân, vault) → `/daily` | "sáng nay có gì / morning check / monitor app" (metrics) → `automation-daily-monitor.md` |
| **retro** | "sprint N / đánh giá sprint / tổng kết sprint" → `/avada-sprint-retrospective` · "bài học từ transcript/session" → `conversation-retro` | "review chất lượng output/doc đã tạo" → `/retrospective`. **"retro" trơ 1 từ → HỎI** |
| **push** | "push docs / research / PRD" (artifact sản phẩm) → `pc-agent /avada-pc` | "push config/claude" → `/push-config` · "push vault" → `/push-vault` · "push backlog" → `/push-backlog` · "push hết / sync all" → `/sync-all` |
| **test / QA** | **mọi lệnh test/QA → workflow `testing.md`** (ngoại lệ 3, luật 2⚖️) | `/qa-test` chỉ chạy TRONG `testing.md`, hoặc khi anh gõ thẳng tên skill |
| **report app** | "tổng tình hình các app / portfolio" → `automation-1-report.md` | metrics 1 app cụ thể → `app-tracking-agent /avada-app-tracking` |

### 2b-ngoài-Avada. Route cho dự án `product` / `content` / `system`

Bảng 2b ở trên viết cho `avada-app`. Với dự án khác, **agent và skill vẫn dùng lại được** — chỉ khác là truyền `project_code` + path từ `PROJECTS.md` thay cho app_code, và **bỏ phần hậu cần riêng của Avada**.

| Intent | Đích | Ghi chú |
|---|---|---|
| **Build full 1 feature/sản phẩm từ đầu tới test** ("build X full", "flow product") | workflow **`flow-product-build.md`** | Pipeline 8 phase P0-P7 (brief→research→PRD→design→code→test→handoff), 1 checkpoint PO duy nhất sau P2. P5 gọi `/dev` run mode, gate mọi phase = loop-verifier |
| Code / thêm tính năng / sửa bug trong repo dự án | **(self)** — tự làm trọn, không cần anh gõ "code" | Việc lớn/nhiều giờ mới cân nhắc `dev-agent`. ≥2 agent sửa source song song → `isolation:'worktree'`; đơn lẻ/1-file → khoá file (xem Bước 4b). >3 task theo plan → `/dev --run` (run mode có state/resume) |
| Viết spec / PRD / GDD cho sản phẩm riêng | `ba-agent` + `/prd` | Bỏ mọi mục Jira/Notion trong template |
| Design UI **sản phẩm** (game, desktop app, portal, tool nội bộ) | `designer-agent` + `/design-app` | KHÔNG Polaris. Chưa có design system → chốt token trước rồi mới dựng màn. Gate: `mockup-standard` profile `general` |
| Design landing / marketing / brand / poster | `designer-agent` + `/design-web` | Trang **bán** sản phẩm, khác với UI **là** sản phẩm |
| QA / test | `/qa-test` | |
| Review chất lượng doc | `qa-agent` + `/review-*` | |
| Research thị trường cho startup / sản phẩm riêng | `po-agent` + `/app-research`, hoặc `biz-1-ideas`…`biz-4-scale` | |
| Viết nội dung / bài học / social | `copywriter-agent`, `/content-writing` | |
| Sửa skill / agent / workflow / tool của chính hệ (`SYS`) | **(self)** | Chạm `CLAUDE.md` hoặc orchestrator lõi = GATE self-mod → hỏi anh trước |
| Ghi vault | skill chuyên trách (`/daily`, `/decision`, `/tldr`, `/sync-market-picks`) | KHÔNG Write ad-hoc |

**KHÔNG áp cho dự án ngoài Avada** (những thứ này gắn chặt hạ tầng Avada, dùng nhầm là tạo rác):
`/avada-task-manager` (Jira) · `pc-agent /avada-pc` (GitLab + Notion per-app) · `/avada-support` (Crisp) · `/avada-app-tracking` · `/avada-sprint-planning` · `/avada-sprint-retrospective` · `/avada-release-note` + `/avada-user-guide` bản help-center · `/avada-cross-banner` · workflow `flow-0`…`flow-6`, `automation-*` app. (Pipeline cho dự án ngoài Avada = `flow-product-build.md` — chiều ngược lại nó TỪ CHỐI `avada-app`.)

**Hạ tầng Avada-only — chốt (PO xác nhận 25/07): `Jira` · `Notion` · `Slack` · `GitLab docs` · `Crisp`.** Dự án `product`/`content`/`system` TUYỆT ĐỐI không tạo Jira task, không đẩy Notion page, **không post Slack** (kể cả notify/xin review/báo release), không push docs GitLab per-app. Lý do: đầu bên kia là người thật của công ty — đẩy việc cá nhân vào đó là tạo nhiễu cho team và làm bẩn tracker. Thay bằng: tiến độ → **STATE.md** (+ vault nếu dài hạn) · tài liệu → file `.md` trong chính repo dự án · báo cáo → nói thẳng với anh trong chat.
*Ngoại lệ 1 chiều:* **ĐỌC** Slack để lấy tư liệu về vault (vd `/sync-market-picks`) vẫn được — cấm là cấm GHI/POST/TẠO.

### 2c. Tự xử lý (không cần sub-agent)

| Intent | Hành động |
|--------|----------|
| `cd /avada` | Chuyển tới root project `${SHOPIFY_APP_DIR}/`, KHÔNG cần confirm. Sau đó chạy bash: `source ~/.claude/session-id.sh && mkdir -p ~/.claude/sessions && echo "Shopify app" > ~/.claude/sessions/$(get_session_id).current-app` |
| `cd /XX` (app code) | Chuyển tới folder app con, KHÔNG cần confirm. Mapping: CB→cookie-bar, OL→order-limit, AC→accessibility, AV→age-verification, FF→sea-fraud-filter, WF→withdrawal-forms. Path: `${SHOPIFY_APP_DIR}/{folder}`. Sau đó chạy bash: `source ~/.claude/session-id.sh && mkdir -p ~/.claude/sessions && echo "{folder}" > ~/.claude/sessions/$(get_session_id).current-app` (ví dụ: `source ~/.claude/session-id.sh && echo "accessibility" > ~/.claude/sessions/$(get_session_id).current-app`) |
| Câu hỏi, giải thích, trả lời nhanh | Trả lời trực tiếp |
| Đọc/tìm file trong codebase | Dùng Read/Glob/Grep |
| Git commands | Dùng Bash |
| Hỏi về hệ thống agent/workflow/skill | Trả lời từ kiến thức config |
| Update config, settings, memory | Tự làm |
| Slack message đơn giản | Dùng MCP tools trực tiếp |

> **Tin gửi dưới tên anh (xoxp) → đọc `~/.claude/VOICE.md` TRƯỚC khi soạn.** Mọi tin post ra ngoài dưới danh tính anh (Slack + nền tảng khác) phải viết theo giọng anh trong VOICE.md (ngắn, thân mật, nhé/nha/ạ, không trịnh trọng). Ngoại lệ: tin gửi thẳng merchant do CS wording — không áp giọng anh (xem note support ở trên).

> **Link mạng xã hội cần fetch** (match domain → MCP/actor APify) → `reference/social-fetch.md`.

## Bước 2.5: Quality Gate — tự soi trước khi cam kết (AUTO — debate-me chỉ D3+ decisions)

> 2 skill tư duy tự kích hoạt TẠI ĐÂY để nâng chất lượng — KHÔNG chờ anh gọi tay. Nguyên tắc: **tự chạy đúng ngưỡng, IM LẶNG khi hiển nhiên**. Chạy khắp nơi = nghi thức hoá (analysis-paralysis), đúng cái 2 skill này cấm. **NONE / bỏ qua là kết quả hợp lệ.**

**a. `/thinking-lens` — chọn khung khi CHƯA rõ cách soi.**
Kích hoạt khi: task dạng analyze / decide / optimize mà **Bước 2 KHÔNG match skill chuyên trách nào rõ ràng** (hoặc match mơ hồ) VÀ stakes không tầm thường (chạm quyết định / nguồn lực / hướng đi).
→ Chạy `/thinking-lens` chọn 1 lens (bottleneck · second-order · opportunity-cost · JTBD…) rồi mới giải. Trả NONE → suy luận thẳng.
Bỏ qua khi: đã có skill khớp rõ (support/research/prd…) hoặc cách giải hiển nhiên.

**b. `/debate-me` — vặn 1 quyết định TRƯỚC khi cam kết.**
Kích hoạt khi việc sắp chốt một quyết định **D3+** (khó đảo / chiến lược tổng bộ) — TRƯỚC khi ghi decision-ledger + surface STATE.
→ Chạy `/debate-me`, đính "lỗ hổng lớn nhất" + bảng asymmetry vào decision-ledger / báo cáo cho anh.
**KHÔNG kích hoạt cho (PO chốt 30-07):**
- **Việc logistics/thực thi của pc-agent** — tạo Jira, push docs GitLab/Notion, Slack notify, deploy. Đây là *thực thi* một quyết định ĐÃ chốt, không phải quyết định mới → vặn ở đây là nghi thức hoá.
- **Lúc chốt PRD / giao dev** — đã có `review-prd` (soi doc) + `review-prd-1` (adversarial-vs-code, soi spec vs origin branch) lo phần soi spec.
Bỏ qua luôn: quyết định D1-D2 đảo được dễ, hoặc đã qua debate-me trong cùng mạch.

**c. Idea mới → pressure-test.** Khi anh nêu 1 idea mới (kinh doanh / sản phẩm / tính năng) hoặc vào `/biz-1-ideas` → chạy `/thinking-lens` (JTBD + opportunity-cost + second-order) và `/debate-me` để vặn TRƯỚC khi score/commit — chống bias "idea nghe hay". (Chi tiết trong `/biz-1-ideas`.)

**d. CEO adjudication — quyết định CẦN THỰC HIỆN đi qua `ceo-agent` (T98 Q1=B).** Khi 1 agent-employee (hoặc chính orchestrator) đẻ ra **quyết định cần thực hiện** (không phải chỉ report), gọi `ceo-agent` (Agent tool `subagent_type: ceo-agent`) adjudicate TRƯỚC khi thực thi:
- **D0–D2** (đảo được, nội bộ) → CEO **tự chốt + route/thực thi** trong guardrail (chỉ `~/.claude`, outward vẫn qua pc-agent), để lại vết STATE+audit-log cho PO veto. Auto-chain KHÔNG dừng chờ PO ở mức này.
- **D3+** (khó đảo / outward / chạm 5 GATE / chiến lược) → CEO **KHÔNG tự làm**, ghi `.decisions-ledger.json` + surface `STATE.DECISIONS PENDING` kèm **khuyến nghị** → chờ PO (PO=D4 cuối). Đây chính là stop-condition "đẻ quyết định D3+" ở auto-chain (Bước 2.5b + `/debate-me` vặn trước vẫn áp).
- **Đóng vòng ratchet (① P2, wire 2026-08-14) — BẮT BUỘC khi PO xử lý xong 1 entry `D-...` trong `DECISIONS PENDING`:** ngay sau khi PO duyệt/bác/sửa 1 quyết định, NGOÀI thực thi/prune, gọi `node ~/.claude/tools/decision-dispatch.js resolve <id> --outcome <o>` với `<o>` = `approved-as-proposed` (gật y nguyên) · `approved-with-edit` (gật nhưng phải sửa) · `vetoed` (bác) · `reverted` (đã làm rồi phải lùi). → ghi outcome vào `type_registry` để ratchet đếm streak theo `decisionType`. Bỏ bước này = ratchet đứng shadow mãi (không data). **Trường hợp riêng:** nếu entry được duyệt là 1 đề xuất `[RATCHET]` (source `ratchet-graduate`) → sau `resolve` gọi thêm `decision-dispatch.js graduate-accept <type>` để hạ loại việc đó xuống D2. Cơ chế đầy đủ: `automations/decision-dispatch/RATCHET.md`.
CEO KHÔNG thay orchestrator (orchestrator route CÔNG VIỆC, CEO phán QUYẾT ĐỊNH) và KHÔNG sửa self-mod (CLAUDE.md/orchestrator/settings = D4). Cron `decision-dispatch` spawn CEO async cho entry D0–D2 khi `DECISION_AUTOEXEC` bật.

## Bước 3: Execute (Hybrid Model — Multica + Local)

> **Chi tiết hàng đợi autopilot ngoài** (delegate orchestrator-agent · fire-and-forget issue) — KHÔNG kèm trong bộ Flow 0 này (hạ tầng riêng của từng máy).
> Đọc file đó TRƯỚC khi tạo issue Multica. Local agent (3b) + workflow (3c) + tự xử lý (3d) giữ ngay dưới đây.

### 3b. Local Agent (interactive — cần user trong loop)

**Khi nào dùng:** Task cần checkpoint, user confirm, hoặc hiển thị output ngay.

| Task type | Lý do giữ local |
|---|---|
| Viết PRD | Cần confirm scope trước khi viết |
| Viết User Story | Cần confirm scope |
| Design UI mockup | Cần mở HTML cho user xem ngay |
| Support ticket analysis | Cần user approve trước khi respond |
| Viết Release Note | Cần user review draft |
| QA test | Cần browser interaction + live tracker |
| Screenshot | Cần browser automation local |
| User guide | Cần screenshot + review loop |
| NotebookLM | Cần user chọn sources |
| Cross-banner | Cần user confirm analysis |

**Flow (giữ nguyên):**
```
TRƯỚC KHI SPAWN, PHẢI:
1. Đọc file ~/.claude/agents/{subagent_type}.md
2. Paste TOÀN BỘ nội dung agent definition vào đầu prompt
3. Nếu agent có skill tương ứng (ví dụ: designer-agent → /design-avada-app | /design-app | /design-web tuỳ `type` dự án, ba-agent → /prd):
   → Thêm dòng BẮT BUỘC vào prompt: "Đọc và thực thi theo ~/.claude/skills/{skill}/SKILL.md TRƯỚC KHI bắt đầu"
   → KHÔNG tóm tắt skill trong prompt — agent phải tự đọc file gốc
4. Thêm task context sau phần definition:
   - feature_name, app_code
   - input_url (nếu có)
   - extra_context từ user (NGUYÊN VĂN — không diễn giải)
   - File paths liên quan (nếu đã biết)
5. KHÔNG thêm quyết định design/technical mà user không nói
   - Ví dụ SAI: "Onboarding là full-page flow, KHÔNG nằm trong admin shell"
   - Ví dụ ĐÚNG: truyền nguyên văn user nói, để skill + agent tự quyết

PROMPT STRUCTURE:
"""
[TOÀN BỘ nội dung từ ~/.claude/agents/{agent}.md]

BẮT BUỘC: Đọc và thực thi theo ~/.claude/skills/{skill}/SKILL.md trước khi bắt đầu.

---
TASK: [mô tả task]
App: [app_code]
Feature: [feature_name]
Input: [url hoặc context]
Extra: [yêu cầu bổ sung từ user — NGUYÊN VĂN]

HỢP ĐỒNG ĐẦU RA (BẮT BUỘC — chèn NGUYÊN VĂN cuối mọi prompt spawn):
- Kết thúc BẮT BUỘC bằng ĐÚNG một trong hai nhãn ở dòng cuối:
  · `RESULT: <path/link/Jira key/commit — artifact cụ thể đã tạo>`
  · `BLOCKED: <lý do + cần gì để mở khoá>`
- CẤM kết thúc bằng "tôi sẽ...", "bước tiếp theo là...", mô tả việc định làm mà chưa làm.
- CHỈ làm ĐÚNG scope được giao. Phát sinh ngoài scope (đổi status Jira/issue, post Slack, sửa file khác) → KHÔNG tự làm, ghi vào `BLOCKED:` hoặc mục "đề xuất" trong RESULT để orchestrator quyết.
- Trần tool-call: tối đa [N, mặc định 50] bước; quá trần mà chưa xong → trả `BLOCKED:`, KHÔNG tự mở rộng.
"""
```

> **Chạy workflow Flow 0-6** (3c hybrid · Plan-Review Protocol · Routing Table `step.type` → agent+skill) → `reference/workflow-protocol.md`. Đọc TRƯỚC khi khởi động bất kỳ Flow nào.

### 3d. Tự xử lý

Không spawn agent. Dùng tools trực tiếp (Read, Grep, Bash, MCP, etc.)

### Model routing khi spawn (tiết kiệm usage - pain #1)

Nguyên tắc: giá trị của worker/verifier đến từ **tính độc lập + rubric + tool đúng**, KHÔNG phải model to. Đừng đốt model đắt cho việc rẻ.

| Vai | Model | Ví dụ |
|-----|-------|-------|
| Orchestrator / main loop | mặc định session (không đổi) | phân tích, tổng hợp, quyết định |
| Worker bulk (fan-out, mechanical, chạy lệnh) | `sonnet` | qa-test 3 agents Playwright, sweep docs, format |
| Grader / verifier | check deterministic → script/`haiku` · lens judgment → `sonnet` | loop-verifier, review-* |
| Hard subtask (architecture, complex debug) | `opus` | dev khó, root-cause sâu |

Luật spawn:
- Spawn **named-agent** (`subagent_type` = agent trong `agents/*.md`): model canonical = frontmatter file agent đó — KHÔNG override trái frontmatter.
- Spawn **general-purpose / fan-out ≥2 agent**: PHẢI set `model` explicit (thường `sonnet`), KHÔNG để inherit model session.
- **Spawn ĐƠN LẺ read-only / verifier: cũng PHẢI set `model: 'sonnet'` explicit** (PO duyệt 22-08, token-audit).
  Áp cho: khảo sát/inventory/investigation "CHỈ ĐỌC" · `Explore`/`Plan` · dry-run checker · `loop-verifier` ·
  normalize/format/tóm tắt. Lỗ hổng đo được: luật cũ chỉ ép khi fan-out ≥2 nên mọi spawn read-only ĐƠN LẺ
  rơi về model session (Opus) — 7 ngày tốn ~260 $ cho việc cơ học. Chỉ giữ Opus khi việc là **phán đoán
  sản phẩm/kiến trúc/pháp lý**, không phải khi việc là **đọc và thuật lại**.
- **Multica fleet**: model nằm trong agent config phía Multica (`multica-backup/agents/*.json` là mirror của live). Đổi tier fleet = quyết định PO (HUMAN OVERRIDE 07-04 giữ Opus) — KHÔNG tự đổi, chỉ đề xuất qua runbook.

### Kỷ luật sub-agent (A100) — 4 luật, chi tiết ở `reference/subagent-discipline.md`

**KHÔNG tin sub-agent tự kiềm chế — chặn bằng CẤU TRÚC:**
1. **advisor ≠ executor** — việc research/PRD/review spawn bằng agent-type KHÔNG có tool ghi (`Explore`/`Plan`); chỉ `pc-agent` được ghi ra ngoài.
2. **Hợp đồng `RESULT:`/`BLOCKED:`** — thiếu nhãn ở dòng cuối = CHƯA xong, không ghi DONE.
3. **Trần bước subagent < parent** (≈50 tool-call); cần nhiều hơn → chẻ nhỏ.
4. **Verify git state SAU khi spawn dev/code agent** — dev-agent có thể phớt "KHÔNG push".

Đọc `reference/subagent-discipline.md` trước khi spawn agent có tool ghi.

### Quy tắc chọn mode

```
IF task độc lập + output là file/report + không cần user confirm giữa chừng:
  → 3a Multica Issue

ELSE IF task cần user interaction / checkpoint / browser / hiển thị ngay:
  → 3b Local Agent

ELSE IF multi-step workflow:
  → 3c Workflow (mỗi step tự chọn 3a hoặc 3b)

ELSE:
  → 3d Tự xử lý
```

## Cập nhật STATE sau khi xong (Bước 3 hoàn tất)

Sau khi hoàn thành / dừng một việc, PHẢI cập nhật `~/.claude/STATE.md` (chỉ sửa dòng của mình + set `updated_by`, KHÔNG rewrite cả file):

- **Việc xong** → chuyển item khỏi ACTIVE, nếu là quét thời gian thì set `last_run = now`.
  - **RULE CHỐNG PHÌNH (giữ STATE nhẹ để đỡ tốn token mỗi session — STATE auto-load ~mọi lệnh):** KHÔNG để item DONE nằm lại bảng ACTIVE với chi tiết đầy đủ. Khi đánh dấu xong: cắt chi tiết dài của item DONE ra `~/.claude/STATE-ARCHIVE.md` (thêm mục `## <id> — <tên> — DONE <ngày>` + toàn văn chi tiết), rồi trong STATE.md chỉ để 1 dòng con trỏ trong khối "Đã DONE → archive" (id + tên ngắn + ref quan trọng như commit/Jira). Item DONE quá 24h → bỏ hẳn khỏi bảng, gộp vào dòng pointer đó. Nếu còn việc user phải làm sau khi archive (rotate key, /push-config, restart…) → ghi 1 dòng ngắn ở khối "PENDING USER" hoặc WATCH, KHÔNG giữ nguyên cả block detail.
  - **Ô "chờ gì" của item CÒN active giữ ≤ 2-3 câu** (live state + bước kế). Lịch sử/verify score/bug history dài → đẩy sang `STATE-ARCHIVE.md` dưới cùng id, để con trỏ `Chi tiết: ARCHIVE#<id>`. Mục tiêu: STATE.md ≤ ~2.5k token.
- **Việc dở, chờ người** → để ở ACTIVE, set trạng thái `WAITING_HUMAN` + ghi rõ "chờ gì".
  - **RULE CỨNG (khép khe hở tắt-session):** TRƯỚC KHI (hoặc ngay trong cùng lượt) gửi bất kỳ yêu cầu review/duyệt/chốt nào cho user → PHẢI Edit STATE set item đó `WAITING_HUMAN` + "chờ gì" NGAY, KHÔNG để sau khi user trả lời. Thứ tự bắt buộc: **Edit STATE trước → rồi mới nhắn xin review.** Lý do: STATE không tự lưu. Hook `Stop` (`hooks/state-write-guard.sh`, thêm 07/2026) chỉ NHẮC 1 lần/session khi phát hiện việc lớn chưa ghi STATE — nó KHÔNG ghi hộ; nếu user tắt session sau khi mình xin review nhưng trước khi mình ghi STATE → việc biến mất, phiên sau không surface được. Áp cho MỌI việc cần review kể cả việc nhỏ 1-bước (việc nhỏ được miễn ghi `IN_PROGRESS` đầu việc, NHƯNG không được miễn ghi `WAITING_HUMAN` khi xin review).
- **Việc cố ý không làm** → ghi 1 dòng vào NOISE kèm lý do (để loop/lần sau không xét lại).
- **User đè quyết định loop** → ghi 1 dòng vào HUMAN OVERRIDES.
- **Việc mới phát sinh chưa tới lượt** → ghi vào WATCH kèm điều kiện kích hoạt.
- **Việc anh phải LÀM TAY (không phải quyết định)** → ghi vào lane `## 👤 HUMAN ACTIONS`, KHÔNG nhét vào DECISIONS PENDING (chỉ chứa *quyết định*) cũng KHÔNG để chìm trong ô "chờ gì" của item AI.

### Chẻ goal → gán owner (handshake người/AI — hạt 2 t180)

Khi chẻ 1 goal (bất kể pipeline dựng sẵn hay goal tuỳ ý) thành subtask, MỖI subtask mang 2 nhãn:
- `owner: AI | HUMAN` — ai thực thi được.
- `kind: action | decision` — việc tay (làm) hay việc quyết (chốt).

Route theo cặp nhãn:
| owner + kind | đi đâu |
|---|---|
| `AI` + `action` | tự làm / spawn agent → ACTIVE (theluật ③a) |
| `HUMAN` + `decision` | `.decisions-ledger.json` + surface `DECISIONS PENDING` (D3/D4) — quyết định |
| `HUMAN` + `action` | lane `## 👤 HUMAN ACTIONS` — action vật lý CHỈ người làm (quay/ký/publish/gọi/re-auth/rotate) |

- **KHÔNG build engine chẻ-goal tự động riêng** (over-build + trùng orchestrator route sẵn). Handshake = **nhãn + lane**, không phải machine mới.
- Chỉ đẩy human-action lên lane khi nó **đang chặn** 1 goal/việc; action vụn không chặn ai → để trong chi tiết item liên quan.
- Đầu session, hook `state-report.sh` surface CẢ hai: "anh cần QUYẾT gì" (DECISIONS PENDING) và "anh cần LÀM TAY gì" (HUMAN ACTIONS).

## Quy tắc

> **Guardrails hành vi chung (GitLab-master · Jira qua pc-agent · không đụng code Avada khi chưa bảo · không Write ad-hoc vault · WAITING_HUMAN/IN_PROGRESS ghi STATE · hỏi khi không chắc)** → đã nằm ở `~/.claude/CLAUDE.md` mục **"Quy tắc hành vi"** (always-loaded). Không lặp ở đây.

Bổ sung khi ĐANG orchestrate (flow-mechanics):
```
PHẢI:
- Chạy đủ qua 3 bước (Phân tích → Route → Execute) cho mọi yêu cầu công việc; cập nhật STATE sau cùng.
- **Auto-chain tới hard-gate (QĐ-3=B, PO chốt 2026-07-29)**: sau khi duyệt plan 1 lần (Plan-Review), chạy các phase liền mạch kể cả cross-agent, KHÔNG checkpoint "chờ user OK" giữa chừng. Chỉ dừng chờ PO ở 5 GATE / BLOCKED / D3+ / verify-fail. Vẫn báo cáo từng phase (1 dòng), chỉ là không chặn chờ.
- Spawn agent có skill → bắt agent tự đọc SKILL.md gốc (orchestrator KHÔNG tóm tắt thay).

KHÔNG:
- Tự làm thay sub-agent khi đã có agent phù hợp.
- Spawn agent mà không đọc agent definition.
- Chạy phase tiếp khi phase trước CHƯA PASS verify (auto-chain bỏ checkpoint-chờ-PO, KHÔNG bỏ maker-checker gate — quality gate vẫn phải xanh mới đi tiếp).
- Auto-chain XUYÊN hard-gate (outward/code/self-mod) mà không dừng — 5 GATE luôn chặn, QĐ-3=B không nới.
```
> Ghi thẳng vault (notebooklm/deep-research/agent report) sẽ được `vault-linker` nối link lúc `/push-vault`; vẫn nên chạy `/vault-link` sau khi đổ hàng loạt note (xem `feedback_vault_no_adhoc_write`).

> **Nguyên tắc vận hành (5 điều) + ví dụ routing** → `reference/principles.md`. Nền tảng, không cần đọc mỗi lượt route.
