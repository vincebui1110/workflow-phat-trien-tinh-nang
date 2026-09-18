---
name: avada-pc
description: "PC Agent (Project Coordinator) - Push tai lieu len GitLab va Notion. Dung khi can publish research, PRD, release notes len repo va Notion."
---

# PC Agent — Project Coordinator (GitLab + Notion Publisher)

Push tai lieu da duoc approve len GitLab repos va Notion pages.

## Trigger

Dung khi:
- docs trong docs/ da duoc approve boi user
- User noi "push len gitlab", "publish len notion", "sync docs"
- Flow 1 Phase 3 trong PO Agent System

## Configuration

- **Working Directory**: `${SHOPIFY_APP_DIR}/`
- **Notion Client**: `./notion-client.js`
- **GitLab**: SSH access configured

### Git Repos (5 projects)
- Order Limit: `${SHOPIFY_APP_DIR}/order-limit/`
- Cookie Bar: `${SHOPIFY_APP_DIR}/cookie-bar/`
- Accessibility: `${SHOPIFY_APP_DIR}/accessibility/`
- Age Verification: `${SHOPIFY_APP_DIR}/age-verification/`
- SEA Fraud Filter: `${SHOPIFY_APP_DIR}/sea-fraud-filter/`

### Notion Page IDs (by app)
> **Cập nhật 2026-07-17**: đã di dời 6 app sang workspace "Anti - Law Team" (`387b0da449f180eab1d8c83a8b04f163`), layout Reference&Law→Research→PRD→CS/TS. ID dưới đây trỏ page MỚI. `Research` = page "Research Document" container; `PRD` = page app (PRD mới thành child dưới mục PRD). ID cũ ở backup `.bak-notion-newws-*`.

#### AC (Accessibility)
- Research: `3a0b0da449f181388068db23315b3879`
- PRD: `3a0b0da449f181b3aceae50780a41724`

#### AV (Age Verification)
- Research: `39fb0da449f18115b91fce7b05084644`
- PRD: `39fb0da449f181238311d0d580ac6639` (under heading PRD)

#### CB (Cookie Bar)
- Research: `3a0b0da449f1810ba10dc853919d65ef`
- PRD: `3a0b0da449f181d0bf09cc3a5566dcac`
- CS/TS Guide: `3a0b0da449f181c1a36fe6f794e70b87` (page "Guide For CS/TS - Cookie Bar" — parent cho guide support CS/TS; verify T99 31-07). Cách tìm CS/TS app khác: retrieve app page (vd "Avada Cookie Bar") → get children → child_page ngay dưới heading "CS/TS Guide".

#### OL (Order Limit)
- Research: `c93500aa766247ff977c56bb94cdef3b`
- PRD: `39fb0da449f181c2bfa4d1210abe8320`

#### FF (SEA Fraud Filter)
- Research: `3a0b0da449f181019fe1de8f23f928e2`
- PRD: `3a0b0da449f18159931ff986115d52cf`

#### WF (Withdrawal Forms)
- Research: `3a0b0da449f181a4ae16cba8bb93f170`
- PRD: `3a0b0da449f181218382f49c6866e063`

## Commands

### Push Research to GitLab + Notion
```
/avada-pc push-research <appCode> <featureName>
```

### Push PRD to GitLab + Notion
```
/avada-pc push-prd <appCode> <featureName>
```

### Push Release Note to GitLab
```
/avada-pc push-release <appCode> <version>
```

## GitLab Push Rules

### Dedicated Document Branch
- **Branch name**: `feature/document` (1 branch duy nhất cho tất cả tài liệu, áp dụng cho cả 5 repos)
- Branch này tồn tại vĩnh viễn — KHÔNG merge vào main, KHÔNG xóa
- Mỗi lần push tài liệu mới: checkout branch này, add file, commit, push

### Folder Structure (inside `feature/document` branch)
```
[repo-root]/
└── docs/
    ├── Research/
    │   └── RESEARCH_[FEATURE_NAME].md
    ├── PRD/
    │   └── PRD_[FEATURE_NAME].md
    ├── UI-UX/
    │   └── [FEATURE_NAME]/
    │       └── [feature-name].html
    └── Release Note/
        └── RELEASE_[FEATURE_NAME].md
```

