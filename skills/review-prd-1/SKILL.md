---
name: review-prd-1
description: Verifier ĐỘC LẬP soi PRD/US theo hướng ADVERSARIAL-VS-CODE (tên cũ review-prd-vs-code) — đối chiếu từng giả định của spec với SOURCE THẬT trên origin/<default-branch>, tìm (a) giả định sai về code đã có, (b) seam/edge case chỗ mới ghép vào cũ chưa cover. Tự động chạy SAU review-prd, TRƯỚC khi chốt/giao dev. Bắt đúng loại lỗ hổng mà review-prd (vs-checklist) và conversation-retro (vs-pattern) bỏ lọt.
argument-hint: "[đường dẫn PRD_*.md hoặc US_*.md]"
---

Adversarial-vs-code review cho spec: $ARGUMENTS

Nếu không có argument → tìm file `PRD_*.md` / `US_*.md` mới nhất trong thư mục hiện tại.

> **VERIFIER ĐỘC LẬP (BẮT BUỘC).** Skill này PHẢI chạy ở agent/context KHÁC agent đã viết spec — spawn 1 reviewer MỚI (general-purpose hoặc qa-agent), input CHỈ gồm: file path + repo path + default-branch + rubric dưới đây. KHÔNG truyền conversation/reasoning của người viết spec (nguyên tắc loop-verifier: "the maker must never grade its own homework"). Mặc định reviewer HOÀI NGHI, nhiệm vụ là CỐ CHỨNG MINH spec sai.

> **NGÔN NGỮ:** toàn bộ output tiếng Việt CÓ DẤU đầy đủ.

## Nó soi gì — và KHÔNG soi gì (đọc kỹ trước khi chạy)

Đây là điểm sống-còn. Spec tính năng MỚI thì hành vi mới ĐƯƠNG NHIÊN chưa có trong code — **KHÔNG được** báo lỗi kiểu đó. Reviewer chỉ được flag 2 loại:

- **(a) Giả định SAI về code ĐÃ CÓ** mà tính năng mới dựa lên / mở rộng / mirror / đụng vào. Ví dụ: "mirror ProductGroupConditions" nhưng engine hiện chỉ nhận string; "count theo cái đã có ở PRD Z" nhưng Z chưa ship master; "không bơm storefront" nhưng app-embed hiện bơm mọi rule. **Gồm 2 case cụ thể (đã gộp từ review-prd cũ):**
  - **Feature đã tồn tại → PRD không nên build lại.** Đối chiếu `origin/$DEF`: glob `packages/assets/src/pages/**` (mỗi page ~1 feature), `packages/functions/src/routes/**` (endpoint), config/feature-flags. Nếu PRD đòi build cái app đã có → flag "đã có, chuyển sang Enhance / bỏ khỏi scope + sửa effort".
  - **Schema/endpoint bịa (§8 Data Model / §9 API).** Với mỗi field/collection/endpoint PRD ghi → verify tồn tại thật trên `origin/$DEF`. Không thấy mà PRD KHÔNG đánh ⚠️ → flag "cần Dev chốt, có thể bịa"; mâu thuẫn code thật → flag. (Feature thuần UI không có §8/§9 → bỏ qua.)
- **(b) Seam/edge case ở chỗ MỚI GHÉP VÀO CŨ chưa được cover.** Ví dụ: automation mới + refund/cancel cũ cùng chạy → double-refund; feature mới + data cũ → mapping/migration thiếu; status mới + status legacy.

**CẤM tuyệt đối** các finding sau (là noise, làm hỏng gate):
- "Tính năng/hàm/field này chưa có trong code" khi đó là phần MỚI cần build. ĐÚNG là chưa có — đó là việc của dev, không phải lỗ hổng spec.
- Nitpick chính tả / format / thứ tự mục.

**Greenfield fallback:** nếu spec đụng số-0 code đã có (repo rỗng / sản phẩm mới toanh / không tích hợp gì) → không có gì để "vs-code" cắn → reviewer chuyển sang **adversarial thường**: soi logic, mâu thuẫn nội bộ, edge case, acceptance thiếu. Ghi rõ trong output là đã chạy chế độ greenfield.

## QUY TRÌNH

### Bước 1: Xác định repo + default branch (KHÔNG hardcode)
1. Từ spec/đường dẫn → xác định app: OL/CB/AC/AV/FF/WF (hoặc dự án riêng trong PROJECTS.md). Repo:
   - OL → `${SHOPIFY_APP_DIR}/order-limit` · CB → `cookie-bar` · AC → `accessibility` · AV → `age-verification` · FF → `sea-fraud-filter` · WF → `withdrawal-forms`
