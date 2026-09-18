# Orchestrator · reference — Kỷ luật sub-agent (advisor≠executor · hợp đồng RESULT · trần bước · verify git)

> Tách khỏi `SKILL.md` ngày 22-08 (token-opt): phần này chỉ cần ở NGỮ CẢNH HẸP, nạp mỗi lượt route là phí.
> **ĐỌC khi: sắp spawn sub-agent có tool ghi, hoặc sau khi sub-agent trả kết quả.**
> Nguồn gốc + lịch sử quyết định: `SKILL.md` (lõi) · bản trước khi tách: `~/.claude/.token-opt-rollback-20260822/skills/orchestrator-SKILL.md.pre7`.

### Kỷ luật sub-agent (A100 — port từ hermes: kanban_stop + MoA advisor + iteration_budget)

Nguyên tắc gốc: **KHÔNG tin sub-agent tự kiềm chế — chặn bằng CẤU TRÚC**. Sub-agent tự thao tác ngoài phạm vi (vd tự đổi status issue ở A80) là do được CẤP tool ghi + prompt không có nhãn kết thúc, không phải do "nó hư".

1. **advisor ≠ executor (chặn bằng agent-type, không bằng lời dặn):**
   - Việc **research / PRD / review / phân tích** = *advisor* → spawn bằng agent-type KHÔNG có tool ghi phá huỷ. Ưu tiên `Explore`/`Plan` (read-only) khi chỉ cần đọc+đề xuất; hoặc named-agent nhưng KHÔNG kèm hướng dẫn tự-publish/tự-đổi-trạng-thái.
   - Chỉ **`pc-agent` / `/avada-task-manager`** được thực thi ghi ra ngoài (Jira/GitLab/Notion/Slack). Advisor phát hiện cần tạo Jira → ĐỀ XUẤT trong `RESULT:`, KHÔNG tự tạo.
   - Fan-out research song song: mọi con CHỈ báo cáo lại, KHÔNG con nào được đổi issue/status/comment (nếu buộc dùng named-agent có tool, ghi rõ trong prompt "read-only, chỉ trả findings").
2. **Hợp đồng RESULT/BLOCKED**: đã bake vào PROMPT STRUCTURE (mục 3b). Sau khi sub-agent trả về, orchestrator VERIFY dòng cuối có đúng nhãn `RESULT:`/`BLOCKED:` — thiếu nhãn hoặc kết thúc bằng "tôi sẽ..." → coi như CHƯA xong, không ghi DONE, hỏi lại/re-spawn.
3. **Trần bước subagent < parent**: subagent mặc định trần thấp hơn (≈50 tool-call); nhắc trong prompt + kiểm số tool-call thực tế khi nghi lang thang. Việc cần nhiều bước hơn → chẻ nhỏ, đừng nới trần.
4. **Verify git state SAU khi spawn dev/code agent** (giữ nguyên `feedback_subagent_may_ignore_no_push_verify_git`): dev-agent có thể phớt "KHÔNG push" + tự tạo remote — advisor≠executor không phủ được git, phải verify thủ công sau.
