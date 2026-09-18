---
name: loop-verifier
description: "Loop Verifier — maker/checker gate. Chấm MỘT step output có đạt để đi tiếp không (khác auto-verify chấm chất lượng doc). Mặc định REJECT cho tới khi chứng minh đạt. Output APPROVE | REJECT | ESCALATE_HUMAN. Dùng trong dispatcher (step có verifier:true) + cuối mỗi autopilot run."
---

# Loop Verifier Skill

## Mục tiêu

Maker/checker gate cho hệ loop. Nguyên tắc gốc (loop-engineering): **"the implementer must never grade its own homework."** Agent vừa tạo output là kẻ tệ nhất để tự chấm nó đạt. Skill này là **người chấm độc lập**.

> Khác `auto-verify`: `auto-verify` = trục **TRUST** ("output này có cần người đọc không" → AUTO/SCAN/DEEP). `loop-verifier` = **GATE** ("output này có được đi tiếp bước sau không"). Chạy nối tiếp: verifier APPROVE → auto-verify phân TRUST tier → publish/escalate.

## Khi nào kích hoạt

- Trong dispatcher Flow 0-6: sau một step có `verifier: true` trong plan (mặc định: step `code`, step `design` (mockup), và bất kỳ step nào ghi `verifier:true`).
- Cuối mỗi autopilot run có `verifier: required` trong manifest, trước khi thực hiện action (L2/L3).
- Khi orchestrator/user gọi "verify step", "gate this".

## Profile theo loại step
- **`design` (mockup)** → dùng chuẩn MẠNH ở `~/.claude/skills/loop-verifier/mockup-standard.md` (Lens 0 technical pre-gate fail-fast + panel 3 lens, pass ≥90 + zero MAJOR + zero MINOR, loop tối đa 3 vòng). Đây là output PO trực tiếp review → nghiêm hơn review thường.
- **`content` (release-note)** → dùng chuẩn `~/.claude/skills/loop-verifier/release-note-standard.md` (Lens 0 grep pre-gate: title-format `[TYPE] Tên - Mô tả` + icon-whitelist + bullet/tag/demo/độ-dài + no-jargon; panel 3 lens: Fidelity&Scope / Audience-CS plain / Completeness; pass zero MAJOR+MINOR, loop ≤3 + token_budget).
- **`content` (user-guide)** → dùng chuẩn `~/.claude/skills/loop-verifier/user-guide-standard.md` (Lens 0 grep pre-gate: folder structure + image-path + header-level + placeholder + require_images knob; panel 3 lens: Structure&Template / Tone&Voice / Accuracy-vs-UI-thật; pass zero MAJOR+MINOR, loop ≤3 + token_budget).
- **`jira-task` (tạo Jira task qua /avada-task-manager + pc-agent)** → dùng chuẩn `~/.claude/skills/loop-verifier/jira-task-standard.md` (Lens `lens-jira-task.sh`: đọc LẠI issue thật, jq-assert J.1 sprint · J.2 assignees · J.3 reviewer · J.4 PO id 10702 · J.5 role-hygiene reviewer-không-lọt-assignees + dev-Task-có-haptt · J.6 điều kiện link PRD/UI). exit 0 mới báo tạo xong. Chạy sau Step 6 target-verify.
- **`code`** → 5-check chuẩn dưới đây + chạy thật build/test. Trong `/dev` run mode + `flow-product-build` P5 → dùng bản mở rộng `~/.claude/skills/loop-verifier/code-standard.md` (5-check + pattern-conformance + non-goal + merge-an-toàn, chấm từng task).
- **`brief` (PRODUCT-BRIEF.md — flow-product-build P0/P2)** → dùng chuẩn `~/.claude/skills/loop-verifier/brief-standard.md` (v0: đủ 7 mục + success có SỐ + ≥2 non-goal + giả định falsifiable + không khẩu hiệu; v1-delta: mọi giả định đánh dấu ĐÚNG/SAI/CHƯA ĐỦ DỮ KIỆN + delta dẫn nguồn research + khuyến nghị TIẾP/XOAY/DỪNG).
- **`test` (flow-product-build P6 / task type:test)** → dùng chuẩn `~/.claude/skills/loop-verifier/test-standard.md` (verifier TỰ chạy lại suite, map acceptance PRD → test, edge+error path, assertion FAIL-được, mock không rỗng ruột).
- Các step khác → 5-check chuẩn.

