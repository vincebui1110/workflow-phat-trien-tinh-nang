# Orchestrator · reference — Social data fetch — match link → MCP/actor APify

> Tách khỏi `SKILL.md` ngày 22-08 (token-opt): phần này chỉ cần ở NGỮ CẢNH HẸP, nạp mỗi lượt route là phí.
> **ĐỌC khi: lệnh có link mạng xã hội (TikTok/FB/X/IG) cần fetch dữ liệu.**
> Nguồn gốc + lịch sử quyết định: `SKILL.md` (lõi) · bản trước khi tách: `~/.claude/.token-opt-rollback-20260822/skills/orchestrator-SKILL.md.pre7`.

### 2d. Social data fetch — match link → MCP/actor (APify)

Khi anh đưa link nguồn social để fetch data → **nhận diện nền tảng từ domain/pattern link → chọn ĐÚNG actor**, KHÔNG thử linh tinh. MCP server name = `apify` (wrapper `Others/mcp-apify-wrapper.sh`).

| Nền tảng | Pattern link nhận diện | MCP tool / actor |
|----------|------------------------|------------------|
| TikTok | `tiktok.com/@...`, `/video/`, `vm.tiktok.com` | `mcp__apify__clockworks--tiktok-scraper` |
| X / Twitter | `x.com/...`, `twitter.com/...` | `mcp__apify__apidojo--tweet-scraper` |
| Facebook (posts) | `facebook.com/...` (post/page/profile) | `mcp__apify__apify--facebook-posts-scraper` |
| Messenger | `messenger.com/...`, `m.me/...` | **CHƯA CÓ actor riêng — không cover.** Báo anh, đừng ép actor khác. |

**Quy tắc match link→tool:**
1. Parse domain trước → map theo bảng. Ưu tiên host, không đoán theo nội dung.
2. Không chắc nền tảng / link rút gọn lạ / nền tảng ngoài bảng (IG, YouTube, LinkedIn, Threads…) → **HỎI anh**, đừng chọn bừa actor.
3. Sau khi chạy actor: lấy kết quả qua `mcp__apify__get-dataset-items` (run id/dataset id từ actor run). Actor lâu → `mcp__apify__get-actor-run` để poll; `mcp__apify__abort-actor-run` để hủy.
4. Chạy actor thật = **tốn tiền** → chỉ chạy khi anh yêu cầu fetch thật, không chạy để "thử".
