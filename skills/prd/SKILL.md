---
name: prd
description: "BA Agent - Viet PRD/GDD, User Stories, Release Notes cho MOI du an (xem PROJECTS.md). Dung khi user noi 'write PRD', 'viet PRD', 'product spec', 'feature spec', 'release note', 'changelog'."
---

> **PHẠM VI DỰ ÁN (V-multi 25/07)**: skill này dùng được cho **MỌI dự án** trong `~/.claude/PROJECTS.md`, không riêng 6 app Avada. Xác định `type` của dự án trước:
> - `avada-app` → giữ nguyên toàn bộ quy ước Avada bên dưới (Polaris, Jira, GitLab/Notion, docs per-app, gate sửa source).
> - `product` / `content` / `system` (game, desktop app, khoá học, chính hệ Claude...) → **bỏ** mục Jira/Notion/GitLab per-app, bỏ ràng buộc Polaris/Shopify, dùng design system + cấu trúc thư mục của chính dự án đó; theo dõi tiến độ bằng `STATE.md`. Sửa source ở nhóm này KHÔNG cần PO gõ "code".


# PRD Writing — Guide & Template

## STEP 1: PRE-WRITING (Luôn làm trước khi viết)

1. **Đọc research files** — Tìm `RESEARCH_*.md`, `docs/research/`, hoặc market research documents. Đây là nguồn chính cho pain points, personas, competitive analysis.
2. **Đọc MEMORY.md** (nếu có) — Lấy context về app architecture, pricing plans, conventions.
3. **Đọc `UI_SNAPSHOT.md`** (nếu có tại project root) — Lấy UI patterns, page map, component conventions của app này. Dùng để viết **Design Description** (bảng UI spec) đúng với UI hiện tại. Nếu không có file này → bỏ qua bước này.
4. **Khám phá codebase liên quan (BẮT BUỘC nếu viết Data Model/API)** — Dùng Glob/Grep hiểu code hiện có. Với 2 phần technical (§8 Data Model, §9 API): PHẢI check code trên **GitLab nhánh master** (`git show origin/master:...`) trước khi ghi field/endpoint. Chỉ ghi cái verify được; chỗ chưa chắc đánh dấu **⚠️** để Dev chốt — TUYỆT ĐỐI không bịa schema/endpoint.
4. **Check Impact Analysis** — Kiểm tra feature mới có cần update các phần khác không:
   - **Pricing Plans**: Cần thêm row vào bảng so sánh plan? Plan-gate cho plan nào?
   - **Settings page**: Cần thêm settings global mới?
   - **Existing features impact**: Feature mới có thay đổi behavior feature cũ không?
   - **Help links / Support**: Cần thêm "Learn more" link trong app trỏ đến help article?
   - **App listing (Shopify App Store)**: Cần update description/screenshots trên store?
   Ghi kết quả vào section 7 của PRD.
5. **Hỏi nếu thiếu thông tin bắt buộc**:
   - Tên feature
   - Deadline / milestone nếu có
6. **Lưu file** `PRD_[FEATURE_NAME].md` tại root project.

---

## STEP 2: WRITING STYLE

- **Tone**: Formal nhưng thân thiện — không cứng nhắc, không dài dòng
- **Ngôn ngữ**: Tiếng Việt CÓ DẤU đầy đủ cho nội dung — TUYỆT ĐỐI KHÔNG viết tiếng Việt không dấu. Tiếng Anh cho thuật ngữ kỹ thuật (e.g., filter, export, merchant)
- **User Stories**: Dùng format "Là 1 [role], tôi muốn [action] để [outcome]"
- **UI Reference**: PRD KHÔNG vẽ ASCII mockup / UI Flow nữa. Thay bằng **link file UI trên GitLab** (mockup/design thật) đặt ở đầu Product Solutions; mô tả UI chi tiết dồn vào phần **5. Design Description** (bảng UI spec). Cơ chế technical (caching, fallback) không thuộc PRD — đó là việc của dev
- **UI label casing**: Tất cả label, title, button text trên UI dùng **sentence case** — chỉ viết hoa chữ cái đầu của từ đầu tiên. Ví dụ: "Country visibility", "Show only in selected countries", "Select all", "No countries selected". Không dùng Title Case cho UI text.
- **Acceptance Criteria**: Dùng bullet point (-), viết ngắn gọn, testable

