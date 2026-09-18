# Mockup Verification Standard — Gate mạnh cho UI Design

> Profile của `loop-verifier` áp riêng cho **step `design` (mockup)** — phần quan trọng nhất của design, là output PO trực tiếp review. Đây là GATE (REJECT-default + loop), KHÔNG phải review tư vấn. Nghiêm hơn `/review-ui` thường.

## Khi nào dùng
- Sau step `design` trong Flow 3 (Step 2) và Flow 0 (Phase 3) - mockup `dev-preview.jsx` + `UI_*.html` dựng qua `/design-avada-app`.
- Sau phase **P4 (DESIGN)** của `flow-product-build` - mockup 1 file HTML dựng qua `/design-app`.
- Step `design` trong plan PHẢI có `verifier: true`.

## PROFILE - chọn TRƯỚC khi chấm (chỉ đổi Lens 3 + sắc thái Lens 0.6/0.7/0.8)

Tra `type` của dự án trong `~/.claude/PROJECTS.md`:

| `type` dự án | Profile | Lens 3 chấm theo |
|---|---|---|
| `avada-app` (CB/OL/AC/AV/FF/WF) | **`polaris`** | Polaris compliance + `UI_SNAPSHOT.md` của app |
| `product` / `system` / `content` | **`general`** | `DESIGN-SYSTEM.md` (token) của chính dự án đó |

Khung gate (REJECT-default, Lens 0 fail-fast, Lens 0.7 vision, loop 3 vòng, tiêu chí PASS) **giống hệt nhau ở cả 2 profile**. Ghi rõ profile đang dùng ở đầu verdict - không ghi = gate chưa xác định = REJECT.

## Nguyên tắc cứng (kế thừa loop-verifier)
1. **REJECT until proven otherwise** — mockup mặc định CHƯA đạt.
2. **Verifier ≠ designer** — chạy ở agent KHÁC agent đã tạo mockup, chỉ nhận artifact + rubric. Model: Lens 0 = script deterministic; panel lens + vision = `sonnet`; escalate `opus` chỉ khi REJECT 2 vòng liên tiếp.
3. **KHÔNG tin "render được"** — phải MỞ THẬT bản build (`UI_*.html`) / bundle `dev-preview.jsx`, kiểm không lỗi console, không màn trắng. Tiêu chí 3 (verify-thật) của loop-verifier.
4. **Designer không tự APPROVE.**

## Lens 0 — Technical Pre-Gate (FAIL-FAST, chạy TRƯỚC panel)

Toàn check khách quan (deterministic). Chạy ĐẦU TIÊN, **bất kỳ check nào fail = REJECT NGAY**, không chấm tiếp panel 3 lens (tiết kiệm token).

**Check 0.1-0.5: chạy 1 lệnh duy nhất** (script = SINGLE SOURCE của pattern check, dán NGUYÊN output + exit code vào verdict — không có block output = gate chưa chạy = REJECT):

```bash
bash ~/.claude/skills/loop-verifier/lens0-mockup.sh "docs/UI-UX/<FEATURE>/UI_*.html" "<marker tên card/screen>"
```

(0.1 một script tag · 0.2 không ref bundle ngoài · 0.3 không corruption `$&` · 0.4 `node --check` inline script · 0.5 render thật headless: DOM không trống + có marker. Exit 0 = pass, 1 = REJECT, 2 = render chưa verify được → verifier tự mở thật hoặc ESCALATE.)

**Check 0.6 (đọc tay — judgment, không nén vào script):** CHỈ áp khi mockup có build step (profile `polaris` luôn có; profile `general` chỉ khi designer chọn build). Đọc `vite.preview.config.js` + script inline của designer: Vite config dùng `esbuild:{jsx:'automatic'}` (KHÔNG `@vitejs/plugin-react@6` với Vite 7); inline JS dùng template literal/`split().join()` (KHÔNG `String.replace(ph, bundle)`). Mockup 1 file HTML thuần (không build) → 0.6 ghi `N/A`, vẫn phải qua 0.1-0.5.

Nguồn: [[feedback_ui_inline_script_escape]], [[feedback_designer_rebuild_inline_method]], [[feedback_vite7_esbuild_jsx]], `design-avada-app` SKILL Bước 3 / `design-app` SKILL §4.2.

## Lens 0.7 — Vision check (BẮT BUỘC, chạy sau khi Lens 0 pass, TRƯỚC panel)

