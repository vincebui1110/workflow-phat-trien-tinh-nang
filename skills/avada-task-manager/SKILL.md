---
name: avada-task-manager
description: "Task Manager Agent - Tao Jira task theo chuan Avada, assign team member. Dung khi can tao task cho feature moi, improvement, bug fix."
---

# Task Manager Agent — Jira Task Creation

Tao Jira task theo dung format Avada, assign cho team member.

## Trigger

Dung khi:
- PRD/User Stories da duoc approve → can tao task cho dev
- User noi "tao task", "create ticket", "assign cho dev"
- Flow 1 Phase 3 trong PO Agent System (sau khi PRD approved)

## Configuration

- **Jira Project**: SB (Solar Board)
- **Jira Instance**: https://space.avada.net
- **Working Directory**: `${SHOPIFY_APP_DIR}/`
- **Jira CLI**: `node jira-cli.js`
- **Slack Client**: `./slack-client.js`

### App Name Codes
- Order Limit → OL
- Cookie Bar → CB
- Accessibility → AC
- Age Verification → AV
- Fraud Filter → FF
- Withdrawal Forms → WF

**Task phủ NHIỀU app (PO chốt 2026-08-24, [[task-26]]):** title liệt kê ĐỦ mã, phân tách bằng dấu phẩy không cách: `[DEV][CB,WF] featureType: featureName`. KHÔNG dùng `[ALL]`, KHÔNG để trống — trước khi có luật này đã lỡ chế 3 kiểu khác nhau (trống, `[ALL]`, liệt kê) trên cùng 1 cụm task (SB-15726), gây khó lọc/search theo app. `customfield_10700` (assignees) vẫn set theo đúng người phụ trách từng app nếu khác nhau.

**Nhãn `[BA-Dev]` — task BA làm luôn phần dev (PO chốt 2026-08-26, ca SB-16045):** khi BA tự code thay vì giao dev team, dùng **1 nhãn gộp** `[BA-Dev][{appCode}] {featureType}: {featureName}`. TUYỆT ĐỐI KHÔNG viết `[BA][DEV][{appCode}]` — loop automation `jira-review-flow` parse app code bằng regex `\[(?:...)\]\[([^\]]+)\]` nên nhãn thứ 2 bị hiểu là app ⇒ `[BA][DEV][AC]` cho ra app = "DEV", báo sai lên Slack. Template + luật đầy đủ: **mục "c) BA-Dev Task" trong Task Creation Rules**.

### Team Members
- DieuBDT — PO
- TrungNQ — Dev
- ThoLX — Dev
- VuLQ — Dev
- HaPTT — Tester (BẮT BUỘC trên mọi dev task)
- DuongNTT — Designer

### Jira Roles
- Reviewer (dev tasks): kenny
- Reviewer (BA tasks): Son Nguyen
- **Reviewer (task gộp `[BA-Dev]`): kenny** — task BA làm luôn phần code thì người review là người review CODE, KHÔNG phải reviewer BA (PO chốt 2026-08-26, ca SB-16045 lỡ set sonnv). Đây là điểm khác BA task thường, KHÔNG được để `sonnv`
- Product Owner: Dieu BDT

## Commands

### Create Feature Tasks
```
/avada-task-manager create-feature <appCode> <featureType> <featureName>
```

**Parameters:**
- `appCode`: OL, CB, AC, AV
- `featureType`: "New Feature", "New Function", "Improvement"
- `featureName`: Ten tinh nang

**Example:**
```
/avada-task-manager create-feature AV "New Feature" "Terms and Conditions"
```

### Create Single Task
```
/avada-task-manager create <type> <details>
```

## Language Guidelines
- **Primary**: Tiếng Việt (use Vietnamese for all descriptions)
- **English**: Only for common tech terms (Backend, Frontend, API, GCM v2, etc.) and framework names (React, Polaris, Firebase, etc.)

## Task Creation Rules (UPDATED)

When creating tasks for new feature/update with PRD/user story, create **2 tasks**:

### a) Dev Task (Task type — NOT Story)

```json
{
  "fields": {
    "project": { "key": "SB" },
    "issuetype": { "name": "Task" },
    "summary": "[DEV][{appCode}] {featureType}: {featureName}",
    "description": "h4. 1. Vấn đề\n* {problem1}\n* {problem2}\n* {problem3}\n* {problem4}\n* {problem5}\n\nh4. 2. Giải pháp\n* {solution1}\n* {solution2}\n* {solution3}\n\nh4. 3. Scope - Dev deliverables\n* {deliverable1}\n* {deliverable2}\n* {deliverable3}\n* {deliverable4}\n\nh4. 4. Tài liệu\n[PRD Name|{prdLink}]\n\nh4. 5. UI/UX\n[UI/UX|{designLink}]\n\nh4. 6. Impact — Các phần cần update thêm\n* {impact1}\n* {impact2}\n\nh4. 7. Ghi chú cho Tester\n* Thay đổi 1 (merchant/khách thấy gì khác) — TRƯỚC: {before1} → SAU: {after1}\n* Thay đổi 2 (merchant/khách thấy gì khác) — TRƯỚC: {before2} → SAU: {after2}\n* Cần test: {testCase1}\n* Cần test: {testCase2}\n* Dễ miss / lưu ý: {edgeCase}",
    "priority": {"name": "{priority}"},
    "customfield_10101": "{activeSprintId}",
    "customfield_10700": [{"name": "{devAssignee}"}, {"name": "haptt"}],
    "customfield_10900": [{"name": "kenny"}],
    "customfield_11400": {"name": "kenny"},
    "customfield_11000": {"value": "Diệu BDT", "id": "10702"}
  }
}
```

