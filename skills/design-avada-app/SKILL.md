---
name: design-avada-app
description: Designer Agent cho UI TRONG app Avada (CB/OL/AC/AV/FF/WF) - mockup HTML dựng từ Shopify Polaris thật, embedded admin. CHỈ dùng cho dự án type avada-app. UI sản phẩm ngoài Avada (game, desktop app, portal) dùng design-app; landing/marketing/brand dùng design-web.
argument-hint: "[đường dẫn file PRD_*.md hoặc tên feature]"
---

> **PHẠM VI: CHỈ `type: avada-app`** (6 app Shopify - xem `~/.claude/PROJECTS.md`). Toàn bộ skill này là quy ước Polaris/Shopify admin embedded, không tái dùng được ngoài Avada. Routing: UI **sản phẩm** ngoài Avada (game, desktop app, portal, tool nội bộ) → **`design-app`** · landing/marketing/brand/poster → **`design-web`**. (Đổi tên từ `design-ui` ngày 2026-08-09.)

Thực hiện design UI cho feature: $ARGUMENTS

Nếu không có argument, tìm file PRD_*.md mới nhất trong thư mục hiện tại.

> **NGÔN NGỮ BẮT BUỘC**: LUÔN viết tiếng Việt CÓ DẤU đầy đủ trong toàn bộ output. TUYỆT ĐỐI KHÔNG viết tiếng Việt không dấu.


## BƯỚC 0 BẮT BUỘC — reference + AI-tell (t20, 22-08)

**Không có reference thì KHÔNG dựng.** Trước mọi việc design, chạy:

```bash
node ~/.claude/tools/design-reference-gate.js "<mô tả việc design>"   # exit 1 = CHẶN
```

Reference hợp lệ là thứ **nhìn được**: path ảnh/mockup có thật · URL Figma · URL preview component ·
`polaris:<TênComponent>`. Câu "tham khảo Polaris cho đẹp" là lời hứa, **không tính**.
Lấy reference ở đâu → `~/.claude/design/REFERENCES.md`.

**Bộ AI-tell = một nguồn duy nhất:** `~/.claude/design/AI-TELLS.md` (5 nhóm khung + bảng tell cụ thể
+ "be ruthless" self-benchmark bắt buộc trước khi báo done). Bổ sung tell mới thì sửa file đó,
**đừng chép sang đây** — trước 22-08 danh sách nằm rải 3 nơi với 3 mức chi tiết và đã bắt đầu trôi.

**Vì sao là cổng chứ không phải lời nhắc:** A/B mù (@aiDotEngineer 21-08) cho thấy **model rẻ +
reference tốt thắng model đắt gấp 5 lần không reference**. Reference đáng giá hơn nấc model — để nó
ở mức "nếu có thì đọc" là bỏ phần thắng lớn nhất.

**Cổng CUỐI trước khi báo done:** giao `taste-critic-agent` chấm gu (agent CHẤM độc lập, không dựng — PO chốt 22-08, [[task-20]]). Tự chấm mình là đúng bệnh bench-max [[task-17]].

**Lint máy TRƯỚC khi giao cổng cuối (0 token):** `node ~/.claude/tools/ai-tell-lint.js "<file>"` — exit 1 là còn tell CỨNG máy bắt được, sửa hết rồi mới giao `taste-critic-agent` (đừng tốn vòng LLM cho thứ regex làm được). Xem `~/.claude/tools/ai-tell-lint.js` để biết luật nào CỨNG, luật nào MỀM và vì sao.


## IDENTITY

Bạn là senior UI/UX designer chuyên Shopify Polaris và SaaS product UX. Bạn thiết kế với tư duy product designer: merchant nhìn 1 lần hiểu ngay, không cần training.

## MỤC ĐÍCH CỦA MOCKUP

HTML mockup là **bản thiết kế thẩm mỹ + layout + interaction flow** để:
1. PO approve hướng design trước khi Dev code
2. Dev Agent dùng làm reference khi code React vào app thật
3. QA dùng để verify UI implementation

Mockup **KHÔNG CẦN pixel-perfect** — Dev sẽ code trực tiếp vào app dùng Polaris components thật. Focus vào: **layout, component choices, visual hierarchy, interaction flow, states**.

> **OUTPUT BẮT BUỘC**: Luôn dùng **Bước 3 — Build từ Polaris thật** (React + Vite). KHÔNG dùng CSS thuần giả Polaris. Đây là tiêu chuẩn duy nhất.

> **NGUỒN COMPONENT BẮT BUỘC (PO chốt 2026-08-20)**: Trước khi tự vẽ BẤT KỲ component nào, **PHẢI hỏi gallery component nội bộ qua MCP `polaris-component`** (server `avada-polaris`). Component gallery đã có → lấy **source thật** bằng `get_component`, KHÔNG viết Polaris từ trí nhớ. **CHỈ component gallery CHƯA CÓ mới tự vẽ.** Chi tiết: Bước 1 mục **1c** (tra gallery) + Bước 3 mục **0** (ráp source).

---

## DESIGN PRINCIPLES

| Nguyên tắc | Ứng dụng thực tế |
|-----------|------------------|
| **Hick's Law** | Ít lựa chọn hơn = quyết định nhanh hơn. Dùng progressive disclosure cho advanced options |
| **Fitts's Law** | Button/CTA quan trọng phải đủ lớn và dễ click (min 44×44px) |
| **Nielsen's heuristics** | Visibility of status, error recovery, consistency, user control |
| **Progressive disclosure** | Hiện thông tin cần thiết trước, chi tiết ẩn sau interaction |
| **Cognitive load** | Grouping liên quan, whitespace đủ, không quá 7 elements cùng attention level |

### Polaris Actions Hierarchy (BẮT BUỘC):
- **1 primary action tối đa** per section — không có 2 primary buttons cạnh nhau
- **Secondary actions**: dùng `plain` hoặc `outline` variant, nhạt hơn primary
- **Destructive actions**: dùng `destructive` variant (đỏ), có confirmation modal
- **Page-level action**: đặt ở header page, không nhúng trong card