### Git Workflow — First Time Setup (branch chưa tồn tại)
1. `cd` vào repo tương ứng
2. `git checkout main && git pull`
3. `git checkout -b feature/document`
4. Tạo folder structure: `mkdir -p "docs/Research" "docs/PRD" "docs/UI-UX" "docs/Release Note"`
5. Tạo `.gitkeep` trong mỗi folder rỗng để git track
6. Copy file vào đúng subfolder trong `docs/`
7. `git add` chỉ file liên quan
8. Commit: `docs: init feature/document branch with [feature-name] [doc-type]`
9. `git push -u origin feature/document`

### Git Workflow — Branch đã tồn tại
1. `cd` vào repo tương ứng
2. `git checkout feature/document && git pull origin feature/document`
3. Copy file vào đúng subfolder trong `docs/`
4. `git add` chỉ file liên quan
5. Commit message:
   - Research: `docs: add research for [feature-name]`
   - PRD: `docs: add PRD for [feature-name]`
   - UI/UX: `docs: add UI mockup for [feature-name]`
   - Release note: `docs: add release note for [feature-name] v[version]`
6. `git push origin feature/document`

### Check branch exists
```bash
git ls-remote --heads origin feature/document
# Nếu output rỗng → branch chưa tồn tại → dùng First Time Setup
# Nếu có output → branch đã có → dùng workflow thông thường
```

### Multi-Repo Push
Khi feature liên quan nhiều app (e.g., Law Compliance Bundle):
1. Push vào từng repo lần lượt (tất cả 5 repos hoặc repos liên quan)
2. Đều dùng branch `feature/document`
3. Cùng commit message format

## Notion Push Rules

### Research Document
- Add vao dung page ID cua app (xem Notion Page IDs)
- Danh so thu tu: 1, 2, 3 (sequential)
- Format: Tao 1 page moi trong database voi title = ten research

### PRD Document
- **LUÔN HỎI USER vị trí trước khi add** — do not auto-add
- User sẽ cung cấp Notion URL (có thể có anchor `#block-id`)
- **Parse URL bắt buộc**: Extract `PAGE_ID` từ URL (32 hex chars cuối slug), KHÔNG dùng hardcoded config
  - URL format: `https://notion.so/[workspace]/[slug]-[PAGE_ID]?...#[ANCHOR_ID]`
  - `PAGE_ID` → dùng làm `parent: { page_id: PAGE_ID }`
  - `#ANCHOR_ID` (nếu có) → check type qua API: `mcp__notion__API-retrieve-a-block` (block_id = ANCHOR_ID)
    - Nếu type = `child_database` → dùng `parent: { database_id: ANCHOR_ID }`
    - Nếu type khác (paragraph, heading...) → **KHÔNG bỏ qua** — xem "Chèn đúng vị trí" bên dưới
- Config page IDs là fallback khi user KHÔNG cung cấp link

### Chèn đúng vị trí theo anchor (KHÔNG mặc định cuối trang)
Bug đã fix: trước đây `#ANCHOR_ID` không phải `child_database` bị "bỏ qua" → mọi lần push đều rơi xuống CUỐI trang bất kể user chỉ định vị trí nào. Nguyên nhân: Notion API mặc định (`API-patch-block-children` không có `after`, hoặc `API-post-page` tạo child page) LUÔN thêm vào cuối children list.

Fix — dùng `after` param của `API-patch-block-children`:
- **Append blocks trực tiếp vào page có sẵn nội dung** (không tạo child page riêng): gọi `API-patch-block-children` với `block_id: PAGE_ID` và `after: ANCHOR_ID` → block mới chèn NGAY SAU anchor, không rơi cuối trang.
- **PRD dạng child page** (rule bắt buộc ở trên): `API-post-page` KHÔNG hỗ trợ tham số vị trí — trang con luôn bị Notion đặt cuối children list của page cha, đây là giới hạn cứng không bypass được bằng API. Cách xử lý:
  1. Tạo child page bình thường (`API-post-page`, `parent: {page_id: PAGE_ID}`)
  2. Gọi `API-patch-block-children({ block_id: PAGE_ID, after: ANCHOR_ID, children: [{ type: "link_to_page", link_to_page: { type: "page_id", page_id: <NEW_CHILD_PAGE_ID> } }] })` → chèn link tham chiếu đúng vị trí anchor, trỏ tới trang PRD đầy đủ.
  3. Nếu user cần nội dung nằm thẳng (không phải link) tại đúng vị trí → hỏi lại, không tự ý đổi cách làm.
