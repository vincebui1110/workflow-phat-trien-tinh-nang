---
name: delivery-plan
description: "Delivery Plan — Tầng DƯỚI của luồng PO: đọc INDEX backlog+roadmap của 6 app, CHỌN tính năng đến lượt trong trần WIP rồi chạy **Flow 0 (Auto BA full pipeline)** cho từng cái, theo tới Done và sync trạng thái ngược backlog. Dùng khi user nói 'lên plan triển khai', 'delivery plan', 'chạy tính năng kế tiếp', 'giờ làm gì tiếp', hoặc khi autopilot Delivery Loop chạy. KHÔNG dùng để chọn/ưu tiên tính năng theo ý mình — thứ tự do BACKLOG + ROADMAP của PO quyết."
---

# Delivery Plan Skill

> **Hợp đồng với PO (chốt 2026-09-07):** PO sở hữu BRIEF → BACKLOG → ROADMAP. Skill này sở hữu **mọi thứ dưới đó**.
> **Skill này KHÔNG tự chế pipeline riêng.** Máy phát triển tính năng đã có sẵn: **`~/.claude/workflows/flow-0-auto.md`** (Auto BA full pipeline, 5 phase, dispatcher + checkpoint bền). Việc của skill này là **chọn đúng tính năng, đúng thứ tự, đúng số lượng** rồi giao cho Flow 0 — và theo nó tới Done.
> Mức tự chủ PO duyệt: **tự làm, báo digest, PO có cửa VETO** (D2). Không hỏi từng bước; chỉ hỏi 3 loại việc ở §6.

```
PO:      BRIEF.md ──▸ BACKLOG ──▸ ROADMAP.md
                                     │  (skill này đọc qua INDEX, không đọc toàn văn)
SKILL:   chọn trong trần WIP ──▸ Flow 0 (research→PRD→design→finish→hậu cần) ──▸ sync Status ngược BACKLOG
```

## 0. Thứ tự chạy BẮT BUỘC (tối ưu token — PO chốt 2026-09-07)

**KHÔNG đọc toàn văn backlog/roadmap của 6 app.** Toàn văn ~33KB và 90% là mục LOW/LOẠI/đã xong — trả tiền token cho thứ không bao giờ được chọn. Thứ tự đúng:

| # | Bước | Lệnh | Tại sao trước |
|---|---|---|---|
| 1 | **Đếm WIP** | `node ~/.claude/tools/journal.js wip flow-0` | Chỉ đếm khối `WIP … đang mở`; khối `TREO CHỜ NGƯỜI` **bỏ qua, không chiếm suất** (§2.1). WIP≥3 → **thoát luôn**, khỏi đọc gì hết. Cổng rẻ nhất đặt đầu tiên. KHÔNG dùng `open` (đếm thiếu). |
| 2 | **Lọc app đã đổi** | `node ~/.claude/tools/backlog-index.js changed` | App `SAME` = backlog+roadmap y hệt lần chạy trước ⇒ bỏ qua ở run *resume-only*. |
| 3 | **Đọc INDEX** | `node ~/.claude/tools/backlog-index.js index` | ~6.5KB thay cho ~33KB (giảm ~80%). Đủ để chọn: mỗi dòng có APP·BUCKET·ID·TÊN·STATUS·CHẶN·ROADMAP. |
| 4 | **Grep dòng đã chọn** | `grep -n '^\| <ID> ' "$(~/.claude/tools/backlog-files.sh resolve <CODE>)"` | Chỉ đọc toàn văn **những mục thật sự sắp chạy** (≤3 mục), không đọc cả file. |
| 5 | **Chốt marker** | `node ~/.claude/tools/backlog-index.js commit` | Ghi chữ ký SHA1 vào `~/.claude/.delivery-loop.state` để bước 2 của lần sau so được. **Chỉ chạy khi run kết thúc bình thường** — run lỗi giữa chừng KHÔNG commit, để lần sau quét lại. |

### 0.1 Phân vai 2 run/ngày

