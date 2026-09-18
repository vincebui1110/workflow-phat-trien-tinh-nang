---
name: review-research
description: "QA review file RESEARCH_*.md — auto-detect loại (full 9 sections / feature 6 sections). Tự động kích hoạt sau khi tạo xong research file. Kiểm tra chất lượng trước khi gửi user."
argument-hint: "[đường dẫn file RESEARCH_*.md]"
---

Review research file: **$ARGUMENTS**

Nếu không có argument, tìm file `RESEARCH_*.md` mới nhất trong `docs/Research/` hoặc thư mục hiện tại.

> **VERIFIER ĐỘC LẬP (BẮT BUỘC)**: skill này phải chạy ở agent/context KHÁC agent đã viết research — spawn qa-agent MỚI, input CHỈ gồm file path + rubric trong skill này, KHÔNG truyền conversation/reasoning của maker. PO-agent vừa viết xong research thì KHÔNG được tự chạy skill này inline trong cùng context.

> **NGÔN NGỮ BẮT BUỘC**: LUÔN viết tiếng Việt CÓ DẤU đầy đủ trong toàn bộ output (report, comments, ghi chú). TUYỆT ĐỐI KHÔNG viết tiếng Việt không dấu.

---

## AUTO-DETECT TYPE

Sau khi đọc file, xác định loại research:
- **Full (app-research)**: Có 9+ sections (Phần 0-8 + Phần 9 nguồn) → rubric 90đ
- **Feature (feature-research)**: Có 6 sections (Phần 0-5) → rubric 60đ

Dùng heading scan: count `### PHẦN` hoặc `## Phần` hoặc `##` major sections.

---

## QUY TRÌNH

### Bước 1: Đọc file
Đọc toàn bộ nội dung file RESEARCH_*.md được chỉ định.

### Bước 1.5: Check existing app features

**Mục đích**: Tránh recommend build feature mà app đã có sẵn.

1. Xác định target app từ file research (OL/CB/AC/AV)
2. Scan codebase app tương ứng:
   - **Order Limit**: `${SHOPIFY_APP_DIR}/order-limit/`
   - **Cookie Bar**: `${SHOPIFY_APP_DIR}/cookie-bar/`
   - **Accessibility**: `${SHOPIFY_APP_DIR}/accessibility/`
   - **Age Verification**: `${SHOPIFY_APP_DIR}/age-verification/`
3. Glob `packages/assets/src/pages/**/*.js` và `packages/functions/src/routes/**/*.js` → existing feature list
4. Cross-reference với Đề xuất sản phẩm / MVP Feature Set
5. Nếu feature đã có: "⚠️ Feature X đã có trong app — không cần build" → update recommendation

---

### Bước 2: Chấm điểm

#### Nếu TYPE = FULL (app-research) — 90đ

| Phần | Max | Tiêu chí chính |
|------|-----|---------------|
| 0. Executive Summary | 10 | 5 dòng, số liệu cụ thể, logic từ data |
| 1. Nhu cầu thực tế | 10 | ≥10 nhu cầu raw, Priority Matrix có công thức |
| 2. User Personas | 10 | 3-4 personas, gắn link painpoint, quote cụ thể |
| 3. User Stories | 10 | ≥2 stories/painpoint, nhóm theo Epic, AC verifiable |
| 4. Competitor Analysis | 10 | 5 đối thủ SWOT, Feature Matrix ≥10 features, Gap ≥2 |
| 5. Pháp lý | 10 | ≥3 regulations, Risk Assessment matrix |
| 6. Market Size | 10 | TAM/SAM/SOM số liệu thực, growth trends |
| 7. Đề xuất sản phẩm | 10 | Positioning, MVP, Pricing 3 tiers, ≥6 KPIs |
| 8. Roadmap | 10 | 3 phases, timeline tuần, dependencies |
| 9. Nguồn tham khảo | — | (bonus check: mọi claim có nguồn) |

**Chi tiết rubric từng phần:**

**PHẦN 0 — Executive Summary (10đ)**
- +2đ: Có đủ 5 nội dung (quy mô thị trường, pain point, đối thủ, cơ hội, đề xuất)
- +2đ: Quy mô thị trường có số liệu cụ thể
- +3đ: Pain point lớn nhất rõ ràng, actionable
- +3đ: Cơ hội và đề xuất có logic từ data

**PHẦN 1 — Nhu cầu thực tế (10đ)**
- +2đ: ≥10 nhu cầu raw list, mỗi nhu cầu có nguồn
- +3đ: Priority Matrix đủ 4 cột
- +3đ: Priority Score tính theo công thức
- +2đ: Kết luận Top 3 có lý giải

**PHẦN 2 — User Personas (10đ)**
- +2đ: 3-4 personas
- +2đ: Đủ info: cơ bản, mục tiêu, nỗi đau, hành vi, quote
- +3đ: Pain gắn link painpoint # từ Phần 1
- +3đ: Quote cụ thể, thực tế

**PHẦN 3 — User Stories (10đ)**
- +3đ: Mỗi Top 3 painpoint có ≥2 stories
- +3đ: Đủ: Persona, As a/I want/So that, AC, Priority, Complexity
- +2đ: Nhóm theo Epic
- +2đ: AC verifiable

**PHẦN 4 — Competitor Analysis (10đ)**
- +2đ: 5 đối thủ, không giới hạn Shopify
- +2đ: SWOT đầy đủ
- +2đ: Feature Matrix ≥10 features
- +2đ: Pricing table đầy đủ
- +2đ: Gap Analysis ≥2 gaps

