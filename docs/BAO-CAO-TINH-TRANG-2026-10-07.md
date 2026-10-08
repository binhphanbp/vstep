# Báo cáo tình trạng Mây VSTEP ngày 07/10/2026

Báo cáo này ghi trạng thái bản sáu đề sau khi phát hành lên HTTPS ngày 07/10/2026; sau đó đề 131 được gỡ khỏi kho nên các con số ở đây là của bản năm đề hiện tại. Nó giúp chủ dự án đối chiếu nội dung, bằng chứng triển khai và những việc còn cần xác nhận. Các release trước được lưu trong `HANDOVER.md` và `QUALITY.md`.

## 1. Kết luận

Kho hiện có **năm đề thi thử**: **132, 133, 134, 135 và Review 13/09**, mỗi đề có đủ 75 khóa đáp án Nghe/Đọc. Đề **131** (thiếu toàn bộ khóa đáp án và transcript, nên chỉ luyện được, không chấm) đã được gỡ theo quyết định của chủ dự án ngày 07/10/2026 cho đỡ rối. Không quy đổi số câu đúng thành bậc B1/B2/C1.

Bản tích hợp đã qua kiểm tra local, CI và smoke production. PR [#38](https://github.com/binhphanbp/vstep/pull/38) được merge thành commit ứng dụng `ff8faef61864460ee6cd6bce9889c6291c96c085`. Vercel Production phục vụ đúng SHA đó trên [website của Gùa](https://vstep-turtle.vercel.app); cả smoke trực tiếp và workflow tự động đều đạt. Một commit chỉ sửa tài liệu sau mốc này không thay đổi mã ứng dụng hay dữ liệu đề.

## 2. Phạm vi đã tích hợp

| Hạng mục | Hiện trạng |
| --- | --- |
| Kho đề | `/papers`, sáu thẻ; route riêng cho từng đề, gồm `/papers/review-1309` |
| Cấu trúc | Mỗi đề 35 câu Nghe, 40 câu Đọc, hai bài Viết, ba phần Nói; tổng 172 phút |
| Chấm Nghe và Đọc | Năm đề có 375 khóa đáp án và lời giải; không còn đề nào không chấm |
| Âm thanh | 105 MP3 tại `public/papers/audio`: 70 bài Nghe và 35 bài mẫu |
| Đối chiếu | Hiện lời giải, transcript và bản dịch có trong nguồn sau khi hoàn thành |
| Tiến độ | Lưu đáp án, bài Viết, phần Nói đã làm, deadline và mã phiên bản vào JSON backup và Supabase snapshot |
| Ghi âm | Blob micro vẫn nằm trong IndexedDB; cần tải riêng khi chuyển thiết bị |
| Dữ liệu tĩnh | Năm JSON đề và manifest; toàn bộ thư mục `public/papers` khoảng 67 MB |

Nguồn trên máy nằm ở `../vstep/data`. Script `scripts/import-papers.mjs` kiểm tra cấu trúc, đáp án và audio trước khi tạo bản nhập. File `de-thi-thu-vstep-135_attempt.json` là lượt làm đã lưu, không phải đề thứ sáu. Đây là bộ đề của chủ dự án, dùng cho học cá nhân; học liệu chưa được giáo viên của Mây thẩm định.

## 3. Bằng chứng kiểm tra và triển khai

| Phép kiểm tra | Kết quả local |
| --- | --- |
| ESLint và TypeScript | Đạt |
| Vitest | 222/222 |
| Playwright trên production build | 110 ca: 102 Chromium, bốn Firefox, bốn WebKit; lượt Chromium đầy đủ mới nhất đạt 102/102 |
| Accessibility tự động | Axe WCAG A/AA trên 19 màn, có kho đề và Review 13/09 |
| Build tĩnh | 112 trang, gồm năm route đề nhập |
| Dependency production | `npm audit --omit=dev` báo 0 lỗ hổng |

Sau khi thêm phòng thi mô phỏng và công cụ luyện đề, lượt Chromium đầy đủ đạt 102/102 trên bản production local; Firefox và WebKit chưa chạy lại cho thay đổi này. Hai workflow [Validate Mây của nhánh](https://github.com/binhphanbp/vstep/actions/runs/37600019911) và [của PR](https://github.com/binhphanbp/vstep/actions/runs/37600046882) đều đạt trên checkout sạch. Kịch bản kiểm tra Review là đề riêng có điểm, 131 không có điểm, lưu bài qua tải lại, backup chứa lượt làm, và tab cũ không nộp chồng phần tiếp theo.

## 4. Kết quả phát hành

1. PR #38 đã merge vào `main` sau khi CI xanh. Vercel tạo deployment Production cho SHA `ff8faef`.
2. Thẻ `may-release` trên HTTPS khớp đủ SHA merge. Smoke mở `/papers`, `/papers/review-1309`, tải manifest, Review JSON và MP3, kiểm tra security headers, chiều rộng 390 px, lỗi runtime và 404; tất cả đạt.
3. [Workflow Smoke production](https://github.com/binhphanbp/vstep/actions/runs/37600634404) của đúng deployment đạt. Kết quả trực tiếp trên URL production cũng là `Production smoke passed`.

Script `scripts/smoke-https.mjs` kiểm tra kho năm đề, file Review và một MP3. Chủ website đã chọn **không bật** cổng chờ CI trên Vercel; quy trình dựa trên CI xanh của pull request trước merge và smoke sau deploy.

## 5. Giới hạn và việc còn cần người xác nhận

- Đề 131 đã được gỡ khỏi kho. Nếu thiết bị từng lưu lượt làm đề này thì dữ liệu đó vẫn nằm trong bản sao nhưng không còn hiện trong ứng dụng; không tự tạo điểm hoặc lời giải cho đề thiếu khóa đáp án.
- Viết và Nói lưu bài, có mẫu đối chiếu, chưa chấm tự động. Số câu đúng của năm đề chưa được hiệu chuẩn để suy ra bậc VSTEP.
- Bản ghi micro không đi vào JSON hoặc Supabase snapshot; audio đề nhập không được tải sẵn để dùng offline.
- Chưa nghiệm thu đăng nhập và đồng bộ trên HTTPS bằng hai thiết bị thật, micro/tai nghe và Safari hoặc Android thật.
- Năm đề nhập là bộ đề của chủ dự án. Chủ dự án xác nhận ngày 07/10/2026 rằng chỉ dùng để học cá nhân, không chia sẻ hay kinh doanh. Địa chỉ trang hiện công khai với ai biết link; nếu muốn chỉ riêng Gùa vào được thì cần bật bảo vệ truy cập trên Vercel.

Để tiếp tục, xem `README.md` để chạy ứng dụng, `QUALITY.md` để tra ca kiểm thử, `HANDOVER.md` cho kiến trúc và `RELEASE-RUNBOOK.md` cho quy trình khôi phục.