| Run | Vai | Làm gì |
|---|---|---|
| **08:00** · **13:00** · **18:00** — full scan | Quét đủ | Chạy trọn bước 1→5. Cả 3 lượt đều được mở run Flow 0 **MỚI**. |
| **20:00** — resume + sync | Rẻ | Bước 1 (đếm WIP) → **đẩy tiếp run đang dở** (§2.2 mục 1) → sync ngược (§5). **Bỏ hẳn bước 3** trừ khi bước 2 báo có app `CHANGED` — lúc đó mới quét và được mở mới cho đủ suất. |

**PO tăng nhịp 2026-09-14**: trước đó chỉ 2 lượt (08:00 full + 14:00 resume) và **chỉ 08:00** được mở việc mới ⇒ cả ngày tối đa mở 1 đợt. Nay **3 lượt full** (08/13/18) + 1 lượt gom cuối ngày (20:00). Trần WIP=3 vẫn giữ nguyên — tăng nhịp là tăng **số lần lấp suất trống**, KHÔNG phải tăng số việc chạy song song.

Lý do vẫn giữ 1 lượt resume-only cuối ngày: 20:00 không ai sửa backlog nữa, quét lại là đốt token cho kết quả y hệt 18:00. Cái lượt cuối thật sự cần là **đẩy run dở tới đích** + sync ngược, không phải tìm việc mới.

### 0.2 Index hỏng thì làm gì (PO chốt: đọc toàn văn app đó + báo digest)

`backlog-index.js` fail-loud: app nào parse ra 0 mục sẽ in dòng `<APP>\tPARSE_FAIL\t(đọc toàn văn app này + báo digest)`.
Gặp `PARSE_FAIL` → **chỉ app đó** rơi về đọc toàn văn backlog như cũ, 5 app còn lại vẫn dùng index; ghi 1 dòng digest "index không parse được <APP>, đã đọc toàn văn — nên xem lại format file". KHÔNG bỏ qua app đó (im lặng bỏ = tính năng của app đó chết âm thầm), cũng KHÔNG rơi về toàn văn cả 6 app.

## 1. Đầu vào

Nguồn chuẩn = **index**. Resolver chỉ dùng khi cần mở đúng 1 file cụ thể (bước 4, hoặc PARSE_FAIL):

```bash
node ~/.claude/tools/backlog-index.js index         # nguồn CHÍNH: bucket + thứ tự roadmap + cờ thiếu file
~/.claude/tools/backlog-files.sh resolve <CODE>     # BACKLOG toàn văn — chỉ khi cần
~/.claude/tools/roadmap-files.sh  resolve <CODE>    # ROADMAP toàn văn — chỉ khi cần
~/.claude/tools/brief-files.sh    resolve <CODE>    # BRIEF — bối cảnh, chỉ khi Flow 0 hỏi
```

Cờ index cần xử — **3 nhóm, đừng trộn**:

| Nhóm | Cờ | Nghĩa | Làm gì |
|---|---|---|---|
| **Chờ PO** (hợp lệ, không phải lỗi) | `NO_BACKLOG` · `EMPTY_BACKLOG` · `NO_ROADMAP` · `EMPTY_ROADMAP` | file chưa có, hoặc là skeleton/roadmap rỗng chưa ai điền | bỏ qua app đó vòng này, digest 1 dòng "chờ PO …". **KHÔNG tự điền, KHÔNG tự bịa roadmap.** |
| **Chờ PO, nhưng có việc để làm** | `UNSORTED_BACKLOG` | backlog có mục nhưng chưa chia bucket | KHÔNG tự chia (việc PO, §4). Digest nêu số mục đang chờ chia. |
| **Hỏng thật** | `PARSE_FAIL` | file CÓ nội dung mà parser không moi ra mục nào ⇒ format lệch | **CHỈ app đó** rơi về đọc toàn văn (§0.2) + digest "nên xem lại format". |

`EMPTY_BACKLOG` nhận bằng **marker tường minh** mà `templates/backlog-project.md` ghi sẵn ("SKELETON — chưa điền"), KHÔNG đoán theo "không thấy dòng bảng nào" — đoán kiểu đó thì file hỏng thật cũng đội lốt skeleton và nuốt mất `PARSE_FAIL`.