> **MVP SCOPE GUARD**: Khi viết PRD, CHỈ include features được PO/research xác nhận rõ ràng. KHÔNG tự thêm features, states, hoặc flows ngoài scope (ví dụ: không tự thêm error states phức tạp, unsaved changes dialog, analytics dashboard nếu PO không yêu cầu). Nếu muốn đề xuất → ghi vào "Ngoài scope" với lý do, để PO quyết định.

> **MULTI-PRD**: Nếu feature phức tạp cần tách PRD, tạo N PRD files riêng biệt với cross-reference và dependency ghi rõ. Mỗi PRD phải self-contained (đọc 1 PRD hiểu đủ context).

---

## STEP 3: PRD TEMPLATE

> Dùng đầy đủ template này. Nếu một sub-section không áp dụng (e.g., không có Interaction with Shopify) → bỏ sub-section đó, không để trống.

---

### Phần 1: Header

> **KHÔNG** thêm "Link task Jira" hoặc "Task List" table ở đầu PRD. Phần Jira link do PC Agent quản lý khi chạy hậu cần.

```markdown
# PRD - [Feature Name]

### History

| Phiên bản | Ngày | Tác giả | Loại (A/M/D) | Mô tả thay đổi |
|-----------|------|---------|--------------|----------------|
| 1.0 | DD/MM/YYYY | [Name] | A | Tạo mới |

> A = Added, M = Modified, D = Deleted

---

## Mục Lục

1. [Executive Summary](#1-executive-summary)
2. [Personas & User Stories](#2-personas--user-stories)
3. [Product Solutions](#3-product-solutions)
4. [Acceptance Criteria](#4-acceptance-criteria)
5. [Design Description](#5-design-description)
6. [Legal & Compliance](#6-legal--compliance)
7. [Impact Analysis](#7-impact-analysis)
8. [Data Model / Database](#8-data-model--database)
9. [API / Integration](#9-api--integration)
```

---

### Phần 2: Executive Summary

> 3–5 bullets ngắn. Đọc trong 30 giây phải hiểu toàn bộ feature.

```markdown
## 1. Executive Summary

- **Vấn đề**: [Pain point cốt lõi — 1 câu]
- **Giải pháp**: [Feature làm gì — 1 câu]
- **Đối tượng**: [Persona(s) sử dụng]
- **Business value**: [Lợi ích cụ thể — có metric nếu có]
- **Scope**: [Tóm tắt MVP trong 1 câu]
```

**Ví dụ:**
```markdown
## 1. Executive Summary

- **Vấn đề**: Merchants không có cách xem và xuất lịch sử xác minh tuổi của khách hàng để phục vụ compliance audit.
- **Giải pháp**: Consent History — dashboard xem, lọc và xuất toàn bộ age verification records từ storefront.
- **Đối tượng**: Merchants bán sản phẩm hạn chế tuổi (rượu, thuốc lá, dao...).
- **Business value**: Giúp merchants đáp ứng yêu cầu pháp lý GDPR/CCPA/LGPD, giảm rủi ro bị phạt.
- **Scope**: MVP = xem records, lọc theo date/result/country, xuất CSV/PDF.
```

---

### Phần 3: Personas & User Stories

> Personas: chỉ list những người thực sự dùng feature. User Stories: format "Là 1 [role], tôi muốn [action] để [outcome]."

```markdown
## 2. Personas & User Stories

### Personas

| Persona | Profile | Nhu cầu chính |
|---------|---------|---------------|
| [Name] | [Role, business size, tech level] | [Specific need] |

### User Stories

Là 1 [role], tôi muốn [action] để [outcome].

Là 1 [role], tôi muốn [action] để [outcome].
```

