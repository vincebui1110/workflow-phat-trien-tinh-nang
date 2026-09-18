---
name: review-prd
description: QA review ĐỘC LẬP file PRD_*.md theo checklist chuẩn Avada. Tự động kích hoạt sau khi tạo xong PRD — PHẢI chạy ở agent/context KHÁC agent đã viết PRD. Kiểm tra tính đầy đủ và nhất quán với research file trước khi gửi user review.
argument-hint: "[đường dẫn file PRD_*.md]"
---

Review PRD file: $ARGUMENTS

Nếu không có argument, tìm file PRD_*.md mới nhất trong thư mục hiện tại.

> **VERIFIER ĐỘC LẬP (BẮT BUỘC)**: skill này phải chạy ở agent/context KHÁC agent đã viết PRD — spawn qa-agent MỚI, input CHỈ gồm file path + rubric trong skill này, KHÔNG truyền conversation/reasoning của maker (nguyên tắc loop-verifier: "the implementer must never grade its own homework"). BA vừa viết xong PRD thì KHÔNG được tự chạy skill này inline trong cùng context.

> **NGÔN NGỮ BẮT BUỘC**: LUÔN viết tiếng Việt CÓ DẤU đầy đủ trong toàn bộ output (report, comments, ghi chú). TUYỆT ĐỐI KHÔNG viết tiếng Việt không dấu.

## QUY TRÌNH

### Bước 1: Đọc file + tìm research source
1. Đọc toàn bộ PRD_*.md
2. Tìm RESEARCH_*.md tương ứng (cùng feature name) để so sánh
3. Đọc research file để check consistency

### Bước 1.5: Grounding code → ĐÃ TÁCH sang /review-prd-1

Mọi đối chiếu spec-vs-code (feature đã tồn tại chưa · schema/endpoint §8/§9 có bịa không · giả định sai về code đã có · seam mới-ghép-cũ) **KHÔNG làm ở đây nữa** — do skill `/review-prd-1` sở hữu, chạy độc lập với posture adversarial + đối chiếu `origin/<default-branch>` (không đọc file local stale). Skill này (`review-prd`) chỉ soi **tài liệu**: đủ mục, AC testable, nhất quán với research. Khi tổng hợp, tham chiếu report của `/review-prd-1` cho phần code, KHÔNG tự grep code.

### Bước 1.6 — TOP-DOWN vs BOTTOM-UP (BẮT BUỘC, t37 24-08)

> Nguồn + luật đầy đủ: **`~/.claude/review/ERROR-DISCOVERY.md`** (nguồn DUY NHẤT). Đừng chép luật
> sang đây — chỉ đọc file đó rồi làm theo.

Rubric 5 phần ở Bước 2 dưới đây là **TOP-DOWN thuần**: tiêu chí được nghĩ ra TRƯỚC khi xem data.
Nó cần thiết nhưng **không đủ**, và có số đo chứng minh: chạy
`node ~/.claude/tools/review-axes.js hitrate` — trên corpus 229 lần PO/QA đã thật sự bắt lỗi,
**cả 5 trục top-down (problem · personas · features · AC · legal) có ĐÚNG 0 bằng chứng**, trong khi
trục PO bắt nhiều nhất (`evidence-missing`, 13 lần / 25%) **không có mục nào trong rubric này**.

Vì vậy lượt review PHẢI chạy CẢ HAI nhánh:

| nhánh | chạy thế nào | ai làm |
|---|---|---|
| **TOP-DOWN** | rubric 5 phần ở Bước 2 | agent |
| **BOTTOM-UP** | trục `bu-*` rút từ corpus lỗi NGƯỜI đã bắt, xem `review/AXES.json` | agent chạy trục `lane: agent`; **trục `lane: human` CHỈ PO** |

**Chạy bottom-up:**
```bash
node ~/.claude/tools/review-axes.js plan --surface prd --artifact <đường dẫn PRD>
```
Tool in ra các brief độc lập — **spawn MỖI brief thành MỘT sub-agent riêng** (mỗi tiêu chí một agent,
không gộp; gộp là mất đúng thứ vừa tách), cộng 1 agent residual, cộng checklist lane người.
Trần mặc định 4 agent (trần cứng 6), xếp hạng theo số bằng chứng thật — chống bung sub-agent vô hạn.

**Ba điều KHÔNG được làm:**
- **Không tự làm phần bottom-up của người.** Trục `lane: human` (`bu-worth-including` —
  "mục này có đáng nằm ở đây không", `bu-evidence-substandard` — chuẩn chụp ảnh) là product judgment
  và chuẩn ngầm. Auto-eval vendor đều trượt đúng loại này (precision 80-90%) ⇒ agent sẽ trả lời
  **tự tin và sai**. Ghi thẳng vào report: *"lane người CHƯA chấm — cần PO đọc"*.
