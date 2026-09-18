# workflow-phat-trien-tinh-nang

Bộ **Flow 0 — Auto BA (Full Pipeline)**: pipeline chạy một tính năng từ *research* tới *hậu cần*
(Jira + Notion + GitLab) bằng Claude Code, không cần người ngồi duyệt giữa chừng.

Repo này là **bộ chạy được**, không phải tài liệu mô tả. Clone về, thả vào `~/.claude/`, gõ
`flow 0` trong Claude Code là chạy.

---

## Flow 0 là gì

Một lệnh → 5 phase tuần tự, mỗi phase là agent chuyên trách + skill riêng:

| Phase | Việc | Agent | Đầu ra |
|---|---|---|---|
| **0** | Sinh plan JSON + checkpoint duyệt | orchestrator | plan theo `loop-upgrade/plan-schema.json` |
| **1** | Research thị trường/đối thủ | `po-agent` → `qa-agent` review | `docs/Research/RESEARCH_<FEATURE>.md` |
| **2** | PRD + review 5 lens trực giao | `ba-agent` + panel review | `docs/PRD/PRD_<FEATURE>.md` |
| **3** | Mockup HTML + verify gate 3 lens | `designer-agent` → `dev-agent` | `docs/UI-UX/<FEATURE>/*.html` |
| **4** | Chốt lại PRD mục UI | `ba-agent` | PRD updated |
| **5** | Push GitLab + Notion + tạo Jira | `pc-agent` | links |

Hai thứ làm nó khác một chuỗi prompt thường:

- **Checkpoint bền.** Mỗi step ghi `journal.js ckpt <key> DONE`. Đứt giữa chừng thì
  `journal.js resume flow-0 <run-id>` chỉ ra đúng step dở — **không re-spawn agent đã xong**,
  không đốt lại token research/PRD.
- **Maker không tự chấm bài mình.** Mọi cặp `fix → verify` phải quay lại verifier gốc, trần cứng
  **3 vòng**, vòng 4 là `WAIT_HUMAN`. Lý do ghi trong `workflows/flow-0-auto.md` — verify toàn văn
  lặp lại *không hội tụ*, nên từ vòng 2 verifier chỉ được trả lời 2 câu về đúng thay đổi vừa làm.

---

## Cần gì để chạy

**1. Claude Code** (bản có Skill/Agent tool). Flow 0 gọi sub-agent nên cần tài khoản chạy được Agent.

**2. Thả vào `~/.claude/`** — mọi file trong bộ này neo theo `~/.claude/<...>`:

```bash
git clone <repo-url> workflow-phat-trien-tinh-nang
cd workflow-phat-trien-tinh-nang
# chép đè vào ~/.claude (backup trước nếu đã có config riêng)
rsync -av --exclude '.git' --exclude 'README.md' --exclude 'SETUP.md' \
      --exclude 'ENV.sh.example' ./ ~/.claude/
```

**3. `ENV.sh`** — copy `ENV.sh.example` → `~/.claude/ENV.sh`, sửa đúng 1 dòng `SHOPIFY_APP_DIR`
trỏ tới thư mục chứa 6 repo app. Không hardcode path ở chỗ nào khác.

```bash
cp ENV.sh.example ~/.claude/ENV.sh && $EDITOR ~/.claude/ENV.sh
bash ~/.claude/tools/backlog-files.sh all   # phải in ra 6 dòng app, không lỗi
```

**4. MCP server** — Flow 0 chỉ thật sự cần MCP ở **Phase 5**:

| MCP | Dùng ở | Thiếu thì |
|---|---|---|
| `jira` | Phase 5 — tạo Dev/BA task | Phase 1-4 vẫn chạy; Phase 5 dừng ở bước Jira |
| `notion` | Phase 5 — push PRD/Research | như trên |
| `gitlab` (hoặc `GITLAB_PAT`) | Phase 5 — push docs nhánh `feature/document` | như trên |

Phase 1→4 **không cần MCP nào** — chạy được ngay sau bước 3.

**5. Node** ≥ 18 cho `tools/*.js` (journal, push-evidence, jira-deliverable-check).

---

## Chạy

Trong Claude Code, gõ một trong các trigger phrase:

