# brief-standard — Rubric chấm PRODUCT-BRIEF.md (flow-product-build P0 + P2)

> Profile của `loop-verifier` cho artifact `PRODUCT-BRIEF.md`. Verifier độc lập (KHÔNG phải ba-agent vừa viết brief). Default REJECT.
> 2 chế độ chấm: **v0** (sau P0 — brief xuất phát) và **v1-delta** (sau P2 — brief đã update theo research).

## Vì sao rubric này phải chặt

Flow-product-build chỉ có 1 checkpoint PO (sau P2). Brief mơ hồ lọt qua gate không làm flow chậm — nó làm flow **sai âm thầm tới tận P7**. Rubric này là hàng rào duy nhất trước khi research tiêu tiền.

## Chấm v0 (sau P0)

Đọc `PRODUCT-BRIEF.md`, chấm từng mục. FAIL bất kỳ check nào → REJECT.

| # | Check | PASS khi | FAIL điển hình |
|---|-------|----------|----------------|
| B1 | Đủ 7 mục | Có đủ: 1 câu · ai dùng-đau đâu · thành công · ràng buộc cứng · KHÔNG làm · giả định · câu hỏi mở | Thiếu mục, hoặc mục chỉ có heading rỗng |
| B2 | Mục 3 có CON SỐ | Định nghĩa thành công đo được: số + đơn vị + mốc thời gian (vd "200 user/tháng sau 3 tháng") | "hay hơn", "nhiều người dùng", "trải nghiệm tốt" |
| B3 | Mục 5 ≥ 2 non-goal | Ít nhất 2 dòng "cố ý KHÔNG làm" cụ thể (chặn được scope creep thật) | 0-1 non-goal, hoặc non-goal hiển nhiên vô nghĩa ("không làm app iOS" cho dự án web thuần) |
| B4 | Mục 6 giả định KIỂM ĐƯỢC | Mỗi giả định phát biểu dạng CÓ THỂ SAI + research trả lời được (falsifiable) | "user thích UX đẹp" (không kiểm được), giả định trá hình kết luận |
| B5 | Không khẩu hiệu | Không mục nào chỉ là từ trang trí: "tốt hơn", "hiện đại", "tối ưu", "nâng tầm" mà không có nội dung đo/kiểm được | — |
| B6 | Mục 4 ràng buộc THẬT | Ràng buộc cứng có chủ thể (thời gian/tiền/tech đã chốt/cái không được đụng), phân biệt được với mong muốn | Trộn wish vào constraint |

Ngoài ra: mục 3/4/5 phải là ý PO chốt (brief ghi nhận từ trả lời trắc nghiệm), không phải ba-agent tự bịa mục tiêu — thấy dấu hiệu tự bịa (số tròn trịa không nguồn, mục tiêu không khớp lệnh gốc) → REJECT nêu rõ.

## Chấm v1-delta (sau P2)

Tất cả check v0 vẫn áp + thêm:

| # | Check | PASS khi |
|---|-------|----------|
| D1 | Nhật ký sửa brief tồn tại | Có section `## Nhật ký sửa brief` với bảng delta: Mục · v0 · v1 · Vì sao (dẫn nguồn research §) |
| D2 | MỌI giả định mục 6 được đánh dấu | Từng giả định gắn `ĐÚNG` / `SAI` / `CHƯA ĐỦ DỮ KIỆN` sau research. Còn giả định trần → REJECT |
| D3 | Delta có truy vết | Mỗi thay đổi dẫn được về section cụ thể trong `RESEARCH_*.md` (verifier mở research kiểm xác suất 2-3 chỗ — dẫn nguồn bịa → REJECT check No-cheat) |
| D4 | Giả định SAI không được giữ nguyên hệ quả | Giả định đánh `SAI` → các mục 1/3/4 liên quan phải đổi theo hoặc ghi rõ vì sao giữ | 
| D5 | Gói trình PO đủ | Cuối brief có khuyến nghị rõ: **TIẾP / XOAY (xoay gì) / DỪNG (lý do)** — vì đây là checkpoint PO duy nhất, PO phải quyết được trong 1 lần nhìn |

## Output

Theo format chuẩn `loop-verifier` SKILL.md (VERDICT + checklist + bằng chứng). FEEDBACK trả maker = CHỈ danh sách fix đánh số, không nhận xét.

- APPROVE: tất cả check PASS.
- REJECT: bất kỳ FAIL → trả ba-agent, đếm `max_iterations` (mặc định 3).
- ESCALATE_HUMAN: REJECT 3 vòng, hoặc verifier phát hiện brief mâu thuẫn với lệnh gốc của PO (không tự phán được ý PO).