**Ví dụ:**
```markdown
## 2. Personas & User Stories

### Personas

| Persona | Profile | Nhu cầu chính |
|---------|---------|---------------|
| Alex — Compliance Manager | Marketing Manager, Shopify Plus, bán rượu online, tech cao | Xuất consent records để nộp cho legal team khi bị audit |
| Sam — Store Owner | Solo owner, $20–50K/tháng, bán dao/thuốc lá, tech trung bình | Xem nhanh ai đã pass/fail verification |

### User Stories

Là 1 merchant, tôi muốn xem tất cả bản ghi xác minh tuổi của khách hàng để đảm bảo tuân thủ quy định pháp lý về bảo vệ tuổi vị thành niên.

Là 1 merchant, tôi muốn lọc bản ghi theo khoảng thời gian, kết quả (Pass/Fail) và quốc gia để dễ dàng phân tích hành vi khách hàng.

Là 1 merchant, tôi muốn xuất dữ liệu consent (CSV/PDF) để sử dụng trong audit hoặc báo cáo compliance.

Là 1 merchant, tôi muốn xem đầy đủ thông tin khách hàng (bao gồm IP address) trong file export để phục vụ mục đích compliance và điều tra gian lận.
```

---

### Phần 4: Product Solutions

> Section lớn nhất. Mô tả CHI TIẾT những gì sẽ được xây dựng. Sub-sections nào không áp dụng thì bỏ.
>
> **QUAN TRỌNG — KHÔNG nhét các nội dung sau vào Product Solutions:**
> - Data Model, API Endpoints — có **phần riêng ở cuối PRD** (§8 Data Model, §9 API); đừng trộn vào đây.
> - Kiến trúc chi tiết, chiến lược detection, cơ chế kỹ thuật (caching, fallback logic, etc.) — việc của Dev Agent.
> - Hệ thống hiện tại (current system context) — dev tự khám phá codebase.
> - Kế hoạch phát hành (Release Plan) / timeline / weekly deliverables.
> - Chỉ số thành công (Success Metrics) / KPIs / tracking events.
>
> Product Solutions mô tả **WHAT** (cái gì). Phần **HOW** technical chỉ gói gọn trong §8 (Data Model) + §9 (API) với rule grounding bắt buộc — ngoài ra không mô tả HOW.

```markdown
## 3. Product Solutions

### 3.1. Solution Overview

[1–2 đoạn mô tả feature làm gì, giá trị mang lại, các tính năng chính — dạng bulleted list]

### 3.2. Scope

**Trong scope (MVP):**
- [Feature A]
- [Feature B]

**Ngoài scope:**
- [Feature X] — Lý do: [why]
- [Feature Y] — Lý do: [why]

### 3.3. UI Reference

> KHÔNG vẽ ASCII mockup / UI Flow trong PRD nữa. Thay bằng:
> - **Link file UI trên GitLab** (mockup / design thật) — dán link ở đây để designer/dev mở xem trực tiếp.
> - Mô tả UI chi tiết (component, data type, validate) → dồn vào phần **5. Design Description**.
> - Nếu có `UI_SNAPSHOT.md` tại project root → dev follow đúng UI patterns trong đó khi implement.

```markdown
**Link UI (GitLab):** [tên file / branch / đường dẫn repo]
```

### 3.4. Error Messages *(nếu có)*

| Error | Mô tả | Message hiển thị | Action |
|-------|-------|-----------------|--------|
| [Error name] | [Khi nào xảy ra] | "[Exact message text]" | [Hành động tiếp theo] |

### 3.5. Success Messages *(nếu có)*

| Event | Mô tả | Message hiển thị |
|-------|-------|-----------------|
| [Event name] | [Khi nào xảy ra] | "[Exact message text]" |
```