2. `cd` vào repo, **fetch trước** (nhánh local có thể stale — đã dính bẫy này): `git fetch origin`
3. **Tự detect default branch** — KHÔNG giả định master (WF dùng `main`):
   ```
   DEF=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@')
   [ -z "$DEF" ] && DEF=$(git remote show origin 2>/dev/null | sed -n 's/.*HEAD branch: //p')
   # fallback cuối: thử master rồi main
   git rev-parse --verify origin/$DEF >/dev/null 2>&1 || DEF=master
   git rev-parse --verify origin/$DEF >/dev/null 2>&1 || DEF=main
   ```
   Mọi lệnh đối chiếu sau dùng `origin/$DEF`, KHÔNG dùng file working-tree.

### Bước 2: Spawn reviewer độc lập với rubric adversarial
Truyền cho reviewer: file spec, repo path, `origin/$DEF`, và rubric "soi gì / cấm gì" ở trên. Reviewer PHẢI:
- Đọc HẾT spec.
- Với mỗi khẳng định spec đưa ra về code đã có → `git grep <token> origin/$DEF -- 'packages/**' 'extensions/**'` hoặc `git show origin/$DEF:<path>` để verify. KHÔNG tin file local.
- Không đủ bằng chứng để khẳng định 1 finding → BỎ, đừng đoán.

### Bước 3: Output (markdown)
1. **Chế độ:** `vs-code` hay `greenfield` (+ repo, `origin/$DEF`, commit tip).
2. **Lỗ hổng** (0..N — trung thực, KHÔNG ép đủ số). Mỗi cái đúng 4 dòng:
   - Lỗ hổng: (gọi đúng tên: giả định sai về code cũ / seam chưa cover / mâu thuẫn với quyết định đã chốt)
   - Trích: (quote NGUYÊN VĂN ≤2 dòng từ spec)
   - Vì sao hại ở mức giao-dev: (dev hỏi gì / làm sai gì / rủi ro gì)
   - Đối chiếu code `origin/$DEF`: (path:line + token thật — hoặc "gap nghiệp vụ, không kiểm bằng code")
3. **Phán quyết:** (A) đủ giao dev, chỉ nitpick · (B) gần đủ, 1-2 chỗ nên chốt nhưng không chặn · (C) chưa đủ, có lỗ hổng chặn-implement.
4. Nếu (C): 1 câu acceptance quan trọng nhất còn thiếu (dạng "input X → hành vi Y phải là gì").
5. **Quyết định mắc kẹt trong code** (nếu có): liệt kê quyết định vật chất tồn tại trong code (comment / số hiệu D-nn) mà spec/decision-log KHÔNG chứa → đề xuất 1 entry cho `~/.claude/.decisions-ledger.json` để nó thoát khỏi code. (Loại rủi ro mất-tiền: đánh dấu 🔴.)

### Bước 4: Định tuyến kết quả
- Phán (A) → pass, spec đi tiếp.
- Phán (B)/(C) → trả về người viết spec để vá; KHÔNG tự sửa spec ở đây (maker ≠ checker).
- Có "quyết định mắc kẹt trong code" → surface cho PO, đề xuất ghi decision-ledger.

## Kỷ luật sống còn
Nếu spec thật sự chắc, nói THẲNG "đủ giao dev, chỉ N nitpick" + phán (A). Gate này tồn tại để phân biệt spec-done-tốt với spec-done-vẫn-lọt-lỗ — kết luận trung thực (kể cả "spec tốt") quan trọng hơn tìm ra lỗi. Mỗi finding PHẢI có trích dẫn thật + (nếu là code-fact) cross-check `origin/$DEF` thật. Đã có tiền lệ subagent bịa code-fact → PO verify lại grep là đúng; giữ kỷ luật đó.

## Trục này nằm trong bộ error-discovery (t37, 24-08)

> Nguồn duy nhất: **`~/.claude/review/ERROR-DISCOVERY.md`**.

Skill này là **bottom-up SƠ KHAI**: nó ground vào SOURCE thật chứ không vào checklist — đúng tinh
thần bottom-up, nhưng mới phủ một trục (spec-vs-code). Corpus lỗi NGƯỜI đã bắt
(`review/corpus/human-caught.jsonl`) cho thấy còn các trục nữa mà skill này KHÔNG phủ, đáng chạy kèm:

- `bu-novelty-claim` — tính năng **đã có nhưng ở chỗ khác**, lần này chỉ ĐỔI VỊ TRÍ. Skill này soi
  "code có / không có", nên case *"đã có config này rồi chỉ là đặt ở tab Content, giờ chuyển sang
  màn setting"* lọt qua: code CÓ thật, spec vẫn sai vì gọi việc di chuyển là tính năng mới.
- `bu-published-rendition` — bản đã publish (Notion/GitBook) khác bản nguồn. 5 lần PO bắt.
- `bu-fix-regression` — lỗi đã fix ở luồng này quay lại ở luồng khác.

Chạy kèm: `node ~/.claude/tools/review-axes.js plan --surface prd --artifact <path>`