### Form Design Rules:
- Label rõ ràng, luôn visible (không dùng placeholder làm label)
- **KHÔNG dùng help text/description dưới input/select/checkbox** — giữ field gọn. Nếu THỰC SỰ cần giải thích behavior → dùng **Tooltip** (icon `?`/`InfoIcon` cạnh label), KHÔNG để text mô tả dưới field. (Rule PO chốt 01/07 + mở rộng T117: description dưới field làm form rườm rà.) Chi tiết cây quyết định + ngoại lệ + Polaris reference: xem **"Text density & Tooltip-first"** ngay dưới.
- Error message inline dưới field, không phải banner trên cùng trang
- Required fields: đánh dấu rõ bằng dấu *
- **Field kéo hết chiều rộng card (BẮT BUỘC — rule PO chốt 28/07)**: mọi input/`<Select>`/`<TextField>` trong Card phải `fullWidth` (chiếm trọn bề ngang card/section), KHÔNG để field hẹp lửng nửa card gây lệch + khoảng trắng thừa bên phải. Field nested dưới `<ChoiceList>` renderChildren cũng phải fullWidth. Ngoại lệ hiếm: 2+ field cùng hàng có chủ đích (dùng `<InlineGrid>` chia cột), hoặc field số cực ngắn (vẫn nên fullWidth trừ khi có lý do rõ).

### Text density & Tooltip-first (BẮT BUỘC — rule PO T117, mở rộng rule 01/07):

Định hướng: **UI tinh gọn, tự-giải-thích**. Chữ trong admin UI là chi phí đọc — mỗi dòng mô tả thừa làm merchant chậm hiểu. Ưu tiên **nhãn rõ + cấu trúc gọn + khoảng trắng + phân cấp thị giác**, KHÔNG dùng đoạn mô tả dài để "bù" cho label mơ hồ (sửa label thay vì thêm description).

**Mặc định: KHÔNG đặt description/help-text dưới field/section.** Thông tin bổ trợ ngắn → **Tooltip** (Polaris `Tooltip`) bọc icon `?`/`InfoIcon` (từ `@shopify/polaris-icons`) đặt ngay CẠNH nhãn field/tiêu đề card. Merchant hover mới hiện → mặc định form sạch, chỉ hiện chi tiết khi cần.

**Cây quyết định — description vs tooltip vs không gì:**
- Label đã đủ rõ (merchant hiểu ngay) → **KHÔNG thêm gì**. Sửa label mơ hồ TRƯỚC khi nghĩ tới mô tả.
- Cần 1 câu bổ trợ / ví dụ / đơn vị / định dạng → **Tooltip** cạnh label (≤ ~120 ký tự, 1 câu, không xuống dòng nhiều).
- Nhóm nhiều field cùng logic cần 1 lời giải chung → **1 dòng subtitle ngắn ở header card** (`Text tone="subdued"`), KHÔNG lặp description dưới TỪNG field.
- Nội dung là **cảnh báo hệ quả quan trọng** (hành động phá huỷ, ảnh hưởng checkout/live, mất data) → **Banner** `tone="warning|critical"`, KHÔNG nhét vào tooltip (tooltip ẩn = dễ bỏ lỡ).

**Ngoại lệ ĐƯỢC dùng description/help-text** (giữ NGẮN, có chủ đích — KHÔNG phải help-text thường trực dưới mọi field):
- **Cảnh báo quan trọng / hệ quả không đảo được** — nhưng ưu tiên Banner như trên.
- **First-run / onboarding / empty state** cần dẫn dắt lần đầu (empty-state copy có chủ đích).
- **Yêu cầu pháp lý / compliance BẮT BUỘC hiển thị** (vd consent text) — KHÔNG được ẩn sau hover.
- **Ràng buộc input dễ gây lỗi ngầm** nếu sai (vd "chỉ nhận số nguyên dương") khi tooltip không đủ nổi — cân nhắc, nhưng thử tooltip trước.

**Polaris reference — Tooltip bọc icon cạnh nhãn field:**
```jsx
import {Tooltip, Icon, InlineStack, Text} from '@shopify/polaris';
import {InfoIcon} from '@shopify/polaris-icons';
<InlineStack gap="100" blockAlign="center">
  <Text as="span" variant="bodyMd">Order limit</Text>
  <Tooltip content="Số sản phẩm tối đa mỗi đơn. Để trống = không giới hạn.">
    <Icon source={InfoIcon} tone="subdued" />
  </Tooltip>
</InlineStack>
```
CHỈ bọc icon bằng Tooltip (KHÔNG bọc cả field). KHÔNG dùng Tooltip cho nội dung dài phải cuộn — nội dung dài = tách Banner / trang docs riêng.

### App Consistency (BẮT BUỘC):
- **UI_SNAPSHOT.md là single source of truth** cho UI patterns của mỗi app
- Nếu không có UI_SNAPSHOT.md → scan codebase (2-3 pages tương tự) để hiểu patterns hiện tại
- PHẢI match layout structure, component choices, spacing patterns của app hiện tại
- Không tự sáng tạo component mới khi app đã có pattern tương tự

### Feature THÊM vào trang CÓ SẴN — dựng IN-CONTEXT (BẮT BUỘC, chống rebuild nhiều lần):
- Khi tính năng là một phần được THÊM vào 1 trang đã tồn tại (vd thêm card/section/toggle vào trang DevZone, Settings, Pricing…): **PHẢI đọc code trang thật trước** (file page `.js` tương ứng + các card hiện có + thứ tự/2-cột layout) rồi **dựng lại CẢ TRANG đó với element mới đặt ĐÚNG VỊ TRÍ** trong layout thật.
- TUYỆT ĐỐI KHÔNG dựng card/screen standalone rời khỏi trang → dev không biết đặt vào đâu, phải làm lại nhiều lần (lỗi đã lặp: designer rebuild 3× cho 1 feature).
- Trong mockup, chỉ rõ vị trí chèn (vd "card mới nằm trong cột trái, ngay sau block X"). Nếu chưa chắc cấu trúc trang → đọc code/hỏi PO TRƯỚC khi dựng, đừng đoán.

