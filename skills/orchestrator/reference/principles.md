# Orchestrator · reference — Nguyên tắc vận hành + ví dụ routing

> Tách khỏi `SKILL.md` ngày 22-08 (token-opt): phần này chỉ cần ở NGỮ CẢNH HẸP, nạp mỗi lượt route là phí.
> **ĐỌC khi: cần hiệu chỉnh cách làm việc tổng quát, hoặc lúc onboard/audit chính skill này.**
> Nguồn gốc + lịch sử quyết định: `SKILL.md` (lõi) · bản trước khi tách: `~/.claude/.token-opt-rollback-20260822/skills/orchestrator-SKILL.md.pre7`.

## Nguyên tắc vận hành

### 1. Plan trước, code sau
Trước khi làm bất kỳ task nào có độ phức tạp cao: lên plan rõ ràng, confirm với user nếu cần.
Sai giữa chừng? **Dừng lại, lên plan lại.** Không cố đấm ăn xôi, không tiếp tục khi đã lạc hướng.

### 2. Việc khó → Sub-Agent
Context chính phải được giữ sạch. Việc nặng, việc khó, việc cần nhiều tool call → spawn sub-agent.
Ném thêm compute vào thay vì tự ôm hết và làm rối context.

### 3. Vòng lặp tự cải thiện
Bài học hành vi cần "chặn lần sau" → thành memory `feedback_*` (index `MEMORY.md`) — kênh DUY NHẤT harness auto-load mọi session. `lessons.md` là AUDIT-LOG (không auto-load từ 07-04); KHÔNG dựa vào "đọc lessons đầu phiên" (kênh đó đã gỡ — hứa đọc = phantom guarantee, lỗi vẫn lặp).
Mục tiêu: lỗi giảm dần theo thời gian — bằng guard/memory THẬT SỰ được nạp (hoặc PreToolUse hook cho lỗi mechanical tái diễn), không bằng lesson nằm ở file không ai đọc.

### 4. Chứng minh nó hoạt động
Chưa chạy test, chưa check log → **chưa được gọi là xong.**
Mọi task dev/fix đều phải có bước verify: chạy test hoặc kiểm tra output thực tế.

### 5. Tự sửa bug
Gặp lỗi → vào log tìm root cause, fix luôn.
Không chờ user cầm tay chỉ việc. Không đoán mò — đọc log trước khi kết luận.

## Ví dụ routing

```
User: "analyze ticket này https://avadaio.slack.com/archives/C084MP0C6SC/p1774490020836929"
→ Intent: support ticket analysis
→ Input URL: Slack link → channel C084MP0C6SC, thread 1774490020.836929
→ Route: flow-support.md (Step 2: Analyze)
→ Execute: Read workflow → spawn support-agent với Slack context

User: "research tính năng font sync cho CB"
→ Intent: feature research
→ App: CB, Feature: font sync
→ Route: Direct agent — po-agent + /feature-research
→ Execute: Read po-agent.md → spawn với feature context

User: "viết PRD cho OL variant limit"
→ Intent: viết PRD
→ App: OL, Feature: variant limit
→ Route: Direct agent — ba-agent + /prd
→ Execute: Read ba-agent.md → spawn với feature context

User: "format file này giúp tôi"
→ Intent: đơn giản, trực tiếp
→ Route: Tự xử lý
→ Execute: Đọc file + edit trực tiếp

User: "flow 1 research cookie scanning cho CB"
→ Intent: workflow flow-1
→ App: CB, Feature: cookie scanning
→ Route: Workflow flow-1-research.md
→ Execute: Read workflow → thực thi từng step
```
