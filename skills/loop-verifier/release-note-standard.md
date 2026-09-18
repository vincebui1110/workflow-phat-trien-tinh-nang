# Release Note Verification Standard — Gate cho luồng Release Note

> Profile của `loop-verifier` áp riêng cho output **Release Note** (skill `/avada-release-note`, Flow 6, autopilot RN+UG `d4b203bc`). Đây là GATE (REJECT-default + loop), KHÔNG phải review tư vấn. Thay cho phần "VALIDATION CHECKLIST" tự-chấm trong skill maker — vì nguyên tắc gốc loop-engineering: *"the implementer must never grade its own homework."*

## Khi nào dùng
- Sau khi maker (`/avada-release-note`, ba-agent) sinh xong 1 release note (Slack mrkdwn hoặc Markdown Mode 2), TRƯỚC khi gửi `#solar-release` / ghi vào digest autopilot / lưu file publish.
- Step `content` (release-note) trong plan PHẢI có `verifier: true`.

## Nguyên tắc cứng (kế thừa loop-verifier)
1. **REJECT until proven otherwise** — release note mặc định CHƯA đạt.
2. **Verifier ≠ maker** — chạy ở agent KHÁC agent đã viết, chỉ nhận artifact + rubric. Model: Lens 0 = script deterministic; panel lens = `sonnet`; escalate `opus` chỉ khi REJECT 2 vòng liên tiếp hoặc dính claim pháp lý (0.10).
3. **KHÔNG tin lời maker** ("đã đúng template") — tự chạy grep Lens 0, tự đọc lại vs task nguồn.
4. **Maker không tự APPROVE.**

## Chuẩn bị
Ghi nội dung release note (raw mrkdwn, đúng ký tự `•◦▪`, `*bold*`, `<!channel>`, `<@ID>`) ra 1 file để chạy check, ví dụ `RN="/tmp/rn-check.txt"`. Lens 0 chạy trên file này.

## Lens 0 — Technical/Format Pre-Gate (CODE GATE, chạy TRƯỚC panel)

**Chạy 1 lệnh duy nhất** (script = SINGLE SOURCE của danh sách check, đừng tự chạy grep rời — dual-maintenance là nguồn drift đã gây tái phạm 03/07 + 07/07):

```bash
bash ~/.claude/skills/loop-verifier/lens0-release-note.sh "$RN"
```

Check bên trong script (đọc script để biết chi tiết pattern): 0.1 title format `[ICON] *[TYPE] Tên - Mô tả*` · 0.2 icon whitelist 6 app x2 · 0.3 dòng 1 App+Date · 0.4 bullet `•◦▪` · 0.5 section labels đủ · 0.6 `<!channel>` + tag CC · 0.7 demo không placeholder · **0.7b demo publish-ready** (marker HOÃN "chưa có/cần chụp/khi publish" → NEEDS_DEMO, KHÔNG coi done; waiver "(không có UI...)" cho qua) · 0.8 không rò code/JSON/camelCase · 0.9 độ dài <3800 · 0.10 phát hiện claim pháp lý.

Đọc exit code:
- **0** = PASS toàn bộ → chạy Panel 3 lens.
- **1** = FAIL → **REJECT NGAY**, không chấm panel; trả maker fix theo dòng FAIL script in ra. (0.8 hit là thuật ngữ hợp lệ như Text-to-Speech → Lens 2 xét, ghi rõ trong verdict.)
- **2** = deterministic PASS nhưng **CÓ claim pháp lý (0.10)** → verifier PHẢI đối chiếu tên + acronym + ngày hiệu lực đạo luật với NGUỒN THẬT (KB legal / web verify), KHÔNG tin tên luật maker tự đặt. Không verify được = **MAJOR** → REJECT/ESCALATE_HUMAN (KHÔNG bao giờ auto-publish claim pháp lý chưa kiểm chứng).
- **3** = format PASS nhưng **Demo còn marker HOÃN (0.7b)** ("chưa có / cần chụp / khi publish") → **NEEDS_DEMO / HOLD**. RN có thể vẫn gửi Slack (thông báo merchant) nhưng **task release-note CHƯA "done"** — còn nợ demo: phải chụp demo production (hoặc đổi sang waiver "(không có UI...)" nếu feature thật sự không có UI) rồi mới tick done. Task 143 (PO bắt được: lens pass hết mà thiếu link demo vẫn coi như done). ⚠️ Đây là HOLD nợ-asset, KHÔNG phải content-error → đừng loop maker sửa nội dung; escalate "đi chụp demo".

> **BẮT BUỘC CHẠY THẬT (không được skip):** autopilot/verifier PHẢI ghi RN ra file, chạy script, và **dán NGUYÊN output + exit code vào digest/verdict**. KHÔNG có block output script = coi như gate CHƯA chạy = REJECT. (Lý do tồn tại của script: cùng lỗi format tái phạm 2 lần dù check có trong .md — gate bằng code, không tin model tự khai, xem [[feedback_autopilot_single_send_code_gate]].)