### Jira Custom Field IDs (Discovered)
- `customfield_10101` — Sprint
- `customfield_10700` — Assignees (array of users)
- `customfield_10900` — Reviewer (array of users)
- `customfield_11400` — **AI Agent** (type `user`, userpicker **ĐƠN** — object `{"name":"kenny"}`, KHÔNG phải array). Verify 2026-09-16 trên SB-16796: `operations: ["set"]`, không bắt buộc. **Dev Task LUÔN set = `kenny`** (PO chốt 2026-09-16) — auto-fill, KHÔNG hỏi PO. BA sub-task / BA-Dev / MKT task: KHÔNG set. ⚠️ Field này **KHÔNG thay thế** việc hỏi PO giao dev nào: `customfield_10700` (assignees) vẫn giữ nguyên luật cũ — VẪN HỎI PO chọn dev (`trungnq`/`tholx`/`vulq`) ở câu hỏi cuối, `kenny` TUYỆT ĐỐI không được lọt vào options chọn dev (PO nhắc lại 2026-09-16).
- `customfield_11000` — Product Owner (select field, id: 10702 = Diệu BDT)
- `customfield_10800` — **Merge Request** (type `url`, string). Nơi DUY NHẤT chứa link MR. Verify 2026-08-26: editable trên cả Task lẫn Sub-task, operations `["set"]`. ⚠️ **KHÔNG dán link MR vào description** — Jira/loop đọc field này, description chỉ mô tả việc (PO chốt 2026-08-26; trước đó ca SB-16045 lỡ để link trong description)
- ⚠️ **DEADLINE — Jira project SB KHÔNG có field deadline/due date dùng được (verify 2026-06-26, tái xác nhận 2026-07-28):** Field "Due Date" (`duedate`) tồn tại trong Jira instance nhưng **KHÔNG được gán vào Screen Scheme của project SB** cho BẤT KỲ issue type nào (Task / Sub-task / Story đều `duedate editable: false` + không nằm trên create screen). → KHÔNG set được qua API, dù lúc CREATE hay edit sau; nếu truyền vào JSON sẽ bị Jira **âm thầm bỏ qua** (task vẫn tạo, duedate = null). Đã BỎ `duedate` khỏi mọi JSON template.
  - **CÁCH GẮN DEADLINE (chuẩn hiện tại — dùng COMMENT, KHÔNG set field):** Sau khi tạo task, nếu cần deadline thì thêm **1 dòng vào COMMENT của issue** dạng `Deadline: YYYY-MM-DD` (dùng `mcp__jira__add_jira_comment` với key vừa tạo, hoặc cơ chế comment sẵn có `node jira-cli.js comment <key> "Deadline: YYYY-MM-DD"`). TUYỆT ĐỐI KHÔNG cố set field `duedate` — nó bị bỏ qua âm thầm.
- `priority` — Priority. Native Jira field. Set bằng `{"name": "..."}`, giá trị: `Highest` / `High` / `Medium` / `Low` / `Lowest`

