# test-standard — Rubric chấm phase TEST (flow-product-build P6 + task type:test)

> Profile của `loop-verifier` chấm bộ test/kết quả test — trả lời câu "test này có THẬT và có ĐỦ không", khác code-standard (chấm code sản phẩm). Verifier độc lập, default REJECT.

## Input

- Test files + test report/output của maker (qa-test hoặc specialist test)
- PRD (acceptance criteria) + PRODUCT-BRIEF (scope/non-goals)
- Quyền chạy lại test trong repo

## Checklist

| # | Tiêu chí | Kiểm thế nào |
|---|----------|--------------|
| T1 | **Test THẬT chạy** | Verifier TỰ chạy lại toàn bộ suite. Kết quả khớp report của maker? Maker báo pass nhưng chạy ra fail → FAIL No-cheat |
| T2 | **Phủ acceptance PRD** | Map từng acceptance criterion trong PRD refs → có ít nhất 1 test? Criterion không test được bằng máy → phải được liệt kê rõ trong report mục "cần test tay", không được im lặng bỏ qua |
| T3 | **Edge + error path** | Mỗi hàm/flow public: happy path + ≥2 edge + error path. Chỉ toàn happy path → FAIL |
| T4 | **Assertion có nghĩa** | Đọc xác suất 3-5 test: assertion có thể FAIL được không? `expect(true).toBe(true)`, assert kết quả do chính test tính lại bằng cùng công thức, snapshot vô tri → FAIL |
| T5 | **Mock không rỗng ruột** | Mock/stub có chừa lại code thật để test không? Mock đến mức test chỉ test mock → FAIL |
| T6 | **Hành vi, không implementation** | Test gắn vào behavior PRD, không gắn vào chi tiết nội bộ dễ vỡ (tên biến private, thứ tự gọi hàm không cam kết) |
| T7 | **Môi trường phù hợp dự án** | Dự án không framework (1 file HTML): harness tự viết chạy được thật (node/browser). Ép cài framework nặng vô cớ → FAIL scope |
| T8 | **Dữ liệu gieo có pha NGHỊCH** | Với mọi test đụng thứ tự/thời gian (replay, rebuild, gộp số, dedup, hàng chờ): bộ dữ liệu gieo phải có ít nhất một pha **nghịch thứ tự hoặc đồng hồ nhảy lùi**. Dữ liệu gieo mà mọi sự kiện tới đúng thứ tự thời gian thì test xanh vì **dữ liệu ngoan**, không phải vì mã đúng — bản dùng "cái sau đè cái trước" và bản dùng `MAX(at)` cho ra kết quả giống hệt nhau. Kiểm bằng cách đọc bộ gieo, hoặc đột biến chính chỗ chọn-bản-mới-nhất rồi xem test có đỏ không. Không có pha nghịch → FAIL |

## Verdict

- **APPROVE**: T1-T8 PASS + suite xanh khi verifier tự chạy.
- **REJECT**: FAIL bất kỳ → trả maker kèm danh sách fix đánh số (chỉ hành động, không nhận xét).
- **ESCALATE_HUMAN**: hết `max_iterations` (3), hoặc test lộ ra bug sản phẩm mà fix thuộc phase trước (P5) → báo rõ để quay lại đúng phase, không vá test cho qua.

## Cấm

- KHÔNG cho maker "sửa test cho xanh" khi bug nằm ở code sản phẩm — bug code → quay lại P5/code-standard.
- KHÔNG APPROVE dựa trên report — chỉ dựa trên lần chạy của CHÍNH verifier.