Đúng mảnh mà dump-dom + grep KHÔNG bắt được (2 class lỗi đã dính thật: thiếu Polaris CSS → trang trơ HTML, logo SVG khổng lồ vỡ layout — DOM vẫn PASS):

1. **Render ảnh từng screen**: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --screenshot=<out.png> --window-size=1440,900 --virtual-time-budget=4000 "file://<abs-path>"` (screen sau: dùng capture.js/script chuyển screen rồi chụp).
2. **Verifier NHÌN ảnh thật** (agent độc lập, model `sonnet`, dùng Read đọc PNG): đối chiếu PRD Section 5 (Design Description) + nguồn-sự-thật UI của dự án (profile `polaris`: `UI_SNAPSHOT.md` · profile `general`: `DESIGN-SYSTEM.md`). Soi chung cả 2 profile: layout vỡ/element chồng, icon-logo kích thước bất thường, màn trắng từng screen, chữ tràn khung, contrast không đọc được. Riêng `polaris`: có đúng Polaris look không (hay HTML trơ vì thiếu Polaris CSS). Riêng `general`: màu/spacing/radius có đúng token đã chốt không (hay tự chế lẻ).
3. **Mismatch = REJECT** kèm mô tả visual cụ thể (screen nào, thấy gì, PRD/nguồn-sự-thật đòi gì).
4. KHÔNG chụp được ảnh → ghi "KHÔNG CHẤM ĐƯỢC VISION" + ESCALATE_HUMAN, **KHÔNG cho điểm chay** (chống điểm ảo kiểu "99/100 mà chưa agent nào nhìn ảnh").

> **⚠️ BẪY ĐO RESPONSIVE — Chrome macOS có SÀN CỬA SỔ 500px. KHÔNG kết luận "vỡ layout ở mobile" từ ảnh chụp dưới 500px.**
> `--window-size=360` / `=414` (cả `--headless` lẫn `--headless=new`) vẫn render layout ở **viewport 500px** rồi **CẮT** ảnh còn 360/414. Ảnh vì thế trông y hệt lỗi thật: badge cụt, chữ mất đuôi, card "tràn ra ngoài viewport, không có scroll ngang". Kiểm nhanh: chèn `document.documentElement.clientWidth` vào trang rồi `--dump-dom` — yêu cầu 360/414/500 đều trả **500**.
> **Cách đo ĐÚNG ở <500px (không cần ảnh):** copy file mockup ra scratchpad, chèn script cuối `<body>` nhân bản element cần soi vào một container `width:320px|360px|414px`, rồi so `getBoundingClientRect().right` của MỌI con với mép container; `--dump-dom` đọc kết quả. Overflow = 0 nghĩa là không vỡ, bất kể ảnh trông thế nào.
> Sinh sau vòng review 2026-09-09 (FF GDPR block): một MAJOR "IntegrationCard tràn ở 414px" hoá ra là artifact cắt ảnh — đo lại được 0px overflow ở 320/360/414.

## Lens 0.8 — Fidelity vs APP THẬT (BẮT BUỘC cho màn UPDATE; tiền-điều-kiện chặn TRƯỚC khi dựng)

> Thêm bởi T58 (PO chốt QĐ-4=A). Vá điểm đứt đau nhất: mockup nhìn "Polaris hợp lý" nhưng **lệch bố cục app đang chạy thật** → clone trượt 3 lần (OL/AC). Lens 0.7 chỉ soi "vỡ/trắng/logo to", KHÔNG soi "khớp app thật". Nguồn: [[orchestrator-lessons]] mục 2026-07-14 (ground trên ảnh app thật).

**Phân loại task TRƯỚC (verifier tự xác định từ PRD/task):**
- **UPDATE** = sửa/thêm phần vào **màn đã tồn tại trong app đang chạy** → Lens 0.8 **BẮT BUỘC**.
- **NEW from-scratch** = màn hoàn toàn mới, app chưa có → Lens 0.8 **KHÔNG áp** (không có app thật để đối chiếu); chỉ cần Lens 0 + 0.7 + panel.

**Với task UPDATE — tiền-điều-kiện (chặn TRƯỚC khi designer dựng, không dựng mù từ code):**
1. **PHẢI có ảnh màn hiện tại của sản phẩm thật** — PO gửi, hoặc tự capture: profile `polaris` dùng `/screenshot` (shopify-admin-auth → chụp màn production); profile `general` mở chính build đang chạy của dự án (game/app/portal) rồi chụp. Thiếu ảnh sản phẩm thật → **REJECT NGAY + ESCALATE_HUMAN** ("cần ảnh màn X hiện tại trước khi dựng"), KHÔNG cho designer chế layout rồi mới sửa sau (chính là vòng lãng phí đã dính 3 lần).
2. Đường ảnh tham chiếu ghi vào verdict + STATE (để vòng sau không hỏi lại).

**Verifier đối chiếu (sau khi designer dựng):**
3. Đặt cạnh: ảnh render mockup (Lens 0.7) vs ảnh app thật. Soi **phần KHÔNG đổi phải khớp 1:1**: bố cục tổng, thứ tự card/section, spacing, control có sẵn, header/nav. Chỉ **phần HM yêu cầu** mới được khác.
4. **Lệch bố cục phần-không-đổi = REJECT** (mô tả cụ thể: card nào lệch, thứ tự sai chỗ nào, so app thật). Đây là MAJOR — không lấy điểm bù.

→ Qua hết Lens 0 + 0.7 (+ 0.8 nếu task UPDATE) mới chạy Panel 3 lens dưới đây.

## Panel 3 lens (perspective-diverse — chạy song song, mỗi lens độc lập REJECT-default)

### Lens 1 — Completeness & PRD fidelity (chặn nếu thiếu)
Đối chiếu mockup vs PRD Section 3 (UI Flow) + Section 5 (Design Description):
- ĐỦ mọi screen trong PRD?
- ĐỦ mọi state: empty / loading / error / success? (thiếu 1 state = REJECT)
- Mọi element tương tác trong UI Flow có mặt + đúng exact text (label/button/message)?
- Input types / default / required đúng PRD?

### Lens 2 — UX & flow
Nielsen heuristics, Hick's Law, Fitts's Law, progressive disclosure:
- Merchant nhìn 1 lần biết làm gì tiếp?
- Cognitive load thấp, không quá nhiều element cạnh tranh attention?
- Feedback sau action đầy đủ (loading/success toast/error inline)?
- Flow không bị chặn (dead-end)?

### Lens 3 — Hệ thiết kế + Accessibility (render đã check ở Lens 0) — **THEO PROFILE**

**3.A Chung cho CẢ 2 profile:**
- 1 primary action max/vùng; secondary nhạt hơn; destructive đỏ + có xác nhận?
- **Cấu trúc 1 file + điều hướng screen**: 1 file HTML duy nhất, có cơ chế chuyển màn — chấp nhận (a) static `<div class="screen">` + `showScreen()`, (b) Polaris `Tabs` thật, (c) switcher nổi thu gọn được. KHÔNG nhiều file / KHÔNG scroll-all [[feedback_ui_mockup_single_file_tabs]] → vi phạm = MAJOR.
- **Interaction-first**: state của CÙNG 1 màn phải click ra được, KHÔNG tách thành screen riêng [[feedback_mockup_interaction_first]] → tách sai = MINOR (nhiều chỗ = MAJOR).
- **Nhất quán FORMAT label giữa control CÙNG CẤP (MAJOR)**: các setting/field **sibling cùng mức phân cấp** (cùng nằm trực tiếp trong 1 card/nhóm) PHẢI dùng **CÙNG 1 format label** — hoặc tất cả field-label, hoặc tất cả heading. CẤM trộn field-label với heading subdued khi chúng ĐỒNG CẤP → 1 field trông "lạc quẻ". Soi: liệt kê label sibling trong 1 card + so variant/tone/weight — lệch = **MAJOR** (PO chốt 2026-07-30) [[feedback_sibling_label_format_consistency]].
  - **Đồng bộ CẢ ở trạng thái disabled/locked**: control có `disabled` tự làm mờ label; label tự chế KHÔNG tự mờ → ở màn locked sẽ đậm hơn các label cạnh nó. Verifier PHẢI soi ảnh trạng thái locked: mọi sibling label CÙNG độ mờ. Lệch = **MAJOR** (PO bắt 2026-07-31).
- **Figma fidelity**: nếu brief/PRD có Figma link → mockup phải bám pattern đó [[feedback_font_sync_use_mockup_pattern]] → lệch rõ = MAJOR.
- Label rõ, error đặt gần chỗ gây lỗi, không dùng placeholder thay label.
- WCAG AA contrast; click target ≥ 44×44px; visual hierarchy rõ.
- **Chống AI-tell**: em-dash/en-dash trong text render = MAJOR (grep = 0); data mẫu generic ("Product 1", "John Doe") hoặc số tròn giả = MINOR; fake UI dựng bằng div, hand-roll SVG icon trang trí = MINOR.

**3.B CHỈ profile `polaris`** (dự án `avada-app`):
- **Single-select dùng `<Select>` fullWidth, KHÔNG radio group** [[feedback_single_selection_use_dropdown]] → thiếu = MAJOR.
- **AdminShell TopBar đủ 3 props**: `showNavigationToggle` + `userMenu` + `onNavigationToggle` (thiếu → logo SVG khổng lồ vỡ layout) [[feedback_topbar_must_have_usermenu]] → thiếu = MAJOR.
- Dùng ĐÚNG Polaris component (DataTable/IndexTable cho bảng; KHÔNG custom component khi Polaris đã có) → sai = MAJOR.
- Nhất quán `UI_SNAPSHOT.md` của app (nav, thứ tự card, spacing pattern).
- **Storefront screens nền xám** `#f1f1f1`, không overlay admin shell; prototype bar nền trắng (không navy/tím) [`design-avada-app`] → MINOR.

