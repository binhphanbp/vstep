# Mốc tiếp tục công việc — 12/09/2026

Code đã được lưu trong workspace sau các lần gián đoạn. Không dựng lại từ create-next-app.

Rà soát và kế hoạch thực thi: [PRODUCTION-ROADMAP.md](PRODUCTION-ROADMAP.md). Release `f43fc23` đã sửa lịch sử, Sổ lỗi và đề đang làm để dùng snapshot học liệu có version; CI `34687798626` đạt 53 unit và 40 E2E. Migration mới thu hồi direct DML và buộc ghi qua RPC revision đã đạt PGlite; preflight Supabase thật xác nhận snapshot hiện có tương thích, còn chờ chạy migration production. Auth request có timeout; lỗi lưu cloud revision tự xuất backup. Workflow smoke dùng tên miền production công khai thay cho URL deployment được Vercel bảo vệ. UAT thiết bị thật vẫn còn mở.

## Đã hoàn thành trong môi trường local

- Mây: giao diện responsive, dashboard cá nhân hóa, 14 bài luyện, hành trình, từ vựng, sổ lỗi, lịch sử, cẩm nang và cài đặt.
- Hai chế độ luyện có giờ: 51 phút và 172 phút đủ cấu trúc. Đề đầy đủ có 35 câu Nghe, 40 câu Đọc, hai bài Viết lưu riêng, ba phần Nói ghi âm riêng.
- Bảo toàn nháp/đáp án khi tải lại; deadline tuyệt đối; chuyển phần tự động; không nhân đôi lượt nộp; lưu bản ghi khi chuyển phần trong ứng dụng.
- SQL Supabase Auth/RLS, RPC snapshot có revision, nhập/xuất JSON, giữ dữ liệu hỏng để phục hồi.
- Sau đợt rà soát Reading/Listening, lịch sử học liệu và đồng bộ: 53 kiểm thử Vitest và 40 kiểm thử Playwright trên `next start` đều đạt; suite đầy đủ chạy Chromium, toàn bộ tám bài Reading/Listening cùng luồng trọng yếu và tải backup chạy thêm Firefox/WebKit. Mười ca cloud giả lập bao phủ tải lên chậm, xung đột revision, bản sao hỏng, phục hồi kèm backup mới nhất, đăng xuất khi server lỗi, hủy khi rời trang hoặc đổi phiên, timeout login và lỗi lưu revision. ESLint, TypeScript, production build 45 route, dependency audit và axe trên 13 màn đều đạt. Chưa nghiệm thu thiết bị iOS hoặc Android thật. Chi tiết lỗi đã sửa và bằng chứng mới nhất nằm trong QUALITY.md; báo cáo Word đã được đồng bộ với release này.
- Đã sửa nháp bị ghi đè giữa hai tab, form hồ sơ đang nhập bị reset bởi cập nhật không liên quan, ghi đè dữ liệu hỏng phát sinh giữa phiên, timestamp phục hồi bản sao và nộp nhầm phần thi từ tab cũ. Thêm kiểm tra file sao lưu có điểm bất khả thi/mã lượt học trùng.
- Đã xem ảnh giao diện desktop/mobile thực tế. Ảnh QA trong `.qa/` không đưa vào Git.
- Daily Mission đã dùng lỗi đến hạn, lỗi tự tin cao, độ chính xác, recency, ngày thi, mood, focus và diversity guard; từng bài hiển thị lý do được chọn. Bài luyện khách quan lưu “Đoán/Chưa chắc/Rất chắc”; Sổ lỗi ưu tiên misconception sai nhưng rất chắc.
- Kết quả Reading/Listening ngắn hiển thị độ vững theo confidence và kết quả theo dạng câu. Đề có giờ cảnh báo số câu bỏ trống trước khi nộp; transcript Listening chỉ mở ở màn đối chiếu sau khi hoàn thành.
- Đã thêm web app manifest và metadata màn hình chính; CSP production không cần `unsafe-eval` và đã kiểm thử bằng listener vi phạm bảo mật. Tối ưu prefetch cùng schema client làm payload ban đầu giảm khoảng 140 KiB và JavaScript giảm khoảng 136 KiB trong phép đo Lighthouse local.

## Cần tài khoản/môi trường thật hoặc thẩm định chuyên môn

- Supabase thật đã kết nối: `.env.local` khớp dự án `vstep`, Auth API trả HTTP 200. Đã chạy migration 001 qua SQL Editor trong một transaction; xác nhận thành công. Hai bảng `allowed_learners` và `study_snapshots` bật RLS, lần lượt có 1 và 3 policy. Truy cập REST chưa đăng nhập trả 401/42501. Đã tắt đăng ký công khai, kiểm tra Auth API `disable_signup=true`. Không ghi giá trị key vào báo cáo.
- Đã tạo một tài khoản người học trong `auth.users`, email đã được xác nhận. UID đã được thêm vào `allowed_learners`; truy vấn xác nhận `access_enabled=true` và `email_confirmed=true`. Đã kiểm thử trên database thật dưới role `authenticated`: tạo snapshot revision 1, cập nhật revision 2, đọc lại và từ chối revision 0 cũ; kết quả PASS, toàn bộ dữ liệu QA nằm trong transaction đã rollback.
- Đăng nhập thật từ giao diện local đã thành công. Luồng “Lưu lên đám mây” tạo đúng một snapshot revision 1 với payload version 1; truy vấn trực tiếp trong Supabase xác nhận dữ liệu và thời điểm cập nhật. Luồng “Tải về thiết bị” đã tải chính snapshot đó, tạo bản sao cục bộ trước khi thay thế và giao diện báo đồng bộ thành công. Chưa thử trên thiết bị hoặc trình duyệt thứ hai. Connector SQL cũ vẫn lỗi DNS; dùng dashboard đã đăng nhập, không lấy session token ra ngoài trình duyệt.
- Đã có bản HTTPS pilot tại `https://vstep-turtle.vercel.app`: ngày 12/09/2026, 23 route gồm 9 màn chính và toàn bộ 14 bài luyện tải đúng trên Chromium, Firefox và WebKit ở viewport mobile; route giả trả 404 và security headers đúng. Luồng Listening phát/dừng, chấm điểm, phân tích và mở transcript sau khi nộp không có lỗi runtime. Supabase production đã được cấu hình; chưa đăng nhập/sync bằng tài khoản thật trên host, chưa thử micro hoặc thiết bị iOS/Android thật.
- Nội dung tự biên soạn, chưa được giáo viên thẩm định/hiệu chuẩn. Bài Nghe dùng giọng tổng hợp, cho phép phát lại. Chưa có chấm Viết/Nói bằng AI hoặc giáo viên.
- Micro thật, giọng đọc của điện thoại người học và quy trình sao lưu vận hành cần thử trên thiết bị thực tế. JSON/đám mây không chứa audio; bản ghi tải riêng.
- Hồ sơ cá nhân cấu hình được và đã cá nhân hóa tên thân mật “Gùa/Rùa”. Mục tiêu, ngày thi và sở thích thực vẫn do người học tự chọn; hệ thống không tự đặt thay họ.

Các giới hạn này được ghi trong giao diện, README và PRODUCT.md; không mô tả chúng như tính năng đã hoàn tất. Mã nguồn được quản lý trên nhánh `main` và kiểm tra tự động bằng GitHub Actions.