**PHẦN 5 — Pháp lý (10đ)**
- +3đ: ≥3 regulations cụ thể
- +3đ: Data & Privacy đủ 4 câu hỏi
- +4đ: Risk Assessment matrix

**PHẦN 6 — Market Size (10đ)**
- +3đ: TAM/SAM/SOM có số liệu
- +3đ: SOM có cơ sở tính toán
- +4đ: Growth trends có yếu tố cụ thể

**PHẦN 7 — Đề xuất sản phẩm (10đ)**
- +2đ: Positioning statement đúng format
- +3đ: MVP Feature Set có Effort + Impact
- +3đ: Pricing 3 tiers có lý do
- +2đ: ≥6 KPIs với target
- **BONUS**: MVP không chứa feature đã có (Bước 1.5)

**PHẦN 8 — Roadmap (10đ)**
- +2đ: 3 phases (MVP/Growth/Scale)
- +3đ: Timeline tuần, thực tế
- +2đ: Effort tổng tính từ S/M/L/XL
- +2đ: Dependencies ≥3 items
- +1đ: Go-to-Market ≥3 mốc

**Ngưỡng FULL**: ≥72/90 (80%) PASS | 63-71 (70-79%) NEEDS WORK | <63 FAIL

---

#### Nếu TYPE = FEATURE (feature-research) — 60đ

| Phần | Max | Tiêu chí chính |
|------|-----|---------------|
| 0. Executive Summary | 10 | 4 nội dung, đề xuất rõ (build/adapt/skip) |
| 1. User Needs & Pain Points | 10 | ≥5 pain points, Priority table, nguồn đa dạng |
| 2. Cách đối thủ implement | 10 | ≥3 đối thủ, Feature Matrix có cột Avada |
| 3. Feature Gap Analysis | 10 | Gaps từ data, logic nhất quán |
| 4. Legal & Compliance | 10 | Regulations nếu có, hoặc ghi rõ "không có" |
| 5. Đề xuất | 10 | Must/Should/Nice phân loại, differentiator cụ thể |

**Chi tiết rubric từng phần:**

**PHẦN 0 — Executive Summary (10đ)**
- +3đ: Đủ 4 nội dung (feature, đối thủ, gap, đề xuất)
- +3đ: Đề xuất rõ ràng (build/adapt/skip)
- +2đ: Đọc 5-7 dòng hiểu toàn bộ
- +2đ: Không thừa/lặp

**PHẦN 1 — User Needs (10đ)**
- +3đ: ≥5 pain points với quote/nguồn
- +3đ: Priority table đủ 4 cột
- +2đ: Pain points liên quan feature (không lạc đề)
- +2đ: Nguồn đa dạng

**PHẦN 2 — Competitor Implementations (10đ)**
- +3đ: ≥3 đối thủ mô tả cụ thể
- +3đ: Feature Matrix có cột Avada hiện tại
- +2đ: Điểm yếu có dẫn chứng
- +2đ: Giá gắn đúng tier

**PHẦN 3 — Gap Analysis (10đ)**
- +4đ: Gaps từ data (matrix + pain points)
- +3đ: Mỗi gap có mức độ cơ hội + lý do
- +3đ: Logic nhất quán Phần 1 + 2

**PHẦN 4 — Legal (10đ)**
- +5đ: Regulations + yêu cầu cụ thể (hoặc ghi rõ không có)
- +3đ: Risk level có lý giải
- +2đ: Không bỏ trống

**PHẦN 5 — Đề xuất (10đ)**
- +3đ: Must/Should/Nice phân loại có lý
- +3đ: Gắn đúng gap + pain point
- +2đ: Differentiator cụ thể
- +2đ: Có nguồn tham khảo

**Ngưỡng FEATURE**: ≥48/60 (80%) PASS | 36-47 (60-79%) PASS WITH NOTES | <36 FAIL

---

### Bước 3: Phân loại issues

**MINOR** → QA tự sửa + log:
- Typo, format, placeholder, bảng thiếu cột

**MAJOR** → Trả về agent gốc (PO) sửa:
- Thiếu section hoàn toàn
- Pain points không có nguồn
- Đề xuất mâu thuẫn gap analysis
- Feature Matrix sai thực tế

### Bước 4: Tự fix MINOR issues
Sửa trực tiếp, search web nếu cần data bổ sung.

### Bước 5: Output report

```
## RESEARCH REVIEW COMPLETE — [Type: Full/Feature]

**File**: [path]
**Type**: Full (9 sections) / Feature (6 sections)
**Score**: X/[90 or 60] (XX%)
**Status**: PASS / NEEDS WORK / FAIL

| Phần | Điểm | Ghi chú |
|------|------|---------|
| ... | X/10 | ... |

### MINOR issues (đã tự fix):
- [List]

### MAJOR issues (cần PO Agent fix):
- [List — nếu có]

### Tóm tắt research:
- **Feature**: [tên]
- **Top pain point**: [1 dòng]
- **Biggest gap**: [1 dòng]
- **Recommendation**: [build/adapt/skip + 1 dòng]

### Cần user chú ý:
1. [Điểm quan trọng]
2. [Điểm thứ 2]

→ File sẵn sàng cho review. Reply "OK" hoặc gửi feedback.
```