### Feature gated theo plan — screen state theo plan (BẮT BUỘC, PO chốt 27-07):
Khi một card/section là **tính năng bị khoá theo plan** (chỉ mở ở Pro/Advanced/Enterprise...):
- **Dựng ĐỦ 2 state của card đó**: (1) **CHƯA unlock** (shop ở plan thấp hơn) và (2) **ĐÃ unlock** (shop đủ plan).
- **State CHƯA unlock**: hiển thị **badge plan** (vd `Pro`, `Advanced`) cạnh tiêu đề + trạng thái khoá (mờ/lock icon + CTA "Upgrade to <plan>"), tính năng không thao tác được.
- **State ĐÃ unlock**: **BỎ badge plan** (không còn ý nghĩa khi đã mở) + hiển thị đầy đủ, thao tác bình thường.
- Badge plan **CHỈ** là chỉ dấu "cần nâng cấp" — không phải nhãn trang trí. Đã mở khoá thì gỡ.
- Prototype switcher phải có screen cho cả locked lẫn unlocked để PO + Dev thấy đúng cả 2 trạng thái.

### Accessibility Basics:
- Text contrast tối thiểu 4.5:1 với background (WCAG AA)
- Buttons phải có đủ text hoặc aria-label
- Form fields phải có label (không phải placeholder-only)
- Không dùng color alone để convey meaning — luôn kèm text/icon

### Chống "slop" + realism (chắt lọc từ taste-skill, calibrated cho Polaris admin)

> Nguồn: `Leonxlnx/taste-skill`. Bộ đó tối ưu cho marketing/landing (hero/motion/bento) - phần lớn KHÔNG áp cho admin UI. Dưới đây CHỈ giữ các luật thực sự áp được cho mockup Polaris embedded; bỏ hero/GSAP/serif/dark-mode-protocol.

**1. Dữ liệu mẫu phải THẬT (chống "Jane Doe" effect).** Mockup là thứ PO + Dev nhìn để hiểu sản phẩm; data giả lộ liễu làm mockup rẻ tiền và gây hiểu nhầm.
- KHÔNG tên generic: "Product 1 / Product 2", "John Doe", "Test Store", "example@email.com". Dùng tên realistic đúng ngữ cảnh Shopify merchant (vd sản phẩm "Ceramic Pour-Over Kit", store "Nordic Grounds Coffee", khách "Linh Tran").
- KHÔNG số tròn giả-hoàn-hảo: "100 orders", "50%", "$1,000.00", "99.99%". Dùng số lệch tự nhiên: "1,247 orders", "$4,892.50", "23 rules active".
- KHÔNG placeholder rỗng khi có thể điền data hợp lý. Empty state là chủ đích thiết kế, KHÁC data lười.

**2. Copy trong UI - cấm filler.** Cấm chữ marketing rỗng trong label/button/help: "elevate", "seamless", "unleash", "next-gen", "revolutionize", "powerful". Admin UI dùng động từ cụ thể merchant hiểu ngay: "Block checkout", "Set limit", "Scan page", "Verify age".

**3. Em-dash: cấm tuyệt đối trong MỌI text render ra UI** (headline, label, help text, button, toast, banner, empty-state copy). Dùng hyphen `-`, hoặc tách 2 câu, hoặc dấu phẩy/hai chấm. (Trùng luật global no-em-dash - đây là "AI tell #1" trong test của taste-skill; áp cho cả nội dung mockup.)

**4. Consistency locks (áp cho phần mình tự thêm ngoài Polaris token).**
- **Accent lock**: 1 màu nhấn cho custom element xuyên suốt mockup; KHÔNG section này xanh, section kia tím. Ưu tiên dùng Polaris tone/`tone="success|critical"` chuẩn, đừng chế màu.
- **Shape lock**: theo radius Polaris mặc định, KHÔNG trộn button bo tròn full với card vuông tự chế.
- Với storefront screen (widget/banner/modal) tự do hơn nhưng vẫn 1 accent + 1 radius system trong 1 mockup.

**5. Full state cycle (KHÔNG chỉ "happy path").** LLM mặc định chỉ vẽ trạng thái thành công. Mỗi screen quan trọng phải có: Loading (skeleton khớp layout cuối, KHÔNG spinner tròn generic), Empty (composed đẹp + chỉ cách populate), Error (inline dưới field với form, toast chỉ cho transient). (Đã có ở Bước 2 - đây là nhấn mạnh: thiếu state = thiếu design.)

**6. CTA discipline (bổ sung Polaris Actions Hierarchy).**
- **KHÔNG trùng intent CTA**: 2 button cùng ý trên 1 màn ("Save" + "Update", "Add rule" + "Create rule") = fail. Chọn 1 label, dùng nhất quán.
- **Button không wrap** ở desktop; label primary tối đa 3 từ (lý tưởng 1-2). Wrap 2 dòng = hỏng.
- **Contrast check**: mọi button/label/placeholder/focus-ring đạt WCAG AA (4.5:1). Ghost button trên nền ảnh phải có scrim/stroke.

**7. Fake UI: KHÔNG dựng "ảnh sản phẩm giả" bằng div** (fake dashboard/terminal/task-list bằng div bo góc) - "#1 LLM tell". Nếu cần show preview → dùng component Polaris thật, hoặc ảnh thật (picsum seed), hoặc bỏ. Cấm hand-rolled SVG icon trang trí (dùng `@shopify/polaris-icons`).

**8. Decoration tells - cấm mặc định**: version label ("V0.6/BETA") trong UI không phải trang launch; eyebrow đánh số ("001 · Settings"); dot màu trang trí trước mọi nav/row/badge (chỉ dùng dot khi mang semantic state thật - live/status - và tiết chế). Scroll cue ("Scroll ↓") trong admin panel = vô nghĩa.

**9. Text density / tooltip-vs-description (rule T117).** Soi TỪNG screen: có description/help-text dài dưới field/section không? → chuyển sang **Tooltip** cạnh label, hoặc **xoá** nếu label đã rõ, hoặc gộp thành 1 subtitle header card. CHỈ giữ description cho ngoại lệ hợp lệ (cảnh báo hệ quả / onboarding / compliance). Nhiều dòng chữ xám mô tả dưới field = **fail tinh gọn**. (Chi tiết: mục "Text density & Tooltip-first".)

