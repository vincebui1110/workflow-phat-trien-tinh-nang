# User Guide Verification Standard — Gate cho luồng User Guide

> Profile của `loop-verifier` áp riêng cho output **User Guide / help-center article** (skill `/avada-user-guide`, Flow 6, autopilot RN+UG `d4b203bc`). Đây là GATE (REJECT-default + loop), thay cho "BƯỚC 7: CHECKLIST" tự-chấm trong skill maker — vì *"the implementer must never grade its own homework."*

## Khi nào dùng
- Sau khi maker (`/avada-user-guide`, content/ba-agent) viết xong bài `.mdx/.md`, TRƯỚC khi push Falcon `main` / bàn giao publish.
- Step `content` (user-guide) trong plan PHẢI có `verifier: true`.

## Nguyên tắc cứng (kế thừa loop-verifier)
1. **REJECT until proven otherwise.**
2. **Verifier ≠ maker** — agent khác, Opus.
3. **KHÔNG tin "đã đúng template"** — tự chạy grep Lens 0, tự đọc bài vs UI thật.
4. **Maker không tự APPROVE.**

## Chuẩn bị
`UG` = đường dẫn file bài (`…/userguide/<slug>/content/<slug>.md`). `DIR` = folder guide (`…/userguide/<slug>/`). Lens 0 chạy trên các path này.

## Lens 0 — Structure/Format Pre-Gate (FAIL-FAST)

Khách quan (grep/ls/awk). Chạy TRƯỚC; fail 1 = REJECT ngay.

| # | Check | Lệnh / cách verify | Pass khi |
|---|-------|---------------------|----------|
| 0.1 | **Folder structure đúng** | `ls "$DIR/content/"*.md` và `ls -d "$DIR/images"` | file `.md` nằm trong `content/`, có folder `images/` cùng cha. |
| 0.2 | **Tên file = slug folder** | so `basename $UG .md` với tên folder guide | trùng (không `-v2/-v3` cạnh nhau khi chưa cần). |
| 0.3 | **Image ref dùng `../images/`** | `grep -noE '!\[[^]]*\]\([^)]+\)' "$UG"` rồi kiểm path | mọi ảnh path `../images/…`, KHÔNG `images/<slug>/…` cũ, KHÔNG absolute. |
| 0.4 | **Không skip cấp header** (H2→H4 bỏ H3) | trích các dòng `^#+ ` → kiểm bậc tăng ≤ +1 | không nhảy cấp. |
| 0.5 | **Screenshot placeholder đúng cú pháp** (nếu còn) | `grep -nE '<!-- screenshot:.*\| app:.*\| page:' "$UG"` | mỗi placeholder đủ field `screenshot/app/page` (+`annotate`). |
| 0.6 | **Có section cấu trúc bắt buộc cuối bài** | `grep -c '^## Tips' "$UG"`, `grep -ic 'related articles' "$UG"`, closing (`grep -ic "there you have it\|all set\|we're here to help"`) | Tips ≥1, Related Articles ≥1, closing ≥1 (trừ FAQ/Regulation theo template). |
| 0.7 | **Format UI element** | `grep -c '\*\*[^*]\+\*\*' "$UG"` (bold tên nút/tab) | có bold cho tên nút/tab/field (không để plain). |
| 0.8 | **require_images (knob)** | nếu `require_images=true`: `ls "$DIR/images/"*.png` và grep placeholder CHƯA fill (`<!-- screenshot`) = 0 | mọi ảnh đã có, không còn placeholder trống. Với autopilot draft `require_images=false` → bỏ qua, nhưng LIỆT KÊ ảnh còn thiếu cho PO. |
| 0.9 | **Thanh tiến độ `<Steps>` (BẮT BUỘC bài có quy trình/nhiều mục)** | `grep -c '<Steps>' "$UG"` và `grep -c 'nextra/components' "$UG"` | bài có chuỗi bước HOẶC nhiều section tuần tự → có đúng 1 cặp `<Steps>…</Steps>` bọc các `###`, có `import { Steps } from 'nextra/components'`. KHÔNG dùng `***`/`---` (hr) giữa các step. Chỉ bài thuần FAQ/khái niệm mới được miễn. |