**Fields to fill:**
- Title: `[DEV][appCode] featureType: featureName` — KHÔNG thêm gì khác vào title. Phủ nhiều app → `[DEV][code1,code2] ...` (xem "App Name Codes" — task-26).
- Description: 7 sections with h4. headings + bullet points
  - 1. Vấn đề (5 bullets - detailed problems/limitations)
  - 2. Giải pháp (3 bullets - concise, high-level only)
  - 3. Scope - Dev deliverables (4-5 bullets - HIGH-LEVEL ONLY, no technical details)
  - 4. Tài liệu (PRD link) — ⚠️ **CẤM để section này thành văn xuôi không có link** (lỗi tái diễn, PO bắt 14-09 ở SB-16780/16781). Section 4 PHẢI luôn chứa **ít nhất 1 link bấm được** dạng `[Tên|url]`. Nếu **chưa có PRD** thì KHÔNG được viết trống kiểu "Chưa có PRD" rồi dừng — bắt buộc link **tài liệu NGUỒN đã đẻ ra task này**, theo thứ tự ưu tiên: (a) PRD/research doc nếu có → (b) **dòng backlog trên GitLab** `[Backlog #<n> — <app>|https://git.avada.net/avada/<repo>/-/blob/feature/document/docs/Feature%20Backlog/List%20feature.md]` (dấu cách trong path encode `%20`; đã verify mở được) → (c) Notion page → (d) vault note. Kèm 1 dòng chữ nói rõ trạng thái ("Chưa có PRD — task này chính là việc viết PRD"), nhưng **chữ KHÔNG thay được link**. Nếu task nằm trong cặp DEV↔BA thì link chéo luôn issue kia (`[SB-xxxxx|https://space.avada.net/browse/SB-xxxxx]`).
  - 5. UI/UX (Design mockup link) — chưa có mockup thì ghi "Không có"; không bịa link.
  - 6. Impact — Các phần cần update thêm (lấy từ PRD section 7, VD: "Update Plans page — thêm row X", "Update Settings — thêm toggle Y"). Bỏ section này nếu PRD không có impact
  - 7. Ghi chú cho Tester (CHỈ Dev task — BA sub-task KHÔNG cần) — viết cho **tester low-tech** đọc HIỂU NGAY. **3 quy tắc CỨNG (task 153 — sửa 3 lỗi hay gặp):**
    1. **Ngôn ngữ người dùng, CẤM tech**: chỉ mô tả cái tester THẤY / BẤM trên app (tên nút · màn hình · toggle · thông báo — đúng như hiện trên UI). TUYỆT ĐỐI không tên biến / hàm / file / API / field-code / metafield (vd cấm "checkboxLabel", "tcSanitize.js", "{{terms_and_conditions}}"). Nếu buộc liên quan kỹ thuật → dịch sang **hệ quả người dùng thấy**.
    2. **Nêu RÕ thay đổi bằng TRƯỚC → SAU**: mỗi thay đổi ghi merchant/khách thấy gì khác **trước** vs **sau** update, ở **màn nào**. Cấm nói chung chung ("cải thiện X", "tối ưu Y") — phải cụ thể để tester đối chiếu được.
    3. **Ngắn, KHÔNG nói lố**: mỗi bullet 1 ý gọn; không nhồi bối cảnh dev / không giải thích vòng vo. Đủ để tester biết **test gì** + **tác động thật lên app hiện tại**, không hơn.
    Nguồn: PRD (Scope + Impact + acceptance criteria) → **DIỄN GIẢI** sang góc người dùng, KHÔNG copy nguyên technical scope của dev.
- Sprint: active sprint (query Jira for current sprint)
- Deadline: HỎI PO 1 ngày (`YYYY-MM-DD`). Bắt buộc với Dev Task. ⚠️ Project SB KHÔNG có field deadline → KHÔNG set `duedate`; SAU khi tạo task thêm 1 dòng `Deadline: YYYY-MM-DD` vào **COMMENT** của issue (xem field `duedate` ở trên). Nếu chạy tự động không có PO → xem "Deadline Fallback" bên dưới
- Priority: HỎI PO mức priority (Highest/High/Medium/Low/Lowest) → set vào `priority` lúc CREATE. Bắt buộc với Dev Task. Default `Medium` nếu chạy tự động không có PO
- Assignees (`customfield_10700`): array = **[dev, tester `haptt`]**. Tester `haptt` BẮT BUỘC mọi dev task → tự thêm, KHÔNG hỏi PO. Chỉ HỎI PO chọn **dev** ở câu hỏi cuối (cùng priority + deadline). Nếu chạy tự động (không PO) → để mình `haptt`.
  - **AskUserQuestion "giao dev nào" — options CHỐT CỨNG, ĐÚNG 3 dev, không thêm/bớt: `trungnq` · `tholx` · `vulq`.** PO tự gõ tên khác qua "Other" thì được, nhưng KHÔNG tự sinh option ngoài 3 tên này. ⚠️ TUYỆT ĐỐI KHÔNG đưa `kenny` (reviewer) hay `haptt` (tester) vào options chọn dev — đó là vai trò auto-fill, KHÔNG phải lựa chọn dev.
- **Auto-fill — KHÔNG hỏi PO, KHÔNG phải option dev:** Reviewer (`customfield_10900`) = `kenny` · **AI Agent (`customfield_11400`) = `kenny`** (PO chốt 2026-09-16; object đơn `{"name":"kenny"}`, KHÔNG phải array — sai kiểu thì Jira bỏ qua âm thầm) · Tester (trong assignees) = `haptt` · Product Owner (`customfield_11000`) = Dieu BDT (id 10702).
- ⚠️ **`assignee` chuẩn và `customfield_10700` là HAI field ĐỘC LẬP — phải set CẢ HAI, bằng 2 cơ chế khác nhau** (case SB-16529, 04-09-2026). `customfield_10700` (Assignees array) set được lúc CREATE như field thường; nhưng field `assignee` chuẩn của Jira **KHÔNG nằm trên edit screen của Sub-task project SB** → `PUT /issue/{key}` với `fields.assignee` bị từ chối thẳng: `Field 'assignee' cannot be set. It is not on the appropriate screen, or unknown.` (cùng họ lỗi với `duedate`). Phải dùng **endpoint riêng** `PUT /issue/{key}/assignee` (hoặc `jira.updateAssignee(key, name)` của `jira-client`) — endpoint này bypass screen-restriction. Quên bước này thì task **không rơi vào hàng việc của người được giao trên board** dù `customfield_10700` nhìn vẫn đúng. **Self-verify (Step 6) PHẢI in ra CẢ HAI field**, không chỉ `customfield_10700`. Lưu ý: `mcp__jira__read_jira_issue` trim response nên có thể không hiện `parent`/`customfield_*` — thiếu trong output MCP KHÔNG có nghĩa là thiếu trên server, đọc thẳng REST để kết luận.

