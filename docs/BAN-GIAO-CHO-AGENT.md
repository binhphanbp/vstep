# Bàn giao cho AI agent làm tiếp — Mây VSTEP

Viết ngày 09/10/2026 bởi agent đang làm phiên này, khi chủ dự án sắp hết quota. Đây là **file đọc đầu tiên**: nói dự án là gì, chủ dự án làm việc thế nào, đang ở đâu, việc gì đang dở và những cái bẫy đã gặp. Các tài liệu khác trong `docs/` là chi tiết (xem mục 11).

Mọi con số dưới đây là số đo thật tại thời điểm viết; số liệu có thể đổi, hãy chạy lại lệnh ở mục 4 trước khi nói "xong".

## 1. Dự án trong năm dòng

- **Mây** là web luyện thi VSTEP (B1–B3) cá nhân cho một người học tên **Gùa**. Chủ dự án quản lý riêng cho Gùa: không có giáo viên, không có người chấm, không có nhiều người dùng.
- Next.js 16.4 (App Router, có thay đổi so với bản bạn quen: **đọc `node_modules/next/dist/docs/` trước khi viết mã Next**, xem `AGENTS.md`), React 19, TypeScript, Tailwind 4, Zod mini, Supabase tùy chọn (đồng bộ thủ công).
- Dữ liệu học nằm **trong trình duyệt** (localStorage `may-study-v1`, IndexedDB cho bản ghi âm). Cloud chỉ là bản sao khi người dùng bấm lưu.
- Repo: `binhphanbp/vstep`. Bản live: https://vstep-turtle.vercel.app (Vercel, deploy từ `main`).
- Ngôn ngữ giao diện, tài liệu và cách nói chuyện với chủ dự án: **tiếng Việt**. Mã và tên biến: tiếng Anh.

## 2. Cách chủ dự án làm việc (quy tắc cố định — tuân thủ)

1. **Ưu tiên máy tính để bàn** (`CLAUDE.md`). Thiết kế, kiểm thử, sửa lỗi theo trình duyệt desktop (1280×720 là cỡ nhỏ nhất); điện thoại chỉ cần không vỡ bố cục, đừng tốn công vào cảm ứng.
2. **Không tự mở PR, không tự merge.** Chỉ mở PR khi chủ dự án nói ("mở PR", "mở và merge"). Khi được bảo merge: chờ CI xanh đúng commit, **squash merge**, rồi reset nhánh làm việc về `main` và xem workflow _Smoke production_ + _Validate Mây_ sau merge.
3. Nhánh làm việc của phiên này: `claude/loving-feynman-1smqzs`. Sau mỗi lần merge: `git fetch origin main && git checkout -B <nhánh> origin/main && git push --force-with-lease origin <nhánh>`.
4. Mỗi commit kết thúc bằng hai dòng `Co-Authored-By: …` và `Claude-Session: …` (dòng chính xác nằm trong system-reminder của phiên); mô tả PR kết thúc bằng dòng `🤖 Generated with [Claude Code](https://claude.com/claude-code)` + URL phiên. **Không ghi tên model vào commit/PR/mã.**
5. **Không bịa**: không bịa thông số chính thức của VSTEP, không bịa thành tích, không báo "xong" khi chưa chạy kiểm thử. Nói thẳng khi một phép đo thất bại hoặc chưa làm được. Chủ dự án ghét việc bị bắt đi vòng và ghét câu nói nghe như việc còn dang dở mà không có ích cho Gùa (xem mục 8, bài học "chưa so với điểm người chấm").
6. **Bí mật:** khóa API chỉ ở biến môi trường phía máy chủ; không đưa vào trình duyệt, repo hay khung chat. Nếu chủ dự án đòi dán khóa vào chat, từ chối nhẹ nhàng và chỉ cách đặt trong _Edit environment_ của môi trường (xem mục 9).
7. File báo lỗi (`Gửi báo lỗi` trong Cài đặt) **không bao giờ** chứa bài viết, bản ghi âm hay kết quả chấm.
8. Mỗi thay đổi có kiểm thử; tài liệu và số liệu phải khớp (xem mục 4: `documents.test.ts`).
9. Chủ dự án giao việc bằng câu ngắn ("làm chuẩn chỉnh đi", "mở và merge"). Hãy làm đủ chứ đừng hỏi lại từng bước; chỉ hỏi khi quyết định thật sự thuộc về họ.

