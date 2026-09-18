# Shot Script Standard — chuẩn script ảnh cho User Guide (A33)

> Checker đọc file này để chấm `shots.md` của một bài user guide TRƯỚC khi cho phép chạy `/screenshot`.
> Nguyên tắc: *ảnh phải ĐẠI DIỆN được cho content* — script kém thì ảnh sinh ra không khớp bài, chụp lại tốn gấp nhiều lần sửa script.

---

## 1. Vị trí + format script

Mỗi guide có đúng 1 file script: `userguide/[guide-slug]/shots.md`

**Format = MARKDOWN** (PO duyệt 07-06 — bỏ format YAML cũ vì khó đọc; field giữ nguyên ngữ nghĩa, chỉ đổi cách trình bày). Cấu trúc:

- Đầu file: 1 dòng metadata chung (**App / Store / Base / Viewport**) + section **Data seeding** nếu cần tạo dữ liệu demo (ghi rõ cả cleanup).
- Mỗi shot = 1 section `## <id> — <tên ngắn>` với các field dạng bullet.

~~~markdown
# Shot script — [guide-slug]

- **App:** cb · **Store:** claude-9967 · **Base:** `/dashboard` · **Viewport:** 1440×900

## 01-overview — Toàn cảnh Dashboard

- **Section:** `## Overview` ← heading THẬT trong content .md mà ảnh đại diện
- **Type:** overview
- **Page:** `/dashboard`
- **Mục đích:** Toàn bộ Dashboard: header + 4 metric cards + time filter.
- **Prep:** — (không cần; UI mặc định sau page load)
- **Annotate:** no · **Blur:** —

## 02-time-filter — Dropdown time filter đang mở

- **Section:** `## Overview > Time filter`
- **Type:** composite (trang + chi tiết dropdown ghép 1 khung qua compose.js)
- **Page:** `/dashboard`
- **Mục đích:** Dropdown time filter đang MỞ, thấy đủ các option + option đang chọn.
- **Prep:**
  1. Click `button:has-text('Last month')` — mở dropdown trước khi chụp
- **Compose:** main = viewport · details = `.Polaris-Popover` (scale 0.38) · layout `detail-left`
- **Annotate:** no · **Blur:** —

## 03-activate — Nút Activate

- **Section:** `## Step 1: Activate the App`
- **Type:** action
- **Page:** `/dashboard`
- **Mục đích:** Nút Activate được highlight + cursor, thấy được context card chứa nút.
- **Prep:** —
- **Selector:** `button:has-text('Activate')` ← element highlight + cursor
- **Vùng chụp:** `.Polaris-Card` (default: element + padding 60)
- **Annotate:** yes · **Blur:** —
~~~

Field theo type (tên bullet trong shots.md ↔ ngữ nghĩa cũ: **Selector** = selector, **Vùng chụp** = shot_region, **Mục đích** = purpose, **Prep** = prep, **Compose** = compose, **Blur** = blur):

| type | Field bắt buộc | Ghi chú |
|------|----------------|---------|
| `action` | **Selector** | highlight + cursor in-DOM; **Vùng chụp** optional |
| `overview` | — | chụp viewport/`.Polaris-Page`; KHÔNG được crop nhỏ |
| `detail` | **Selector** hoặc **Vùng chụp** | crop chặt 1 vùng, KHÔNG annotate trừ khi action |
| `composite` | **Compose** (main + ≥1 detail) | ≥2 ảnh ghép 1 khung qua compose.js |

## 2. Quy tắc OVERVIEW (lỗi hay gặp — ảnh nhỏ không cover đủ nội dung)

- Ảnh `overview` phải cho thấy **toàn bộ nội dung mà section content mô tả** (mọi metric/section được nhắc trong bảng/bullet của content phải nhìn thấy trong ảnh).
- Viewport tối thiểu **1440×900** cho overview; nội dung dài hơn viewport → 1 trong 2:
  1. **Vùng chụp** trỏ vào container Polaris (`.Polaris-Page`) + scroll, hoặc
  2. **tách nhiều shot** rồi dùng `Type: composite` ghép về 1 ảnh tổng (main = màn chính, details = phần bị khuất/dropdown/panel).
- CẤM: ảnh overview là crop 1 góc trang; ảnh overview có element bị cắt cụt giữa chừng (nửa card, nửa bảng).

## 3. Quy tắc chung

- `id` = tên file output, zero-padded theo thứ tự xuất hiện trong bài (`01-`, `02-`…). Ngoại lệ REFRESH ảnh cho bài đã publish: `id` = path ảnh cũ để giữ nguyên ref.
- Mỗi shot map đúng 1 **Section** heading có thật trong content `.md` (khớp chuỗi).
- **Mục đích** viết đủ cụ thể để người KHÔNG đọc content vẫn chụp đúng (nói rõ state: dropdown mở/đóng, tab nào active, toggle on/off).
- **Prep** phải đủ để tái hiện state từ page load sạch (không dựa vào state có sẵn của session). Dữ liệu demo dùng chung nhiều shot → khai ở section **Data seeding** đầu file, kèm bước dọn (cleanup) sau khi chụp.
- Annotate theo verb matrix: Action=yes, Observation=no, Transient=không có shot.
- PII (email, tên khách, domain thật) → khai trong **Blur**.
- Số shot: mỗi Step Action ≥1 shot; Observation step chỉ khi UI phức tạp; không có shot "trang trí" không gắn section nào.

## 4. VERIFICATION CHECKLIST (checker chấm — REJECT nếu phạm bất kỳ mục FAIL-HARD)

```
COVERAGE (FAIL-HARD)
[ ] Mọi Step có verb Action trong content đều có ≥1 shot type=action
[ ] Section Overview/Dashboard trong content có shot type=overview hoặc composite
[ ] Mỗi shot Section khớp 1 heading THẬT trong content .md (không trỏ heading không tồn tại)
[ ] Không có placeholder ảnh nào trong .md thiếu shot tương ứng (so id ↔ filename trong ![](...))

ĐÚNG TYPE (FAIL-HARD)
[ ] Không có shot overview nào là crop vùng nhỏ (Vùng chụp hẹp / selector đơn lẻ)
[ ] Nội dung section overview dài (>1 viewport hoặc có dropdown/panel ẩn) → đã dùng composite
[ ] Shot action có Selector cụ thể (không mơ hồ kiểu "button")

TÁI HIỆN ĐƯỢC (FAIL-HARD)
[ ] Prep đủ để tái hiện state từ page load sạch; state trong Mục đích (mở/đóng/tab) có Prep tương ứng
[ ] Selector khả thi: khớp text in đậm trong content / UI_SNAPSHOT / Polaris pattern

CHUẨN OUTPUT
[ ] id zero-padded đúng thứ tự xuất hiện trong bài (hoặc = path ảnh cũ nếu là refresh)
[ ] Mục đích đủ cụ thể (nêu rõ state), không chung chung "chụp trang X"
[ ] PII được khai Blur (nếu app hiển thị email/tên/domain)
[ ] Annotate đúng verb matrix
[ ] Viewport ≥1440×900 nếu bài có shot overview
```

**Verdict**: `APPROVE` | `REJECT` (kèm danh sách mục fail + gợi ý sửa). Loop tối đa **3 vòng** → còn REJECT thì `ESCALATE_HUMAN`.
Sau APPROVE → **GATE PO**: mở `shots.md` (+ content .md) cho PO review; CHỈ khi PO duyệt mới chạy `/screenshot`.