### b) BA Task (Sub-task of monthly parent)

```json
{
  "fields": {
    "project": { "key": "SB" },
    "parent": { "key": "{parentTaskKey}" },
    "issuetype": { "name": "Sub-task" },
    "summary": "[BA][{appCode}] {featureType}: {featureName}",
    "description": "h4. 1. Vấn đề\n* {problem1}\n* {problem2}\n* {problem3}\n* {problem4}\n* {problem5}\n\nh4. 2. Giải pháp\n* {solution1}\n* {solution2}\n* {solution3}\n\nh4. 3. Scope - BA deliverables\n* Research thị trường, đối thủ\n* Viết PRD\n* Design UI/UX\n* {otherDeliverables}\n\nh4. 4. Tài liệu\n[PRD Name|{prdLink}]\n\nh4. 5. UI/UX\n[UI/UX|{designLink}]\n\nh4. 6. Impact — Các phần cần update thêm\n* {impact1}\n* {impact2}",
    "customfield_10700": [{"name": "dieubdt"}],
    "customfield_10900": [{"name": "sonnv"}],
    "customfield_11000": {"value": "Diệu BDT", "id": "10702"}
  }
}
```

**Fields to fill:**
- Parent task: **BẮT BUỘC query Jira để tìm parent task của tháng hiện tại** — KHÔNG dùng hardcoded key. Xem section "Monthly Parent Lookup" bên dưới.
- Title: `[BA][appCode] featureType: featureName` — KHÔNG thêm gì khác vào title
- Description: BA-specific (scope = Research thị trường/đối thủ, Viết PRD, Design UI/UX — KHÔNG có release note). Section 6 Impact lấy từ PRD section 7 (bỏ nếu không có)
- Assignees: dieubdt
- Reviewer: Son Nguyen (`sonnv`) — **NHƯNG task gộp `[BA-Dev]` thì reviewer = `kenny`**, xem mục "c) BA-Dev Task" ngay dưới
- Product Owner: Dieu BDT

### c) BA-Dev Task (Sub-task — BA làm luôn phần code)

**Khi nào dùng:** BA (PO) tự code feature thay vì giao dev team — tự dựng nhánh, tự push, tự tạo MR. **CHỈ 1 sub-task duy nhất**, KHÔNG tạo Dev Task kèm (nếu không sẽ có 2 task cho 1 việc). PO chốt 2026-08-26, ca đầu tiên SB-16045; ca kiểm thử luồng end-to-end (create + lens `--expect-mr` PASS): **SB-16097**.

```json
{
  "fields": {
    "project": { "key": "SB" },
    "parent": { "key": "{parentTaskKey}" },
    "issuetype": { "name": "Sub-task" },
    "summary": "[BA-Dev][{appCode}] {featureType}: {featureName}",
    "description": "h4. 1. Vấn đề\n* {problem1}\n* {problem2}\n* {problem3}\n* {problem4}\n* {problem5}\n\nh4. 2. Giải pháp\n* {solution1}\n* {solution2}\n* {solution3}\n\nh4. 3. Scope - BA deliverables\n* Research thị trường, đối thủ\n* Viết PRD\n* Design UI/UX\n* {otherDeliverables}\n\nh4. 4. Tài liệu\n[PRD Name|{prdLink}]\n\nh4. 5. UI/UX\n[UI/UX|{designLink}]\n\nh4. 6. Impact — Các phần cần update thêm\n* {impact1}\n* {impact2}",
    "customfield_10700": [{"name": "dieubdt"}],
    "customfield_10900": [{"name": "kenny"}],
    "customfield_11000": {"value": "Diệu BDT", "id": "10702"},
    "customfield_10800": "{mergeRequestUrl}"
  }
}
```

**Khác BA task thường ĐÚNG 3 điểm — mọi thứ còn lại giữ nguyên như mục b):**
1. **Title** = `[BA-Dev][{appCode}] ...` (1 nhãn gộp). KHÔNG `[BA][DEV][...]` — vỡ regex app-code của loop `jira-review-flow`.
2. **Reviewer (`customfield_10900`) = `kenny`**, KHÔNG phải `sonnv` — có code thì người review là người review CODE.
3. **Merge Request → field `customfield_10800`**, KHÔNG dán vào description. Set thẳng trong payload create (verify được, ca SB-16097); chưa có MR lúc tạo task thì để trống rồi update sau (Step 5b).