> Nguyên tắc chọn profile: đối tượng PO/CS/merchant trực tiếp đọc (mockup, release-note, user-guide) → dùng profile-standard riêng (Lens 0 fail-fast + panel 3 lens + loop maker-checker, dừng khi đạt hết HOẶC chạm `max_iterations`/`token_budget`). Step nội bộ (code, logistics) → 5-check chuẩn.

## Nguyên tắc cứng

1. **Default stance: REJECT until proven otherwise.** Không có bằng chứng đạt → REJECT, không cho "tạm ổn".
2. **KHÔNG tin lời implementer.** Nếu implementer nói "tests passed" / "đã đúng PRD" → tự kiểm, không lấy lời khai làm bằng chứng.
3. **Verifier ≠ implementer.** Skill này phải chạy ở agent/context KHÁC agent đã tạo output — input CHỈ gồm artifact + rubric, KHÔNG truyền reasoning/conversation của maker. Model theo tầng: check deterministic (Lens 0) chạy script/model rẻ; lens judgment chạy `sonnet`; CHỈ escalate `opus` khi đã REJECT 2 vòng liên tiếp hoặc nhánh legal/risk. Giá trị verifier đến từ tính độc lập + rubric, không phải model to.
4. **Không tự sửa.** Verifier chỉ phán xử + nêu lý do; việc sửa trả về agent gốc (vòng fix trong dispatcher, giới hạn `max_iterations`).

## Cost-matrix — sai kiểu nào đắt hơn, và đắt hơn BAO NHIÊU

> Nguồn: @aiDotEngineer — Jared Joselowitz (Ufonia), *"Shipping AI to a Million Patients Without an
> A/B Test"*: không A/B test được trên bệnh nhân, không rút lại được câu đã nói ra ⇒ phải mô phỏng
> trước và phải **cân phí tổn hai loại sai**, vì chúng KHÔNG bằng nhau. Hệ mình cùng bản chất rủi ro:
> tin Slack đã post thì **token bot không xoá/sửa được** (memory `slack-mcp-post-cannot-undo-no-blind-retry`),
> mail merchant / publish RN-UG / comment Jira cũng vậy.

Skill này vốn đã lệch về phía an toàn ("REJECT until proven"). Mục này **tường minh hoá thành số**, để
verdict được chọn bằng **kỳ vọng phí tổn** chứ không bằng cảm giác — và để chính chỗ lệch đó bị đo được.

| nhãn THẬT ↓ / verifier phán → | APPROVE | REJECT | ESCALATE_HUMAN |
|---|---|---|---|
| **Output ĐẠT** | 0 | **1** (báo giả) | **3** (escalate giả) |
| **Output LỖI — nội bộ** | **10** (lọt) | 0 | 2 |
| **Output LỖI — chạm RA NGOÀI** | **20** (lọt, không đảo được) | 2 | 0 |
| **Ca risk / thiếu thông tin** | **20** | 4 | 0 |

**Số ở đâu ra (không phải "nặng hơn" suông):**
- **1 báo giả = 1 vòng maker/checker chạy lại** ≈ 2-3′ MÁY, **0′ PO**, đảo được, đã có trần
  `max_iterations` chặn loop vô hạn. Đây là đơn vị 1.
- **1 lọt RA NGOÀI = 20.** Tin/mail/task đã tới người thật; gỡ không được. Vụ thật để neo số: 3 tin
  trùng post nhầm 20-08 (memory `slack-mcp-post-cannot-undo-no-blind-retry`) — PO phải dọn tay và bản
  gốc vẫn nằm đó. Ước lượng neo: **~30-60′ PO dọn / ~3′ máy chạy lại ≈ 10×**, nhân **2** cho phần
  KHÔNG ĐẢO ĐƯỢC (uy tín với người nhận không mua lại bằng thời gian) → **20**.