**Ví dụ:**
```markdown
## 3. Product Solutions

### 3.1. Solution Overview

Consent History cho phép merchants lưu trữ, theo dõi và xuất tất cả bản ghi xác minh tuổi từ storefront. Tính năng này giúp merchants tuân thủ quy định pháp lý (GDPR/CCPA/LGPD) và quản lý rủi ro liên quan đến sản phẩm bị hạn chế tuổi.

**Tính năng chính:**
- Lưu trữ đầy đủ dữ liệu xác minh: IP, timestamp, kết quả, phương pháp, email, quốc gia
- Lọc theo: khoảng thời gian, kết quả (Pass/Fail), quốc gia
- Ẩn IP trên UI (anonymization), nhưng export đầy đủ
- Xuất CSV/PDF cho báo cáo compliance

### 3.2. Scope

**Trong scope (MVP):**
- Xem danh sách age verification records với pagination
- Filter theo date range, verification result, country
- Export CSV/PDF (giới hạn 10,000 records mặc định)
- IP masking trên UI

**Ngoài scope:**
- Terms & Conditions consent tab — Lý do: implement ở phase sau
- Real-time notifications khi có Fail record — Lý do: nice-to-have, chưa có user request

### 3.3. UI Reference

**Link UI (GitLab):** `feature/consent-history` — `UI-UX/AV_CONSENT_HISTORY/index.html` (mockup 3 màn: list / filter / export)

Chi tiết component xem phần **5. Design Description**.

### 3.4. Error Messages

| Error | Mô tả | Message hiển thị | Action |
|-------|-------|-----------------|--------|
| Wrong date format | Input sai format (e.g., 18/02/2026 thay vì 02/18/2026) | "Wrong date format" | Hiển thị inline dưới input, block Apply |
| Export failed | Server error khi export | "Export data failed" | Toast notification |
| File quá lớn | Export > 10,000 records | "The export file exceeds the maximum size limit." | Hiện instruction bar: "Contact us for assistance with larger exports." |

### 3.5. Success Messages

| Event | Mô tả | Message hiển thị |
|-------|-------|-----------------|
| Export completed | File export hoàn thành và sẵn sàng download | "Export Successfully" |
```

---

### Phần 5: Acceptance Criteria

> Dùng bullet point (-). Mỗi item phải testable — dev đọc là viết được test case. Tổ chức theo feature/user story, không gộp thành 1 block.
>
> **KHÔNG thêm**: Non-Functional Requirements (performance, security, compatibility, accessibility) — những yêu cầu này do Dev Agent xác định khi technical review.

```markdown
## 4. Acceptance Criteria

### [Feature name / User Story] (US-X)

- [Requirement 1 — mô tả behavior cụ thể]
- [Requirement 2]
- [Requirement 3]

### Edge Cases

- [Edge case 1 — mô tả scenario + expected behavior]
- [Edge case 2]
```

**Ví dụ:**
```markdown
## 4. Acceptance Criteria

### View consent records (US-1)

- Merchant có thể xem tất cả age verification records trong Consent History dashboard
- IP address hiển thị dạng masked trên UI: 192.168.1.***
- IP address hiển thị đầy đủ trong file export (CSV/PDF)
- Table hiển thị đúng các cột: IP, Timestamp, Min Age, Verification Result, Method, Email, Country
- Verification Result hiển thị đúng màu: Pass = xanh, Fail = đỏ
- Country hiển thị kèm flag icon

### Filter records (US-2)

- Merchant có thể lọc theo date range (Today/Yesterday/Last week/Last month/Last year/Custom)
- Merchant có thể lọc theo Verification Result (Pass/Fail)
- Merchant có thể lọc theo Country

### Export data (US-3)

- Merchant có thể xuất dữ liệu dạng CSV hoặc PDF

### Edge Cases

- Không có record nào trong khoảng thời gian được chọn → hiển thị "No data found"
- Export > 10,000 records → hiển thị error message và instruction
- Email hoặc Country field trống/null → hiển thị empty, không crash
- Click "Clear" filter → quay về date range mặc định (tháng hiện tại)
```

---

### Phần 6: Design Description

> Mô tả UI spec cho từng screen/component. Dùng bảng chuẩn. Nếu có HTML mockup hoặc Figma link thì note ở đầu section.

```markdown
## 5. Design Description

### 5.1. [Screen/Tab Name]

> Màn hình này mở khi: [trigger condition]

**UI Specifications:**

| Item | Data Type | Required | Default | Mô tả | Validate Rule |
|------|-----------|----------|---------|-------|---------------|
| [Component] | Text/DateTime/Number/Badge/Selection/Button | Y/N | [Default value] | [Behavior/display description] | [Validation rules] |
```