**3.C CHỈ profile `general`** (dự án `product`/`system`/`content`) — thay Polaris bằng **shadcn/ui + hệ token của chính dự án**:
- **Tuân thủ shadcn (PO chốt 2026-08-09, `design-app` §2b)** — 3 check, mỗi cái fail = **MAJOR**:
  - **Token đúng TÊN shadcn**: `--background`/`--foreground`/`--card*`/`--popover*`/`--primary*`/`--secondary*`/`--muted*`/`--accent*`/`--destructive`/`--border`/`--input`/`--ring`/`--radius`. Tự đặt tên riêng cho vai trò shadcn đã có = MAJOR (token dự án riêng được thêm nếu có tiền tố + lý do ghi trong DESIGN-SYSTEM.md).
  - **Dark mode qua `.dark`** ghi đè đúng bộ biến đó, KHÔNG bộ token thứ hai.
  - **Không tự chế component registry đã có**: tự vẽ dropdown/modal/toast/tooltip/tabs/skeleton thay vì dùng anatomy shadcn tương ứng = MAJOR. Variant phải đúng tên shadcn (`default|secondary|outline|ghost|link|destructive`, size `sm|default|lg|icon`); đặt tên riêng kiểu "btn-red" = MINOR.
  - *Ngoại lệ hợp lệ, KHÔNG tính lỗi*: HUD trong `game-canvas` · khung/vùng-kéo/thu-gọn của `desktop-overlay` · dự án đã dùng lib khác từ trước VÀ đã nêu lý do ở Dev Notes.
  - *Runtime KHÔNG bị chấm*: mockup 1 file HTML thuần (không React/Tailwind build) là **hợp lệ** — shadcn ở đây là hợp đồng token + anatomy, không phải dependency.
