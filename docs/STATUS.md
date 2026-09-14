# Mốc tiếp tục công việc — 12/09/2026

Code đã được lưu trong workspace sau các lần gián đoạn. Không dựng lại từ create-next-app.

Rà soát mới ngày 13/09/2026: [AUDIT-2026-09-13.md](AUDIT-2026-09-13.md). Release `6cdbbfe` đã bổ sung nâng cấp snapshot cho lịch sử legacy tương thích, khóa lịch ôn theo phiên bản, đóng băng cấu trúc phần thi, kiểm tra liên kết snapshot và nhận diện SHA trên production. Migration 002 đã áp dụng thành công trên Supabase production và hậu kiểm đạt. Release vẫn chưa buộc Vercel chờ CI trước deploy; UAT thiết bị thật và thẩm định học liệu còn mở nên không kết luận toàn sản phẩm hoàn thành 100%.

Đợt sửa F14–F19 tiếp sau `cf12c02`: đề đầy đủ không còn dùng chung câu hỏi với thư viện (20 câu Đọc viết mới, bốn bài Đọc của đề lên version 3 và `full-reading-memory` lên 4), độ chính xác theo kỹ năng tính trên 30 câu gần nhất thay vì 5 lượt, bỏ lần kiểm tra toàn bộ hồ sơ mỗi giây, phần Nói hoàn thành được khi không có micro, bản ghi được giữ và xóa được, phòng thi nhớ ngữ liệu đang làm. Chi tiết trong QUALITY.md.

Đợt F13 tiếp sau `4c3554a`: ngân hàng câu hỏi có ma trận dạng câu (`src/lib/question-types.ts`), 14 câu bị gắn nhãn sai đã sửa lại và 8 câu Đọc được viết mới nên phần Đọc của đề còn 14/40 câu chi tiết (trước 20/40) và phần Nghe còn 18/35 (trước 29/35). Bốn bài Đọc của đề lên version 4, `full-reading-memory` lên 5.

Đợt 1 của kế hoạch đã làm xong: độ chính xác chỉ tính lượt đầu gặp bài (lượt làm lại đếm riêng), Sổ lỗi bỏ thẻ đã được làm lại đúng, và bài dài hơn ngân sách ngày được đề nghị dưới dạng chia buổi nên cả 14/14 bài đều vào được kế hoạch ngày.

Đợt 2 đã làm xong: kế hoạch ngày chọn bài theo dạng câu đang sai (chỉ tính lượt đầu, cần ít nhất 3 câu mới kết luận) và Sổ lỗi có phần "Chỗ mình hay vấp" hiện tỉ lệ sai theo từng dạng câu. Trần điểm ưu tiên theo lỗi được hạ và mỗi ngày giữ một suất cho bài chưa gặp, nên người học sai liên tục vẫn được đưa ra 13/14 bài thay vì 7/14.

Đợt 3 (A4) đã làm xong: thêm **8 bài Đọc và 8 bài Nghe** mới viết theo ma trận dạng câu, đều có trích dẫn nguyên văn và phân tích đủ bốn phương án. Thư viện đạt 12 Đọc + 12 Nghe + 3 Viết + 3 Nói; kho cho kế hoạch ngày tăng từ 141 lên **329 phút**. Đo lại: ngân hàng Đọc ngắn đoán mù theo chu kỳ 40%, Nghe ngắn 43,8%.

Đợt 4 đã làm xong: ngày thi được chia thành ba giai đoạn và trang Lộ trình hiện việc của tuần này (không có ngày thi thì nói rõ là chưa có mốc); ngày mệt có buổi 10 phút gồm một ngữ liệu ngắn, thẻ từ đến hạn và một câu sai; trang chính chỉ hiện mốc đã xảy ra thật kèm bằng chứng; và thẻ từ có thể thêm từ chính câu "từ vựng trong ngữ cảnh" đã làm sai, dùng chung lịch ôn với bộ thẻ có sẵn.

Đợt 5 đã làm xong: Viết và Nói có bộ tiêu chí tự kiểm tra ngay cạnh bài làm (ba mức tự chấm, lưu vào lịch sử, ghi rõ không phải thang chấm của hội đồng thi vì chưa có rubric chính thức); có gói in được để gửi người chấm kèm ô nhập nhận xét ngược lại vào đúng buổi học; player Nghe có tạm dừng, tua theo câu, nghe lại một câu và nói rõ khi thiết bị thiếu giọng tiếng Anh.