```
flow 0
auto BA
auto <tên tính năng>
làm hết cho <tên tính năng>
```

Rồi trả lời 3 input: `feature_name`, `app_code` (CB/OL/AC/AV/FF/WF), `feature_type`.

Flow in plan ra cho duyệt (Phase 0). Trả lời:

- `[ACCEPTED]` → chạy thẳng 5 phase
- `[EDIT_PLAN] <góp ý>` → sửa plan rồi hỏi lại

Soi tiến độ giữa chừng / chạy lại sau khi đứt:

```bash
node ~/.claude/tools/journal.js run-graph flow-0 <app>-<feature-slug>
node ~/.claude/tools/journal.js resume    flow-0 <app>-<feature-slug> --max-rounds 3
```

`--max-rounds 3` là **bắt buộc**: vòng fix→re-review đúc key mới mỗi vòng nên `--max-retry`
không bao giờ chạm, chỉ `--max-rounds` (đếm theo *gốc* key) mới chặn được loop vô hạn.

---

## Trong repo có gì

```
workflows/flow-0-auto.md              ← file chính, đọc cái này trước
workflows/automation-resume-protocol.md   giao thức checkpoint/resume §v2
skills/orchestrator/                  routing table: keyword → agent + skill
skills/delivery-plan/                 tầng gọi Flow 0 từ BACKLOG + ROADMAP
skills/loop-verifier/                 chuẩn verify + mockup-standard.md (Phase 3 gate)
skills/{feature-research,prd,user-story}/          Phase 1-2
skills/{review-research,review-prd,review-prd-1,review-ui}/   các lens review
skills/design-avada-app/              Phase 3
skills/{avada-pc,avada-task-manager}/ Phase 5
agents/                               6 agent def Flow 0 gọi tên
agent-core/employee-core.md           block năng lực dùng chung của agent
loop-upgrade/plan-schema.json         schema plan Phase 0
loop-upgrade/flow-0-plan.example.json plan mẫu — chỉnh theo feature thật
tools/journal.js                      ckpt / resume / run-graph
tools/{backlog,roadmap}-files.sh      resolver path, đọc PROJECT_DIRS trong ENV.sh
tools/push-evidence.js                bằng chứng push GitLab (Phase 5)
tools/jira-deliverable-check.js       đọc ngược số Jira task đã tạo (Phase 5)
```

**Không có flow 1-5 trong đây** — Flow 0 tự mô tả đủ từng phase, không cần file flow khác.

---

## Giới hạn — đọc trước khi trách repo

1. **Phase 5 ghi ra hệ thật.** Nó tạo Jira task, push Notion, push GitLab. Chạy thử thì dừng sau
   Phase 4, hoặc chạy trên feature nháp. Không có chế độ dry-run cho Phase 5.
2. **`tools/jira-deliverable-check.js` cần module `jira-client`.** Nó dò
   `$HOME/dev/Shopify app/Others/node_modules/jira-client` trước, rồi mới tới `require('jira-client')`
   toàn cục. Máy khác layout thì `npm i -g jira-client` là xong.
3. **Vài file tham chiếu thứ không nằm trong bộ này** (cố ý — chúng là ngữ cảnh riêng của PO, không
   phải thứ Flow 0 cần): `~/.claude/VOICE.md` (giọng gửi tin dưới tên PO, chỉ orchestrator nhắc tới),
   `~/.claude/tools/gmail-send.js` (nhánh mail của `pc-agent`, ngoài Flow 0), `~/.claude/STATE.md`
   (spine trạng thái xuyên phiên). Thiếu chúng **không chặn** Phase 0-5.
4. **`agents/*.md` khai `customfield_11000` = Product Owner id `10702`** và assignee mặc định theo
   team Legal của Avada. Dùng cho project Jira khác thì sửa đúng 2 chỗ: `agents/pc-agent.md` và
   `skills/avada-task-manager/SKILL.md`.
5. **Phase 3 gate đòi Polaris.** `skills/loop-verifier/mockup-standard.md` chạy profile `polaris` vì
   Flow 0 sinh ra cho app Shopify. Dùng cho sản phẩm không-Shopify thì phải đổi profile.