→ Qua hết Lens 0 mới chạy Panel 4 lens.

Nguồn: `user-guide/SKILL.md` (CẤU TRÚC OUTPUT, BƯỚC 7 CHECKLIST, BƯỚC 8 placeholders), [[feedback_userguide_screenshot_style]], [[feedback_userguide_page_description_limit]], [[feedback_screenshot_conventions]].

## Panel 4 lens

### Lens 1 — Structure & Template fidelity
- Đúng **Article Type** (Quick Start / Feature Setup / Integration / Dashboard / FAQ / Troubleshooting) và theo template tương ứng.
- Đủ section theo type: Prerequisites (nếu cần) → Steps (số + tiêu đề + mô tả + sub-actions) → Tips (≥2 thực tế) → Related Articles → Closing.
- Para 1 (page description) ≤ 200 ký tự, 1 câu (xem [[feedback_userguide_page_description_limit]]).
- Availability badge `Free`/`Pro` đặt sau tiêu đề step khi cần.

### Lens 2 — Tone & Voice
- **Câu chủ động**, dùng "you/your" (KHÔNG "users/the user").
- **Step title = Động từ + Danh từ** (Activate/Configure/Set/Add/Select/Enable/Navigate/Upload/Paste + đối tượng), KHÔNG danh-từ-hoá ("App Activation").
- **Tiêu đề bài (H1) theo VIỆC merchant MUỐN LÀM, KHÔNG theo tên tính năng/tên màn hình.** REJECT nếu H1 chỉ là tên feature/field trong app ("Widget General Settings", "Multiple Active Campaigns", "Consent Activities", "Re-purchase Limit", "Menu Settings", "IAB TCF Compliance"). Sửa sang hướng dùng ("Customize your widget's appearance", "Run several age campaigns at once", "Track & export visitor consent", "Limit how often customers re-order", "Set up the accessibility menu", "Turn on IAB TCF consent"). Tên tính năng giữ ở H2/body để định vị, KHÔNG ở H1.
- Câu ≤ 20 từ trong phần hướng dẫn; không gộp 2 action bằng "and".
- Warm opening chỉ cho Integration/Technical guide; bài setup thường đi thẳng.

### Lens 3 — Accuracy & Completeness (đối chiếu UI thật)
- Bước khớp **UI thật**: tên màn/nút/tab đúng theo `UI_SNAPSHOT.md`/PRD/app production (không bịa tên nút).
- **Screenshot đúng nơi cần**: step verb nhóm **Action** (Click/Toggle/Enter/Select/Upload/Paste/Save) → phải có ảnh + annotate; **Observation** → ảnh plain; **Transient** → skip. Integration/technical: mỗi action phức tạp 1 ảnh.
- Không jargon chưa giải thích; path/URL/code dùng `code format`.
- Bảng chỉ dùng khi so sánh option / ≥3 rows.

### Lens 4 — Screenshot Pixel QA (BẮT BUỘC bất cứ khi nào ảnh THẬT ĐÃ CÓ trong `images/`, KHÔNG chỉ khi `require_images=true` — gốc từ ca 03-09 AI Access 6-app)

> **Đừng gate theo knob `require_images`** — knob đó chỉ nói "text được phép thiếu ảnh ở draft", không nói "có ảnh thì khỏi soi". Ca 03-09 đúng là autopilot-draft (`require_images=false`) nhưng `ba-agent` VẪN tự chụp đủ 12 ảnh/app rồi coi là xong — nếu Lens 4 chỉ chạy theo knob thì đúng ca gây lỗi lại là ca bị bỏ qua. Điều kiện chạy Lens 4: `ls images/*.png` ra ≥1 file THẬT (không phải placeholder `<!-- screenshot -->` còn trống).