Đợt 6 đang làm: mỗi bài học hiện rõ ai soạn và đã qua thẩm định hay chưa (hiện tại: chưa bài nào); Cài đặt có nút tải file báo lỗi không kèm bài viết hay bản ghi; app chạy được khi mất mạng nhờ service worker viết tay; và **đề đủ cấu trúc số 02** đã có — 35 câu Nghe, 40 câu Đọc (1.913 từ, chú giải đầy đủ), 2 đề Viết và 3 phần Nói của riêng đề, không dùng chung gì với đề 01. Còn lại: dựng lại báo cáo Word theo mốc hiện hành.

Cả sáu đợt của [PLAN-2026-09-14.md](PLAN-2026-09-14.md) đã xong; kế hoạch đang chạy là [PLAN-TIEP-THEO.md](PLAN-TIEP-THEO.md), đợt 1 (so sánh hai lần thi, kế hoạch dùng đúng ngân sách) và đợt 2 (ngân hàng Viết/Nói) đã xong. Ghi lại bối cảnh của kế hoạch 14/09: Ba phát hiện chính: kế hoạch ngày chỉ chọn được trong 141 phút bài (13/14 bài thư viện vừa ngân sách 30 phút), tức khoảng 5 ngày là hết bài mới; `skillStats` trộn lượt đầu với lượt làm lại nên độ chính xác tăng giả khi luyện lại; và thẻ trong Sổ lỗi không bao giờ rời sổ, kể cả khi câu đó đã được làm lại đúng.

Rà soát và kế hoạch thực thi: [PRODUCTION-ROADMAP.md](PRODUCTION-ROADMAP.md). Mốc hiện hành là `32422fa`: đạt **81 unit, 44 E2E**, build 45 route và audit dependency trong GitHub Actions run `34790572846`; smoke production run `34790590164` cũng đạt. (Mốc `6cdbbfe` trước đó đạt 57 unit, 40 E2E trong run `34733331145`.) Migration mới đã thu hồi direct DML và buộc ghi qua RPC revision trên Supabase production. Auth request có timeout; lỗi lưu cloud revision tự xuất backup. UAT thiết bị thật vẫn còn mở.

## Đã hoàn thành trong môi trường local

- Mây: giao diện responsive, dashboard cá nhân hóa, 30 bài luyện, hành trình, từ vựng, sổ lỗi, lịch sử, cẩm nang và cài đặt.
- Hai chế độ luyện có giờ: 51 phút và 172 phút đủ cấu trúc. Đề đầy đủ có 35 câu Nghe, 40 câu Đọc, hai bài Viết lưu riêng, ba phần Nói ghi âm riêng.
- Bảo toàn nháp/đáp án khi tải lại; deadline tuyệt đối; chuyển phần tự động; không nhân đôi lượt nộp; lưu bản ghi khi chuyển phần trong ứng dụng.
- SQL Supabase Auth/RLS, RPC snapshot có revision, nhập/xuất JSON, giữ dữ liệu hỏng để phục hồi.
- Sau đợt rà soát Reading/Listening, lịch sử học liệu và đồng bộ: 139 kiểm thử Vitest và 53 kiểm thử Playwright trên `next start` đều đạt; suite đầy đủ chạy Chromium, toàn bộ tám bài Reading/Listening cùng luồng trọng yếu và tải backup chạy thêm Firefox/WebKit. Mười ca cloud giả lập bao phủ tải lên chậm, xung đột revision, bản sao hỏng, phục hồi kèm backup mới nhất, đăng xuất khi server lỗi, hủy khi rời trang hoặc đổi phiên, timeout login và lỗi lưu revision. ESLint, TypeScript, production build 98 route, dependency audit và axe trên 14 màn đều đạt. Chưa nghiệm thu thiết bị iOS hoặc Android thật. Chi tiết lỗi đã sửa và bằng chứng mới nhất nằm trong QUALITY.md; báo cáo Word đã được đồng bộ với release này.
- Đã sửa nháp bị ghi đè giữa hai tab, form hồ sơ đang nhập bị reset bởi cập nhật không liên quan, ghi đè dữ liệu hỏng phát sinh giữa phiên, timestamp phục hồi bản sao và nộp nhầm phần thi từ tab cũ. Thêm kiểm tra file sao lưu có điểm bất khả thi/mã lượt học trùng.
- Đã xem ảnh giao diện desktop/mobile thực tế. Ảnh QA trong `.qa/` không đưa vào Git.
- Daily Mission đã dùng lỗi đến hạn, lỗi tự tin cao, độ chính xác, recency, ngày thi, mood, focus và diversity guard; từng bài hiển thị lý do được chọn. Bài luyện khách quan lưu “Đoán/Chưa chắc/Rất chắc”; Sổ lỗi ưu tiên misconception sai nhưng rất chắc.
- Vòng chữa bài Reading/Listening có lớp bằng chứng: 136/183 câu (toàn bộ 108 câu của 24 bài ngắn và 28 câu Đọc của đề đầy đủ) hiện câu quyết định đáp án trong ngữ liệu, lý do phương án đã chọn chưa đúng, lý do đáp án đúng và phân tích các phương án còn lại; bài Nghe phát lại riêng câu bằng chứng. Chú giải không đổi nội dung đã phát hành nên không tạo version mới; kiểm thử tự động bắt buộc trích dẫn trùng nguyên văn ngữ liệu.
- Kết quả Reading/Listening ngắn hiển thị độ vững theo confidence và kết quả theo dạng câu. Đề có giờ cảnh báo số câu bỏ trống trước khi nộp; transcript Listening chỉ mở ở màn đối chiếu sau khi hoàn thành.
- Đã thêm web app manifest và metadata màn hình chính; CSP production không cần `unsafe-eval` và đã kiểm thử bằng listener vi phạm bảo mật. Tối ưu prefetch cùng schema client làm payload ban đầu giảm khoảng 140 KiB và JavaScript giảm khoảng 136 KiB trong phép đo Lighthouse local.