## 3. Trạng thái hiện tại

- `main` = `73a6ea7` (PR #63). Production đã chạy bản này; _Validate Mây_ và _Smoke production_ đạt.
- Nhánh `claude/loving-feynman-1smqzs` **hơn `main` một commit chưa merge: `bc5e7f2`** — sửa ba nút "Câu trước / Nghe lại / Câu sau" của bài nghe bị chồng chữ ở khung hẹp (thẻ kiểm tra của trang Phòng thi thử), thêm một ca E2E và ghi tài liệu. CI trên commit này chưa chạy vì chưa có PR. **Việc đầu tiên nếu chủ dự án đồng ý: mở PR, chờ CI, merge.**
- Số đo ở `bc5e7f2`: **404 unit (Vitest), 194 E2E** (186 ca Chromium, bốn Firefox, bốn WebKit), build 106 route, axe 19 màn, ESLint/TypeScript sạch, `npm audit --omit=dev` 0 lỗ hổng. Quét 59 route thật bằng trình duyệt: không lỗi console/mạng.
- **Tính năng AI hiện không dùng được trên trang live vì khóa Gemini đã hết hạn mức chi tiêu hằng tháng** (HTTP 429 từ Google). Chủ dự án nói **tạm bỏ qua AI** cho đến khi họ nâng hạn mức ở https://ai.studio/spend. Đừng tốn công vào AI trừ khi họ nâng hạn mức hoặc yêu cầu.

## 4. Môi trường và lệnh chạy

```
npm ci
npm run check                 # lint + typecheck + vitest + build
npx vitest run                # unit
npx tsc --noEmit && npx eslint src tests scripts
```

**E2E (Playwright) trên bản production build** — hay hỏng vì cổng và biến môi trường:

```
# build cần hai biến Supabase giả, giống CI:
NEXT_PUBLIC_SUPABASE_URL=https://may-e2e.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_placeholder npm run build
MAY_E2E_PRODUCTION=1 npx playwright test -c pw-local.config.ts [tệp] [-g "tên ca"]
```

- `pw-local.config.ts` **không nằm trong repo** (đã loại bằng `.git/info/exclude`): nó chỉ trỏ Chromium có sẵn `/opt/pw-browsers/chromium` và cờ micro giả. Nếu thiếu, tạo lại: `defineConfig({...base, reporter:[["line"]], projects:[{name:"chromium", use:{...devices["Desktop Chrome"], launchOptions:{executablePath:"/opt/pw-browsers/chromium", args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]}}}]})` với `base` lấy từ `playwright.config.ts`. **Không chạy `playwright install`.**
- Một tiến trình `next start` cũ còn giữ cổng 3100 làm Playwright hỏng. Giải phóng bằng `fuser -k 3100/tcp` (và 3101) **trước khi** build/test.
- **Đừng dùng `pkill -f "next start"`** trong lệnh có chứa chính chuỗi đó (giết cả shell, exit 144). Đừng chạy nền bằng `&`; dùng chế độ chạy nền của công cụ.
- Vitest **không có alias `@/`**: test import bằng đường dẫn tương đối (`../../src/...`).
- Hai ca E2E "máy chủ từ chối khi chưa có khóa" tự bỏ qua khi môi trường có `GEMINI_API_KEY`/`GRADER_PASSCODE`; CI không có khóa nên vẫn chạy chúng.
- Đồng hồ: ngày trong mã tính theo giờ Việt Nam (`localDay`).

**Tài liệu và số liệu phải khớp:** `tests/unit/documents.test.ts` đếm số ca unit (`it(`), E2E (dòng bắt đầu bằng `test(`) và route, rồi so với con số ghi trong `HANDOVER.md`, `STATUS.md`, `QUALITY.md` (một số dòng) và `BAO-CAO-TINH-TRANG-2026-10-07.md`. Thêm/xóa ca kiểm thì sửa các con số đó, rồi tạo lại hai báo cáo Word:
`python3 scripts/create_handover_docx.py && python3 scripts/create_progress_report_docx.py`.

**GitHub:** trong môi trường này chỉ có công cụ MCP `mcp__github__*` (tạo/đọc/merge PR) và `gh api` (đọc trạng thái, workflow). Không có `gh pr`. Khi merge, truyền `expectedHeadSha` là **mã 40 ký tự thật** (`git rev-parse HEAD`), không bịa.

CI: `.github/workflows/check.yml` (Validate Mây) và `production-smoke.yml` (Smoke production, chạy sau khi Vercel deploy).

## 5. Bản đồ mã nguồn

```
src/app/                  # trang (App Router) + 3 route chấm AI: api/grade/{writing,speaking,status}
src/components/           # giao diện; practice.tsx (bài học), exam.tsx (thi rút gọn/đề đầy đủ),
                          # paper-exam/paper-review/paper-bank (kho đề), progress.tsx, settings.tsx,
                          # grade-panel/speaking-grade-panel/grade-parts/writing-total/grade-trend (chấm AI)
src/lib/learning.ts       # schema trạng thái học, kế hoạch ngày, chấm câu hỏi, advanceExam
src/lib/papers.ts         # kho đề nhập (public/papers/*.json)
src/lib/grades.ts         # lần chấm AI lưu trong state.grades (schema, giới hạn, dọn)
src/lib/grading/          # toàn bộ logic chấm (mục 6)
src/lib/rubric/vstep-3-5.ts # thang chấm (dựng theo CEFR công khai, official:false)
src/lib/recordings.ts     # bản ghi âm trong IndexedDB
scripts/grading-eval/     # bộ đo độ chính xác (mục 6.4), chạy bằng npx tsx
tests/unit, tests/e2e     # Vitest và Playwright
docs/                     # tài liệu (mục 11)
supabase/                 # migration/RLS (đồng bộ thủ công, tùy chọn)
```

Quy ước trạng thái: `StudyState` do Zod (`looseObject`) đọc/ghi và **giữ trường lạ** để tab chạy bản cũ không xóa dữ liệu mới. `STATE_REV` đang là 2; đừng nâng nếu không thật cần (nâng làm hỏng ca phục hồi). Có cơ chế phục hồi khi tab bản cũ làm rơi trường (`recovery*.ts`).

## 6. Hệ thống chấm AI (đã làm xong phần mã; đang chờ hạn mức)

### 6.1 Nguyên lý

- Chỉ chấm khi người học **bấm nút** và đã đồng ý (cờ `may.ai.consent`, mã `may.ai.passcode` trong localStorage, không vào sao lưu). Bài viết/bản ghi đi: trình duyệt → máy chủ Mây (`/api/grade/*`) → Google Gemini (`generateContent`, gói trả phí, không dùng Interactions API vì nó giữ nội dung).
- Máy chủ chỉ bật khi có **`GEMINI_API_KEY` và `GRADER_PASSCODE`** (biến môi trường phía máy chủ, Vercel). Bảo vệ: so mã bằng `timingSafeEqual` trên SHA-256, khóa sau 10 lần sai/15 phút, tối đa 2 lần chấm đồng thời và 20 lần/giờ mỗi instance, giới hạn kích thước (48 KB Viết; 4,2 MB âm thanh, ≤3 phần, ≤900 giây mỗi phần), `maxDuration = 300`.
- Phản hồi dạng **NDJSON** khi trình duyệt xin (`progress`, `ping` mỗi 10 giây, rồi `grade` hoặc `error` kèm "chi tiết kỹ thuật" an toàn); không thì một JSON thường.
- Mỗi lần chấm: **median của 3 lần độc lập** (thêm 2 lần nếu lệch >1 điểm); câu trích của model phải có trong bài (`verify.ts`); số đo tính bằng mã (số từ, chép đề, trôi chảy từ thời điểm từng từ…). Thang 0–10; làm tròn 0,5 (Thông tư 23/2017). Điểm bài Viết = trung bình 4 tiêu chí; **điểm Viết = (Bài 1 + 2 × Bài 2) / 3**, làm tròn 0,5, tính trong mã; điểm Nói = trung bình 5 tiêu chí (giả định, chưa có văn bản chính thức). **Chưa có điểm tổng bốn kỹ năng** vì chưa tìm được bảng quy đổi Nghe/Đọc chính thức — **đừng tự bịa phép chia tuyến tính**.
- Hằng quan trọng: `GRADER_MODEL = "gemini-3.8-flash"`, `PROMPT_VERSION = "p1"`, `RUBRIC_VERSION = "cefr-fallback-1"` (`config.ts`); `SHOW_UNVALIDATED_SCORES = true` và các cổng `GATES` (`gates.ts`); `ESSAY_TEMPLATES_APPROVED = true` (`requirements.ts`, mẫu ý bắt buộc cho Task 2, thu hồi được); `APPROVED_REQUIREMENTS` (danh sách ý riêng của 5 bài học Viết và Task 2 của Review 13/09, do agent tách từ câu lệnh đề — chủ dự án nên đọc lại).

### 6.2 Cách hiển thị điểm (đã chốt với chủ dự án)

- Không có người chấm nào để so và sẽ không có. Vì vậy **đừng viết "chưa so với điểm người chấm"** hay "chưa đối chiếu giám khảo". Ghi chú đúng: điểm do AI chấm theo mô tả mức điểm công khai của VSTEP, **chỉ là ước lượng, có thể lệch so với điểm thi thật**, dùng để theo dõi tiến bộ. Điểm hiện ngay cả khi cổng `GATES` đóng; đặt `SHOW_UNVALIDATED_SCORES=false` để ẩn lại.
- Dòng "Thang chấm: dựng theo mô tả CEFR công khai, chưa đối chiếu văn bản chính thức của VSTEP" giữ nguyên (nói về văn bản thang chấm, không phải người chấm).

### 6.3 Nơi chấm AI có mặt

Kho đề (màn chữa đề: từng bài Viết, điểm Viết tổng, cả bài Nói), kết quả bài học Viết và Nói, màn kết thúc `/exam` (Viết + Nói), trang tiến bộ (biểu đồ điểm), Cài đặt (thẻ "Chấm bài bằng AI"). Mã lần chấm lưu trong `state.grades` theo `paper:<runId>:<slotId>` hoặc `attempt:<attemptId>` (attemptId của buổi thi có dạng `exam:<id>:<bài>` — `gradeTarget` đã xử lý dấu hai chấm). Giới hạn: 40 lần chấm, 0,5 MB, cũ nhất bị bỏ trước.

### 6.4 Kết quả đo thật đầu tiên (09/10/2026, `gemini-3.8-flash`, phần tune)

Chạy `bash scripts/grading-eval/first-run.sh` (cần khóa; **tốn khoảng 13 USD** — hoặc 6–7 USD nếu giá thật bằng nửa; 768 lệnh gọi, ~57 phút). Chi tiết ở `docs/QUALITY.md` mục "lần đo thật đầu tiên".

- Thứ tự điểm trên ELLIPSE (40 bài): Pearson 0,57–0,62; **QWK 0,31–0,42, không qua ngưỡng 0,45**; AI chấm thấp hơn người chấm của ELLIPSE khoảng 0,4–0,6 điểm trên thang 1–5 (ELLIPSE là bài học sinh Mỹ lớp 8–12, thang riêng, nên không phải VSTEP). Tỉ lệ câu trích sai 0,2% (đạt).
- Độ ổn định (8 bài × 3 lần): lệch tối đa 0,5 điểm (đạt, nhưng mẫu nhỏ).
- Phản ứng khi sửa bài: cắt ngắn → điểm giảm mạnh; xáo câu → tổ chức giảm; **thêm lỗi ngữ pháp → điểm Ngữ pháp chỉ giảm 0,125 (phản ứng yếu: danh sách lỗi đáng tin hơn con số)**; chèn lời dặn cho người chấm: chưa kết luận.
- Gemini đọc được `audio/webm;codecs=opus` và `audio/mp4` (do Chromium ghi) và chép đúng. **Chưa thử AAC thật do Safari ghi** — xem mục 7.
- Kết luận: cổng điểm giữ đóng; điểm vẫn hiện kèm ghi chú. Chưa chạy `gemini-3.1-pro-preview` (đắt hơn, không khuyên chạy ngay).

## 7. Việc đang dở và gợi ý thứ tự

**P0 — làm ngay nếu chủ dự án đồng ý**

1. Mở PR cho `bc5e7f2`, chờ CI xanh, squash-merge, reset nhánh, kiểm _Smoke production_. (Cần chủ dự án nói "mở và merge".)

**P1 — chờ chủ dự án nâng hạn mức Gemini (https://ai.studio/spend)**

2. Thử AAC của Safari: `GEMINI_API_KEY=… npx tsx scripts/grading-eval/audio-probe.ts <file>`. Lệnh ffmpeg dựng MP4 AAC phân mảnh giống Safari nằm ở đầu `audio-probe.ts`; file Safari thật vẫn tốt hơn. Trong phiên này ffmpeg lấy từ `pip install imageio-ffmpeg` (xóa file `.whl` tải kèm, đừng commit).
3. Nếu cần chạy lại bộ đo (model đổi/ngừng): `scripts/grading-eval/first-run.sh`; không đọc phần `holdout` trừ khi lấy con số cuối.

**P2 — không cần AI, đáng làm**

4. **Nghiệm thu thiết bị thật của Gùa** (micro, giọng đọc, Safari/iOS, màn hình tắt, bộ gõ Unikey/EVKey/macOS): `docs/UAT-DIEN-THOAI.md` có 20 mục chưa ai chạy.
5. **Đăng nhập + đồng bộ cloud bằng tài khoản thật trên URL production** và thử hai thiết bị (`docs/PRODUCTION-ROADMAP.md`, `RELEASE-RUNBOOK.md`).
6. Rà UX/UI tiếp theo kiểu đã làm: chụp màn hình ở 1280×720, xem từng ảnh, sửa, thêm ca E2E đo được. Đợt gần nhất (đợt bốn) chỉ thấy một lỗi (nút bài nghe chồng chữ ở khung hẹp). Màn chưa xem kỹ trong đợt bốn: Kho đề, Sổ ghi chú, Hướng dẫn, trang bài học Viết/Nói đang làm dở.
7. Monitoring lỗi production (hiện chỉ có file báo lỗi do người dùng gửi), cập nhật dependency định kỳ, nội dung C1, ngân hàng đề độc lập, audio người thật cho các đề tự soạn.

**Chưa làm và có lý do (đừng làm khi chưa có chỉ định)**

- Điểm tổng bốn kỹ năng (thiếu bảng quy đổi Nghe/Đọc chính thức).
- Chấm Nói ở buổi thi: chỉ gửi những phần có **bản ghi** trên máy; phần chỉ đánh dấu "đã nói thành tiếng" thì không.
- Mở cổng điểm cho từng tiêu chí (`gates.ts`): chưa có tiêu chí nào qua ngưỡng đo.

## 8. Bài học và cái bẫy đã gặp (đỡ mất thời gian)

- **Lời nhắn "chưa so với điểm người chấm"** từng được viết vào giao diện rồi bị chủ dự án phản đối: nó vô nghĩa khi app chấm hoàn toàn bằng AI. Khi viết chữ giao diện, tự hỏi nó có _ích cho Gùa_ không.
- Ba đoạn ghi chú nói cùng một ý ở đầu kết quả chấm làm trang rối; nay: điểm to trước, một dòng ước lượng, một hộp ghi chú ngắn, rồi dòng thang chấm.
- Nộp bài học Nói **chuyển bản ghi sang khóa theo mã lượt làm** (`attempt.id`) rồi xóa bản nháp dưới `lesson.id`; mã chấm Nói của bài học phải đọc bản ghi từ `attemptId`.
- Mã lượt làm của buổi thi có dấu hai chấm; trước đây `gradeTarget` không nhận nên lần chấm không bao giờ bị dọn (đã sửa, có test).
- Ngày dạng `8/10/2026` khớp nhầm mẫu điểm `n/10` trong test regex; dùng `/\d\/10(?![\d/])/`.
- Ca E2E "finishing a Speaking lesson while still recording…" từng đỏ lúc có lúc không vì một cuộc đua thời gian trong chính ca kiểm (cú nhấp "Hoàn thành" đến sau khi bản ghi đã lưu): đã sửa cho chấp nhận cả hai thứ tự.
- Kiểm thử màu biểu đồ bằng `validate_palette.js` của kỹ năng dataviz: hồng `#c24178` + xanh `#2a7fb5` đạt (khác biệt cho người mù màu 11,7). `#2b7a9b` không đạt (độ chói màu thấp).
- Khi trạng thái localStorage của test dựng sai schema, cả trang báo "Không đọc được dữ liệu thiết bị"; dùng đủ trường của `storedGradeSchema` khi seed lần chấm.
- Nguyên nhân gốc của lỗi "Không kết nối được" lần thử thật đầu tiên **chưa xác định** (không có nhật ký Vercel); nay mọi lỗi kèm dòng "Chi tiết kỹ thuật" để biết thêm.

## 9. Việc chỉ chủ dự án làm được

| Việc                                                                              | Ghi chú                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nâng hạn mức chi tiêu Gemini                                                      | https://ai.studio/spend. Nên dùng một khóa riêng cho việc đo, hạn mức vừa đủ.                                                                                                                                                                                                          |
| Đặt khóa cho môi trường làm việc của agent                                        | Menu môi trường (thanh tiêu đề phiên) → **Edit** → ô _Environment variables_: dòng `GEMINI_API_KEY=…` (hộp thoại không có mục "Network secrets"). Chỉ phiên **mở sau khi lưu** mới có khóa. Mạng: chọn mức _Custom_ và thêm `generativelanguage.googleapis.com` vào _Allowed domains_. |
| Khóa và `GRADER_PASSCODE` trên Vercel                                             | Đã đặt cho trang live (khóa Vercel và khóa của môi trường làm việc là hai thứ tách nhau). Mã nên dài hơn 6 ký tự.                                                                                                                                                                      |
| Nghiệm thu thiết bị thật, đăng nhập thật                                          | Mục 7, P2.                                                                                                                                                                                                                                                                             |
| Duyệt `APPROVED_REQUIREMENTS` và mẫu essay                                        | Mục 6.1.                                                                                                                                                                                                                                                                               |
| Chặn build production khi CI chưa xanh                                            | Cần `MAY_CI_TOKEN` trên Vercel (xem `RELEASE-RUNBOOK.md`); chủ dự án đã chọn **không bật** cổng này.                                                                                                                                                                                   |
| Tên miền VSTEP chính thức, giấy phép Cambridge (Write & Improve, Speak & Improve) | Chỉ cần nếu muốn đo đối chiếu thang chính thức; hiện bị chặn: `vstep.vnu.edu.vn`, `js.vnu.edu.vn`, `huggingface.co`, `cambridgeenglish.org`.                                                                                                                                           |

## 10. Trước khi nói "xong"

1. `npx tsc --noEmit && npx eslint src tests scripts` sạch.
2. `npx vitest run` đạt (gồm `documents.test.ts`: số liệu tài liệu khớp).
3. Build bằng hai biến Supabase giả rồi chạy các ca E2E liên quan; thay đổi lớn thì chạy cả bộ (~8 phút) — **xem lại các ca đỏ** thay vì cho qua.
4. Với thay đổi giao diện: chụp ảnh, **xem ảnh**, và có ca E2E đo được điều đã sửa (xác nhận ca đó đỏ trên bản cũ).
5. Cập nhật `docs/QUALITY.md` (mục mới nhất ở trên cùng), `docs/STATUS.md`/`HANDOVER.md` nếu số liệu đổi, tạo lại hai báo cáo Word, commit, push.
6. Báo cáo cho chủ dự án bằng tiếng Việt, ngắn: đã sửa gì, kiểm gì, **chưa làm được gì và vì sao**. Không mở PR/merge khi chưa được bảo.

## 11. Các tài liệu khác

| File                                                                                | Dùng để                                                                                 |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `docs/HANDOVER.md` (+ `Bao-cao-ban-giao-May-VSTEP.docx`)                            | Bàn giao tổng thể (sản phẩm, kiến trúc, Supabase, lộ trình).                            |
| `docs/STATUS.md`, `docs/BAO-CAO-TINH-TRANG-2026-10-07.md`                           | Trạng thái và số liệu kiểm thử.                                                         |
| `docs/QUALITY.md`                                                                   | Nhật ký rà soát chất lượng, mới nhất ở trên cùng: mọi lỗi đã sửa, bằng chứng, giới hạn. |
| `docs/PLAN-CHAM-AI.md`                                                              | Kế hoạch và quyết định chi tiết của chấm AI (thang, mô hình, quy trình, đợt 0–4).       |
| `docs/PLAN-GHI-CHU.md`                                                              | Kế hoạch ghi chú/nháp/tô (đã làm xong).                                                 |
| `docs/PRODUCTION-ROADMAP.md`, `RELEASE-RUNBOOK.md`, `UAT-DIEN-THOAI.md`             | Phát hành, phục hồi, nghiệm thu thiết bị.                                               |
| `docs/PRODUCT.md`, `PLAN-TIEP-THEO.md`, `AUDIT-2026-09-13.md`, `REVIEW-RESPONSE.md` | Bối cảnh sản phẩm và các lần rà soát cũ.                                                |