**Giữ nguyên như BA sub-task thường:** issuetype Sub-task của parent tháng (query động, xem "Monthly Parent Lookup") · description 6 sections, KHÔNG có section 7 Ghi chú cho Tester · assignees = `dieubdt` · Product Owner = Diệu BDT (id 10702) · KHÔNG set sprint / priority / deadline · ngôn ngữ tiếng Việt.

## Implementation Steps

### Step 1: Gather Information
Before creating tasks, ensure you have:
1. App code (OL/CB/AC/AV/FF/WF) — nhiều app thì liệt kê đủ mã, xem "App Name Codes"
2. Feature type (New Feature / New Function / Improvement) — user specifies
3. Feature name
4. PRD link (from GitLab or Notion)
5. Design link (if available, can be "TBD")
6. Dev (`customfield_10700`): HỎI PO chọn dev nào (`trungnq`/`tholx`/`vulq`) ở câu hỏi cuối. Tester `haptt` tự thêm vào assignees (BẮT BUỘC), KHÔNG hỏi. Kết quả = [dev, haptt]
7. Deadline: HỎI PO 1 ngày dạng `YYYY-MM-DD`. ⚠️ Project SB KHÔNG có field deadline (xem note ở field `duedate`) → KHÔNG set field; ghi deadline bằng 1 dòng `Deadline: YYYY-MM-DD` trong COMMENT của issue sau khi tạo
8. Priority (`priority`): HỎI PO mức (Highest/High/Medium/Low/Lowest). Bắt buộc với Dev Task

**LƯU Ý interactive**: Khi tạo Dev Task ở chế độ interactive (có PO), PHẢI hỏi PO cả **Priority + Deadline + Dev** TRƯỚC khi tạo task (gộp trong 1 lần hỏi). Chỉ hỏi chọn dev (`trungnq`/`tholx`/`vulq`); tester `haptt` tự thêm, KHÔNG hỏi. Priority bắt buộc. Nếu được orchestrator/flow gọi mà thiếu Priority → DỪNG hỏi PO, KHÔNG tự đặt default.

**Deadline Fallback (context tự động — autopilot/flow headless, KHÔNG có PO để hỏi):**
KHÔNG dừng để hỏi. Default deadline = ngày kết thúc sprint hiện tại (lấy từ `mcp__jira__get_sprint_details` của active sprint). Ghi bằng 1 dòng `Deadline: YYYY-MM-DD` trong COMMENT của issue sau khi tạo (KHÔNG set field `duedate` — bị Jira bỏ qua). Chỉ hỏi PO khi chạy interactive.

### Step 2: Get Active Sprint
```bash
cd "${SHOPIFY_APP_DIR}"
node -e "
  const jira = require('./jira-client.js');
  jira.jira.getSprintsForRapidView('YOUR_BOARD_ID').then(console.log);
"
```
Or search for sprint in openSprints via JQL.

### Step 3: Discover Custom Field IDs
First time setup — run this to find field IDs for Reviewer, Product Owner, etc:
```bash
cd "${SHOPIFY_APP_DIR}"
node -e "
  const jira = require('./jira-client.js');
  jira.getIssue('SB-9359').then(i => {
    console.log(JSON.stringify(Object.keys(i.fields), null, 2));
  });
"
```

### Step 4: Create Dev Task
```bash
cd "${SHOPIFY_APP_DIR}"
node jira-cli.js create '{...}'
```

### Step 5: Create BA Sub-task
```bash
cd "${SHOPIFY_APP_DIR}"
node jira-cli.js create '{...}'
```

> ⚠️ **Tạo issue LUÔN dùng `node jira-cli.js create`, KHÔNG dùng `mcp__jira__create_jira_issue`.** Tool MCP trả response trông-như-thành-công nhưng **không persist** — ca thật 2026-08-25 (SB-16045): `webUrl` trả về `.../browse/undefined`, verify lại thì 0 kết quả. Nghi do MCP không set được `parent` cho Sub-task qua `customFields`. Đây là ca cụ thể của luật chung "ghi Jira qua MCP không đáng tin" (memory `jira-task-conventions`) — áp cho CẢ create, không chỉ comment. Đường ghi đáng tin duy nhất: `jira-cli.js` / `jira-client.js`.

### Step 5b: Gắn Merge Request vào FIELD (task `[BA-Dev]`, hoặc bất kỳ task nào đã có MR)

Link MR đi vào field **Merge Request `customfield_10800`** (type url), **KHÔNG dán vào description**. **Verify 2026-08-26 (ca SB-16097): field này set được NGAY trong payload create**, không cần bước update riêng — cứ nhét thẳng vào JSON ở Step 5. Bước dưới chỉ là fallback khi MR ra đời SAU lúc task đã tồn tại:
```bash
cd "${SHOPIFY_APP_DIR}/Others" && node jira-cli.js update '{returnedKey}' '{"fields":{"customfield_10800":"https://git.avada.net/avada/{app}/-/merge_requests/{n}"}}'
```
Verify bằng đọc ngược (`node jira-cli.js get '{returnedKey}'` → `fields.customfield_10800`), KHÔNG tin response echo. Sau đó Step 6b chạy lens với cờ `--expect-mr`.