- Nếu link KHÔNG có anchor → giữ hành vi cũ (append cuối trang là đúng, vì user không chỉ định vị trí).
- **CẤM xoá-hết-rồi-append (clear all + append) trên page có anchor cần giữ** — thao tác này xoá luôn chính block anchor, làm mất luôn điểm neo cho lần push sau (đã ghi nhận thực tế 1 anchor PRD bị archived/in_trash vì lý do này). Chỉ dùng xoá-hết khi page do 1 doc sở hữu hoàn toàn (không có vị trí cần giữ) và user xác nhận muốn REPLACE.

### Verify BẮT BUỘC ngay sau MỌI push Notion (T74)
> Bối cảnh: ít nhất 1 lần push PRD chạy nền KHÔNG hoàn tất mà không cảnh báo → page giữ version CŨ dù tưởng đã xong, phát hiện muộn phải redo tay (Session Audit 2026-07-19). Từ nay push Notion coi như CHƯA XONG cho tới khi verify PASS.

Sau khi push (script HAY MCP), BẮT BUỘC đọc lại page để chứng minh push đã "đáp":
1. **Trước push**: đọc `last_edited_time` của page (`mcp__notion__API-retrieve-a-page` hoặc `notion.pages.retrieve`) → lưu `beforeEdit`.
2. **Sau push**: đọc lại → `afterEdit`.
3. **Đánh giá**:
   - `afterEdit` MỚI HƠN `beforeEdit` → **PASS** (tín hiệu chính).
   - `afterEdit` KHÔNG mới hơn (Notion round `last_edited_time` xuống PHÚT — before/after cùng phút vẫn có thể bằng nhau) → kiểm tra fallback nội dung: 1 chuỗi sentinel từ nội dung vừa push (vd heading/câu đầu) có XUẤT HIỆN trên page không. Có → **PASS (weak)**, cảnh báo dựa nội dung. Không → **FAIL**.
   - **FAIL** = page KHÔNG đổi → báo rõ "push có thể fail âm thầm, page còn version CŨ — KHÔNG coi là done, re-run/điều tra". TUYỆT ĐỐI không im lặng báo done.
- **Script tự làm sẵn**: `push-notion.sh` / `push-notion-page.js` / `notion-push-prd.js` đã tích hợp bước verify này — verify FAIL → exit code 2, wrapper in dòng FAIL. Khi dùng script chỉ cần check exit ≠ 0 = FAIL.
- **Push bằng MCP (tay)**: PHẢI tự chạy 3 bước trên; đừng bỏ qua vì "thấy API trả 200" — 200 từng đi kèm page không đổi.

### Notion API Usage
```javascript
const notion = require('./notion-client.js');

// Add new page to Research database
await notion.notion.pages.create({
  parent: { database_id: 'PAGE_ID_HERE' },
  properties: {
    title: {
      title: [{ text: { content: 'N. RESEARCH_FEATURE_NAME' } }]
    }
  },
  children: [
    // Convert markdown to Notion blocks
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Section Title' } }]
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: 'Content here' } }]
      }
    }
  ]
});
```

## Automation Scripts — ⚠️ KHÔNG CÒN TỒN TẠI (kiểm 2026-08-28)

**Trạng thái**: thư mục scripts/ dưới SHOPIFY_APP_DIR **không có trên máy vince**, và cả 3 script từng được gọi ở đây (push-gitlab.sh · push-notion.sh · jira-comment.sh) đều đã biến mất — không tìm thấy bản nào trong ~/dev hay ~/.claude. Tham chiếu cuối cùng còn thấy là bản backup skill từ 2026-05.

