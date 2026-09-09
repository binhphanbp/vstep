# Rà soát chất lượng — 09/09/2026

Rà lại sau yêu cầu kiểm tra kỹ, gồm đọc code, tái hiện lỗi, sửa và kiểm thử hồi quy. Đây là bằng chứng cho phạm vi đã kiểm tra, không phải chứng nhận không còn lỗi hoặc hoàn thành mọi yêu cầu production.

## Lỗi dữ liệu đã tái hiện và sửa

| Tình huống | Trước khi sửa | Kết quả sau sửa |
| --- | --- | --- |
| Cùng bài trắc nghiệm mở ở hai tab | Mỗi tab giữ đáp án riêng; bộ lưu theo đồng hồ có thể ghi lại nháp cũ | Đáp án và thời gian dùng cùng bản nháp trong store; thay đổi một câu giữ các câu mới nhất |
| Đang nhập tên, tab khác ôn từ | Snapshot mới tạo object hồ sơ mới, reset tên chưa lưu | Chỉ cập nhật form khi nội dung hồ sơ thực sự đổi |
| localStorage hỏng giữa phiên | Lần ghi tiếp theo bỏ qua lỗi đọc và ghi đè bản hỏng | Hiển thị lỗi, giữ nguyên bản gốc, giữ thay đổi mới trong RAM để xuất |
| Khôi phục backup cũ | Timestamp có thể thấp hơn phiên hiện hành, tab khác bỏ qua | Timestamp phục hồi luôn tăng so với bản hiện hành trên máy |
| Tab cũ đang xác nhận nộp, tab khác chuyển phần | Lệnh nộp có thể áp dụng cho phần tiếp theo | Chỉ nộp nếu mã phiên và phần thi vẫn đúng với phần đã xác nhận |

Bốn kiểm thử mới về dữ liệu hỏng, timestamp, nháp hai tab và form hồ sơ đã thất bại trên code cũ, rồi đạt sau bản sửa. Ca nộp thi từ tab cũ được bổ sung để kiểm tra điều kiện bảo vệ phần đã chuyển.

## Gia cố bổ sung

- Từ chối backup có số câu đúng lớn hơn tổng câu hoặc mã lượt học trùng.
- Cảnh báo rời trang khi đang ghi âm; đóng track nếu khởi tạo ghi âm thất bại. Timer ghi âm dựa trên thời gian thực thay vì số lần interval chạy.
- IndexedDB báo lỗi khi giao dịch bị hủy/kho bị khóa; không để lời hứa lưu treo vô hạn trong các trường hợp đó.
- AudioPlayer chỉ dừng bản đọc do chính nó phát khi unmount; hủy/interruption đưa nút phát về trạng thái đúng.
- CI và lệnh `test:production` chạy trình duyệt trên `next start` cổng riêng để kiểm chứng bản build thực tế.
- Hệ màu pastel pink dùng nền blush sáng, chữ charcoal/lavender-gray trung tính và điểm nhấn rose rõ nét; vẫn giữ màu phụ riêng cho bốn kỹ năng. Focus, trạng thái chọn, con trỏ và favicon dùng cùng bảng màu.

## Bằng chứng kiểm tra

- 44 kiểm thử Vitest: logic học, độ đầy đủ cấu trúc, dữ liệu/khôi phục và SQL/RLS trên PostgreSQL qua PGlite.
- 23 kiểm thử Playwright trên bản production, gồm phục hồi bài, lưu hai bài Viết, ghi âm khi chuyển phần, nhiều tab, import/export, dung lượng bị chặn, micro bị từ chối, con trỏ tùy biến, header bảo vệ và HTTP 404.
- Axe WCAG A/AA trên 13 màn, cộng kết quả đề đầy đủ mở giải thích trên mobile; kiểm tra chiều rộng các màn chính ở 390 px.
- ESLint, TypeScript, production build: đạt.
- `npm audit --omit=dev`: không báo lỗ hổng tại thời điểm chạy. Đây là kết quả advisory hiện có, không thay thế rà soát bảo mật toàn diện.

## Giới hạn còn mở

Chưa có môi trường HTTPS công khai, thử micro/giọng đọc trên thiết bị người học, bản thu người nói, thẩm định độ khó từ giáo viên hay chức năng chấm Viết/Nói. Supabase thật đã được cấu hình và kiểm thử riêng theo `STATUS.md`. Bộ kiểm thử dùng Chromium; chưa xác minh Safari/iOS thật. Đồng bộ giữa tab giúp tránh ghi đè tuần tự thường gặp, không phải giao thức hợp nhất chỉnh sửa đồng thời như trình soạn thảo cộng tác. Dữ liệu vẫn cần sao lưu theo README, âm thanh tải riêng.
