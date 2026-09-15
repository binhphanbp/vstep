# Nghiệm thu trên điện thoại thật

Toàn bộ kiểm thử tự động của Mây chạy trên trình duyệt máy ảo. Những thứ dưới đây **máy ảo không kiểm được**: micro thật, bàn phím tiếng Việt, loa, mạng yếu, chuyển app, và cách trình duyệt điện thoại xử lý lưu trữ. Đây là danh sách để làm đúng một lần trên máy Gùa dùng hằng ngày.

Thời gian ước tính: **25–35 phút**. Cần: điện thoại của Gùa, tai nghe, và đường truyền bình thường.

## Trước khi bắt đầu

1. Mở **Cài đặt → Bản sao của hành trình → Tải bản sao** và giữ lại file JSON. Nếu bước nào làm hỏng dữ liệu thì còn đường lùi. Dữ liệu học của Gùa là bản duy nhất.
2. Ghi lại: điện thoại gì, hệ điều hành bản mấy, trình duyệt gì (Safari hay Chrome), ngày giờ chạy.
3. Mở `/settings` và ghi lại dòng **Dung lượng** đang hiển thị, để đối chiếu ở cuối.

## Danh sách kiểm

Đánh dấu Đạt hoặc Không, và khi Không thì ghi đúng thao tác vừa làm. Nếu app báo lỗi, bấm **Cài đặt → Khi có gì đó hỏng → Gửi báo lỗi** rồi dán vào tin nhắn — bản mô tả đó không chứa bài viết hay bản ghi âm.

| #   | Thao tác                                                       | Kỳ vọng                                                                         | Kết quả |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------- |
| 1   | Mở trang chủ, đọc kế hoạch hôm nay                             | Có tên Gùa, có kế hoạch, không có chữ nào bị tràn ra ngoài màn hình             |         |
| 2   | Xoay ngang màn hình rồi xoay lại                               | Không vỡ layout, không mất nội dung đang xem                                    |         |
| 3   | Làm hết một bài **Đọc**                                        | Chọn đáp án và mức độ chắc chắn bằng ngón tay dễ, nút đủ to                     |         |
| 4   | Xem kết quả bài Đọc vừa làm                                    | Có giải thích, có câu trích dẫn làm căn cứ, có gợi ý bước tiếp theo ở câu sai   |         |
| 5   | Làm một bài **Nghe**                                           | Audio phát được qua loa và qua tai nghe, tua được, không tự dừng khi cuộn trang |         |
| 6   | Trong lúc nghe, khóa màn hình 10 giây rồi mở lại               | Bài chưa mất, đáp án đã chọn còn nguyên                                         |         |
| 7   | Làm một bài **Viết**, gõ tiếng Anh có dấu câu                  | Bàn phím không che ô nhập, đếm từ chạy đúng, không mất chữ khi gõ nhanh         |         |
| 8   | Thoát app giữa bài Viết rồi quay lại                           | Bản nháp còn nguyên                                                             |         |
| 9   | Làm một bài **Nói**: cho phép micro, ghi âm                    | Hỏi quyền micro một lần, ghi được, nghe lại rõ                                  |         |
| 10  | Từ chối quyền micro ở một bài Nói khác                         | App nói rõ là không ghi được và vẫn cho làm tiếp, không treo                    |         |
| 11  | Nộp buổi Nói vừa ghi                                           | Buổi học vào lịch sử, bản ghi tải lại được từ trang Lịch sử                     |         |
| 12  | Mở **Thư viện**, lọc "Chưa học"                                | Ra đúng những bài chưa làm, số đếm khớp                                         |         |
| 13  | Mở một **đề đủ cấu trúc**, làm vài câu rồi thoát app           | Quay lại vẫn đúng câu đó, đồng hồ không bị nhảy sai                             |         |
| 14  | Mở **Sổ tay lỗi sai**                                          | Danh sách hiện 10 câu một lần, bấm "Xem thêm" ra tiếp                           |         |
| 15  | Bật chế độ máy bay, mở lại app                                 | Trang offline hiện ra, không màn hình trắng                                     |         |
| 16  | Tắt chế độ máy bay, vào **Cài đặt → Đồng bộ**, lưu lên đám mây | Báo lưu xong, không lưu lặp                                                     |         |
| 17  | Vào **Cài đặt → Khi có gì đó hỏng → Gửi báo lỗi**              | Mở được chỗ chia sẻ hoặc báo đã chép; nội dung dán ra không có bài viết nào     |         |
| 18  | Vào **Cài đặt → Dung lượng**                                   | Số liệu hiện ra, so với số đã ghi ở đầu thì hợp lý                              |         |
| 19  | Vào **Cài đặt → Bản sao**, tải bản sao lần nữa                 | File tải về được và mở được                                                     |         |
| 20  | Đọc một màn bất kỳ ngoài nắng hoặc để độ sáng thấp             | Chữ vẫn đọc được, không quá nhạt                                                |         |

## Sau khi chạy xong

- Ghi kết quả vào `docs/QUALITY.md` kèm ngày, máy và commit đang chạy.
- Mỗi mục **Không** là một việc cần sửa; ghi rõ thao tác để dựng lại được.
- Nếu có bước nào làm hỏng dữ liệu, nhập lại file JSON đã lưu ở phần chuẩn bị trước khi học tiếp.