- **1 lọt NỘI BỘ = 10.** Ghi sai file/ledger còn git + append-only để lùi ⇒ đắt bằng nửa outward.
- **1 escalate giả = 3, đắt gấp 3 báo giả.** Nó tiêu **sự chú ý của PO** — tài nguyên hiếm nhất; và
  escalate giả lặp lại thì **dạy PO đóng dấu cho qua**, tức là tự tay phá cái cổng cuối cùng.
- **An toàn KHÔNG miễn phí.** Báo giả có giá 1 chứ không phải 0, để chặn cái thước thoái hoá thành
  "cứ REJECT cho lành" — thứ đạt điểm an toàn tuyệt đối mà vô dụng.

**Quy tắc quyết định rút ra từ ma trận** (thay cho "thấy ổn thì cho qua"):

> APPROVE chỉ khi **P(output thật sự đạt) ≥ C_lọt / (C_lọt + C_báo-giả)**
> → step **chạm ra ngoài / autopilot D2+**: cần **≥ 0.95** (20/21)
> → step **nội bộ**: cần **≥ 0.91** (10/11)
> Dưới ngưỡng mà lỗi maker sửa được → **REJECT**. Dưới ngưỡng vì **rủi ro/thiếu thông tin** → **ESCALATE_HUMAN**.

Nói cách khác: nghi ngờ ở mức "chắc 9 phần 10" vẫn **chưa đủ** để cho một hành động ra ngoài đi qua.
Ngược lại, đừng escalate khi chỉ cần một dòng fix — 3 > 1.

**Cách đo mình có tuân ma trận không:** `node ~/.claude/tools/verifier-f1.js` (0 token) chấm chính
verifier trên bộ ca đóng băng `~/.claude/evals/loop-verifier/`, in ma trận nhầm lẫn + F1 + TỔNG PHẠT
theo đúng bảng trên, và so với 3 "thước ngu" (luôn APPROVE / luôn REJECT / luôn ESCALATE). **Verifier
phải rẻ hơn CẢ BA** — không thì nó không mang thông tin nào cả.

### Số đo THẬT của chính skill này (mốc 2026-08-24, 15 ca × 2 lượt = 28 điểm đo)

| | APPROVE | REJECT | ESCALATE | ← verifier phán |
|---|---|---|---|---|
| **thật = APPROVE** (8) | 1 | 7 | 0 | |
| **thật = REJECT** (14) | 0 | 10 | 4 | |
| **thật = ESCALATE** (6) | 0 | 0 | 6 | |

`macro-F1 = 0.539` · `accuracy 61%` · **lọt = 0/28** · báo giả = 7/28 · **tổng phạt 15** (thước
"luôn REJECT" phạt 32 ⇒ verifier CÓ mang thông tin, nhưng chưa nhiều).

Đọc 3 điều từ bảng này, đừng đọc mỗi F1:
1. **Không lọt lượt nào** — cái đắt nhất (20) đang được giữ. Lệch-về-an-toàn là THẬT, không phải khẩu hiệu.
2. **Recall APPROVE chỉ 0.125** — 7/8 lượt chặn oan chính những bài **đã publish live và PO không sửa
   một chữ**. Đây là chỗ hỏng đang tốn tiền, và giờ nó có giá đo được thay vì được khen là "cẩn thận".
3. **Cùng bộ ca, 2 lượt ra 77% và 47%** — K=1 nói dối. Kết luận về thước phải chạy `--k 3` trở lên
   (`evals/README.md`: pass@k đo NĂNG LỰC, pass^k đo ĐỘ TIN CẬY).

Hướng sửa tiếp theo bị ma trận quy định, không do cảm tính: **giảm báo giả mà KHÔNG được đánh đổi
bằng lọt** — 1 lọt outward xoá sạch lãi của 20 lần bớt chặn oan.

## Verify-the-verifier — số bất thường thì NGHI THƯỚC TRƯỚC, đừng lao vào sửa agent

