# code-standard — Rubric chấm code task (/dev run mode + flow-product-build P5)

> Profile `code` của `loop-verifier`, bản MỞ RỘNG cho run mode: chấm TỪNG task sau khi specialist ghi file (§R4b của /dev v2). Verifier độc lập — input = artifact + task + PRD refs, KHÔNG nhận reasoning maker. Default REJECT.

## Input verifier nhận

- `task` (từ task-list.json: id, name, description, type, output_file, pattern_files, prd_refs)
- Diff hoặc file output thật (verifier tự Read — không tin bản dán trong report)
- Path PRD + PRODUCT-BRIEF (nếu có)
- KHÔNG nhận: lời giải thích/summary của specialist (JSON `notes` chỉ dùng cho test-mock hint, không phải bằng chứng)

## Checklist (5-check chuẩn + 3 check code riêng)

| # | Tiêu chí | Kiểm thế nào |
|---|----------|--------------|
| 1 | **Scope** | Diff CHỈ chạm `output_file` (+ file task khai rõ)? Đổi file ngoài scope / sửa lan man → FAIL |
| 2 | **Intent vs PRD** | Đọc `prd_refs` trong PRD thật → hành vi code khớp yêu cầu? Thiếu case PRD ghi rõ → FAIL |
| 3 | **Verify thật — TỰ CHẠY** | Tự chạy: build/type-check (lệnh detect từ repo, xem /dev v2 §R6) + test liên quan nếu có + smoke (node -c / mở file). KHÔNG tin "tests passed" của maker. Không chạy được vì môi trường → ghi rõ, không được tính PASS mặc định |
| 4 | **No cheating** | Hardcode qua test? Bịa URL/số liệu? Skip phần khó nhưng báo done? Try/catch nuốt lỗi để test xanh? → FAIL |
| 5 | **Risk** | Đụng credentials/path nhạy cảm? Side-effect ngoài ý (xoá file, gọi API ngoài không có trong task)? → FAIL = ESCALATE thẳng |
| C1 | **Pattern conformance** | Mở 1-2 `pattern_files`: naming/import/error-handling/export style có khớp không? Code đúng nhưng "lạc điệu" so với repo → FAIL (đây là lý do pattern_files tồn tại) |
| C2 | **Non-goal** | PRODUCT-BRIEF mục "Cố ý KHÔNG làm": code có lấn vào non-goal không? Feature dư ngoài task → FAIL scope |
| C3 | **Merge an toàn** (task extend) | File đã tồn tại trước task: code cũ còn nguyên chức năng không? Mất code cũ âm thầm → FAIL |

## Verdict

- **APPROVE**: 5-check + C1-C3 đều PASS → dev-agent ghi hash + per-task commit.
- **REJECT**: FAIL ở 1/2/3/4/C1/C2/C3 → trả specialist qua Retry variant (AGENT-BRIEFS.md), kèm CHỈ danh sách fix đánh số. Đếm retry (mặc định max 2).
- **ESCALATE_HUMAN**: FAIL check 5 (risk), hết retry, hoặc fix đúng sẽ trái PRD (spec-issue thật — cần PO phân xử).

## Thử đột biến: cách KHÔI PHỤC (bắt buộc)

Thử đột biến là sửa mã cho sai đi rồi xem test có đỏ không. Khôi phục sai thì mất việc **im lặng**, và mất của người khác chứ không phải của mình.

- **Chụp bản sao TRƯỚC khi sửa** (`cp <tệp> /tmp/...`), khôi phục bằng `cp` ngược lại, xác nhận bằng `cmp`.
- **CẤM `git checkout -- <tệp>` / `git restore <tệp>` để gỡ đột biến.** Trong cây đang dirty (thường xuyên: nhiều phiên ghi song song, việc chưa commit), lệnh đó không gỡ đột biến mà **xoá về HEAD**, tức cuốn sạch mọi thay đổi chưa commit của tệp đó, gồm cả việc của vòng trước và của phiên khác.
- **Chạy `tsc`/suite NGAY sau mỗi lần khôi phục**, trước khi làm tiếp. Ca thật 01/09 (NAO): một lần `git checkout -- src/gate/gate.ts` xoá trọn vòng sửa trước; chỉ vì chạy `tsc` ngay sau đó mới lộ (~130 lỗi) thay vì báo cáo "xong" trên một tệp đã rỗng ruột.
- Cuối phiên: báo lại **số mục working tree** trước và sau, phải bằng nhau.

## Cấm

- KHÔNG tự sửa code (trả về specialist).
- KHÔNG APPROVE khi chưa tự chạy check ở tiêu chí 3 (hoặc chưa ghi rõ vì sao không chạy được).
- KHÔNG hạ chuẩn vì "task nhỏ" — task nhỏ đi direct mode, đã vào run mode là chấm đủ.