**Ví dụ:**
```markdown
## 5. Design Description

### 5.1. Consent History — Age Verification Tab

> Màn hình mở khi merchant click "Consent History" trong left sidebar.
> Default: hiển thị records theo tháng hiện tại.

**UI Specifications:**

| Item | Data Type | Required | Default | Mô tả | Validate Rule |
|------|-----------|----------|---------|-------|---------------|
| Page Title | Text | Y | "Consent History" | Tiêu đề trang ở top | N/A |
| Filter Button | Button | Y | — | Click → mở dropdown với 3 filter types | N/A |
| Date Range | Selection | Y | Tháng hiện tại | Calendar picker với quick filters (Today/Yesterday/Last week/Last month/Last year) và custom date input dạng mm/dd/yyyy | Đúng format mm/dd/yyyy |
| Verification Result | Selection | Y | — | Click → chọn Pass hoặc Fail | Pass / Fail |
| Country | Multiple Selection | Y | — | Click → chọn 1 hoặc nhiều country, có flag icon | N/A |
| Export Button | Button + Dropdown | Y | — | Click → 2 options: Export CSV, Export PDF. Show loading state khi đang export | N/A |
| Tab: Age Verification | Tab Button | Y | Active | Tab chính hiển thị age verification logs | N/A |
| Tab: Terms & Conditions | Tab Button | Y | Inactive | Tab thứ 2 (implement sau) | N/A |
| IP | Text | Y | — | Hiển thị dạng masked: 192.168.1.*** | Mask last octet |
| Timestamp | DateTime | Y | — | Format: YYYY-MM-DD HH:MM:SS | N/A |
| Min Age | Number | Y | — | Tuổi tối thiểu yêu cầu (e.g., 18, 21) | N/A |
| Verification Result | Badge | Y | — | Pass (xanh) / Fail (đỏ) | Pass = Pass, Fail = Fail |
| Method | Text | Y | — | Phương pháp xác minh (e.g., Birthday entry, No input) | N/A |
| Email | Text | N | Empty | Email khách hàng, truncate nếu quá dài (deb...@example.com) | Valid email hoặc empty |
| Country | Text + Flag | Y | — | Flag icon + Country name (e.g., 🇷🇺 Russia) | N/A |
| Pagination | Controls | Y | 10 items/page | Hiển thị: Previous \| Page X of Y \| Next. Dropdown: 10/25/50/100 | Valid page range |
```

---

### Phần 7: Legal & Compliance *(nếu có)*

> Chỉ thêm section này nếu feature liên quan đến compliance/legal (consent, privacy, age verification, T&C, etc.). Nếu không liên quan → bỏ hoàn toàn section này.
>
> **CHỈ bao gồm 2 sub-sections:**
> - 6.1. Bối cảnh pháp lý — tại sao feature này cần compliance
> - 6.2. Các quy định liên quan — bảng liệt kê regulations áp dụng
>
> **KHÔNG thêm**: Biện pháp compliance, Disclaimer, Dependencies, Glossary, Câu hỏi đã giải quyết, Tham khảo — những nội dung này không thuộc PRD.

```markdown
## 6. Legal & Compliance

### 6.1. Bối cảnh pháp lý

[1-2 câu mô tả tại sao feature này cần tuân thủ quy định pháp lý]

### 6.2. Các quy định liên quan

| Quy định | Khu vực | Yêu cầu chính | Ảnh hưởng đến feature |
|----------|---------|---------------|----------------------|
| [Regulation] | [Region] | [Key requirement] | [How it affects this feature] |
```

---

### Phần 8: Impact Analysis

> Liệt kê các phần khác trong app cần update khi ship feature này. Chỉ ghi mục có ảnh hưởng — mục nào "Không ảnh hưởng" thì bỏ.

```markdown
## 7. Impact Analysis

| Phần | Cần update |
|------|-----------|
| Pricing Plans | [Mô tả ngắn — VD: Thêm row "Consent History" vào bảng so sánh, plan-gate cho Pro] |
| Settings page | [Mô tả ngắn — VD: Thêm toggle "Enable consent logging" trong General Settings] |
| Existing features | [Mô tả ngắn — VD: Consent History cần thêm cột "Reset status"] |
| Help links | [Mô tả ngắn — VD: Thêm "Learn more" link trong page header] |
| App listing | [Mô tả ngắn — VD: Update screenshot #3 trên Shopify App Store] |
```