> Cùng nguồn Ufonia: LLM-judge của họ (**BevJudge**) được validate ngang chuyên gia (**F1 0.96**)
> TRƯỚC khi được dùng để phán agent. Kỷ luật: **metric drift → soi thước trước**. Không có bước này
> thì mọi lần "chất lượng tụt" đều biến thành một đợt sửa agent mù theo một cái thước đã hỏng.
> Bẫy kèm theo (memory `audit-tool-verify-own-output-first`): **đo verifier bằng chính output của nó
> thì luôn thấy đẹp** — 117 cờ đỏ thô hoá 0 sau khi kiểm tay. Nhãn phải ĐỘC LẬP.

**Tín hiệu drift — bất kỳ cái nào cũng kích hoạt quy trình dưới đây:**
- Tỉ lệ REJECT của một loop đổi >20 điểm % so với 2 tuần trước (cả hai chiều).
- Một loop D2+ chạy **≥10 lượt liên tiếp không có REJECT/ESCALATE nào** (cổng có thể đã thành con dấu).
- PO phải sửa tay / bắt lỗi một output mà verifier **đã APPROVE** (= 1 lọt đã xảy ra thật).
- Đổi model tier, đổi rubric/standard, hoặc đổi format output của maker.

**Quy trình 5 bước (theo thứ tự, KHÔNG được nhảy cóc sang bước 4):**

| # | Bước | Lệnh / việc cụ thể | Dừng ở đây nếu |
|---|------|--------------------|----------------|
| 1 | **Đóng băng hiện trường** | Ghi lại loop nào, cửa sổ thời gian nào, số nào lệch. `node ~/.claude/tools/gate-log.js rollup --days 14` để lấy phân bố `pass\|ask\|block` thật, không lấy trí nhớ. | — |
| 2 | **Lint bộ ca trước khi tin nó** | `node ~/.claude/tools/verifier-f1.js --lint` (0 token) — bắt ca thiếu `label_source`, nguồn chết, bộ ca lệch một phía. Bài học `evals/README.md` #3: **mốc đầu tiên là bản lint có trả phí cho chính bộ ca, không phải điểm của skill.** | Bộ ca hỏng → sửa CA, mọi kết luận khác vô hiệu. |
| 3 | **Chấm THƯỚC** | `node ~/.claude/tools/eval-run.js loop-verifier --k 1` rồi `node ~/.claude/tools/verifier-f1.js` → macro-F1, ma trận nhầm lẫn, tổng phạt, so mốc `f1-baseline.json`. | **F1 tụt >0.05 hoặc phạt tăng so mốc → THƯỚC HỎNG.** Sửa rubric/standard/model-tier của verifier. **CẤM kết luận gì về agent trong lượt này.** |
| 4 | **Chỉ khi thước còn nguyên** | Thước giữ F1 và 0 lượt lọt → drift là THẬT, lúc đó mới soi agent/maker. | — |
| 5 | **Đóng mốc lại** | Sửa xong bên nào thì `--baseline` lại cho bên đó (`eval-run … --baseline`, `verifier-f1 --baseline`), ghi 1 dòng vì sao đổi mốc. | — |

**Kèm theo, 3 rào chống tự-lừa (đã trả giá mới có):**
1. **Nhãn phải ĐỘC LẬP với verifier** — ca lấy từ lịch sử đã biết kết cục (PO đã phán / vụ thật đã ghi
   trong memory-BRIEF-ledger), mỗi ca có `label_source` gồm path + trích nguyên văn. `verifier-f1.js`
   **từ chối chấm** bộ ca thiếu nguồn. Ca do model tự bịa không được vào bộ.
2. **Bắt buộc có ca nhãn APPROVE.** Bộ ca toàn lỗi thì "luôn REJECT" đạt điểm đẹp giả — tool chặn cứng
   (lỗi) nếu 0 ca APPROVE, cảnh báo nếu <25%.
3. **Echo KHÔNG phải bằng chứng.** Verifier không được lấy lời tự khai làm PASS tiêu chí 3 — kể cả khi
   tool nói "thành công": `slack-post-once` từng báo `posted:true` trong khi gate đã chặn
   (memory `slack-post-once-false-posted-on-gate-block`). Đọc ngược từ server/file mới tính.