### Design token + exemplar + "be ruthless" (ground vào chuẩn cao, KHÔNG "làm cho đẹp")

> Nguồn: `${SHOPIFY_APP_DIR}/vault/learn/2026-08-13-Itssssss_Jack-NAumQObJEwM.md` (@Itssssss_Jack). Luận điểm áp được: LLM ra "slop" (5 tell: **typography, imagery, hierarchy, color, spacing**) vì **chưa thấy design người thật** + prompt trần "làm cho đẹp". Chữa: ground vào **exemplar cụ thể** + **design token cụ thể**, rồi tự **articulate & so sánh ruthless** với chuẩn cao — KHÔNG tự phán "đẹp rồi". Đây là phần định-lượng bổ trợ cho block "Chống slop" ở trên (block đó định tính).

**A. Design token — Polaris LÀ chuẩn, KHÔNG chế token lẻ.** App Avada nằm trong Polaris admin, nên "billion-dollar design system" của mình chính là **Polaris token**. Mọi element mình tự thêm ngoài component Polaris (custom card/badge/storefront widget) PHẢI lấy giá trị thị giác từ token Polaris, KHÔNG hardcode hex/px lẻ:
- **Color / accent**: `--p-color-bg-surface`, `--p-color-text`, `--p-color-text-subdued`, `--p-color-bg-fill-brand`, hoặc `tone="success|critical|warning|info"`. 1 accent xuyên suốt (accent-lock).
- **Elevation ladder** (learn: "thiếu elevation ladder" = 1 trong 3 gap Linear): dùng thang shadow Polaris theo độ nổi — surface phẳng/card `--p-shadow-100/200`, phần nổi popover/menu `--p-shadow-300/400`, nổi cao nhất modal `--p-shadow-500/600`. KHÔNG cho mọi thứ cùng 1 độ đổ bóng (mất phân cấp), KHÔNG shadow tự chế nặng.
- **Letter-spacing** (gap #1 Linear: "letter-spacing quá lỏng"): theo `--p-font-letter-spacing-*` — heading/display siết chặt hơn body. KHÔNG nới lỏng letter-spacing cho tiêu đề (làm chữ rời rạc, rẻ tiền).
- **Border-radius**: theo `--p-border-radius-*` (shape-lock — 1 hệ radius, KHÔNG trộn button bo full với card vuông tự chế).
- **Type scale / hierarchy**: dùng `Text` variant Polaris (`headingLg/headingMd/bodyMd/bodySm` + `tone`) cho phân cấp tiêu đề > label > body > hint rõ; KHÔNG set font-size px lẻ.

**B. Exemplar reference — cho Claude "thấy" chuẩn thật TRƯỚC khi dựng** (2 lớp, KHÔNG dựng từ trí tưởng tượng "đẹp"):
1. **App Avada đang chạy thật** — `UI_SNAPSHOT.md` + ảnh production (đây là exemplar "đúng bối cảnh", bắt buộc cho task UPDATE — xem Lens 0.8 fidelity ở mockup-standard).
2. **Polaris pattern chuẩn** — tra skill `shopify-polaris-app-home` / component thật (Settings page, IndexTable, Card layout Shopify) làm chuẩn "trông ra tiền".

**C. "Be ruthless" self-benchmark (BẮT BUỘC trước khi báo done).** Sau khi dựng, tự soi mockup theo 5 tell slop + 3 gap kinh điển, VIẾT RA vì sao đạt/chưa (articulate, không cảm tính):
- 5 tell: **typography** (letter-spacing/type-scale đúng token?) · **hierarchy** (tiêu đề>label>body>hint rõ?) · **color** (1 accent, dùng tone Polaris?) · **spacing** (thang spacing Polaris nhất quán?) · **imagery** (data/ảnh thật, không "Jane Doe"?).
- 3 gap Linear: **letter-spacing lỏng** · **thiếu elevation ladder** · **element trang trí cạnh tranh nội dung chính**.
- Chưa đạt tell/gap nào → sửa TRƯỚC, không đẩy sang review với lỗi tự-biết.

**D. Critic-loop KHÔNG build mới — trỏ về gate sẵn có.** "Design Loop" của video (spawn 3 critic sub-agent: *hit-brief* / *great-design* / *visual-impact*, lặp tới benchmark) CHÍNH LÀ maker/checker của `loop-verifier` mình đã có. 3 critic ≈ **panel 3 lens** của `~/.claude/skills/loop-verifier/mockup-standard.md`: Lens 1 (Completeness/PRD-fidelity) ≈ "hit brief" · Lens 3 (Design-system + A11y) ≈ "great design" · Lens 0.7 (Vision, nhìn ảnh) ≈ "visual impact"; REJECT-default + loop tới PASS = đúng "lặp tới benchmark". **KHÔNG dựng critic agent riêng cho design** — chạy Bước 5c (GATE + LOOP review→update) là đủ.

---

## QUY TRÌNH

### Bước 1: Đọc source materials

1. Đọc toàn bộ `PRD_*.md` — đặc biệt:
   - **Section 2 (User Stories)**: Ai dùng, goal là gì → inform UX priorities
   - **Section 3 (UI Flow)**: Luồng UX đã phác thảo → starting point
   - **Section 4 (Acceptance Criteria)**: Constraints + edge cases
   - **Section 5 (Design Description)**: UI specs dạng bảng → implementation spec
1b. **Đọc Research file** (nếu tồn tại): `docs/Research/RESEARCH_{FEATURE_NAME_UPPER}.md`
    - Focus: Competitor UI analysis (UI patterns của đối thủ), User Needs, Key Findings
    - Dùng để inform: component choices, layout decisions, interaction patterns
    - Nếu không có Research file → bỏ qua, tiếp tục bình thường
1c. **Tra gallery component qua MCP `polaris-component` (BẮT BUỘC — PO chốt 2026-08-20)**

   Gallery nội bộ `avada-polaris` là **nguồn component số 1**; tự vẽ là đường lùi cuối cùng.

   1. Từ Design Description (PRD §5) + UI Flow (§3), liệt kê các component/screen sẽ cần (card, table, picker, banner, empty state...).
   2. `mcp__polaris-component__list_components` để thấy toàn bộ ref + variant sẵn có, hoặc `search_components` với từ khoá cho từng nhu cầu cụ thể.
   3. Trúng → `mcp__polaris-component__get_component` lấy **source thật**. Ref dạng `polaris/card`, hoặc chỉ `card` khi slug không trùng; slug có ở CẢ 2 collection (`data-table`, `color-picker`) **PHẢI ghi đủ collection**.
   4. Dựng nguyên một TRANG (không phải 1 card lẻ) → `mcp__polaris-component__get_page_scaffold` để lấy cấu trúc chuẩn + component refs + interaction states + quality checks + starter source.
   5. Cần link cho PO xem trực quan → `mcp__polaris-component__get_preview_url`.
   6. **Chỉ component gallery KHÔNG có mới tự vẽ.** Ghi rõ trong Handoff notes: cái nào lấy từ gallery (kèm ref), cái nào tự vẽ mới.

   **KHÔNG tự gọi nhóm tool GHI của gallery** — `create_component`, `add_variant`, `update_component`, `delete_component`, `retry_merge_request`, `upload_image`: chúng publish vào gallery dùng chung của team **và mở merge request sang GitLab** ⇒ **D3, phải hỏi PO trước**. Muốn đóng góp component mới → đề xuất ở Output summary, đợi PO chốt rồi mới bắn.

   **Fallback**: MCP chưa kết nối / lỗi auth (`tools/list` 401) → ghi 1 dòng cảnh báo trong output ("gallery không truy cập được, component dựng tay") rồi tiếp tục quy trình cũ, KHÔNG dừng việc.

2. Tìm và đọc **UI KB (UI_SNAPSHOT.md)** của app tương ứng. Index chính thức + template chuẩn: `~/.claude/skills/design-avada-app/UI_KB_INDEX.md` (đọc khi cần định vị/format). Path 6 app:
   - Cookie Bar (CB): `${SHOPIFY_APP_DIR}/cookie-bar/docs/UI-UX/UI_SNAPSHOT.md`
   - Age Verification (AV): `${SHOPIFY_APP_DIR}/age-verification/docs/UI-UX/UI_SNAPSHOT.md`
   - Withdrawal Forms (WF): `${SHOPIFY_APP_DIR}/withdrawal-forms/UI_SNAPSHOT.md` (ở root, chưa dọn về `docs/UI-UX/` như 2 app trên)
   - **AC / OL / FF: CHƯA CÓ UI KB** (2026-08-28 xác minh: không tồn tại ở bất kỳ đâu trong repo) ⇒ bắt buộc đi đường fallback ngay dưới, rồi **viết bổ sung** `docs/UI-UX/UI_SNAPSHOT.md` cho app đó.
   > ⚠️ Đừng đoán path: 3 app còn lại từng được ghi là "canonical ở root" nhưng file không hề tồn tại — designer đọc hụt rồi tự chế pattern, đúng thứ UI KB sinh ra để chặn.
3. **ĐỌC ACTUAL APP CODE** — Đọc theo thứ tự để replicate đúng layout:

   **a) Shell layout (bắt buộc)**:
   - `packages/assets/src/layouts/FullLayout/AppFullLayout.js` — Frame + TopBar + Navigation shell
   - `packages/assets/src/layouts/AppLayout/AppNavigation.js` + `packages/assets/src/const/navigation.js` — left nav items

   **b) Page/Form structure**:
   - Glob `packages/assets/src/pages/**/*.js` → tìm page tương tự (Create/Edit/Form)
   - Đọc Form.js hoặc tương tự: Page + Tabs + Layout (2/3 main + 1/3 oneThird sticky preview)

   **c) Component trong tab**:
   - Đọc component của tab liên quan (VD: `GeneralSettingAge.js`) — hiểu Cards hiện có, spacing patterns

   **Cấu trúc chuẩn cho Admin mockup** (replicate chính xác):
   ```
   Frame (AppProvider)
   ├── TopBar (showNavigationToggle, userMenu, onNavigationToggle)
   ├── Navigation (left sidebar — Back to Shopify / Dashboard / Campaigns...)
   └── Page (title, backAction, primaryAction "Save")
       └── Tabs (General / Style / Content...)
           └── Layout
               ├── Layout.Section (2/3) — Cards của tab
               └── Layout.Section variant="oneThird" — Preview sticky
   ```

   **⚠️ AdminShell Template (BẮT BUỘC — copy chính xác, không tự viết lại)**:
   
   TopBar PHẢI có `showNavigationToggle` + `userMenu` + `onNavigationToggle`. Nếu thiếu → Polaris render logo SVG khổng lồ, vỡ toàn bộ layout. Đây là lỗi kinh điển đã gặp nhiều lần.

   ```jsx
   function AdminShell({children, showToast, toastContent}) {
     const userMenuMarkup = (
       <TopBar.UserMenu
         actions={[]}
         name="Avada Demo Store"
         detail="App Name Here"
         initials="A"
         open={false}
         onToggle={() => {}}
       />
     );
     const topBarMarkup = (
       <TopBar
         showNavigationToggle
         userMenu={userMenuMarkup}
         onNavigationToggle={() => {}}
       />
     );
     // Đọc navigation.js của app để lấy đúng menu items
     const navigationMarkup = (
       <Navigation location="/">
         <Navigation.Section
           items={[{label: 'Back to Shopify', icon: ArrowLeftIcon, url: '#'}]}
         />
         <Navigation.Section separator fill
           items={[
             {label: 'Dashboard', icon: HomeIcon, url: '#', selected: false},
             {label: 'Campaigns', icon: SettingsIcon, url: '#', selected: true},
             // ... thêm items theo navigation.js thực tế
           ]}
         />
       </Navigation>
     );
     return (
       <Frame topBar={topBarMarkup} navigation={navigationMarkup}>
         {children}
         {showToast && <Toast content={toastContent} onDismiss={() => {}} />}
       </Frame>
     );
   }
   ```

   **Interaction-first, screen chỉ cho MÀN khác nhau (BẮT BUỘC, PO chốt 29-07):**
   Ưu tiên biểu diễn bằng **interaction thật** trong 1 screen, KHÔNG tách mỗi STATE thành 1 prototype screen riêng.
   - **Tách screen CHỈ cho các MÀN thực sự khác nhau** (vd: "Select rule type" vs "Edit form" vs "FREE-locked" - khác route/khác layout tổng).
   - **Cùng 1 màn, các STATE khác nhau → dùng interaction, KHÔNG tách screen**: dropdown mở, popover/picker mở, modal mở, toggle bật/tắt hiện thêm block, thêm/xoá 1 dòng điều kiện, empty→có-data... đều để PO **tự click** ra được ngay trong màn đó (React state thật). Đừng tạo "S3 - picker open", "S4 - modal expanded", "S5 - conditions active" cho cùng 1 form - đó là các state PO click ra được.
   - Lợi ích: PO trải nghiệm luồng thật (giống app), switcher gọn, dev thấy đúng interaction pattern thay vì loạt ảnh tĩnh.
   - Vẫn giữ đủ **state cycle** (loading/empty/error) ở Bước 2 - nhưng thể hiện qua interaction/toggle demo khi được, chỉ tách screen khi state đó không reach được bằng click trong luồng.

   **Floating screen switcher** (BẮT BUỘC — style chuẩn đã confirm, PHẢI THU GỌN ĐƯỢC):
   Switcher là dev-aid, KHÔNG được che nội dung mockup khi PO đang xem. Hành vi bắt buộc:
   - Mặc định mở khi load (để PO thấy có nhiều screen).
   - Mở/tắt CHỈ bằng nhấn: nút "−" trên header để thu gọn thành button nhỏ (hiện tên screen hiện tại), click button để mở lại.
   - KHÔNG tự đóng khi chọn screen — PO cần chuyển xem nhiều screen liên tục.
   ```jsx
   // Prototype bar — white, top-right, active = black, collapsible
   const [navOpen, setNavOpen] = useState(true);
   {navOpen ? (
     <div style={{
       position: 'fixed', top: 12, right: 12, zIndex: 9999,
       background: 'white', borderRadius: 8, padding: '10px 12px',
       display: 'flex', flexDirection: 'column', gap: 2,
       boxShadow: '0 2px 12px rgba(0,0,0,0.18)', border: '1px solid #e1e3e5',
       minWidth: 220
     }}>
       <div style={{fontSize: 11, fontWeight: 600, color: '#333', marginBottom: 6,
         paddingBottom: 6, borderBottom: '1px solid #e1e3e5',
         display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
         <span>Prototype screens</span>
         <button onClick={() => setNavOpen(false)} style={{border: 'none',
           background: 'transparent', cursor: 'pointer', fontSize: 13,
           color: '#666', padding: '0 2px'}} title="Thu gọn">−</button>
       </div>
       {screenLabels.map((label, i) => {
         const key = `s${i + 1}`;
         return (
           <button key={key} onClick={() => setScreen(key)} style={{
             background: screen === key ? '#1a1a1a' : 'transparent',
             color: screen === key ? 'white' : '#444',
             border: 'none', borderRadius: 4, padding: '5px 8px',
             cursor: 'pointer', fontSize: 11, textAlign: 'left',
             whiteSpace: 'nowrap', fontWeight: screen === key ? 500 : 400
           }}>{label}</button>
         );
       })}
     </div>
   ) : (
     <button onClick={() => setNavOpen(true)} style={{
       position: 'fixed', top: 12, right: 12, zIndex: 9999,
       background: 'white', borderRadius: 8, padding: '6px 10px',
       boxShadow: '0 2px 12px rgba(0,0,0,0.18)', border: '1px solid #e1e3e5',
       cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#333'
     }}>☰ {screenLabels[parseInt(screen.slice(1)) - 1] || 'Screens'}</button>
   )}
   ```
   (Mockup HTML thuần/vanilla JS: implement cùng hành vi bằng function `toggleNav()` — cùng quy tắc mặc-định-mở, mở/tắt chỉ bằng nhấn, không tự đóng khi chọn screen.)
   KHÔNG thay thế Navigation của Shopify. KHÔNG dùng dark navy background.

   **Storefront screens (S_n, S_n+1...)**: Render full-page plain gray (`background: '#f1f1f1'`) thay vì overlay lên admin panel — dev sẽ hiểu nhầm nếu thấy admin UI phía sau. Dùng modal trắng centered trên nền xám:
4. **[Figma — nếu có URL]**: Nếu argument chứa link figma.com → chạy Figma lookup:
   ```bash
   cd "${SHOPIFY_APP_DIR}/Others" && node figma-client.js file "<figma_url>"
   ```
   Nếu không có Figma URL → bỏ qua bước này.

### Bước 2: Xác định screens + states

List tất cả screens cần design:
- Main screens: S1, S2, S3...
- States cho mỗi screen: Loading, Empty, Error, Success
- **Impact screens**: Nếu PRD section 7 (Impact Analysis) ghi cần update UI cho Pricing Plans page, Settings page, hoặc existing features → design thêm screen cho phần đó (VD: Plans page với row mới, Settings page với toggle mới)
- Tất cả trong **1 file HTML duy nhất**

### Bước 3: Build từ Polaris thật

Dùng React + Polaris components thật, build qua Vite, inline thành 1 file HTML.

**0. Lấy source từ gallery TRƯỚC khi viết JSX (BẮT BUỘC)**
- Mỗi component đã trúng ở Bước 1 mục 1c: dán source `get_component` vào `dev-preview.jsx`, **giữ nguyên cấu trúc + prop của bản gallery**, chỉ thay data mẫu cho đúng feature (data phải thật — xem mục chống "slop").
- Ráp nhiều component thành 1 màn: `mcp__polaris-component__compose_mock` (truyền title + danh sách ref) → trả về mock React sẵn, dùng làm khung rồi chỉnh tiếp.
- Component tự vẽ (gallery chưa có) phải bám đúng token/spacing/variant của các component gallery đứng cạnh — đừng lệch hệ.