### Step 5c: Gắn deadline qua COMMENT (nếu task cần deadline)

⚠️ **Jira project SB KHÔNG có field deadline** → KHÔNG set field `duedate`. Nếu task cần deadline (Dev Task bắt buộc), sau khi tạo xong thêm **1 dòng vào COMMENT** của issue:
```bash
cd "${SHOPIFY_APP_DIR}/Others" && node jira-cli.js comment '{returnedKey}' 'Deadline: {YYYY-MM-DD}'
```
(hoặc `mcp__jira__add_jira_comment` với key vừa tạo, body = `Deadline: YYYY-MM-DD`.) Không set field, không truyền `duedate` vào JSON create.

### Step 6: Self-verify target (BẮT BUỘC — gate chống "nhắm nhầm issue")

**KHÔNG báo done trước khi làm bước này.** Sau MỖI thao tác ghi lên Jira (create / comment / update — nhất là thao tác **hàng loạt** hoặc trên **sub-task**), PHẢI đọc lại issue/comment vừa tác động theo **key** để xác nhận đúng target:

```bash
cd "${SHOPIFY_APP_DIR}/Others" && node jira-cli.js get '{returnedKey}'
```
(hoặc `mcp__jira__read_jira_issue` với key vừa tạo)

Checklist xác nhận trước khi báo done:
1. **Đúng key** — key đọc lại khớp key vừa create/comment/update, KHÔNG phải key khác trong batch.
2. **Đúng parent** — với sub-task: `parent.key` khớp đúng parent tháng hiện tại (không nhầm sang sub-task khác của issue khác).
3. **Đúng nội dung** — summary + description/comment khớp feature đang xử lý (đúng app code, đúng featureName).
4. **Batch → verify từng cái** — thao tác hàng loạt PHẢI verify LẦN LƯỢT từng issue, KHÔNG suy từ 1 cái đúng ra cả batch đúng.

Nếu bất kỳ mục nào lệch → DỪNG, sửa lại, verify lại. Chỉ báo done sau khi cả 4 mục PASS.

> **Vì sao có gate này (ev — session 6786d249):** đã từng comment nhầm vào subtask LCP của SB-13865 (nhắm nhầm target), user phải hỏi 2 lần mới lộ. Bước đọc-lại-theo-key là chốt chặn để không lặp lại.

### Step 6b: Field-completeness gate (BẮT BUỘC — lens deterministic, chống "thiếu field mà báo xong")

Step 6 chỉ verify ĐÚNG target. Step 6b verify issue có ĐỦ FIELD bắt buộc — chạy **code gate, không tự khai**:
```bash
cd "${SHOPIFY_APP_DIR}/Others" && node jira-cli.js get '{returnedKey}' > /tmp/issue-{returnedKey}.json
bash ~/.claude/skills/loop-verifier/lens-jira-task.sh /tmp/issue-{returnedKey}.json --expect-doclink --expect-mr   # bỏ --expect-mr nếu task chưa có merge request
```
⚠️ **`--expect-doclink` LUÔN BẬT, KHÔNG được bỏ** (sửa 14-09 sau khi PO bắt lỗi ở SB-16780/16781). Hướng dẫn cũ cho phép bỏ cờ này "nếu task KHÔNG có PRD/UI" — đó chính là lỗ hổng: gặp task chưa có PRD thì agent bỏ cờ, gate không kiểm, section 4 thành văn xuôi không link và không ai chặn. Nay section 4 **luôn** phải có link (PRD → hoặc backlog GitLab → hoặc Notion → hoặc vault, xem mục "4. Tài liệu"), nên gate cũng luôn phải kiểm.
Lens assert: J.1 sprint (mọi issuetype Task; BA Sub-task bỏ qua) · J.2 assignees không rỗng · J.3 reviewer không rỗng · J.4 PO id 10702 · J.5 role-hygiene (reviewer kenny/sonnv KHÔNG lọt assignees; dev Task PHẢI có tester haptt) · J.6 (nếu `--expect-doclink`) description/comment có link PRD/UI · **J.7 (nếu `--expect-mr`) link MR nằm ở field `customfield_10800` VÀ không còn sót trong description** · **J.8 dev Task (`[DEV]`) PHẢI có AI Agent (`customfield_11400`) = `kenny`; task khác SKIP**.
- **exit 0** → mới báo "task tạo xong". **exit 1** → sửa field thiếu (update qua jira-cli/MCP) → chạy lại lens → chỉ báo done khi exit 0.
- **Batch** → chạy lens LẦN LƯỢT từng issue (không suy từ 1 cái đúng ra cả batch).
- Chuẩn đầy đủ + lý do từng check: `~/.claude/skills/loop-verifier/jira-task-standard.md` (BRIEF task 145).