- **Có `DESIGN-SYSTEM.md` (hoặc token nguồn tương đương) không?** Chưa có mà mockup đã chế màu/spacing lẻ = **MAJOR** (design-app §3 bắt chốt token trước khi dựng màn).
- **Mọi giá trị thị giác lấy từ token đã chốt**: màu ngoài bảng token, spacing ngoài thang, radius trộn nhiều hệ, >1 accent, hardcode hex/px lẻ giữa mockup = **MAJOR**.
- **Icon**: Lucide (mặc định shadcn), không trộn nhiều bộ icon = MINOR.
- **Surface type đã khai báo** (`app-window` / `game-canvas` / `desktop-overlay` / `tool-panel`) và luật của loại đó được áp: vd `desktop-overlay` không cướp focus + có trạng thái thu gọn + kích thước px tuyệt đối; `game-canvas` HUD đọc được trên nền động, không che vùng chơi. Sai loại hoặc bỏ luật loại = MAJOR.
- **Nhất quán với sản phẩm đang chạy**: component/pattern đã tồn tại trong dự án thì tái dùng, không đẻ biến thể mới cho cùng 1 chức năng.
- **Dark mode** với `app-window` và `desktop-overlay`: đã test cả 2 mode chưa? Chưa = MINOR (vỡ ở 1 mode = MAJOR).

## Ngân sách MINOR & chống nitpick (T175, PO chốt qua veto-window 2026-09-07)