**Ví dụ:**
```markdown
## 7. Impact Analysis

| Phần | Cần update |
|------|-----------|
| Pricing Plans | Thêm row "Reset Consent" vào bảng so sánh plan, chỉ available cho Pro plan |
| Existing features | Consent History page — thêm cột "Reset status" và filter "Reset by" |
| Help links | Thêm "Learn more" link trong Reset Consent page header trỏ đến help article |
```

---

### Phần 9: Data Model / Database

> ⚠️ **RULE GROUNDING (BẮT BUỘC):** Chỉ viết phần này SAU khi đã check code trên **GitLab nhánh master** (`git show origin/master:...`). Ghi **data requirements** — cần lưu gì, kiểu, retention, quan hệ — ở mức PO/BA hiểu. KHÔNG tự chế schema / index / migration nếu chưa verify. Field / collection / kiểu nào **chưa chắc** → đánh dấu **⚠️** để Dev chốt. BA-agent TUYỆT ĐỐI không bịa cấu trúc DB. Nếu feature không đụng dữ liệu lưu trữ → bỏ hẳn phần này.

```markdown
## 8. Data Model / Database

### 8.1. Dữ liệu cần lưu

| Entity / Collection | Field | Kiểu | Bắt buộc | Mô tả | Ghi chú |
|---------------------|-------|------|----------|-------|---------|
| [Tên] | [field] | String/Number/Boolean/Timestamp/... | Y/N | [Ý nghĩa] | ⚠️ nếu chưa verify |

### 8.2. Storage & Retention

- **Nơi lưu**: [Firestore / BigQuery / ... — nếu biết; ⚠️ nếu chưa chắc]
- **Retention**: [Lưu bao lâu, khi nào xoá — quan trọng nếu liên quan GDPR/compliance]
- **Quan hệ**: [Liên kết với entity nào — vd shop → records]
```

**Ví dụ:**
```markdown
## 8. Data Model / Database

### 8.1. Dữ liệu cần lưu

| Entity | Field | Kiểu | Bắt buộc | Mô tả | Ghi chú |
|--------|-------|------|----------|-------|---------|
| consentRecord | shopId | String | Y | ID shop sở hữu record | |
| consentRecord | ip | String | Y | IP khách khi verify | Lưu đầy đủ, mask ở UI |
| consentRecord | result | String | Y | Pass / Fail | |
| consentRecord | verifiedAt | Timestamp | Y | Thời điểm verify | |
| consentRecord | country | String | N | Mã quốc gia (ISO) | ⚠️ nguồn geo chưa rõ — Dev chốt |

### 8.2. Storage & Retention

- **Nơi lưu**: ⚠️ Firestore collection `consentRecords` (cần Dev verify tên thật trên master)
- **Retention**: Giữ tối thiểu 3 năm phục vụ compliance audit; cần cron xoá record cũ hơn.
- **Quan hệ**: Mỗi record thuộc 1 shop (shopId); query theo shopId + verifiedAt.
```

---

### Phần 10: API / Integration

> ⚠️ **RULE GROUNDING (BẮT BUỘC):** Chỉ viết sau khi check code master. Mô tả **capability cần** (app cần gọi API nào, nhận webhook nào, tích hợp bên thứ 3 nào) ở mức contract. Chi tiết payload / auth / rate-limit để **Dev hoàn thiện**. Endpoint / param nào chưa chắc → **⚠️**. Không bịa endpoint. Nếu feature thuần UI, không phát sinh API mới → bỏ hẳn phần này.

```markdown
## 9. API / Integration

### 9.1. Endpoints / Capabilities cần có

| Method | Endpoint / Action | Mục đích | Request (tóm tắt) | Response (tóm tắt) | Ghi chú |
|--------|-------------------|----------|-------------------|--------------------|---------|
| GET/POST/... | [/api/... hoặc mô tả action] | [Để làm gì] | [Field chính] | [Trả về gì] | ⚠️ nếu chưa chắc |

### 9.2. Tích hợp ngoài / Webhook *(nếu có)*

| Nguồn | Loại | Mục đích | Ghi chú |
|-------|------|----------|---------|
| [Shopify / ESP / ...] | Webhook / REST / GraphQL | [Dùng để làm gì] | [Scope, event] |
```

