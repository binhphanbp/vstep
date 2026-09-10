# Mây — một góc học VSTEP cá nhân

## Người học và nguyên tắc

Một người học tại TP.HCM, cần một chứng chỉ nhưng cũng cần giữ nhịp học lâu dài. Website là công cụ học thực tế, không phải trang bán khoá học. Không xây tổ chức, bảng xếp hạng, thanh toán hay quản lý nhiều người dùng.

| Nỗi đau                      | Cách giải quyết đã triển khai                                                                                   | Nguyên tắc đo lường                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Không biết hôm nay học gì    | Chọn tối đa 3 bài vừa quỹ thời gian; ưu tiên kỹ năng, sở thích, bài chưa học và kết quả các ngày trước          | Kế hoạch giữ ổn định trong ngày; bài hoàn thành có dấu kiểm                 |
| Áp lực, học đứt nhịp         | Chọn mức năng lượng; ngày mệt giảm ngân sách xuống tối đa 15 phút                                               | Chuỗi ngày không phạt trước khi ngày hiện tại kết thúc, theo giờ Việt Nam   |
| Làm nhiều mà lặp lỗi         | Kết quả tách theo dạng câu và độ chắc chắn; câu sai vào sổ tay, làm lại trước khi xem giải thích, xếp lịch ôn   | Ưu tiên lỗi sai dù rất chắc; chỉ ra câu đúng nhưng còn phân vân             |
| Học từ rồi quên              | 20 thẻ có phiên âm, nghĩa, ví dụ, giọng đọc; lịch ôn theo mức nhớ                                               | Chưa nhớ: 10 phút; khó: một ngày; nhớ: tăng khoảng cách; đây là tự đánh giá |
| Ngại viết và nói             | Nháp tự lưu, đếm từ, tiêu chí tự kiểm tra, bài viết mẫu; ghi âm, nghe lại, tải bản ghi                          | Không tự tạo điểm chấm cho văn bản hay bản ghi                              |
| Lo thao tác và thời gian thi | Buổi rút gọn 51 phút hoặc đủ cấu trúc 172 phút; đồng hồ theo deadline tuyệt đối; lưu và chuyển phần khi hết giờ | Tách rõ hai chế độ, không quy đổi điểm sang chứng chỉ                       |
| Mất tiến độ khi crash        | Ghi đồng bộ đáp án/nháp vào thiết bị; phục hồi đồng hồ; bản sao JSON; kho bản ghi IndexedDB                     | Dữ liệu hỏng không bị ghi đè; lỗi lưu được hiển thị                         |
| Khó nhìn thấy tiến bộ        | Thời gian thực hành, lịch sử, độ chính xác Nghe/Đọc, từ đã ôn                                                   | Không có điểm khởi tạo, hoạt động giả hay điểm dự đoán bậc                  |

## Hướng giao diện

Giao diện làm việc với thanh điều hướng, kế hoạch ngày và công cụ học ngay ở trang chính. Hồng pastel cho hành động, màu riêng cho từng kỹ năng, font Be Vietnam Pro có tiếng Việt. Trên điện thoại dùng menu thu gọn và xếp một cột. Không dùng bảng xếp hạng, cơ chế trả thưởng gây áp lực hay popup thúc ép.

Đã kiểm tra tương phản WCAG A/AA bằng axe trên các màn chính và hỗ trợ bàn phím, nhãn form, vùng đọc cuộn, menu Escape/Tab, reduced motion. Kiểm tra tự động không thay thế đánh giá thủ công toàn bộ khả năng tiếp cận.

## Nội dung và độ chân thực

14 bài ngắn: 4 Đọc (20 câu), 4 Nghe (16 câu), 3 Viết và 3 Nói. Toàn bộ tự biên soạn. Nghe sử dụng speech synthesis trên thiết bị. Cấp B1/B2 là định hướng biên soạn, chưa phải kết quả chuẩn hoá khảo thí.

Buổi mô phỏng dùng lại 2 bài Nghe, 2 Đọc, 1 email và phần Nói tương tác xã hội. Tổng 51 phút = 10 + 15 + 20 + 6. Đây là luyện thao tác và thời gian, không phải kiểm tra đầu vào vì bài đã có thể được học trước.