Nguồn: `release-note/SKILL.md` (FORMAT RULES, VALIDATION CHECKLIST, giới hạn độ dài), [[feedback_vietnamese_diacritics]], [[feedback_slack_message_format]].

## Panel 3 lens (perspective-diverse — mỗi lens độc lập REJECT-default)

### Lens 1 — Fidelity & Scope (chặn nếu sai bản chất)
- **SCOPE đúng:** task này ĐƯỢC viết release note? Loại NGAY nếu là **bug-fix** (chỉ sửa lỗi, không đổi hành vi) hoặc **cross-promo/marketing** (điều hướng sang app khác) → đó là REJECT với lý do "task không thuộc diện release note" (khớp SCOPE trong `release-note/SKILL.md`).
- **Không bịa:** mọi tính năng/hành vi/con số nêu trong RN có THẬT trong task nguồn (Jira Done note / PRD)? Đọc task nguồn, đối chiếu. Bịa = REJECT.
- **Đúng TYPE:** NEW FEATURE vs IMPROVEMENT phân loại đúng theo task.

### Lens 2 — Audience CS & Plain language
- Đối tượng là CS + người ngoài (merchant/sale). **Không technical sâu:** không database/API/cache/metafield/endpoint/GeoIP…
- **Description/Logic là văn xuôi người ngoài đọc hiểu:** không còn tên biến/field nội bộ, snippet, tên metric nội bộ chưa gloss (vd "Specificity Score" phải giải thích ngay tại chỗ hoặc thay bằng "mức độ cụ thể của điều kiện nhắm"). Đây là chỗ bắt jargon mà Lens 0.8 (grep) bỏ lọt.
- **Tiếng Việt có dấu đầy đủ, tự nhiên** (không dịch máy gượng; thuật ngữ EN phổ biến giữ nguyên).
- Mô tả theo trải nghiệm: merchant/khách LÀM gì → THẤY gì → kết quả.

### Lens 3 — Completeness & correctness
- Đủ mọi section bắt buộc: **Issue / Use case, Solution, Vị trí, Description/Logic** (Note, Demo optional nhưng nếu có phải hợp lệ).
- **Logic flow:** Issue → Solution → Description nhất quán (Solution giải đúng Issue; Description khớp Solution).
- **Vị trí reproduce được:** đường dẫn trong app rõ, CS lần theo tới được (vd `App AV → Campaigns → toggle Active`).
- Nhiều feature cùng ngày → gộp dưới 1 header date + dòng 2 `*X NEW FEATURES/IMPROVEMENTS - …*`.

## Tiêu chí PASS (GATE — phải đủ TẤT CẢ, không lấy trung bình)
- **Lens 0 toàn bộ pass** (0.1-0.10) — fail 1 = REJECT ngay.
- **ZERO issue MAJOR.**
- **ZERO issue MINOR** (mặc định `block_on_minor=true`; nới được).
- **Cả 3 lens APPROVE.**

→ Đủ hết = **APPROVE**. Thiếu 1 = **REJECT**.

### Phân loại MAJOR / MINOR
- **MAJOR** (luôn REJECT): bất kỳ Lens 0 fail; sai SCOPE (bug-fix/cross-promo viết như feature); bịa nội dung; **claim pháp lý (tên đạo luật/hiệu lực) không verify được nguồn thật** (Lens 0.10); thiếu 1 trong 4 section bắt buộc; rò technical sâu gây CS hiểu sai; logic Issue/Solution mâu thuẫn.
- **MINOR** (REJECT khi `block_on_minor=true`): 1 thuật ngữ jargon lẻ chưa gloss; câu quá dài/khó hiểu lẻ; Demo marker chữ nghĩa chưa chuẩn; vị trí hơi mơ hồ; icon render nhập nhằng (xác nhận với PO).

## FEEDBACK FORMAT — CHỈ danh sách phần cần update (BẮT BUỘC, task 221)

> **Vấn đề đã bắt (case 05/08, RN AC "Solved by SEA→Avada"):** BA soát trả feedback dài, hầu hết là NHẬN XÉT/ĐÁNH GIÁ ("khớp spec…", "chính tả và giọng ổn…", "một ý product nhỏ…", "đây là góc soát của BA thôi ạ…") chứ không phải điểm cần sửa. Feedback đó (a) phình input cho AI revise ở bước sau, (b) vượt ngưỡng `RN_ESCALATE_CHARS` (600) → rn-review.js escalate "feedback khá dài/nặng" thay vì auto-revise được.

**Tách BẠCH 2 thứ — verifier vẫn tự chấm ĐỦ để RA verdict, nhưng phần EMIT ra ngoài (cho maker / AI revise kế / PO đọc trong thread) CHỈ gồm danh sách phần cần update.**