**Ví dụ:**
```markdown
## 9. API / Integration

### 9.1. Endpoints / Capabilities cần có

| Method | Endpoint / Action | Mục đích | Request | Response | Ghi chú |
|--------|-------------------|----------|---------|----------|---------|
| GET | /api/consent/records | List records có filter + pagination | shopId, dateFrom, dateTo, result, country, page | Danh sách record + total | |
| POST | /api/consent/export | Tạo file export theo filter | shopId, filter, format (csv/pdf) | URL file / job id | ⚠️ export sync hay async — Dev chốt |

### 9.2. Tích hợp ngoài / Webhook

| Nguồn | Loại | Mục đích | Ghi chú |
|-------|------|----------|---------|
| Shopify | Webhook customers/redact | Xoá PII khi merchant/khách yêu cầu (GDPR) | Phải xoá IP thật trong consentRecords |
```

---

## STEP 4: CHECKLIST

Trước khi share PRD với team:

```
[ ] File đã được lưu ra .md tại root project (không chỉ trả lời trong chat)
[ ] File đặt tên đúng: PRD_[FEATURE_NAME].md
[ ] Header có History table và Mục Lục
[ ] Executive Summary đủ 5 bullets, đọc 30 giây hiểu hết
[ ] User Stories đúng format "Là 1 [role], tôi muốn... để..."
[ ] UI Reference: có link file UI GitLab (KHÔNG vẽ ASCII UI Flow trong PRD nữa)
[ ] Error Messages có exact message text (không phải mô tả chung chung)
[ ] Acceptance Criteria dùng bullet point (-), mỗi item testable, tổ chức theo feature/user story
[ ] Edge Cases có ít nhất 3 scenarios thực tế
[ ] Design Description dùng bảng chuẩn (Item/DataType/Required/Default/Mô tả/Validate)
[ ] Sub-sections không áp dụng (Error/Success Messages, Legal & Compliance) đã được bỏ — không để trống
[ ] Data Model (§8) + API (§9): CHỈ ghi cái đã check code GitLab master; field/endpoint chưa chắc đánh dấu ⚠️ cho Dev; KHÔNG bịa schema/endpoint. Feature không đụng data/API → bỏ hẳn phần đó
[ ] VẪN KHÔNG có: kiến trúc chi tiết, detection strategy, cơ chế caching/fallback (là việc Dev)
[ ] KHÔNG có Non-Functional Requirements (performance, security, accessibility, compatibility)
[ ] KHÔNG có Release Plan / timeline / Success Metrics / KPIs / tracking events
[ ] KHÔNG có Disclaimer, Dependencies, Glossary, Q&A, References
[ ] Impact Analysis đã check đủ 5 mục (Pricing Plans, Settings, Existing features, Help links, App listing) — chỉ ghi mục có ảnh hưởng
```

---

## STEP 5: RELEASE NOTE → dùng skill `/avada-release-note` (KHÔNG viết ở đây)

> ⚠️ **Template Release Note cũ đã GỠ khỏi đây (2026-07-08).** Nó là format changelog `## v[X.Y.Z]` legacy, MÂU THUẪN với format canonical hiện hành (Slack mrkdwn `[ICON] *[TYPE] Tên - Mô tả*`). Giữ 2 bản = drift. Nay chỉ còn MỘT nguồn.

Khi user yêu cầu viết release note cho feature đã ship (trigger: "viết release note", "write release note", "changelog"; Flow 1 Phase 4 / Flow 6):

1. **Gọi skill `~/.claude/skills/avada-release-note/SKILL.md`** — đó là nguồn DUY NHẤT về format, SCOPE, app registry/icon, demo screenshot, và bước gửi Slack (token theo `~/.claude/SLACK_TOKEN_POLICY.md`: RN→#solar-release = **xoxp**).
2. **Gate verify** = `~/.claude/skills/loop-verifier/release-note-standard.md` (REJECT-default), KHÔNG tự-chấm.
3. Không dùng template/checklist RN riêng trong skill prd nữa.