Đề đủ cấu trúc số 01: 35 câu Nghe (8 thông báo, 3 hội thoại x 4 câu, 3 bài nói x 5 câu), 4 bài Đọc mở rộng x 10 câu tổng 1.900–2.050 từ, email và essay, ba phần Nói. Tổng 172 phút = 40 + 60 + 60 + 12. Chuyển ngữ liệu trong từng kỹ năng, lưu hai bài Viết riêng và bản ghi riêng cho từng phần Nói. Khi nộp Nghe/Đọc, hệ thống báo rõ số câu bỏ trống; transcript Nghe chỉ hiện trong phần đối chiếu sau khi hoàn thành. Hội thoại giữ giọng nhất quán theo nhân vật khi thiết bị có nhiều giọng tiếng Anh. Cho phép nghe lại, chưa phải điều kiện thi chính thức. Viết/Nói dùng bài đã có trong thư viện; cần ngân hàng độc lập nếu muốn kiểm tra đầu vào.

Nguồn định dạng đối chiếu: [ULIS VSTEP Test format](https://vstep.vnu.edu.vn/test-format/) và [ĐH Sư phạm TP.HCM](https://vstep.hcmue.edu.vn/index.php/gioi-thieu/dinh-dang-de-thi/bac-345), ngày 10/09/2026. Phạm vi Reading chính thức được ULIS công bố là 1.900–2.500 từ; độ dài 1.900–2.050 ở trên là của đề Mây hiện có. Cẩm nang dẫn nguồn chính thức để người học tự kiểm tra lịch thi, hồ sơ và phí mới nhất.

## Dữ liệu và kiến trúc

- Next.js App Router + TypeScript + Tailwind CSS 4, giao diện React phía client cho thao tác học.
- Một external store với `useSyncExternalStore`, localStorage lưu hồ sơ, buổi học, đáp án, bài viết, lịch ôn và phiên luyện có giờ; Zod kiểm tra khi nhập.
- IndexedDB lưu Blob ghi âm, không nhét base64 vào JSON. Bản nháp theo bài và bản lưu riêng cho lượt Nói hoàn thành. Xuất JSON không bao gồm âm thanh.
- Supabase Auth email/mật khẩu cho tài khoản cấp sẵn; không có đăng ký công khai. RLS giới hạn đúng tài khoản được cho phép.
- Snapshot đám mây lưu thủ công bằng RPC có revision và khoá giao dịch. Bản cũ không tự ghi đè bản mới. Tải về yêu cầu xác nhận và xuất bản thiết bị trước khi thay thế. Không tự gộp lịch sử khác nhánh.
- Không có service-role key trong client, không tự gửi nội dung/bản ghi đến API AI, không tracking hay quảng cáo.

## Ranh giới cần hoàn thành trước khi gọi là hệ luyện thi toàn diện

1. Nghiệm thu đồng bộ Supabase trên hai thiết bị thật. Dự án, migration, tài khoản, RLS và luồng lưu/tải trên một thiết bị local đã kiểm tra; CI kiểm tra SQL/RLS bằng PostgreSQL trong PGlite.
2. Giáo viên thẩm định bộ đề đủ cấu trúc đã có; mở rộng ngân hàng độc lập có quyền sử dụng, thay giọng tổng hợp bằng bản thu người nói và hiệu chuẩn độ khó. Một đề tự biên soạn chưa đủ cho chương trình luyện dài hạn.
3. Tích hợp phản hồi Viết/Nói từ giáo viên hoặc AI được hiệu chuẩn theo rubric, luôn hiển thị giới hạn độ tin cậy. Chưa triển khai chấm AI tự động.
4. Bản HTTPS pilot đã có tại `https://vstep-turtle.vercel.app`; tiếp tục thử đăng nhập/sync, micro/giọng đọc trên đúng điện thoại và máy tính người học sử dụng, kiểm tra khôi phục dữ liệu thật và sao lưu vận hành.
5. Cá nhân hoá nội dung sâu hơn khi có trình độ, mục tiêu, ngày thi và sở thích thực của người học. Tên thân mật hiện là “Gùa/Rùa”; các mục còn lại cấu hình được và không tự bịa thông tin.

Các điểm trên là phần công việc thật còn lại, không phải tính năng đã hoàn tất hoặc lời cam kết đạt chứng chỉ.