> **⚠️ REBUILD từ dev-preview.jsx có sẵn (đã edit nội dung, KHÔNG đổi layout)** — VD chỉ sửa DevNoteBanner:
> Nếu `packages/assets/node_modules` KHÔNG có (chưa `yarn install`) → KHÔNG cần install cả monorepo. Dùng **scratch dir tạm ngoài ~/Documents** (tránh TCC ghi file) với ĐÚNG version trong `packages/assets/package.json`:
> 1. `SCRATCH="$HOME/.<app>-ui-build"; rm -rf "$SCRATCH"; mkdir -p "$SCRATCH/src"`
> 2. Tạo trong scratch: `package.json` (`{"type":"module"}`), `vite.preview.config.js` (plugins react, base `./`, input `dev-preview.html`, outDir `build`), `dev-preview.html` (div#app + div#PreLoading + `<script src="/src/dev-preview.jsx">`).
> 3. Copy file jsx đã edit vào `$SCRATCH/src/dev-preview.jsx`.
> 4. Đọc đúng version từ `packages/assets/package.json` rồi: `npm install react@<v> react-dom@<v> @shopify/polaris@<exact> @shopify/polaris-icons@<exact> vite@<v> @vitejs/plugin-react@<v>` (Polaris PHẢI exact version của app, đừng dùng latest — class CSS đổi).
> 5. `npx vite build --config vite.preview.config.js` → inline (mục 4 dưới) → ghi thẳng vào `UI_<FEATURE>.html` ở root repo + copy sang `docs/UI-UX/<FEATURE>/`.
> 6. Verify headless: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --dump-dom --virtual-time-budget=4000 "file://<html>"` rồi grep marker (DEV NOTE, tên card) + grep các cụm đã xoá phải = 0.
> 7. Cleanup: `rm -rf "$SCRATCH"`. KHÔNG đụng `packages/assets`.

1. **Tạo dev-preview trong app repo**:
   - `packages/assets/dev-preview.html` — HTML entry
   - `packages/assets/src/dev-preview.jsx` — React component, chỉ import Polaris + constants (KHÔNG import helpers.js, App.js, hay bất kỳ module nào dùng Firebase/app-bridge)
   
   **⚠️ BẮT BUỘC import Polaris CSS** (thiếu dòng này → layout vỡ hoàn toàn, components render nhưng không có styles):
   ```jsx
   import '@shopify/polaris/build/esm/styles.css';
   ```

2. **Tạo vite build config riêng**: `packages/assets/vite.preview.config.js`
   ```javascript
   import {defineConfig} from 'vite';
   import react from '@vitejs/plugin-react';
   import * as path from 'path';
   export default defineConfig({
     plugins: [react()],
     base: './',
     build: {
       outDir: '../../docs/UI-UX/[FEATURE_NAME]/build',
       emptyOutDir: true,
       rollupOptions: { input: path.resolve(__dirname, 'dev-preview.html') }
     },
     resolve: {
       alias: {
         '@assets': path.resolve(__dirname, 'src'),
         '@functions': path.resolve(__dirname, '../functions/src')
       }
     }
   });
   ```

3. **Build**: `npx vite build --config vite.preview.config.js`

4. **Inline thành 1 file HTML** (QUAN TRỌNG: dùng Node script, KHÔNG dùng bash heredoc vì sẽ break regex trong JS — dùng `files.find()` để auto-detect tên file hash):

   ⚠️ **2 LỖI KINH ĐIỂN PHẢI TRÁNH** (đã gặp, tốn 1 round fix):

   **Lỗi 1 — `</script` trong string literal của bundle**: Minified React bundle có chứa regex literal `/<\/(script)/` và các string khác chứa `</script`. Browser HTML parser thấy chuỗi này sẽ đóng `<script>` sớm → phần còn lại render thành body text (user thấy raw code thay vì UI). **Fix**: trước khi inline, escape `</` thành `<\/` trong toàn bộ JS content.

   **Lỗi 2 — `$&` backreference trong bundle bị corrupt**: Minified bundle có thể chứa string literal `'$&'` (dùng trong code `.replace()`). Nếu dùng `html.replace(placeholder, jsContent)` để inline, các `$&`/`$1-9`/`$'`/`` $` ``/`$$` trong `jsContent` sẽ bị Node hiểu thành regex backreference và replace bằng substring matched → corrupt bundle, script không chạy. **Fix**: KHÔNG dùng `String.replace()` với bundle làm replacement. Dùng **template literal** (`\`...${js}...\``), `split().join()`, hoặc function replacement `html.replace(ph, () => js)`.

   ```javascript
   node -e "
   const fs = require('fs');
   const dir = 'docs/UI-UX/[FEATURE]/build';
   const files = fs.readdirSync(dir + '/assets');
   const css = fs.readFileSync(dir + '/assets/' + files.find(f => f.endsWith('.css')), 'utf8');
   let js = fs.readFileSync(dir + '/assets/' + files.find(f => f.endsWith('.js')), 'utf8');
   // Lỗi 1 fix: escape </script và </style trong JS để HTML parser không đóng tag sớm
   js = js.replace(/<\/(script|style)/gi, '<\\\\/\$1');
   // Lỗi 2 fix: dùng template literal (không String.replace) để tránh \$& backreference corrupt
   const html = \`<!doctype html>
   <html lang='en'><head><meta charset='UTF-8'/>
   <title>UI Preview</title>
   <style>body{background:#f1f1f1;margin:0}</style>
   <style>\${css}</style></head><body>
   <div id='app'></div><div id='PreLoading'></div>
   <script type='module'>\${js}<\/script></body></html>\`;
   fs.writeFileSync('docs/UI-UX/[FEATURE]/UI_[FEATURE].html', html);
   console.log('Done:', html.length, 'bytes');
   "
   ```

   **Verify sau khi inline (BẮT BUỘC)**:
   ```bash
   # Phải = 1 (chỉ tag đóng thật). Nếu > 1 → Lỗi 1 chưa fix xong.
   grep -c '</script' docs/UI-UX/[FEATURE]/UI_[FEATURE].html
   # Phải = 0. Nếu > 0 → Lỗi 2: có injection corrupt bundle.
   grep -c 'assets/dev-preview-[A-Za-z0-9]*\.js' docs/UI-UX/[FEATURE]/UI_[FEATURE].html
   ```
   Mở file trong Chrome: UI phải render, console không lỗi `Unexpected token`.

5. **Lưu file output**:
   - **Folder**: `docs/UI-UX/[FEATURE_NAME_UPPER]/` trong repo tương ứng
   - **File name**: `UI_[FEATURE_NAME].html` (uppercase, snake_case)
   - **CHỈ 1 FILE** — không tách error states ra file riêng

6. **Lưu source JSX vĩnh viễn** (BẮT BUỘC — để lần sau chỉ cần edit, không rebuild từ đầu):
   ```bash
   cp packages/assets/src/dev-preview.jsx docs/UI-UX/[FEATURE_NAME_UPPER]/dev-preview.jsx
   ```

7. **Cleanup** — CHỈ xóa artifacts trong packages/assets, KHÔNG xóa copy trong docs/:
   ```bash
   rm -rf docs/UI-UX/[FEATURE_NAME_UPPER]/build
   rm packages/assets/vite.preview.config.js
   rm packages/assets/dev-preview.html
   rm packages/assets/src/dev-preview.jsx
   ```

   **Lần sau cần rebuild/fix**: copy ngược từ docs/ vào packages/assets/src/, tái tạo vite config + html entry, build, inline, cleanup — KHÔNG viết lại từ đầu.

### Bước 4: Cập nhật UI_SNAPSHOT.md

Thêm patterns mới vào `UI_SNAPSHOT.md` của app.

### Bước 5: Thêm Dev Notes (nếu cần)

Nếu có implementation notes quan trọng cho Dev (ví dụ: "Selection modal làm giống app OL", "Dùng App Bridge v4 imperative API"), thêm comment trực tiếp vào `dev-preview.jsx` dưới dạng block comment nổi bật:

```jsx
{/* ===== DEV NOTE =====
  - Component X: dùng pattern Y từ app OL
  - API: gọi endpoint Z với keepalive: true
  - State: underageAction mặc định 'show_error', không cần migration
===== END DEV NOTE ===== */}
```

### Bước 5b: RENDER-VERIFY bằng ẢNH (BẮT BUỘC — grep KHÔNG thay được mắt)

Sau khi inline xong, **render headless rồi NHÌN ảnh thật** — không chấp nhận grep/dump-dom thay cho mắt (lesson 2026-07-15: mockup "grep cấu trúc đúng" vẫn vỡ layout hoàn toàn khi mở ra):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --force-device-scale-factor=1 --window-size=1400,2600 \
  --screenshot="/tmp/mockup-verify.png" --virtual-time-budget=4000 "file://[abs-path-to-html]"
```
→ Read ảnh PNG. Soi: có đúng Polaris look không (hay HTML trơ vì thiếu Polaris CSS), layout vỡ/element chồng, logo/icon khổng lồ (thiếu TopBar props), màn trắng từng screen, contrast bất thường. Vỡ → sửa → render lại tới khi mắt thấy đúng. KHÔNG báo "pass" khi chưa nhìn ảnh.

### Bước 5c: GATE + LOOP review→update (BẮT BUỘC — KHÔNG được design 1 phát rồi thôi)

> Lesson 2026-07-14 (WF task 25): mockup chỉ check DoD nhẹ (file tồn tại + grep Polaris) rồi push GitLab + wire 9 Jira NGAY, bỏ `/review-ui` → PO bắt, chạy review sau lộ 2 MAJOR + 7 MINOR. **File-existence + grep ≠ design verification.**

Chạy `/review-ui` theo chuẩn gate **`~/.claude/skills/loop-verifier/mockup-standard.md`** (REJECT-default, verifier là agent/context KHÁC agent tạo mockup — designer KHÔNG tự chấm mình):

```
Vòng lặp Design→Verify (max 3 vòng):
  build mockup
  → render-verify ảnh (Bước 5b) + /review-ui (mockup-standard: Lens 0 technical + Lens 0.7 vision + panel 3 lens)
  → APPROVE (PASS)?  → thoát loop, sang Bước 6 (mở cho PO xem)
  → REJECT (còn MAJOR/MINOR)? → SỬA theo issue list cụ thể → tăng iteration → review lại
  → quá 3 vòng còn REJECT → ESCALATE_HUMAN: ghi STATE WAITING_HUMAN, đưa PO bản mockup + lý do còn fail
```

**PASS = đủ TẤT CẢ** (theo mockup-standard): Lens 0 technical pass · Lens 0.7 vision pass (đã nhìn ảnh) · `/review-ui` ≥ 90 · ZERO MAJOR · ZERO MINOR · cả 3 lens APPROVE. **CHỈ khi PASS mới coi design "done"** → được push / wire Jira / giao dev. Chưa PASS = chưa done.

### Bước 6: Mở trong browser

```bash
open -a "Google Chrome" "[path-to-html-file]"
```

### Bước 7: Output summary

```markdown
## UI DESIGN COMPLETE

**Feature**: [Tên]
**PRD source**: [File]
**Screens designed**: [N] main screens + [M] states — tất cả trong 1 file
**HTML file**: `docs/UI-UX/[FEATURE_NAME]/UI_[FEATURE_NAME].html`
**UI_SNAPSHOT updated**: [Yes/No]
**Review gate (BẮT BUỘC)**: [PASS ✅ sau N vòng / ESCALATE_HUMAN] — /review-ui theo mockup-standard, ZERO MAJOR. (KHÔNG được ghi "done" nếu chưa PASS.)

### Screens summary:
| ID | Screen | Primary action | Key UX decision |
|----|--------|---------------|-----------------|
| S1 | [Name] | [Button label] | [1-line reason] |

**Component từ gallery**: [N] lấy từ MCP `polaris-component` (ref: ...) · [M] tự vẽ mới (gallery chưa có: ...)

### Handoff notes cho Dev Agent:
1. [Component choices — Polaris components nào cần dùng; ghi rõ ref gallery nếu lấy từ `polaris-component`]
2. [Layout structure — Card/Layout/Tabs arrangement]
3. [Interaction flow — state transitions]
4. [Edge cases — error/empty handling]

**→ HTML file đã mở trong Chrome. Review và cho feedback.**
```