Skeleton tạo bằng: `~/.claude/templates/backlog-project.md` · `~/.claude/templates/roadmap-project.md` (roadmap có sẵn `roadmap-files.sh ensure <CODE>`).

Không có CODE khi PO gọi tay → hỏi trắc nghiệm. **KHÔNG mặc định là Avada.**

## 2. Chọn tính năng — TRẦN WIP = 3 RUN ĐANG MỞ (PO chốt 2026-09-07)

> **Trần là WIP (work-in-progress), KHÔNG phải "3 mỗi lần gọi".** Nếu tính theo lần gọi thì PO thêm 10 tính năng
> trong 1 phiên = 10 lần gọi = 10 run song song, trần vô nghĩa. Trần đúng: **tại MỌI thời điểm, toàn hệ 6 app
> chỉ được có tối đa 3 run Flow 0 chưa DONE** — bất kể ai gọi (4 cron 08:00/13:00/18:00/20:00, hay PO gọi tay `/delivery-plan` trong phiên).
> **KHÔNG có trigger tự-chạy-khi-backlog-đổi** (PO bỏ hẳn 2026-09-07). PO sửa backlog trong phiên → việc vào hàng đợi,
> cron 08:00 hôm sau nhặt; muốn chạy ngay thì PO gọi tay `/delivery-plan <CODE>`. Lý do bỏ: trigger đó nuốt gần hết việc
> của cron nên hoá ra hai đường làm cùng một việc, khó soi cái nào đã chạy.

### 2.1 Đếm WIP TRƯỚC khi đọc bất cứ gì

```bash
node ~/.claude/tools/journal.js wip flow-0     # ĐẾM WIP THẬT — dùng lệnh này, KHÔNG dùng `open`
```

> ⚠️ **KHÔNG đếm bằng `journal.js open`** (công thức cũ, đã sai). `open` chỉ bắt run có step FAILED/WAIT_HUMAN/
> STARTED-dở nên **bỏ sót run nằm chờ sạch ở cạnh NEXT** (mọi step DONE, step kế chưa khởi động) — mà đó vẫn là
> việc đang mở. Ca thật 07-09: 3 run FF (R1/R2/R3) đều đứng ở `research-review DONE → prd chưa chạy`, `open` báo
> **0** trong khi thực tế **4** run mở (kể cả CB) ⇒ trần tưởng còn trống, loop sẵn sàng mở run thứ 5.

- Mỗi dòng `flow-0/<run-id>` in ra = 1 suất đã dùng.
- **Run chỉ đang CHỜ NGƯỜI thì BỎ QUA, đi làm việc khác — không đợi nhau** (PO chốt 2026-09-14). Tool `wip` nay in 2 khối tách bạch: khối `WIP … run đang mở` (có step FAILED/STARTED-dở hoặc step kế đang chờ chạy) là **suất đã dùng**; khối `TREO CHỜ NGƯỜI … run` **KHÔNG tính vào WIP** và **KHÔNG có trần riêng** — treo bao nhiêu cũng mặc, cứ mở việc khác cho đủ suất.
  - Trần cũ "tối đa 3 run treo chờ PO → dừng mở mới" **đã BỎ**. Lý do đo được: 09-09 → 14-09 loop ghi **5 lượt `clean` liên tiếp** không mở được gì, vì 3/5 run chỉ đang nằm chờ PO trả lời câu hỏi mà vẫn bị đếm chiếm suất. Việc PO chậm trả lời một tính năng KHÔNG được làm đứng cả 6 app.
  - Run treo vẫn **phải lên digest mỗi lượt** (đang chờ gì, chờ từ bao giờ) — bỏ qua ở đây là bỏ qua việc *chặn hàng đợi*, không phải bỏ quên.
- WIP < 3 → được mở thêm cho đủ 3. WIP = 3 → **KHÔNG mở gì thêm**, kể cả PO vừa thêm tính năng mới vào HIGH → **thoát sớm ngay tại đây, không chạy bước 2-5 của §0** (không có suất thì đọc index cũng vô ích).

### 2.2 Thứ tự xét (dừng khi WIP chạm 3)

