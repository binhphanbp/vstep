# Runbook phát hành và phục hồi Mây VSTEP

## Cổng phát hành

1. Xuất một bản JSON từ thiết bị Gùa trước thay đổi schema hoặc migration.
2. Tạo backup Supabase trước migration. Chạy migration mới trên staging/PGlite và đọc phần rollback trước khi chạy production.
3. Chạy `npm ci`, `npm audit --omit=dev`, `npm run check` và `npm run test:production`.
4. Push đúng commit lên `main`. GitHub Actions phải đạt. Vercel chỉ được xem là triển khai xong khi status của cùng SHA đạt.
5. Workflow `Smoke production` tự chạy sau deployment Production. Có thể chạy thủ công với URL preview/production; nó kiểm tra Settings, một bài Reading, một bài Listening, mobile overflow, lỗi runtime, security headers và HTTP 404.
6. Với thay đổi dữ liệu/Auth, chạy UAT cloud và backup theo `PRODUCTION-ROADMAP.md`. Không dùng dữ liệu duy nhất của người học làm dữ liệu thử nếu chưa xuất backup.

## Khi release có lỗi

1. Ghi SHA, URL, thời điểm, route và thao tác gây lỗi. Không chép token, mật khẩu, nội dung bài viết hoặc bản ghi âm vào issue/log.
2. Nếu chỉ lỗi UI/code, chọn deployment tốt gần nhất trong Vercel và promote lại. Xác nhận SHA, rồi chạy `Smoke production` thủ công trên URL vừa promote.
3. Không tự động rollback database. Migration mới phải tương thích ít nhất với bản code ngay trước nó. Chỉ chạy file trong `supabase/rollback/` sau khi đã backup DB, đọc tác động và xác nhận bản code cũ thật sự cần schema cũ.
4. Nếu sync có trạng thái chưa rõ, không bấm lưu lặp lại. Xuất bản local, tải cloud về để đối chiếu revision, rồi chọn bản cần giữ. Audio luôn sao lưu riêng.
5. Nếu lỗi có nguy cơ mất dữ liệu, tạm dừng sync và dùng local-first. Giữ nguyên file backup cùng snapshot cloud cho đến khi xác định được bản đúng.

## Kiểm tra sau phục hồi

- Settings, Reading và Listening trả HTTP 200; route giả trả 404; CSP/header còn đủ.
- Mở lại bài dở và đề có giờ không mất đáp án/deadline.
- Import bản sao trên profile thử; số lượt học, tên, nháp và lịch ôn khớp.
- Với migration cloud, kiểm tra anonymous/direct DML bị từ chối, RPC đúng revision lưu được và revision cũ conflict.
- Ghi kết quả, SHA đang chạy và người kiểm tra vào tài liệu release/UAT.

Kênh báo lỗi tối thiểu cho ứng dụng một người là gửi mô tả thao tác, thời điểm và ảnh đã che dữ liệu cho chủ website. Chưa cài dịch vụ theo dõi bên thứ ba; chỉ bổ sung khi chủ website chọn dịch vụ và chính sách dữ liệu.
