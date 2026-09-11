# Rà soát chất lượng — 11/09/2026

Rà lại sau yêu cầu kiểm tra kỹ, gồm đọc code, tái hiện lỗi, sửa và kiểm thử hồi quy. Đây là bằng chứng cho phạm vi đã kiểm tra, không phải chứng nhận không còn lỗi hoặc hoàn thành mọi yêu cầu production.

## Lỗi dữ liệu đã tái hiện và sửa

| Tình huống                                     | Trước khi sửa                                                        | Kết quả sau sửa                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Cùng bài trắc nghiệm mở ở hai tab              | Mỗi tab giữ đáp án riêng; bộ lưu theo đồng hồ có thể ghi lại nháp cũ | Đáp án và thời gian dùng cùng bản nháp trong store; thay đổi một câu giữ các câu mới nhất |
| Đang nhập tên, tab khác ôn từ                  | Snapshot mới tạo object hồ sơ mới, reset tên chưa lưu                | Chỉ cập nhật form khi nội dung hồ sơ thực sự đổi                                          |
| localStorage hỏng giữa phiên                   | Lần ghi tiếp theo bỏ qua lỗi đọc và ghi đè bản hỏng                  | Hiển thị lỗi, giữ nguyên bản gốc, giữ thay đổi mới trong RAM để xuất                      |
| Khôi phục backup cũ                            | Timestamp có thể thấp hơn phiên hiện hành, tab khác bỏ qua           | Timestamp phục hồi luôn tăng so với bản hiện hành trên máy                                |
| Tab cũ đang xác nhận nộp, tab khác chuyển phần | Lệnh nộp có thể áp dụng cho phần tiếp theo                           | Chỉ nộp nếu mã phiên và phần thi vẫn đúng với phần đã xác nhận                            |

Bốn kiểm thử mới về dữ liệu hỏng, timestamp, nháp hai tab và form hồ sơ đã thất bại trên code cũ, rồi đạt sau bản sửa. Ca nộp thi từ tab cũ được bổ sung để kiểm tra điều kiện bảo vệ phần đã chuyển.

## Gia cố bổ sung

- Từ chối backup có số câu đúng lớn hơn tổng câu hoặc mã lượt học trùng.
- Cảnh báo rời trang khi đang ghi âm; đóng track nếu khởi tạo ghi âm thất bại. Timer ghi âm dựa trên thời gian thực thay vì số lần interval chạy.
- IndexedDB báo lỗi khi giao dịch bị hủy/kho bị khóa; không để lời hứa lưu treo vô hạn trong các trường hợp đó.
- AudioPlayer chỉ dừng bản đọc do chính nó phát khi unmount; hủy/interruption đưa nút phát về trạng thái đúng.
- CI và lệnh `test:production` chạy trình duyệt trên `next start` cổng riêng để kiểm chứng bản build thực tế.
- Hệ màu pastel pink dùng nền blush sáng, chữ charcoal/lavender-gray trung tính và điểm nhấn rose rõ nét; vẫn giữ màu phụ riêng cho bốn kỹ năng. Focus, trạng thái chọn, con trỏ và favicon dùng cùng bảng màu.
- Bổ sung `global-error.tsx` để người học vẫn có nút thử lại và đường vào phần xuất bản sao khi lỗi xảy ra ở root layout. Chuẩn hóa `type` cho toàn bộ nút, trạng thái `aria-pressed` của các bộ lọc, nhóm confidence, timer và tiến độ trả lời.
- Kết quả Reading/Listening phân tách câu đúng vững, câu đúng còn phân vân và lỗi sai dù rất chắc; đồng thời tổng hợp đúng/tổng theo từng dạng câu hỏi.
- Phần thi có giờ báo rõ số câu Nghe/Đọc còn bỏ trống trước khi nộp. Transcript Listening được giữ kín trong lúc làm và chỉ hiện trong phần đối chiếu sau khi hoàn thành.
- Cẩm nang sửa phạm vi Reading chính thức thành 1.900–2.500 từ, đồng thời tách rõ đề Mây hiện có dài khoảng 1.900–2.050 từ.
- Bổ sung Content Security Policy cho bản static: chỉ cho script/style của chính website, kết nối Supabase, media Blob và chặn object/frame embedding; development thêm `unsafe-eval` theo yêu cầu debug của Next.js. Zod chạy chế độ không JIT để không phát sinh vi phạm `unsafe-eval` trên Firefox; bỏ ép nâng cấp URL tài nguyên ở local để WebKit tải đúng bản production HTTP dùng cho QA.
- Thêm web app manifest, màu theme và metadata màn hình chính. Tắt prefetch ở menu cố định và dùng `zod/mini` cho schema phía client để tránh tải route chưa dùng và giảm JavaScript ban đầu.