4. **"Không thấy trong working tree local" KHÔNG phải bằng chứng maker bịa** — và đây là **lỗi
   verifier đã mắc thật**, đo được: ở lượt đo đầu (24-08), ca `LV-A04` là một RN **đã publish** bị
   verifier gắn ESCALATE vì grep repo local không thấy code tính năng; sự thật là submodule local
   đứng ở commit 07-07 trong khi `origin/master` đã ở 18-08. Muốn kết luận "code không có" thì phải
   đọc được master (`git show origin/master:<path>`); không đọc được thì ghi **"chưa đối chiếu được
   với master"**, KHÔNG quy kết bịa. Nhầm chiều này rất đắt vì nó **giả dạng cẩn thận**.

## Áp cho autopilot D2+ — cổng nào chịu ma trận này

**D2+ = autopilot tự quyết và tự thực hiện mà KHÔNG hỏi PO trước** ⇒ verifier là **cái chặn cuối cùng**
trước khi thứ không-đảo-được rời khỏi máy. Ở những cổng dưới đây, dùng **cột "chạm RA NGOÀI" (C_lọt=20,
ngưỡng APPROVE ≥ 0.95)**, không dùng cột nội bộ:

| Autopilot / cổng | Chặn ngay trước | Nguồn wiring |
|---|---|---|
| `support-check` (+ `support-prescan` fast-path) | gửi DM merchant/PO (chống bịa link/ticket) | `automations/MANIFESTS.md` §Verifier gate |
| `weekly-kb-update` · `daily-kb-update` | PUSH GitLab | MANIFESTS §A58 — REJECT ⇒ không push |
| `monthly-jira-tasks` | tạo Jira task (chống trùng + sai field) | MANIFESTS §Verifier gate |
| `release-note-ug` | gửi Slack / push Falcon | `skills/loop-verifier/lens0-release-note.sh` (exit 0 PASS / 1 REJECT / 2 ESCALATE) |
| `portfolio-capture` | commit repo (grep secret ở tiêu chí Risk) | MANIFESTS §A58 |
| `support-calibrate` | gửi digest KB | MANIFESTS §A58 |
| Flow 0-6 dispatcher | step `verifier:true` trước khi mở phase kế | `tools/flow-dispatch.js` SEAM 2 (`verifyPhase`) |

Luật áp ở các cổng này (bổ sung cho §Quy tắc ra verdict, KHÔNG thay thế):
- **Tie-break luôn nghiêng về chặn**: ngang ngửa giữa APPROVE và REJECT thì REJECT — 1 rẻ hơn 20.
- **Không đủ dữ kiện để đọc ngược từ nguồn thật** (không xem được issue/tin đã ghi, không mở được file
  đích) ⇒ **ESCALATE_HUMAN**, không APPROVE. "Không kiểm được" ≠ "không có lỗi".
- **`unattended`** (không có người ở đầu bên kia): mọi FAIL tiêu chí Risk → ESCALATE + dừng loop, ghi
  STATE `WAITING_HUMAN`. Không có chế độ "tự quyết cho nhanh" ở nhánh này.
- **Mọi verdict ở cổng D2+ ghi 1 dòng telemetry**: `node ~/.claude/tools/gate-log.js log --gate loop-verifier
  --tool <cổng> --decision pass|ask|block --reason "<lý do ngắn>" --loop <tên autopilot> --redact`
  (`pass`=APPROVE · `block`=REJECT · `ask`=ESCALATE_HUMAN). Không có dòng này thì bước 1 của quy trình
  verify-the-verifier không có dữ liệu để soi drift.

## Checklist 7 điểm (chấm từng cái, ghi PASS/FAIL + bằng chứng)

> #6–#7 = 2 nguyên tắc anh chốt 19-08 (outcome đo được · mức thương mại hoá). Khối nguồn: `~/.claude/MINDSET.md`.