> Sinh sau root-cause T148: loop mockup 5 vòng, trong đó **3 vòng REJECT toàn MINOR cosmetic mới-mỗi-vòng-không-lặp** (link label rỗng, CSS scope `.pill.active`) — chữ ký nitpick, không phải tay nghề kém. Bar `ZERO-MINOR + block_on_minor=true` không có van thoát tự động ⇒ verifier luôn tìm ra MINOR mới ở vòng sau. Nguồn: LOOPTASKS `APP #175`, agent `adb2cd2a`.

**M1 — Vét cạn MINOR ở VÒNG 1 (bắt buộc, danh sách ĐÓNG).** Vòng verify đầu tiên PHẢI liệt kê **đầy đủ** mọi MINOR thấy được, in dưới nhãn `MINOR-LIST (đóng, vòng 1)`. Đây là hợp đồng: designer fix trọn danh sách này là hết chuyện.

**M2 — Cấm MINOR "mới đẻ từ vòng trước".** Từ vòng ≥2, MINOR nêu ra mà **đã tồn tại trong artifact vòng 1** = lỗi bỏ sót của VERIFIER, **KHÔNG được dùng để REJECT** — chỉ ghi Dev Notes. Chỉ MINOR **thật sự mới** (do chính bản sửa đẻ ra, hoặc do MAJOR-fix kéo theo) mới tính. Verifier phải nói rõ MINOR mới đó sinh từ thay đổi nào.

**M3 — Cap re-loop MINOR-only = 1 vòng.** MINOR-only (0 MAJOR) chỉ được REJECT **tối đa 1 lần**. Từ vòng 2 trở đi, nếu còn **0 MAJOR** và chỉ còn MINOR → verdict = **`APPROVE-WITH-NOTES`**: gate mở, MINOR còn lại chuyển thành checklist trong Dev Notes/ticket, KHÔNG giữ loop. Tức `block_on_minor` **tự động = false từ vòng 2**, không cần PO gạt tay.
- **MAJOR KHÔNG có cap** — 1 MAJOR = REJECT, mọi vòng, như cũ. Lens 0 / 0.7 / 0.8 fail cũng không cap.
- `APPROVE-WITH-NOTES` phải kèm: danh sách MINOR còn lại + nơi đã ghi nợ (path Dev Notes / Jira key).

**M4 — MINOR đo được thì đẩy xuống script, đừng tiêu vòng người.** `lens0-mockup.sh` có thêm check **`0.9` — LOCATOR ADVISORY, KHÔNG tự fail gate** (chỉ 0.1-0.5 quyết exit code): `0.9a` em/en-dash trong text render · `0.9b` data mẫu generic (`Product 1`, `John Doe`, `Lorem`) · `0.9c` hex hardcode trong `style="..."`. Script **tìm + chỉ chỗ** (rẻ, vét cạn); **verifier phân loại** (judgment) rồi mới gọi tên MAJOR/MINOR. Verifier KHÔNG soi tay lại các mục này — đọc thẳng output 0.9.
- **Riêng 0.9a**: dash trong **copy merchant** = MAJOR (REJECT); dash trong **card DEV NOTE / thanh prototype / tên screen switcher** = KHÔNG tính lỗi. Lý do không fail cứng: run-test 4 mockup THẬT (OL/CB/AC/WF) cho thấy 3/4 dính dash ĐÚNG ở dev-note + prototype bar — fail cứng ở đó chính là nitpick giả mà T175 sinh ra để diệt.
- **Bẫy encoding (đừng gỡ khỏi script)**: `--dump-dom` decode theo charset TRANG; mockup thiếu `<meta charset="utf-8">` thì em-dash thành mojibake (`â€”`) và grep ký tự thật **trượt âm thầm** → script bắt cả dạng mojibake + cảnh báo riêng khi file thiếu charset.

## Khoá hướng design (epoch lock) — chặn pivot-sau-APPROVE

> Root-cause lớn hơn cả bar MINOR ở T148: **PO đổi kiến trúc SAU khi mockup đã APPROVE** (bảng multi-link → single-token `{{terms_and_conditions}}`), mockup đã duyệt bị bỏ, dựng lại từ đầu — Epoch B chiếm 3/5 vòng. Đây là chi phí quy trình, không phải chất lượng designer.