> **Vì sao có lens này:** Lens 0.8 chỉ `ls` xem file ảnh CÓ TỒN TẠI, Lens 3 chỉ xét ảnh có mặt đúng step — cả hai đều KHÔNG mở ảnh ra nhìn. Ca 03-09: `ba-agent` tự chụp (không qua PO vẽ box tương tác) sinh đủ 12 ảnh × 6 app, có badge+label, generic pass hết Lens 0/3 — nhưng khi PO mở ra thì **crop lệch cắt lẹm chữ nền, KHÔNG có con trỏ, blur thô** ở toàn bộ 6 app. Gate cũ mù trước lỗi pixel vì chỉ chấm text/tồn-tại.

**Verifier PHẢI dùng Read tool MỞ TỪNG ẢNH** referenced trong bài (không suy diễn từ tên file/caption). Với mỗi ảnh loại **Action** (theo bảng verb Lens 3):

| # | Check bằng mắt (Opus vision) | Pass khi |
|---|------------------------------|----------|
| 4.0 | **KHÔNG rỗng** | Ảnh phải CÓ nội dung đọc được — một ô/khung xám trơn không chữ = FAIL nặng, chụp lại. Script log "đã chụp" và log cả giá trị đọc được từ DOM vẫn có thể ra ảnh trống (khối bị gắn `data-shot` là skeleton, không phải khối đã render). Sự cố 07/09/2026: ảnh `09-cli-snippet.png` bộ AI Access CB ra ô xám trống, lọt qua 1 lượt QA vì verifier chỉ soi những ảnh PO đã chỉ tên. **Soi ĐỦ mọi ảnh, không chỉ ảnh bị phàn nàn.** |
| 4.1 | **Con trỏ** | Có overlay con trỏ hình tam giác outline, nằm góc dưới-phải khối được nhấn, KHÔNG rỗng/thiếu. Ảnh mô tả/crop-1-block (không mang badge) được miễn. |
| 4.2 | **Crop sạch** | Không dính/cắt lẹm chữ hay khối UI của phần tử KẾ BÊN (chữ đứt giữa từ, card hàng xóm lộ nửa). Không có khoảng trắng/nền thừa chiếm quá ~30% khung một cách vô nghĩa. |
| 4.3 | **Badge + nhãn dính đúng chỗ** | Nhãn text neo sát con trỏ/khối được nhấn, không trôi nổi cách xa; badge số đứng trước chữ. |
| 4.4 | **Nét, không mờ** | Chữ trong ảnh đọc rõ ở độ phóng to bình thường — chữ nhòe/vỡ pixel (dấu hiệu chụp DPR1 không qua `capture-hidpi.js`) = FAIL. |
| 4.5 | **Blur đúng vùng, đúng mức** | PII (API key/URL/token) được che, nhưng vùng blur khớp đúng ô cần che — không blur lem sang chữ hướng dẫn xung quanh, không bỏ sót ô cần che. |
| 4.6 | **Khung pastel** | Có nền pastel + sub-frame bo góc (ảnh trần không khung = thiếu bước `annotate.js`). |

Fail bất kỳ mục nào ở ≥1 ảnh → **MAJOR**, liệt kê đúng ảnh + mục fail vào feedback (vd `4. ảnh step 3 (03-turn-on-modal.png) → crop cắt lẹm chữ nền trái, chụp lại sát khối modal`).

## Tiêu chí PASS (GATE — đủ TẤT CẢ)
- **Lens 0 toàn bộ pass** (0.1-0.8, riêng 0.8 theo `require_images`) — fail 1 = REJECT.
- **ZERO MAJOR.**
- **ZERO MINOR** (mặc định `block_on_minor=true`; nới được cho autopilot draft).
- **Lens 1-3 APPROVE + Lens 4 APPROVE khi áp dụng (có ảnh thật).**

