---
name: feature-research
description: "PO Agent - Research tính năng cụ thể trong một sản phẩm bất kỳ, Avada hay dự án riêng (nhỏ hơn app-research). Dùng khi cần hiểu user needs, cách đối thủ làm, và đề xuất cho 1 tính năng riêng lẻ — không phải toàn bộ app."
argument-hint: "[tên tính năng] trong [tên app]"
---

> **PHẠM VI DỰ ÁN (V-multi 25/07)**: skill này dùng được cho **MỌI dự án** trong `~/.claude/PROJECTS.md`, không riêng 6 app Avada. Xác định `type` của dự án trước:
> - `avada-app` → giữ nguyên toàn bộ quy ước Avada bên dưới (Polaris, Jira, GitLab/Notion, docs per-app, gate sửa source).
> - `product` / `content` / `system` (game, desktop app, khoá học, chính hệ Claude...) → **bỏ** mục Jira/Notion/GitLab per-app, bỏ ràng buộc Polaris/Shopify, dùng design system + cấu trúc thư mục của chính dự án đó; theo dõi tiến độ bằng `STATE.md`. Sửa source ở nhóm này KHÔNG cần PO gõ "code".


# Feature Research — PO Agent

Research tính năng: **$ARGUMENTS**

Dùng khi cần research cho 1 tính năng cụ thể — không phải full market research cho cả app. Nhanh hơn `app-research`, focus vào implementation insight thay vì market sizing.

> **NGÔN NGỮ BẮT BUỘC**: LUÔN viết tiếng Việt CÓ DẤU đầy đủ trong toàn bộ output. TUYỆT ĐỐI KHÔNG viết tiếng Việt không dấu. Thuật ngữ kỹ thuật (API, webhook, merchant, v.v.) giữ nguyên tiếng Anh.

> **VALIDATION TRƯỚC KHI LƯU FILE**: Trước khi lưu file output, KIỂM TRA toàn bộ nội dung đã dùng tiếng Việt CÓ DẤU chưa. Nếu phát hiện bất kỳ đoạn nào không dấu (ví dụ: "tinh nang", "khong co") → DỪNG LẠI và sửa trước khi lưu. Đây là quy tắc ưu tiên cao nhất.

> **TÊN SECTION BẮT BUỘC**: Các phần PHẢI dùng đúng tên theo template: PHẦN 0 = Executive Summary, PHẦN 1 = User Needs & Pain Points, PHẦN 2 = Cách đối thủ implement, PHẦN 3 = Feature Gap Analysis, PHẦN 4 = Legal & Compliance, PHẦN 5 = Đề xuất, PHẦN 6 = Nguồn tham khảo. KHÔNG đổi tên section.

---

## BƯỚC 1: CHUẨN BỊ

1. Xác định rõ tính năng cần research: tên, app nào, user nào dùng
2. Đọc research file hiện có (nếu có) để tránh duplicate
3. Đọc MEMORY.md để lấy context về app và team

---

### BƯỚC 1.5 — NotebookLM Quick Research (nếu có)

Feature research nhỏ hơn app-research → dùng `nlm_research` (không cần full pipeline).

#### 1.5.1 Kiểm tra availability
- Gọi `mcp__notebooklm__nlm_list` — nếu lỗi AUTH, timeout, hoặc MCP server không phản hồi → **BỎ QUA toàn bộ Bước 1.5**, log warning cho user

#### 1.5.2 Deep Research
Gọi `mcp__notebooklm__nlm_research` với:
- query: "$ARGUMENTS feature implementation competitor analysis user needs"
- mode: "deep" (1-5 phút — chấp nhận được cho feature research)

#### 1.5.3 Lưu context
- Lưu `notebook_id` để dùng ở Citation Enrichment (Bước 4)
- Tổng hợp output thành `NLM_CONTEXT` (markdown)
- Truyền `NLM_CONTEXT` vào prompt subagents ở phần Parallel Research

---

## BƯỚC 2: OUTPUT FILE

Lưu file: `docs/Research/RESEARCH_[FEATURE_NAME].md`

> Research date: [ngày hôm nay]

---

## BƯỚC 3: CẤU TRÚC RESEARCH

### PHẦN 0 — EXECUTIVE SUMMARY

Tóm tắt trong **5-7 dòng**:
- Tính năng cần làm gì, giải quyết vấn đề gì
- Cách đối thủ đang xử lý (1 câu)
- Cơ hội/gap quan trọng nhất
- Đề xuất hành động (build / adapt / skip)

---

### PHẦN 1 — USER NEEDS & PAIN POINTS

#### 1.1 Pain points thực tế
Research từ: app reviews (1-2 sao), Reddit, Shopify Community, support tickets liên quan.