## Cần tài khoản/môi trường thật hoặc thẩm định chuyên môn

- Supabase thật đã kết nối: `.env.local` khớp dự án `vstep`, Auth API trả HTTP 200. Migration 001 và 002 đã chạy thành công trong transaction. Hai bảng `allowed_learners` và `study_snapshots` bật RLS; migration 002 đã thu hồi direct DML và bỏ policy ghi trực tiếp. Hậu kiểm xác nhận contract tồn tại, RPC là `SECURITY DEFINER` và snapshot hiện có không mất. Truy cập REST chưa đăng nhập trả 401/42501. Đã tắt đăng ký công khai, kiểm tra Auth API `disable_signup=true`. Không ghi giá trị key vào báo cáo.
- Đã tạo một tài khoản người học trong `auth.users`, email đã được xác nhận. UID đã được thêm vào `allowed_learners`; truy vấn xác nhận `access_enabled=true` và `email_confirmed=true`. Đã kiểm thử trên database thật dưới role `authenticated`: tạo snapshot revision 1, cập nhật revision 2, đọc lại và từ chối revision 0 cũ; kết quả PASS, toàn bộ dữ liệu QA nằm trong transaction đã rollback.
- Đăng nhập thật từ giao diện local đã thành công. Luồng “Lưu lên đám mây” tạo đúng một snapshot revision 1 với payload version 1; truy vấn trực tiếp trong Supabase xác nhận dữ liệu và thời điểm cập nhật. Luồng “Tải về thiết bị” đã tải chính snapshot đó, tạo bản sao cục bộ trước khi thay thế và giao diện báo đồng bộ thành công. Chưa thử trên thiết bị hoặc trình duyệt thứ hai. Connector SQL cũ vẫn lỗi DNS; dùng dashboard đã đăng nhập, không lấy session token ra ngoài trình duyệt.
- Đã có bản HTTPS pilot tại `https://vstep-turtle.vercel.app`: ngày 12/09/2026, 23 route gồm 9 màn chính và toàn bộ 14 bài luyện tải đúng trên Chromium, Firefox và WebKit ở viewport mobile; route giả trả 404 và security headers đúng. Luồng Listening phát/dừng, chấm điểm, phân tích và mở transcript sau khi nộp không có lỗi runtime. Supabase production đã được cấu hình; chưa đăng nhập/sync bằng tài khoản thật trên host, chưa thử micro hoặc thiết bị iOS/Android thật.
- Nội dung tự biên soạn, chưa được giáo viên thẩm định/hiệu chuẩn. Bài Nghe dùng giọng tổng hợp, cho phép phát lại. Chưa có chấm Viết/Nói bằng AI hoặc giáo viên.
- Micro thật, giọng đọc của điện thoại người học và quy trình sao lưu vận hành cần thử trên thiết bị thực tế. JSON/đám mây không chứa audio; bản ghi tải riêng.
- Hồ sơ cá nhân cấu hình được và đã cá nhân hóa tên thân mật “Gùa/Rùa”. Mục tiêu, ngày thi và sở thích thực vẫn do người học tự chọn; hệ thống không tự đặt thay họ.

Các giới hạn này được ghi trong giao diện, README và PRODUCT.md; không mô tả chúng như tính năng đã hoàn tất. Mã nguồn được quản lý trên nhánh `main` và kiểm tra tự động bằng GitHub Actions.