### MAJOR / MINOR
- **MAJOR**: Lens 0 fail; sai Article Type/template; thiếu section bắt buộc; bịa tên UI/bước sai so app thật; thiếu ảnh cho Action step khi `require_images=true`; jargon chặn hiểu; **Lens 4 fail (ảnh thiếu con trỏ/crop lệch/mờ/blur sai vùng/thiếu khung pastel)**.
- **MINOR**: 1 step title danh-từ-hoá; 1-2 câu passive/quá dài; thiếu 1 tip; caption ảnh thiếu; para 1 hơi dài.

## FEEDBACK FORMAT — CHỈ danh sách phần cần update (BẮT BUỘC, task 221)

> Cùng luật với release-note-standard.md: feedback BA soát UG hay bị dài vì đầy nhận xét/đánh giá thay vì điểm cần sửa → phình input cho AI sửa bài ở bước sau + kẹt loop. Feedback GỬI RA chỉ là danh sách phần cần update.

**Verifier vẫn chấm đủ Lens 0 + panel 4 lens NỘI BỘ để ra verdict (không in ra); phần EMIT ra ngoài (cho maker / AI revise kế / PO) CHỈ gồm:**
1. **1 dòng verdict**: `APPROVE` | `REJECT` | `ESCALATE_HUMAN`.
2. Nếu KHÔNG APPROVE → **danh sách đánh số "phần cần update"**, mỗi mục 1 dòng:
   `N. [vị trí cụ thể trong bài — vd "Step 2 title", "section Tips", "ảnh step 3", "para mở đầu"] → [hành động sửa cụ thể]`
   Ví dụ: `2. Step 3 title "Banner Configuration" → đổi thành Verb+Object ("Configure Your Banner").`
- **CẮT BỎ, KHÔNG đưa vào feedback:** khen phần đạt ("template đúng", "tone ổn", "đủ section"); tóm tắt chất lượng; điểm 0-100 dạng văn; lời rào/đưa đẩy; nhắc lại nội dung bài. Câu nào không chỉ 1 chỗ cụ thể + 1 hành động sửa → bỏ.
- **APPROVE** → in đúng 1 dòng `APPROVE` (+ nếu `require_images` và còn thiếu ảnh thì liệt kê ĐÚNG danh sách ảnh cần chụp, mỗi ảnh 1 dòng, không kèm nhận xét).
- Ưu tiên feedback NGẮN gọn để AI kế sửa đúng, không phải đọc-hiểu-đánh-giá.

## Verdict + LOOP
Output = **FEEDBACK FORMAT ở trên** (verdict 1 dòng + danh sách phần cần update). KHÔNG in bảng Lens 0 / diễn giải 3 lens / điểm 0-100 ra ngoài — đó là suy luận nội bộ để ra verdict.

```
Vòng lặp Write→Verify:
  maker viết/sửa user guide
  → Lens 0 (grep pre-gate, fail-fast) → fail = REJECT ngay
  → panel 4 lens chấm (đối chiếu UI thật + template + pixel QA ảnh)
  → APPROVE? → thoát loop → push Falcon main / bàn giao publish
  → REJECT?  → trả maker feedback cụ thể → tăng iteration → verify lại
  → iteration > max_iterations  HOẶC  token > token_budget  → ESCALATE_HUMAN
```

- **ESCALATE_HUMAN**: dừng, STATE ACTIVE = `WAITING_HUMAN`, đưa PO bài + lý do.
- Ảnh thiếu (autopilot `require_images=false`) → KHÔNG chặn push text, nhưng ghi rõ danh sách ảnh cần chụp cho PO (gap recurring của UG).

## Knobs (PO chỉnh được)
- `pass_score` = **90** · `max_iterations` = **3** · `block_on_minor` = **true** · **`token_budget`** (guard runaway) · **`require_images`** = `false` cho autopilot-draft / `true` cho publish.

## Tôi luyện standard (living document)
PO bắt lỗi gate bỏ sót → thêm check Lens 0 (ưu tiên grep) hoặc mục lens. Ghi ngày + ca lỗi.