Liệt kê với quote thực tế nếu có:
- **Pain 1**: [Mô tả] — "Quote từ user" (nguồn)
- **Pain 2**: [Mô tả] — "Quote từ user" (nguồn)
- ...

#### 1.2 Mức độ ưu tiên

| Pain | Tần suất | Mức độ | Priority |
|------|----------|--------|----------|
| [Pain 1] | Cao/TB/Thấp | Cao/TB/Thấp | High/Med/Low |

---

### PHẦN 2 — CÁCH ĐỐI THỦ IMPLEMENT

Với mỗi đối thủ có tính năng này (top 3-5):

```
## [Tên App] — [App Store URL]
- Rating: X/5 (N reviews)
- Cách implement: [Mô tả cụ thể cách họ làm]
- Điểm mạnh: [1-2 điểm]
- Điểm yếu / user complaint: [1-2 điểm]
- Giá: [tier có tính năng này]
```

#### Competitive Feature Matrix

| Feature detail | [App 1] | [App 2] | [App 3] | Avada hiện tại |
|----------------|---------|---------|---------|----------------|
| [Sub-feature A] | ✅ | ✅ | ❌ | ❌ |
| [Sub-feature B] | ✅ | ❌ | ❌ | ❌ |
| [Sub-feature C] | ⚠️ Partial | ✅ | ✅ | ❌ |

---

### PHẦN 3 — FEATURE GAP ANALYSIS

Dựa trên competitive matrix và pain points, xác định:

**Gap 1**: [Tên gap]
- Vấn đề: [Pain chưa được giải quyết]
- Đối thủ có làm không? [Ai có / ai không]
- Mức độ cơ hội: Cao / TB / Thấp
- Lý do nên làm: [1-2 câu]

**Gap 2**: ...

---

### PHẦN 4 — LEGAL & COMPLIANCE *(nếu liên quan)*

Chỉ điền nếu tính năng có rủi ro pháp lý:
- Regulations áp dụng: [GDPR/CCPA/...]
- Yêu cầu cụ thể: [...]
- Risk level: Cao / TB / Thấp

Nếu không có rủi ro → ghi: "Không có vấn đề pháp lý đặc biệt."

---

### PHẦN 5 — ĐỀ XUẤT

#### 5.1 Nên build gì?

Dựa trên gaps và pain points, đề xuất tính năng cụ thể:

| # | Feature | Gắn với Pain | Complexity | Impact |
|---|---------|-------------|------------|--------|
| 1 | [Feature A] | Pain 1 | S/M/L | Cao |
| 2 | [Feature B] | Pain 2 | S/M/L | TB |

**Must-have** (MVP): [Liệt kê]
**Should-have**: [Liệt kê]
**Nice-to-have**: [Liệt kê — có thể skip v1]

#### 5.2 Differentiator đề xuất

Avada có thể làm tốt hơn đối thủ ở điểm nào?
- [Điểm 1: cụ thể]
- [Điểm 2: cụ thể]

---

### PHẦN 6 — NGUỒN THAM KHẢO

- [Tên nguồn](URL) — [Review / Forum / Official / App Store]

---

## BƯỚC 4: SAU KHI VIẾT XONG

0. **Citation Enrichment** (nếu Bước 1.5 thành công, có `notebook_id`):
   - Đọc lại file RESEARCH_*.md vừa viết
   - Tìm claims thiếu source URL cụ thể
   - Gọi `mcp__notebooklm__nlm_ask` (tối đa **5 lần**) để backfill citations
   - Nếu nlm_ask trả về cited answer → cập nhật claim với citation đầy đủ
   - Format citation: `[NLM: source_title] (URL)`
   - Mục tiêu: tăng tỷ lệ claim có real citation lên >90%

1. Đọc lại, đảm bảo không có placeholder còn sót
2. Kiểm tra tất cả số liệu có nguồn cụ thể
3. Tự động invoke skill `review-feature-research` để self-review
4. Báo cáo kết quả review + hỏi user feedback

---

## PARALLEL RESEARCH (khi cần nhanh)

Launch 2-3 subagents đồng thời:
```
Agent 1: User pain points → Reviews, Reddit, Shopify Community
Agent 2: Competitor implementations → App Store, competitor websites
Agent 3: Existing codebase context → Grep/Read current app code
```

### Context injection từ NotebookLM
Nếu Bước 1.5 thành công (có `NLM_CONTEXT`), truyền vào prompt mỗi subagent:

```
Agent 1: User pain points → [NLM_CONTEXT phần user complaints] + Reviews, Reddit
Agent 2: Competitor implementations → [NLM_CONTEXT phần competitor] + App Store
Agent 3: Existing codebase → Grep/Read (không cần NLM context)
```

Subagents vẫn TỰ SEARCH thêm — NLM_CONTEXT là starting point, KHÔNG thay thế search.
Citation format từ NLM: `[NLM: source_title] (URL)`
