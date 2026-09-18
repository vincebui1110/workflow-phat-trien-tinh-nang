# UI KB Index + Template — 6 Avada apps

> **Mục đích**: 1 nơi duy nhất cho designer-agent / `/design-avada-app` biết **UI KB (UI_SNAPSHOT) của mỗi app nằm ĐÂU** và **format chuẩn 1 UI KB gồm gì**.
> UI KB = "single source of truth" về UI THỰC TẾ của app tại thời điểm hiện tại (nav, màn chính, component Polaris, token) → designer lấy đúng UI app khi design ⇒ mockup dùng-được-ngay, không tự chế pattern.
> Nạp ON-DEMAND khi bắt đầu design 1 feature. Cập nhật bảng khi app đổi vị trí file UI KB.

---

## Index — UI KB path của 6 app (CANONICAL)

| App | Code | UI KB path (đọc file này TRƯỚC khi design) | Ghi chú |
|-----|------|--------------------------------------------|---------|
| Cookie Bar | CB | `${SHOPIFY_APP_DIR}/cookie-bar/docs/UI-UX/UI_SNAPSHOT.md` | ✅ có |
| Age Verification | AV | `${SHOPIFY_APP_DIR}/age-verification/docs/UI-UX/UI_SNAPSHOT.md` | ✅ có |
| Withdrawal Forms | WF | `${SHOPIFY_APP_DIR}/withdrawal-forms/UI_SNAPSHOT.md` | ✅ có — còn ở root, chưa dọn về `docs/UI-UX/` |
| Order Limit | OL | `${SHOPIFY_APP_DIR}/order-limit/UI_SNAPSHOT.md` | ⚠ có file (200 dòng) — **nội dung chưa verify vs master**, đọc kèm hoài nghi |
| Accessibility | AC | `${SHOPIFY_APP_DIR}/accessibility/UI_SNAPSHOT.md` | ⚠ có file (304 dòng) — **nội dung chưa verify vs master**, đọc kèm hoài nghi |
| Fraud Filter | FF | `${SHOPIFY_APP_DIR}/sea-fraud-filter/UI_SNAPSHOT.md` | ✅ có — đã verify vs `origin/master` 2026-09-08, mỗi mục gắn nhãn ✅ CÓ THẬT / 📐 MỚI Ở MOCKUP |

> **Sửa 2026-09-08**: 3 dòng trên trước đây ghi "❌ chưa có" (từ `deadpath-lint` 24/08), nhưng thực tế **cả 3 file đều tồn tại ở root**. Ghi "chưa có" cho file có thật nguy ngang ghi path ma, chỉ theo chiều ngược: không ai đọc ⇒ không ai bảo trì ⇒ file mục ruỗng âm thầm. Đúng chuyện đã xảy ra với FF: snapshot vẫn mô tả trang Settings kiểu single-column có nút Save và mô tả Data & privacy là card cuối trang, trong khi master đã đổi sang 2 cột + save bar từ lâu và PRD v1.3 đã bác bản card-cuối-trang.
>
> **Bài học đóng vào luật**: một UI KB **có file** không có nghĩa là **đúng**. Trước khi tin, đối chiếu vài mục chủ chốt với `git show origin/master:<path>`. Snapshot phải phân biệt "app đang có thật" với "mới chỉ có trong mockup" — xem cách FF gắn nhãn, đó là format chuẩn từ nay.
>
> Còn **1 app thứ 7 ngoài bảng**: `${SHOPIFY_APP_DIR}/ai-transparency/UI_SNAPSHOT.md` (47 dòng, EU AI Act Art.50, sửa lần cuối 2026-07-03). Chưa rõ nó có thuộc 6 app chính thức trong `PROJECTS.md` không — hỏi PO trước khi thêm hẳn vào bảng.
>
> Nếu path trên không tồn tại → theo rule fallback trong SKILL.md: scan 2-3 page tương tự trong `packages/assets/src` để hiểu pattern hiện tại, RỒI viết bổ sung UI KB.

---

## Template chuẩn — 1 UI KB gồm các mục sau

Khi tạo mới / bổ sung UI KB cho 1 app, giữ đúng khung này (thứ tự linh hoạt, nhưng đủ mục). Chỉ ghi UI THẬT lấy từ codebase/mockup đã có — KHÔNG bịa.

```markdown
# UI Snapshot — <Tên app> (<CODE>)

> Single source of truth cho UI patterns của app. Designer + Dev đọc TRƯỚC khi thêm/sửa UI để giữ consistency.
> Ref code: <origin/master|main @commit + ngày scan>   ← chống stale

## Stack UI
- Polaris <version chính xác> + polaris-icons <version>, React <ver>, Vite <ver>.
- i18n: cách lấy label (sentence case).
- ⚠ Version-specific: tên icon đổi theo version Polaris (vd v12 `*Minor/*Major` vs v13 `*Icon`).

## App shell / Navigation (nav THỰC TẾ)
- Layout shell: Frame + TopBar (`showNavigationToggle` + `userMenu` + `onNavigationToggle` — thiếu → vỡ layout) + Navigation trái.
- Nav items THẬT (từ `const/navigation.js`, verify origin): liệt kê đúng tên + icon + item nào ẩn/gate.

## Các màn chính (page patterns)
- Mỗi màn/trang chính: đường dẫn file page + cấu trúc (Page/Tabs/Layout 2/3 + oneThird sticky preview…), thứ tự card.

## Component patterns
- Card header, Toggle, Badge/tone, Select vs Radio (rule PO: single-select = dropdown), TextField, Banner, Modal, Tooltip (KHÔNG help text dưới field), custom component (chart, progress bar…).

## Design tokens (nếu có bảng màu/shadow)
- Bảng `--p-color-*`, shadow, font stack.

## Dev Note banner convention
- Trong mockup: background #FFF8E6, border #FFD54F, tiêu đề "⚠ DEV NOTE".

## Feature UI Index
| Feature | Files/Folder (docs/UI-UX/<FEATURE>/) | Screens/States | Last updated |
```

### Mục BẮT BUỘC có (DoD 1 UI KB đạt)
1. **Stack + version chính xác** (Polaris/icons — vì CSS/tên đổi theo version).
2. **Nav thực tế** (item + icon + gate).
3. **Các màn chính** + đường dẫn page code.
4. **Component/token patterns** đủ để dựng mockup không cần đoán.
5. **Feature UI Index** (trỏ tới các mockup đã dựng — để reuse, chống rebuild).

---

## Trạng thái UI KB 6 app (cập nhật 2026-09-08)

Cả 6 app ĐỀU có UI KB nội dung thật, không app nào là scaffold rỗng. Quét thực tế 2026-09-08:

| App | Vị trí file có thật |
|-----|---------------------|
| CB | root **và** `docs/UI-UX/` (2 bản — cần dọn còn 1) |
| AV | root **và** `docs/UI-UX/` (2 bản — cần dọn còn 1) |
| WF · OL · AC · FF | chỉ ở root |

> ⚠ **Câu này từng bị ghi đè bằng thông tin sai.** Bản 2026-07-15 nói đúng, rồi bản 28/08 sửa bảng Index thành "❌ chưa có" cho AC/OL/FF. Suốt thời gian đó file tự mâu thuẫn: sự thật nằm ở footer, cái sai nằm ở bảng — và cái sai thắng, vì bảng là chỗ người ta đọc. Sửa loại file này thì **sửa ở bảng trước**, đừng để hai chỗ nói hai kiểu.