1. **Run Flow 0 đang dở trước tiên** — `node ~/.claude/tools/journal.js resume flow-0 <run-id> --max-rounds 3`:
   - exit 0 (RESUME/RETRY/NEXT) → chạy tiếp step in ra (đã chiếm suất sẵn).
   - exit 3 (WAIT_HUMAN / **ESCALATE**) → nhả suất WIP ngay (run chuyển sang khối TREO, không chặn gì nữa), đưa lên digest cho PO. Nguồn còn lại: **vòng fix→verify chạm trần 3** (Phase 5 KHÔNG còn treo trong đường auto — xem §6), hoặc **vòng fix→verify chạm trần 3** — lúc đó digest phải nói rõ verifier đang bắt lỗi MỚI hay lỗi CŨ chưa đóng, vì hai ca đó PO xử khác nhau.
   - exit 4 (DONE) → nhả suất, sang §5 sync ngược.
   Mở nhiều mà không cái nào tới đích là kiểu hỏng nặng nhất → run dở LUÔN ưu tiên hơn mở mới.
2. Còn suất → đọc index (§0 bước 3), lấy dòng `HIGH` có cột ROADMAP khác `-`, mở theo **ĐÚNG thứ tự roadmap (R1, R2, …)**.
3. Dòng có cột CHẶN khác `-` (prereq chưa xong / `blocked-by` còn treo) → bỏ qua, ghi digest "đang chặn bởi X", KHÔNG chiếm suất.
4. **CẤM TỰ PHỦ QUYẾT việc mở mới khi còn suất trống** (PO chốt 2026-09-14, sau run 13:00 để trống 2 suất). Còn suất + có dòng HIGH `Chốt` với cột CHẶN = `-` ⇒ **PHẢI mở**. Chỉ đúng **3 cớ** được phép không mở, và cả 3 đều đọc-được-từ-dữ-liệu, không phải suy luận: (a) cột CHẶN khác `-`; (b) hết dòng HIGH có ROADMAP; (c) WIP đã = 3. **Mọi lý lẽ kiểu "soft-prereq", "nhảy thứ tự R", "mở thêm chỉ dồn nợ quyết định PO", "chờ PO gỡ bớt đã" đều KHÔNG hợp lệ** — đó chính là cái nết đợi-nhau mà PO đã bỏ ở §2.1. Muốn nêu prereq mềm thì **ghi vào cột CHẶN của BACKLOG** (dữ liệu), đừng quyết trong đầu lúc chạy. Nếu quả thật có lý do ngoài 3 cớ trên ⇒ vẫn **mở run**, rồi ghi lo ngại vào digest cho PO veto.

### 2.3 PO thêm nhiều tính năng cùng lúc

PO thêm 10 mục trong 1 phiên → **KHÔNG chạy 10**. Xử theo thứ tự:

1. Nếu 10 mục đó làm bucket HIGH vượt **trần 8** → DỪNG, hỏi PO đẩy mục nào ra (§6.1). Backlog phải hợp lệ trước khi chạy bất cứ gì.
2. Backlog hợp lệ → mở đúng số suất WIP còn trống (thường 0-3), **theo thứ tự ROADMAP** chứ không theo thứ tự PO vừa gõ.
3. Phần còn lại nằm **hàng đợi** — không tạo run, không tạo task, chỉ báo digest "N mục chờ suất". Mỗi lần 1 run DONE là suất trống, lần chạy kế (cron hoặc phiên) tự lấp.

Hàng đợi KHÔNG cần file riêng: thứ tự đã nằm sẵn ở ROADMAP §2, trạng thái nằm ở cột Status của BACKLOG.

## 3. Giao cho Flow 0

Mỗi tính năng được chọn → chạy `~/.claude/workflows/flow-0-auto.md` với:

| Tham số | Lấy từ đâu |
|---|---|
| `feature_name` | cột TÊN của dòng index (= nguyên văn tên mục trong BACKLOG, để pre-flight của Flow 0 khớp được row) |
| `app_code` | cột APP (CB/OL/AC/AV/FF/WF) |
| `feature_type` | New Feature / New Function / Improvement — suy từ dòng backlog grep ở §0 bước 4; không rõ thì hỏi |
| `auto_accept` | **true khi chạy từ autopilot** (Flow 0 bỏ checkpoint Phase 0); **false khi PO gọi tay trong phiên** (PO duyệt plan trước) |
| `run-id` | `<app>-<feature-slug>` — Flow 0 quy định. Bền theo nội dung ⇒ chạy lại cùng tính năng = **resume đúng chỗ, không re-spawn agent đã xong** |

