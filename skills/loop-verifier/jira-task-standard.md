# Jira Task Creation — Loop-Verifier Standard (field-completeness gate)

> Profile `jira-task` của loop-verifier. Chạy SAU khi `/avada-task-manager` (pc-agent) create/update xong 1 issue,
> TRƯỚC khi báo "task tạo xong". Nguyên tắc gốc: **gate bằng code, không tin model tự khai đã set đủ field**
> (giống Lens 0 release-note). BRIEF task 145.

## Vì sao có gate này
`/avada-task-manager` Step 6 hiện chỉ verify **đúng target** (đúng key/parent/nội dung — chống nhắm nhầm issue). KHÔNG có gate
xác nhận issue đã tạo có **đủ field bắt buộc**. Đã có 2 lần rò thực tế:
- **SB-14726 (MKT, 27-07)**: task type Task thiếu sprint (PO bắt) — trước đó tưởng chỉ dev task mới cần sprint.
- **task-142 (29-07)**: reviewer `kenny` / tester `haptt` rò vào option/assignees dev (sai vai trò).
⇒ Cần 1 lens deterministic đọc LẠI issue thật + assert từng field.

## Lens 0 = `lens-jira-task.sh` (SINGLE SOURCE OF TRUTH danh sách check)
Input = issue JSON REST đọc lại từ Jira (KHÔNG phải JSON mình định gửi):
```bash
cd "${SHOPIFY_APP_DIR}/Others" && source ../.env.secrets && node jira-cli.js get <KEY> > /tmp/issue.json
bash ~/.claude/skills/loop-verifier/lens-jira-task.sh /tmp/issue.json [--expect-doclink] [--no-tester]
```
(hoặc lấy JSON qua `mcp__jira__read_jira_issue` rồi ghi ra file.)

| check | nội dung | áp cho |
|---|---|---|
| J.1 | Sprint (`customfield_10101`) set | **MỌI issuetype Task** (dev/MKT/standalone). BA **Sub-task** bỏ qua |
| J.2 | Assignees (`customfield_10700`) không rỗng | tất cả |
| J.3 | Reviewer (`customfield_10900`) không rỗng | tất cả |
| J.4 | Product Owner (`customfield_11000.id`) = `10702` (Diệu BDT) | tất cả |
| J.5 | **Role-hygiene**: reviewer (kenny/sonnv) KHÔNG lọt vào assignees; dev Task (reviewer=kenny) PHẢI có tester `haptt` trong assignees | tất cả (nối task-142) |
| J.6 | (điều kiện `--expect-doclink`) description/comment có link PRD/UI (GitLab/Notion/Drive/Docs) | task CÓ tài liệu đi kèm |
| J.7 | (điều kiện `--expect-mr`) link merge request nằm ở **field `customfield_10800`** VÀ không còn sót trong description | task `[BA-Dev]` / bất kỳ task nào đã có MR |

**Flag:**
- `--expect-doclink` — bật khi task này CÓ PRD/UI (dev task từ pipeline BA thường có). Không có tài liệu → bỏ flag, J.6 SKIP.
- `--no-tester` — task Task đặc biệt không cần tester haptt (hiếm; mặc định dev Task cần).
- `--expect-mr` — bật khi task đã có merge request (chuẩn cho task `[BA-Dev]` — BA tự code). Chưa có MR → bỏ flag, J.7 SKIP. PO chốt 2026-08-26: link MR đi vào field Merge Request để Jira/loop đọc được, KHÔNG dán vào description.

**Exit:** `0` = đủ field bắt buộc → được báo tạo xong · `1` = thiếu/sai field → **CHƯA xong**, sửa field rồi verify lại (KHÔNG báo done).

## Wiring vào `/avada-task-manager`
Thêm sau **Step 6 (target-verify)** một bước **Step 6b — field-completeness gate**:
1. Đọc lại issue vừa create theo key → file JSON.
2. Chạy `lens-jira-task.sh` (bật `--expect-doclink` nếu task có PRD/UI).
3. exit 0 → mới báo "tạo xong". exit 1 → sửa field thiếu (update qua jira-cli/MCP) → re-verify → mới báo done.
4. Batch → chạy lens LẦN LƯỢT từng issue (giống luật batch Step 6).

## Giới hạn (không over-engineer)
- Lens chỉ chấm **field-completeness cứng**. Đúng-người-đúng-app (dev nào hợp app nào), priority hợp lý, nội dung
  description đủ chất → vẫn thuộc self-verify/judgment người, KHÔNG nhét vào lens deterministic.
- J.6 chỉ kiểm CÓ link, không kiểm link trỏ đúng tài liệu — nội dung link do người xác nhận.
- J.7 chỉ kiểm link MR ĐÚNG CHỖ (field, không phải description) + là URL; không kiểm MR đó có thật/đúng nhánh.
- Field ID cứng theo project SB (10101/10700/10900/11000/10800). Project khác phải chỉnh map.