## Bằng chứng kiểm tra

- 47 kiểm thử Vitest: logic học, confidence, chẩn đoán theo dạng câu và planner, cá nhân hóa dữ liệu cũ, độ đầy đủ cấu trúc, dữ liệu/khôi phục và SQL/RLS trên PostgreSQL qua PGlite.
- 27 kiểm thử Playwright trên bản production: 25 ca Chromium cùng hai smoke test trọng yếu trên Firefox và WebKit. Phạm vi gồm phục hồi bài, lưu hai bài Viết, ghi âm khi chuyển phần, nhiều tab, import/export, dung lượng bị chặn, micro bị từ chối, con trỏ tùy biến, manifest, CSP không dùng eval, header bảo vệ và HTTP 404.
- Axe WCAG A/AA trên 13 màn, cộng kết quả đề đầy đủ mở giải thích trên mobile; kiểm tra chiều rộng các màn chính ở 390 px.
- ESLint, TypeScript, production build: đạt.
- `npm audit --omit=dev`: không báo lỗ hổng ngày 11/09/2026. Đây là kết quả advisory hiện có, không thay thế rà soát bảo mật toàn diện.
- GitHub Actions run `34604727728` đạt cho commit tài liệu `7b78df6`; các run chức năng trước đó cũng đạt. Pipeline hiện cài Chromium, Firefox và WebKit.
- Smoke test bản HTTPS `https://vstep-turtle.vercel.app` ngày 11/09/2026: 9 màn chính và 14 bài luyện tải đúng, route giả HTTP 404, HSTS/CSP và các header bảo vệ hiện diện. Toàn bộ Reading/Listening không tràn ngang ở 1.440 px và 390 px; luồng Listening phát/dừng, chấm điểm, phân tích và mở transcript sau khi nộp không có lỗi runtime.
- Supabase production trả HTTP 200 ở Auth settings; ba thao tác ẩn danh gồm đọc snapshot, đọc membership và gọi RPC lưu đều bị RLS chặn bằng mã `42501`.
- Lighthouse mobile chạy ba lần trên bản production local sau tối ưu: tổng payload giảm từ khoảng 516 KiB xuống 376 KiB, JavaScript từ 354 KiB xuống 218 KiB và phần JavaScript chưa dùng từ 169 KiB xuống 26 KiB. Accessibility và Best Practices đạt 100; Performance dao động 73–84 do mô phỏng CPU. SEO 60 là hệ quả chủ đích của `noindex` cho ứng dụng cá nhân.

## Giới hạn còn mở

Đã có môi trường HTTPS pilot nhưng chưa thử đăng nhập/sync bằng tài khoản thật trên host, micro/giọng đọc trên thiết bị người học, bản thu người nói, thẩm định độ khó từ giáo viên hay chức năng chấm Viết/Nói. Supabase thật đã được cấu hình và kiểm thử riêng theo `STATUS.md`. Đã có smoke test bằng engine WebKit nhưng chưa xác minh Safari/iOS trên thiết bị thật. Đồng bộ giữa tab giúp tránh ghi đè tuần tự thường gặp, không phải giao thức hợp nhất chỉnh sửa đồng thời như trình soạn thảo cộng tác. Dữ liệu vẫn cần sao lưu theo README, âm thanh tải riêng.