| # | Tiêu chí | Hỏi gì |
|---|----------|--------|
| 1 | **Scope** | Output có đúng phạm vi step không? Có làm dư (scope creep) hay thiếu? |
| 2 | **Intent** | Có đúng intent feature/backlog Note không? (đọc `backlog_note`, PRD nếu có) |
| 3 | **Verify thật** | Test/check có THẬT SỰ chạy không? Tự chạy lại (build/lint/test/mở file) — không tin báo cáo. |
| 4 | **No cheating** | Có bịa số liệu/URL? Có skip phần khó rồi báo done? Có hard-code qua test? |
| 5 | **Risk** | Đụng path nhạy cảm (credentials, .env.secrets)? Đụng file ngoài scope? Side-effect ngoài ý? |
| 6 | **Outcome** | Output này thay đổi chỉ số/hành vi NÀO, **đo bằng gì**? (1 dòng, có số hoặc lệnh kiểm được). "Đã sinh ra file/report" KHÔNG tính là outcome. Không đo được → ghi rõ "không đo được vì X", đừng thay bằng lời khen. |
| 7 | **Mức hoàn thiện** | Đủ mức dùng/bán được chưa, hay còn bản nháp? Đã **chạy thật 1 lượt trước khi gửi** chưa (gửi PO / team / ra ngoài đều áp)? Còn TODO/placeholder/số bịa để "trông như xong" → FAIL. |

## Output (BẮT BUỘC theo format)

```
VERDICT: APPROVE | REJECT | ESCALATE_HUMAN
Step: [id + title]
Checklist:
  1. Scope:      PASS/FAIL — [bằng chứng]
  2. Intent:     PASS/FAIL — [bằng chứng]
  3. Verify:     PASS/FAIL — [đã chạy gì, kết quả]
  4. No-cheat:   PASS/FAIL — [bằng chứng]
  5. Risk:       PASS/FAIL — [bằng chứng]
Lý do verdict: [1-3 câu]
Nếu REJECT → trả về cho: [agent] với yêu cầu fix cụ thể: [...]
```

> **FEEDBACK trả maker = CHỈ danh sách phần cần update, KHÔNG nhận xét (task 221).** "Yêu cầu fix cụ thể" phải là danh sách hành động sửa đánh số (`N. [vị trí/mục] → [hành động sửa]`), KHÔNG kèm khen/đánh giá chất lượng/tóm tắt/điểm số/lời rào. Bảng 5-check + bằng chứng ở trên là suy luận NỘI BỘ để verifier ra verdict; phần trả cho maker (và mọi AI ở bước sau) chỉ là danh sách actionable, ngắn gọn. Với profile RN/UG xem FEEDBACK FORMAT trong `release-note-standard.md` / `user-guide-standard.md`.

### Quy tắc ra verdict
- **APPROVE**: cả 5 PASS.
- **REJECT**: có FAIL ở 1-2, 3, hoặc 4 (scope/intent/verify/cheat) → trả agent gốc fix (đếm vào `max_iterations`).
- **ESCALATE_HUMAN**: FAIL ở 5 (risk), HOẶC đã REJECT `max_iterations` lần mà vẫn FAIL, HOẶC verifier không đủ thông tin để phán. Dừng dispatcher, báo user qua STATE (mục ACTIVE → WAITING_HUMAN) + nêu rõ cần quyết định gì.

## Tích hợp dispatcher (Flow 0-6)

Trong vòng dispatcher (orchestrator skill, mục Plan-Review Protocol): sau khi step có `verifier:true` chạy xong:
1. Spawn verifier (agent khác, đọc skill này) với: step output, scope step, backlog_note, PRD path (nếu có).
2. APPROVE → `step.status=done`, tiếp step sau.
3. REJECT → `step.status=rejected`, chạy lại agent gốc với yêu cầu fix, tăng iteration counter.
4. ESCALATE_HUMAN → dừng, ghi STATE.ACTIVE `WAITING_HUMAN`, báo user.

## KHÔNG
- KHÔNG để agent implementer tự set APPROVE.
- KHÔNG APPROVE vì "có vẻ ổn" mà chưa chạy check thật (tiêu chí 3).
- KHÔNG tự sửa output (đó là việc của agent gốc).
- KHÔNG đọc/hiển thị credentials khi verify (tiêu chí 5 vẫn tuân Credentials Rule).