- **Không kết luận PASS khi lane người còn trống.** Agent PASS hết ≠ PRD đạt.
- **Không tự sinh "sample thật" rồi rút tiêu chí từ chính nó.** Trục mới chỉ đến từ corpus có
  `source_file` + `verbatim` thật.

### Bước 2: Chấm điểm từng phần (mỗi phần tối đa 10 điểm)

---

#### PROBLEM STATEMENT (10đ)
- [ ] +3đ: Problem được mô tả từ góc nhìn user (không phải từ góc nhìn business)?
- [ ] +3đ: Problem gắn trực tiếp với Top 3 painpoints từ research?
- [ ] +2đ: Có dẫn chứng (quote từ user, số liệu) để justify problem?
- [ ] +2đ: Rõ ràng ai bị ảnh hưởng (persona cụ thể)?

#### USER PERSONAS (10đ)
- [ ] +4đ: Personas trong PRD khớp với personas trong research (không tự bịa)?
- [ ] +3đ: Mỗi persona có rõ goal + pain point chính?
- [ ] +3đ: Personas được reference xuyên suốt PRD (user stories, acceptance criteria)?

#### FEATURES & USER STORIES (10đ)
- [ ] +3đ: Mỗi feature có User Story ID gắn với research?
- [ ] +3đ: Features phân loại rõ Must-have / Should-have / Nice-to-have?
- [ ] +2đ: Features trong MVP nhất quán với MVP recommendation trong research?
- [ ] +2đ: Không có feature nào thêm vào mà không có trong research (scope creep)?
- [ ] **BONUS CHECK**: feature-đã-tồn-tại + schema/endpoint bịa → xem report `/review-prd-1` (không tự grep code ở đây).

#### ACCEPTANCE CRITERIA (10đ)
- [ ] +3đ: Mỗi Must-have feature có ít nhất 3 Acceptance Criteria?
- [ ] +4đ: Acceptance Criteria testable — có thể verify Pass/Fail rõ ràng?
- [ ] +3đ: AC được tổ chức theo feature/user story (không gộp thành 1 block)?

#### LEGAL / COMPLIANCE (10đ)
- [ ] +4đ: Risks từ Phần 5 của research được address trong PRD?
- [ ] +3đ: Có compliance requirements cụ thể cho từng regulation?
- [ ] +3đ: Legal risks được assign owner (ai chịu trách nhiệm implement compliance)?

---

### Bước 3: Kiểm tra Consistency với Research

So sánh các điểm sau giữa PRD và RESEARCH_*.md:

| Điểm kiểm tra | Research nói gì | PRD nói gì | Consistent? |
|---------------|----------------|-----------|-------------|
| Target personas | ... | ... | ✅/❌ |
| MVP features | ... | ... | ✅/❌ |
| Market gap addressed | ... | ... | ✅/❌ |
| Top legal risk | ... | ... | ✅/❌ |

Nếu có ❌ → fix trước khi gửi user.

### Bước 4: Tính tổng điểm

```
Tổng điểm: X/50

90-100%: ✅ PASS — Sẵn sàng gửi user review
70-89%:  ⚠️ NEEDS WORK — Fix issues trước khi gửi
<70%:    ❌ FAIL — Cần bổ sung đáng kể
```

### Bước 5: Phân loại issue, fix đúng vai, output báo cáo

Phân loại từng vấn đề tìm được (khớp QA Review Protocol trong `agents/qa-agent.md` và cách `review-research`/`review-user-story` đang làm):
- **MINOR** (format, typo, thiếu field nhỏ, số liệu lệch): reviewer tự fix luôn + ghi log từng thứ đã sửa.
- **MAJOR** (logic sai, thiếu section quan trọng, conflict với research, feature app đã có): reviewer KHÔNG tự sửa content — trả về BA Agent fix, rồi review lại (re-verify) tới khi hết MAJOR.

Sau đó output:

---

## ✅ PRD REVIEW COMPLETE

**File:** [tên file]
**Research source:** [RESEARCH_*.md tương ứng]
**Score:** X/50 (XX%)
**Consistency check:** ✅ Passed / ❌ X inconsistencies found and fixed

### Những gì đã được bổ sung trong review:
- [Mô tả ngắn gọn từng thứ đã fix]

### Tóm tắt PRD để bạn review nhanh:
- **Feature:** [tên]
- **Problem:** [1 dòng]
- **MVP:** [số features, effort estimate]
- **Top compliance requirement:** [1 dòng]

### Các điểm bạn nên đặc biệt chú ý khi review:
1. [Điểm quan trọng nhất cần human judgment — thường là timeline hoặc pricing]
2. [Điểm thứ 2]
3. [Điểm thứ 3]

**→ PRD đã sẵn sàng cho bạn review. Bạn có thể:**
- ✏️ Sửa trực tiếp vào file PRD_*.md
- 📝 Gửi feedback dạng list để tôi update
- ✅ Confirm "OK" để tôi commit cả Research + PRD lên GitLab
