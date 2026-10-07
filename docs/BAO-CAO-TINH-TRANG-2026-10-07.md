# Báo cáo tình trạng Mây VSTEP ngày 07/10/2026

Báo cáo này ghi trạng thái bản sáu đề tại thời điểm chuẩn bị phát hành. Nó giúp chủ dự án đối chiếu nội dung, kiểm thử và những việc cần xác nhận sau khi bản mới lên HTTPS. Các release trước được lưu trong `HANDOVER.md` và `QUALITY.md`.

## 1. Kết luận

Bộ dữ liệu trên máy có **sáu đề thi thử**, không phải năm đề tổng cộng. Năm đề **132, 133, 134, 135 và Review 13/09** có đủ 75 khóa đáp án Nghe/Đọc mỗi đề. Đề **131** có nội dung bốn kỹ năng nhưng thiếu toàn bộ khóa đáp án và transcript nên chỉ dùng để luyện, không chấm Nghe/Đọc. Không quy đổi số câu đúng thành bậc B1/B2/C1.

Bản tích hợp đã qua kiểm tra local và sẵn sàng đưa qua CI. Bằng chứng production cần đối chiếu đúng SHA trên `vstep-turtle.vercel.app` sau khi merge; kiểm thử local không chứng minh bản HTTPS đã cập nhật.

## 2. Phạm vi đã tích hợp

| Hạng mục | Hiện trạng |
| --- | --- |
| Kho đề | `/papers`, sáu thẻ; route riêng cho từng đề, gồm `/papers/review-1309` |
| Cấu trúc | Mỗi đề 35 câu Nghe, 40 câu Đọc, hai bài Viết, ba phần Nói; tổng 172 phút |
| Chấm Nghe và Đọc | Năm đề có 375 khóa đáp án và lời giải; 131 không chấm |
| Âm thanh | 126 MP3 tại `public/papers/audio`: 84 bài Nghe và 42 bài mẫu |
| Đối chiếu | Hiện lời giải, transcript và bản dịch có trong nguồn sau khi hoàn thành |
| Tiến độ | Lưu đáp án, bài Viết, phần Nói đã làm, deadline và mã phiên bản vào JSON backup và Supabase snapshot |
| Ghi âm | Blob micro vẫn nằm trong IndexedDB; cần tải riêng khi chuyển thiết bị |
| Dữ liệu tĩnh | Sáu JSON đề và manifest; toàn bộ thư mục `public/papers` khoảng 79 MB |

Nguồn trên máy nằm ở `../vstep/data`. Script `scripts/import-papers.mjs` kiểm tra cấu trúc, đáp án và audio trước khi tạo bản nhập. File `de-thi-thu-vstep-135_attempt.json` là lượt làm đã lưu, không phải đề thứ bảy. Nguồn ghi Hapio Class; học liệu chưa được giáo viên của Mây thẩm định.

## 3. Bằng chứng kiểm tra trước phát hành

| Phép kiểm tra | Kết quả local |
| --- | --- |
| ESLint và TypeScript | Đạt |
| Vitest | 190/190 |
| Playwright trên production build | 71 ca: 67 Chromium, hai Firefox, hai WebKit; mọi ca đã đạt qua các lượt chạy |
| Accessibility tự động | Axe WCAG A/AA trên 19 màn, có kho đề và Review 13/09 |
| Build tĩnh | 112 trang, gồm sáu route đề nhập |
| Dependency production | `npm audit --omit=dev` báo 0 lỗ hổng |

Trong lượt đầy đủ gần nhất, 70/71 ca đạt. Ca offline còn lại chờ tiêu đề kho đề cũ sau khi đổi microcopy; cập nhật kỳ vọng và chạy lại riêng trên bản production đạt. Kịch bản mới kiểm tra Review là đề riêng có điểm, 131 không có điểm, lưu bài qua tải lại, file backup chứa lượt làm, và tab cũ không nộp chồng phần tiếp theo. CI trên GitHub phải chạy lại toàn bộ 71 ca từ checkout sạch.

## 4. Quy trình phát hành

1. Đẩy thay đổi lên nhánh và mở pull request; chờ workflow **Validate Mây** đạt cho đúng commit.
2. Merge vào `main` khi CI xanh. Vercel tự triển khai từ `main` theo cấu hình Git hiện có.
3. Xác nhận thẻ `may-release` trên HTTPS khớp SHA merge, mở `/papers` và `/papers/review-1309`, tải manifest/JSON/audio, kiểm tra security headers và 404.
4. Đọc kết quả workflow **Smoke production** của đúng deployment. Nếu sai SHA hoặc thiếu dữ liệu, dừng bàn giao bản mới và dùng runbook để quay lại bản tốt.

Script `scripts/smoke-https.mjs` đã được mở rộng để kiểm tra kho sáu đề, file Review và một MP3. Repository hiện có script cổng chờ CI cho Vercel nhưng chủ website đã chọn **không bật**; vì vậy quy trình phát hành dựa trên CI xanh của pull request trước merge.

## 5. Giới hạn và việc còn cần người xác nhận

- Đề 131 thiếu đáp án và transcript; không tự tạo điểm hoặc lời giải.
- Viết và Nói lưu bài, có mẫu đối chiếu, chưa chấm tự động. Số câu đúng của năm đề chưa được hiệu chuẩn để suy ra bậc VSTEP.
- Bản ghi micro không đi vào JSON hoặc Supabase snapshot; audio đề nhập không được tải sẵn để dùng offline.
- Chưa nghiệm thu đăng nhập và đồng bộ trên HTTPS bằng hai thiết bị thật, micro/tai nghe và Safari hoặc Android thật.
- Nguồn nội dung từ Hapio Class do chủ dự án cung cấp; quyền sử dụng và công bố học liệu cần được chủ dự án xác nhận.

Để tiếp tục, xem `README.md` để chạy ứng dụng, `QUALITY.md` để tra ca kiểm thử, `HANDOVER.md` cho kiến trúc và `RELEASE-RUNBOOK.md` cho quy trình khôi phục.