1. **Trước vòng verify ĐẦU TIÊN**, plan/PRD phải có dòng `design_direction_locked:` = 1 câu mô tả hướng kiến trúc UI đã chốt + ai chốt + ngày. Thiếu → **ESCALATE_HUMAN** ("chốt hướng trước khi dựng"), KHÔNG vào loop verify.
2. **Đổi hướng giữa chừng hoặc sau APPROVE = EPOCH MỚI**, không phải "vòng tiếp theo": `iteration` **reset về 0**, ghi `epoch N + lý do đổi` vào STATE, mockup epoch cũ archive và **KHÔNG tính là fail của designer** (chống thổi số vòng như "24 run" của T148).
3. **≥2 epoch cho cùng 1 feature** → verdict ghi cảnh báo + surface PO: dấu hiệu PRD/hướng chưa chốt, phải khoá hướng trước khi tiêu thêm vòng dựng.

## Tiêu chí PASS (GATE — phải đủ TẤT CẢ, không lấy trung bình)
- **Profile đã khai báo** (`polaris` | `general`) ở đầu verdict
- **Lens 0 (Technical Pre-Gate) toàn bộ pass** (script 0.1-0.5 exit 0 + 0.6 đọc tay) — fail 1 cái = REJECT ngay, không chấm tiếp
- **Lens 0.7 (Vision) pass** — verifier đã NHÌN ảnh render thật, không mismatch với PRD/UI_SNAPSHOT
- **Lens 0.8 (Fidelity app thật) pass — CHỈ với task UPDATE**: có ảnh app thật + phần không-đổi khớp 1:1 (task NEW from-scratch bỏ qua lens này)
- `/review-ui` total **≥ 90/100**
- **ZERO issue MAJOR** (bất kỳ MAJOR nào = REJECT, bất kể điểm)
- **ZERO issue MINOR — CHỈ ở vòng 1** (`block_on_minor=true` vòng 1; từ vòng 2 áp M3: 0 MAJOR + chỉ còn MINOR = `APPROVE-WITH-NOTES`, không REJECT nữa)
- **Cả 3 lens APPROVE** (không lens nào nêu critical)

→ Đủ hết = **APPROVE**. Thiếu 1 = **REJECT**.

## Verdict + LOOP (đây là chỗ "loop" anh muốn)
Output theo format loop-verifier (`APPROVE | REJECT | ESCALATE_HUMAN` + 5-check + lý do), kèm điểm 4 chiều + danh sách MAJOR/MINOR cụ thể.

```
Vòng lặp Design→Verify:
  designer tạo/sửa mockup
  → Lens 0 (script lens0-mockup.sh, fail-fast) → fail = REJECT ngay
  → Lens 0.7 (vision: chụp screen + verifier nhìn ảnh) → mismatch = REJECT
  → panel 3 lens chấm
  → APPROVE? → thoát loop, sang step code
  → còn MAJOR? → REJECT (không cap) → trả designer fix → tăng iteration → verify lại
  → chỉ còn MINOR?
        vòng 1 → REJECT kèm MINOR-LIST (đóng)
        vòng ≥2 → APPROVE-WITH-NOTES (M3) → thoát loop, MINOR ghi nợ Dev Notes
  → hướng design bị đổi giữa chừng? → EPOCH MỚI: iteration = 0, ghi epoch vào STATE
  → iteration > max_iterations (mặc định 3)? → ESCALATE_HUMAN
```

- **ESCALATE_HUMAN**: dừng, ghi `STATE.md` ACTIVE = `WAITING_HUMAN`, đưa PO bản mockup + lý do còn fail (3 vòng chưa qua) để PO quyết: chấp nhận có điều kiện / tự chỉnh / đổi hướng design.
- Mỗi vòng ghi STATE: `iteration N, verdict, MAJOR còn lại`.
- Risk gate (Lens nào chạm credentials / file ngoài scope) → ESCALATE ngay, không loop.

## Knobs (PO chỉnh được)
- `pass_score` = **90** · `max_iterations` = 3 · số lens = 3 (+ Lens 0 fail-fast).
- `block_on_minor` = **true ở vòng 1**, **tự động false từ vòng 2** (M3 — cap re-loop MINOR-only). MAJOR không có cap.
- `minor_reloop_cap` = **1** (số vòng REJECT được phép khi chỉ còn MINOR). Đặt về `0` = MINOR không bao giờ chặn; về `99` = quay lại chế độ siết cũ trước T175.
- `epoch_warn_at` = **2** (số epoch cùng 1 feature thì cảnh báo PRD chưa chốt hướng).
