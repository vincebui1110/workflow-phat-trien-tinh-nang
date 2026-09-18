---
name: user-story
description: "BA Agent - Viết User Stories + UI Flow + Design Description cho tính năng nhỏ (không cần full PRD). Dùng khi user nói 'viết user story', 'US cho [feature]', 'tính năng nhỏ không cần PRD'."
argument-hint: "[tên tính năng]"
---

# User Story Writing — BA Agent (Small Feature)

Viết User Stories cho tính năng nhỏ: **$ARGUMENTS**

Dùng khi tính năng không cần full PRD — chỉ cần user stories + UI flow + design description để dev bắt đầu làm.

---

## BƯỚC 1: PRE-WRITING

1. **Đọc research file** (nếu có) — `docs/docs/Research/RESEARCH_*.md` hoặc `docs/docs/PRD/` liên quan
2. **Đọc `UI_SNAPSHOT.md`** (nếu có tại project root) — lấy UI patterns, component conventions của app này
3. **Đọc MEMORY.md** — lấy context app, pricing plans, conventions
4. **Xác định scope** — feature thuộc app nào, màn hình nào, user nào dùng

---

## BƯỚC 2: OUTPUT FILE

Lưu file: `docs/PRD/US_[FEATURE_NAME].md`

Nếu chưa có thư mục `docs/docs/PRD/` → tạo mới.

---

## BƯỚC 3: TEMPLATE

```markdown
# User Stories — [Feature Name]

> **App**: [App Name]
> **Scope**: [Mô tả 1 câu feature làm gì]
> **Date**: [DD/MM/YYYY]
> **Author**: DieuBDT

---

## User Stories

### Epic: [Tên nhóm tính năng]

---

**US-1: [Tiêu đề ngắn gọn]**

Là 1 [role], tôi muốn [action] để [outcome].

**Priority**: Must-have / Should-have / Nice-to-have
**Complexity**: S / M / L

---

**US-2: [Tiêu đề ngắn gọn]**

Là 1 [role], tôi muốn [action] để [outcome].

**Priority**: Must-have / Should-have / Nice-to-have
**Complexity**: S / M / L

---

## UI Flow

Mô tả từng màn hình và hành động người dùng theo thứ tự trải nghiệm.

**Cấu trúc chuẩn cho mỗi màn hình:**
1. Tên màn hình + điều kiện xuất hiện
2. Mô tả ngắn — user đang ở đâu, thấy gì
3. ASCII mockup — layout trực quan
4. Bảng action → result

---

**S1 — [Tên màn hình]**

[Mô tả ngắn — user thấy gì, đang làm gì]

```
┌─────────────────────────────────────────┐
│  [Page Title]                            │
│                                          │
│  [Component 1]          [Button]         │
│  ────────────────────────────────────    │
│  [Row 1]                                 │
│  [Row 2]                                 │
└─────────────────────────────────────────┘
```

| Hành động | Kết quả |
|-----------|---------|
| [Action 1] | [Result] |
| [Action 2] | [Result] |

---

**S2 — [Tên màn hình]**

[Tiếp tục theo flow...]

---

## Design Description

### [Screen/Tab Name]

> Màn hình này mở khi: [trigger condition]

| Item | Data Type | Required | Default | Mô tả | Validate Rule |
|------|-----------|----------|---------|-------|---------------|
| [Component] | Text/DateTime/Number/Badge/Selection/Button | Y/N | [Default] | [Behavior] | [Validation] |
```

---

## BƯỚC 4: QUY TẮC VIẾT

- **User Stories**: Format bắt buộc "Là 1 [role], tôi muốn [action] để [outcome]"
- **UI labels**: Sentence case — "Save changes", "Add product", không dùng Title Case
- **UI Flow**: ASCII mockup cho từng màn hình — designer/dev nhìn vào là hình dung được ngay, không cần Figma
- **Design Description**: Bảng Item/DataType/Required/Default/Mô tả/Validate — giống PRD section 5
- **Ngôn ngữ**: Tiếng Việt CÓ DẤU đầy đủ cho nội dung — TUYỆT ĐỐI KHÔNG viết tiếng Việt không dấu. Tiếng Anh cho thuật ngữ kỹ thuật

---

## BƯỚC 5: IMPACT ANALYSIS

Trước khi kết thúc, check feature mới có cần update các phần khác không. Thêm section cuối file output:

```markdown
## Impact Analysis

| Phần | Cần update |
|------|-----------|
| [Chỉ ghi mục có ảnh hưởng] | [Mô tả ngắn] |
```

5 mục cần check:
- **Pricing Plans**: Cần thêm row vào bảng so sánh plan? Plan-gate?
- **Settings page**: Cần thêm settings global?
- **Existing features**: Thay đổi behavior feature cũ?
- **Help links**: Cần thêm "Learn more" link?
- **App listing**: Cần update description/screenshots trên store?

Chỉ ghi mục có ảnh hưởng, bỏ mục "Không ảnh hưởng".

---

## BƯỚC 6: CHECKLIST TRƯỚC KHI GỬI

```
[ ] File lưu đúng: UserStory/US_[FEATURE_NAME].md
[ ] Mỗi US có đủ: story + Priority + Complexity
[ ] UI Flow có ASCII mockup cho từng màn hình chính
[ ] Bảng action → result cho mỗi màn hình
[ ] Design Description có bảng chuẩn (6 cột)
[ ] Không có placeholder còn sót ([Tên], [action], v.v.)
```

---

## BƯỚC 6: SAU KHI VIẾT

Tự động invoke skill `review-user-story` để self-review trước khi gửi user.