**⇒ Đường CHÍNH thức bây giờ = mục "Implementation Steps" ngay dưới** (git thủ công + MCP Notion + `pc-agent` cho Jira). Mục này giữ lại **chỉ để đọc hiểu ý đồ cũ**, KHÔNG phải để chạy.

**Nếu định khôi phục** (hoặc phát hiện script còn sống ở máy avada): trước khi chạy phải `test -x` từng file; **đừng giả định nó tồn tại** — cách viết cũ ("LUÔN dùng scripts thay vì tự compose commands") khiến pc-agent gọi thẳng vào path chết rồi báo fail mơ hồ, đó chính là lý do mục này bị hạ cấp.

Ý đồ 3 script cũ, giữ làm đặc tả nếu dựng lại:
1. **push-gitlab.sh** `<app_repo> "<commit_message>" [files…]` — stash → checkout `feature/document` → commit → push → checkout back; in ra branch + commit hash.
2. **push-notion.sh** `<page_id> <md_file>` — xoá sạch block cũ → convert md → append block mới → **verify sau push**; exit ≠0 nghĩa là verify FAIL (page chưa đổi). ⚠️ Destructive theo thiết kế: xoá cả block anchor. Page cần giữ vị trí/anchor → dùng flow "Chèn đúng vị trí theo anchor" (MCP `API-patch-block-children` + `after`), KHÔNG dùng kiểu replace này.
3. **jira-comment.sh** `<ticket_key> "<comment>"` — nay thay bằng `pc-agent` + `/avada-task-manager` (luật CLAUDE.md: mọi thao tác ghi Jira phải qua `pc-agent`).

## Implementation Steps (đường CHÍNH — thay cho scripts đã mất)

### Step 1: Verify doc is approved
- Check voi user: "Doc [name] da duoc approve chua?"
- Neu chua → khong push, bao user

### Step 2: GitLab Push
1. cd vao repo
2. Tao branch, copy file, commit, push
3. Return branch name + commit hash

### Step 3: Notion Push (Research only — auto)
1. Query existing pages de xac dinh so thu tu tiep theo
2. Tao page moi voi content
3. Return Notion page URL

### Step 4: Notion Push (PRD — manual position)
1. Hoi user: "Ban muon add PRD [name] vao vi tri nao tren Notion?"
2. Doi user tra loi
3. Tao page theo chi dan
4. Return Notion page URL

### Step 5: Report
Bao user:
```
Done! Da push:
- GitLab: [branch-name] @ [repo-name] (commit: [hash])
- Notion: [page-url]
```

## Credentials

**KHÔNG hỏi user về credentials.** Luôn source từ:
```bash
source '${SHOPIFY_APP_DIR}/.env.secrets'
```
File chứa: `SLACK_BOT_TOKEN`, `NOTION_TOKEN`, `JIRA_TOKEN`, `GITLAB_TOKEN`, v.v.

Khi dùng notion-client.js hoặc jira-cli.js:
```bash
cd "${SHOPIFY_APP_DIR}" && source .env.secrets && node notion-client.js ...
```

Khi gửi Slack (notify PC — đứng tên bot): dùng CHOKEPOINT, KHÔNG tự curl/tự cầm token:
```bash
printf '%s' "[NỘI DUNG]" > /tmp/pc_notify.txt
node ~/.claude/tools/slack-send.js post --purpose notify --channel "<CHANNEL_ID>" --text-file /tmp/pc_notify.txt
```
> `purpose notify` → xoxb (bot). Token do slack-send.js đọc từ `mcp.json`, KHÔNG cần `SLACK_BOT_TOKEN` trong `.env.secrets`.

## Important Notes

- **NEVER push without user approval** on the doc content
- **PRD on Notion: ALWAYS ask position first**
- Research on Notion: auto-add with sequential numbering
- Git: always create feature branch, never push directly to main
- If git push fails (auth, conflict), report to user immediately
- Notion API has block limits — for large docs, split into multiple API calls
- **Slack: KHÔNG gửi trong hậu cần** — bỏ hoàn toàn bước Slack notify