- Verifier vẫn chạy đủ Lens 0 + panel 3 lens NỘI BỘ để quyết APPROVE/REJECT (đó là suy luận riêng, KHÔNG in ra).
- Phần feedback GỬI RA chỉ được gồm:
  1. **1 dòng verdict**: `APPROVE` | `REJECT` | `ESCALATE_HUMAN` (kèm 1 mệnh đề ngắn lý do nếu ESCALATE).
  2. Nếu KHÔNG APPROVE → **danh sách đánh số "phần cần update"**, mỗi mục đúng 1 dòng theo mẫu:
     `N. [vị trí/mục cụ thể trong RN — vd "dòng Demo", "section Vị trí", "title feature 2"] → [hành động sửa cụ thể, actionable]`
     Ví dụ: `1. Dòng Demo (AC) → chụp production badge "Solved by Avada" ở Accessibility Scanner > Scan History > View Details, dán link thay marker "(chưa có...)".`
- **CẮT BỎ HẾT, KHÔNG được có trong feedback gửi ra:** khen/nhận xét phần đạt ("khớp spec", "chính tả ổn", "format đủ"); tóm tắt chất lượng; điểm số 0-100 dạng văn; bàn luận product không-actionable ("có nên lên RN riêng không"); lời rào/đưa đẩy ("đây là góc soát của BA", "còn duyệt thì để anh chốt"); nhắc lại nội dung RN. Nếu 1 câu KHÔNG chỉ ra 1 chỗ cụ thể + 1 hành động sửa → KHÔNG đưa vào.
- **APPROVE** → chỉ in đúng 1 dòng `APPROVE` (+ nếu còn nợ demo thì đúng 1 mục "phần cần update" là chụp demo). KHÔNG liệt kê "những gì đã tốt".
- Mục tiêu độ dài: feedback gửi ra **NGẮN hơn hẳn**, ưu tiên < ~600 ký tự để rn-review.js auto-revise được thay vì escalate vì dài.
- MAJOR/MINOR chỉ dùng để verifier TỰ quyết verdict; khi đưa vào danh sách "phần cần update" thì diễn đạt thành hành động sửa, KHÔNG dán nhãn phân loại kèm bình luận.

## Verdict + LOOP (đây là "loop" maker-checker)
Output = **FEEDBACK FORMAT ở trên** (verdict 1 dòng + danh sách phần cần update). KHÔNG in bảng Lens 0 / diễn giải 3 lens / điểm 0-100 ra ngoài — đó là suy luận nội bộ để ra verdict, không phải feedback.

```
Vòng lặp Write→Verify:
  maker viết/sửa release note
  → Lens 0 (grep pre-gate, fail-fast) → fail = REJECT ngay
  → panel 3 lens chấm
  → APPROVE? → thoát loop → gửi Slack / ghi digest / lưu publish
  → REJECT?  → trả maker feedback CỤ THỂ (từng MAJOR/MINOR + cách sửa) → tăng iteration → verify lại
  → iteration > max_iterations  HOẶC  token dùng > token_budget  → ESCALATE_HUMAN
```

- **ESCALATE_HUMAN**: dừng, ghi `STATE.md` ACTIVE = `WAITING_HUMAN`, đưa PO bản RN + lý do còn fail để PO quyết (chấp nhận có điều kiện / tự chỉnh / bỏ).
- Mỗi vòng ghi STATE: `iteration N, verdict, MAJOR/MINOR còn lại`.
- Risk gate (chạm credentials / file ngoài scope) → ESCALATE ngay.

## Knobs (PO chỉnh được)
- `pass_score` = **90** (điểm tham khảo) · `max_iterations` = **3** · `block_on_minor` = **true** · **`token_budget`** = ngưỡng token/loop (guard runaway — vượt là ESCALATE, không lặp vô hạn) · số lens = 3 (+ Lens 0 fail-fast).
- Autopilot draft (RN chỉ draft, chưa publish): có thể `block_on_minor=false` để không kẹt loop vì MINOR — MINOR ghi nhận trong digest cho PO, MAJOR vẫn chặn.

## Tôi luyện standard (living document)
Mỗi lần PO bắt được lỗi mà gate KHÔNG bắt → thêm 1 check vào Lens 0 (ưu tiên grep deterministic) hoặc 1 mục lens. Lịch sử: title-format `[TYPE] Tên - Mô tả` + icon-whitelist (0.1/0.2) được thêm 03/07 sau khi PO soi ra RN AV dùng `🎯🎯 IMPROVEMENT …` thiếu ngoặc + thiếu mô tả.
- **07/07**: digest 05/07 TÁI PHẠM cùng lỗi 0.1 (`NEW FEATURE`/`IMPROVEMENT` thiếu ngoặc `[]`) + thiếu footer `<!channel>` (0.6) + demo `(Link)` (0.7) — cả 3 đã có check nhưng gate KHÔNG chạy lúc runtime → thêm mệnh lệnh "BẮT BUỘC CHẠY THẬT + dán kết quả Lens 0 vào digest, thiếu = REJECT". Đồng thời PO soi ra CB bịa luật "Arkansas Consumer Protection Act (ACPA)" (đúng là **APDPA** Arkansas Personal Data Protection Act, hiệu lực 01/07/2025) → thêm check 0.10 legal/fact grounding.