Mục gộp trong backlog (vd "GDPR Compliance block" gồm 4 mảnh) → chạy Flow 0 **một lần cho cả mục**, các mảnh là scope bên trong PRD; KHÔNG tách thành 4 run.

## 4. Trần an toàn (vi phạm = dừng, hỏi PO)

- **Không đổi bucket** trong backlog. Thấy mục HIGH sai chỗ → nêu digest, PO quyết.
- **Không thêm mục thứ 9 vào HIGH**, **không tự loại mục**, **không đẻ mục mới** (Flow 0 cũng có MVP Scope Lock — BA không được tự thêm feature ngoài scope).
- **Không rời working tree repo app Avada**: commit/push/MR/deploy = D3. Ghi file local = D1, cứ làm. **NGOẠI LỆ (PO chốt 2026-09-14): push tài liệu nhánh `feature/document` + Notion PRD/Research trong chính luồng này = D1** — pc-agent push thẳng, không hỏi (xem `CLAUDE.md` §GATE 3+4).
- Ghi Jira LUÔN qua `pc-agent` + `/avada-task-manager`, verify bằng đọc ngược từ server (không tin echo).
- Dự án ngoài Avada (`product`/`content`/`system`): KHÔNG Jira/Notion/Slack/GitLab-docs. Flow 0 hiện chỉ phục vụ app Avada.

## 5. Sync ngược sau mỗi run

- Flow 0 Phase 5 đã tự đổi Status của row trong backlog → **kiểm lại đúng row đúng cột**, đừng ghi trùng.
- Cập nhật cột `Status` cho mục vừa đổi trạng thái thật: `LIVE` / `Đang chạy Flow 0 (phase N)` / `Chờ` / `Chờ prereq` / `Hoãn`. **Chỉ cột Status.**
- Cập nhật ROADMAP §2 cột "Trạng thái" nếu mốc đổi; mốc trượt hạn → ghi 1 dòng vào ROADMAP §5 (đổi gì + lý do).
- **Chạy `node ~/.claude/tools/backlog-index.js commit`** ở cuối run (§0 bước 5) — sau khi đã sync xong, để chữ ký khớp trạng thái mới.
- Ghi STATE theo luật ③a: run clean → `node ~/.claude/tools/journal.js run-log delivery-loop clean "<tóm tắt>"`; chỉ ghi dòng `A##` khi sinh việc MỞ cần PO.

## 6. Ba loại việc PHẢI hỏi PO (ngoài ra tự chạy)

1. **Thêm mục thứ 9 vào HIGH** → hỏi đẩy mục nào ra (trắc nghiệm).
2. **Trade-off thật**: 2 đường dẫn tới 2 kết quả khác hẳn (scope, kỹ thuật, thứ tự mốc).
3. **D3+**: push/MR/deploy, publish ra ngoài, đổi permission, và **mục hoãn-có-điều-kiện đã đủ trigger** (ROADMAP §4) — trigger thoả thì đẩy quyết định vào `.decisions-ledger.json`, KHÔNG tự mở.

Các gate durable của chính Flow 0 (QA<60 sau N vòng, mockup gate quá 3 vòng) vẫn giữ nguyên — chúng dừng ở `WAIT_HUMAN`, skill này chỉ surface lên digest chứ không tự vượt.

**Phase 5 KHÔNG còn là gate trong đường TỰ ĐỘNG** (PO chốt 2026-09-14): loop luôn gọi Flow 0 với `auto_accept: true` ⇒ `hard_gates` rỗng — không hỏi vị trí Notion (PRD làm child page dưới đúng page Notion của app), không hỏi dev assignee (**để TRỐNG Dev assignees**), **được push thẳng** Notion + nhánh `feature/document` qua pc-agent. PO gọi tay `/delivery-plan` thì Flow 0 vẫn hỏi 2 thứ đó như cũ — chỉ đường auto được miễn.