### Step 6c: Close-the-loop — backfill task NGUỒN (BẮT BUỘC khi task mới sinh ra TỪ một task cũ)

Step 6/6b chỉ soi task **vừa tạo**. Bước này soi task **đẻ ra nó**. Áp khi task mới là sản phẩm của một task trước đó — điển hình: **task BA viết PRD → PRD xong → tạo task DEV**; cũng áp cho research → PRD, PRD → UI, bug report → fix task.

Sau khi task mới PASS 6b, quay lại task nguồn và làm ĐỦ 3 việc:
1. **§4 Tài liệu của task nguồn** — thay mọi câu dạng "Chưa có PRD / sẽ có sau / đây chính là task viết PRD" bằng link THẬT tới artifact vừa sinh (PRD GitLab + Research + Notion), **giữ nguyên byte-for-byte** các mục 1/2/3/5.
2. **Link chéo** — task nguồn trỏ tới task mới (và ngược lại, task mới trỏ về nguồn ở §4).
3. **Status task nguồn** — deliverable đã giao thì chuyển trạng thái tương ứng, đừng để nằm `To Do` sau khi đã xong.

Verify: chạy lại `lens-jira-task.sh` với `--expect-doclink` trên **task nguồn**, và diff description cũ/mới để chứng minh chỉ §4 đổi.

> **Vì sao có gate này (ev — 14-09-2026, SB-16781):** PRD cho backlog AC #22 viết xong, push `feature/document`, tạo task DEV SB-16796 gắn đủ 6 link — nhưng task BA nguồn SB-16781 không ai backfill: §4 vẫn "Chưa có PRD — đây chính là task viết PRD", status vẫn To Do. PO mở đúng task đó và tưởng việc chưa làm. Pipeline chỉ nhìn xuôi (nguồn → sản phẩm) mà không đóng vòng ngược lại; artifact đúng hết vẫn ra kết quả sai với người đọc.

## Monthly Parent Lookup (BẮT BUỘC — chạy MỖI LẦN tạo BA sub-task)

**KHÔNG hardcode parent key.** Parent task BA subtasks đổi theo tháng. Phải query Jira dynamically mỗi lần tạo task.

### Cách query parent tháng hiện tại

> ⚠️ **Pattern parent THẬT (verify T110 28-07-2026): summary tiếng Việt `[DieuBDT] Log task tháng {M}/{YYYY}`** (M = số tháng, KHÔNG leading zero). "DieuBDT" chỉ là **tag trong summary** — parent **KHÔNG có assignee hệ thống** (customfield_10700 rỗng). ⇒ TUYỆT ĐỐI KHÔNG lọc `assignee = dieubdt` (trả 0). Query cũ dùng tên tháng tiếng Anh + lọc assignee = SAI cả 2, đã sửa.
> Lưu ý path: `jira-client.js`/`jira-cli.js` nằm ở `${SHOPIFY_APP_DIR}/Others/` (không phải root) → `cd` vào `Others`.

```bash
cd "${SHOPIFY_APP_DIR}/Others" && node -e "
  const jira = require('./jira-client.js');
  const now = new Date();
  const month = now.getMonth() + 1; // số tháng, KHÔNG leading zero
  const year = now.getFullYear();
  // Parent BA log tháng = summary tiếng Việt '[DieuBDT] Log task tháng {M}/{YYYY}'. KHÔNG lọc assignee.
  const jql = 'project = SB AND issuetype = Task AND summary ~ \"Log task tháng ' + month + '/' + year + '\" ORDER BY created DESC';
  jira.jira.searchJira(jql, {maxResults: 5, fields: ['summary','created']}).then(r => {
    console.log('Candidates:', JSON.stringify(r.issues.map(i => ({key: i.key, summary: i.fields.summary})), null, 2));
  });
"
```

### Quy tắc
1. Mỗi lần tạo BA sub-task → chạy query trên, lấy key parent khớp tháng hiện tại
2. Nếu query trả về 0 kết quả hoặc nhiều candidates ambiguous → DỪNG hỏi user: "Parent task BA subtasks tháng {current} là gì?"
3. KHÔNG dùng parent key từ conversation history/cache/skill definition hardcoded
4. Ngày hôm nay = `new Date()`, KHÔNG assume tháng từ CLAUDE.md currentDate nếu đã cũ

### History (reference only — KHÔNG dùng để tạo task mới)
- March 2025: SB-9359
- April 2026: SB-10559
- July 2026: SB-13664 (summary "[DieuBDT] Log task tháng 7/2026")
- (cập nhật khi verify với user)

## Credentials

**KHÔNG hỏi user về credentials. KHÔNG source gì cả.**

> ⚠️ Hook `hooks/credentials-gate.sh` **deny cứng** mọi lệnh Bash mà command string có chứa tên file credential (kể cả `source ...` chỉ để nạp env, kể cả `grep` tìm nó). Pattern `source <cred> && node ...` trong bản cũ của skill này đã làm pc-agent bị chặn hoàn toàn — không tạo được task nào. Đừng viết lại pattern đó.

`jira-client.js` **tự đọc và nạp credential bên trong nó** (dòng 1–18, tự parse cú pháp `export KEY=value`). `notion-client.js` và `slack-send.js` cũng tự lo token của chúng. Vì vậy chỉ cần chạy thẳng:
```bash
cd "${SHOPIFY_APP_DIR}/Others" && node jira-cli.js create "$(cat /path/to/payload.json)"
```
Đã verify 2026-09-07: `node jira-cli.js search 'project = SB ...'` chạy được, không cần source, không bị hook chặn.

**KHÔNG hardcode token** trong bất kỳ lệnh hay file nào.

## Important Notes

- **Dev task assignees**: array = [dev, `haptt`]. Tester `haptt` BẮT BUỘC, tự thêm không hỏi. Chỉ HỎI PO chọn dev (`trungnq`/`tholx`/`vulq`) ở câu hỏi cuối
- **Dev task AI Agent** (`customfield_11400`) = `kenny`, auto-fill mọi Dev Task, KHÔNG hỏi PO. Kiểu **object đơn** `{"name":"kenny"}` (userpicker single), KHÔNG phải array như reviewer. Chỉ áp cho task `[DEV]` — BA sub-task / BA-Dev / MKT KHÔNG set (PO chốt 2026-09-16)
- **Dev task type**: Task (NOT Story)
- **BA task type**: Sub-task (NO sprint assignment)
- **BA-Dev task type** (BA tự code, PO chốt 2026-08-26): Sub-task như BA task, khác ĐÚNG 3 điểm — title `[BA-Dev][app]` (1 nhãn gộp) · reviewer `kenny` thay `sonnv` · link MR vào field `customfield_10800` thay vì description. KHÔNG tạo Dev Task kèm. Xem mục "c) BA-Dev Task"
- **Description format**: Use h4. headings + Vietnamese text + bullet points for content
  - Scope must be HIGH-LEVEL ONLY (no technical implementation details)
  - Leave implementation decisions to dev team
  - **Dev task = 7 sections** (thêm "h4. 7. Ghi chú cho Tester" — viết cho tester low-tech: thay đổi bằng **TRƯỚC→SAU** góc người dùng + checklist test + case dễ miss. **3 quy tắc cứng**: cấm tech-term/tên biến-hàm-file · nêu rõ trước→sau · ngắn không nói lố — xem mục section 7 chi tiết). **BA sub-task giữ 6 sections, KHÔNG có section 7 Tester**
- **Language**: Vietnamese primary, English only for tech terms (Backend, Frontend, API, GCM v2, React, Firebase, etc.)
- **Sprint**: MUST assign MỌI task type **Task** (dev, MKT, standalone...) vào active sprint — không chỉ dev task (PO nhắc 27-07-2026, case SB-14726 MKT thiếu sprint); BA sub-task NO sprint. Giá trị `customfield_10101` = sprint ID dạng **number** (KHÔNG phải array — format sai từng kích hoạt side-effect Jira tự thêm dieubdt vào assignees; sau update sprint PHẢI re-verify assignees)
- **Priority + Deadline + Dev (Dev Task)**: interactive PHẢI hỏi PO cả 3 trong 1 lần trước khi tạo. Chỉ hỏi chọn dev (`trungnq`/`tholx`/`vulq`); tester `haptt` tự thêm vào assignees. Priority + assignees set lúc CREATE. ⚠️ Project SB KHÔNG có field deadline → KHÔNG set `duedate`; gắn deadline bằng 1 dòng `Deadline: YYYY-MM-DD` trong COMMENT sau khi tạo (Step 5c). BA task không cần priority/sprint/deadline
- Credentials: **KHÔNG gõ `source .env.secrets` trong bất kỳ lệnh nào** — hook `hooks/credentials-gate.sh` chặn cứng mọi command string có chứa tên file đó, agent sẽ bị deny và không chạy được gì. `jira-client.js` (và `notion-client.js`, `slack-send.js`) **tự đọc credential bên trong nó** (jira-client.js dòng 1–18) ⇒ chỉ cần `cd "${SHOPIFY_APP_DIR}/Others" && node jira-cli.js <cmd>`, không source gì cả. KHÔNG hỏi user, KHÔNG hardcode token.
- Custom field IDs (Reviewer, Product Owner, Sprint) need to be discovered first — run Step 3 on first use and save field IDs
- If Jira API returns error about field not found, check field names/IDs
- BA task parent changes monthly — check memory for current parent key
- **Slack: KHÔNG gửi trong hậu cần** — bỏ hoàn toàn bước Slack notify
- **Self-verify BẮT BUỘC trước khi báo done (Step 6)**: sau mọi create/comment/update Jira (nhất là hàng loạt / trên sub-task), PHẢI đọc lại theo key để xác nhận đúng key + đúng parent + đúng nội dung. Batch → verify từng cái. Gate chống "nhắm nhầm issue"
