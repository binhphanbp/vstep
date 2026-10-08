# Báo cáo tình trạng Mây VSTEP ngày 08/10/2026

Báo cáo này ghi trạng thái sau khi phát hành tính năng ghi chú, nháp và tô câu lên HTTPS ngày 08/10/2026, trên nền kho năm đề (đề 131 đã được gỡ ngày 07/10/2026). Các con số ở đây là của bản hiện tại. Nó giúp chủ dự án đối chiếu nội dung, bằng chứng triển khai và những việc còn cần xác nhận. Các release trước được lưu trong `HANDOVER.md` và `QUALITY.md`.

## 1. Kết luận

Kho hiện có **năm đề thi thử**: **132, 133, 134, 135 và Review 13/09**, mỗi đề có đủ 75 khóa đáp án Nghe/Đọc. Đề **131** (thiếu toàn bộ khóa đáp án và transcript, nên chỉ luyện được, không chấm) đã được gỡ theo quyết định của chủ dự án ngày 07/10/2026 cho đỡ rối. Không quy đổi số câu đúng thành bậc B1/B2/C1.

Ngày 08/10/2026 Mây có thêm bộ công cụ **ghi chú, nháp và tô câu** để Gùa luyện đề trên máy tính thay tờ giấy nháp và cây bút: ghi chú theo từng câu hỏi (chỉ hiện sau khi đã biết đáp án), trang **Sổ ghi chú** (`/notes`) để tìm, lọc, đánh dấu ★, in và khôi phục, nháp riêng cho từng phần của một lượt làm, và tô câu trong bài đọc, bản chép lời và đề bài. Hai pull request [#51](https://github.com/binhphanbp/vstep/pull/51) (nền: bản cũ không còn xóa được dữ liệu của bản mới) và [#52](https://github.com/binhphanbp/vstep/pull/52) (toàn bộ tính năng) đã merge; commit hiện hành trên `main` là `003be7f`. Kiểm tra trên GitHub Actions và smoke production của commit này đều đạt. Ghi chú, nháp và câu tô nằm trên máy và nằm trong file sao lưu; **không** gửi cho dịch vụ AI nào, và file báo lỗi chỉ đếm số ghi chú chứ không chứa nội dung.

Cùng ngày, giao diện máy tính được rà lại từng màn (chụp ở 1440×900 và 1280×720) và phần luyện thi được dựng lại cho giống phần mềm thi trên máy: khung cố định vừa màn hình, đề và câu hỏi cuộn riêng, bảng câu hỏi và nút Nháp ở thanh dưới, Nghe và Nói ở cột giữa, con trỏ hệ thống trong phòng thi. Đây là cách bố trí thường gặp ở phần mềm thi trên máy, không phải phần mềm VSTEP chính thức. Chưa có ai ngoài các ca kiểm thử tự động dùng thử; nên để Gùa làm thử một phần Đọc và một phần Viết rồi nói chỗ nào còn vướng. Đợt rà thứ hai, trên bản đã học vài bài ở màn laptop, sửa thêm: thanh bên không còn cắt mất “Cẩm nang”, “Cài đặt” và hồ sơ; kho năm đề có mục riêng trong menu; Sổ tay lỗi sai đưa câu sai lên trước phần phân tích; thẻ từ vựng hiện đủ nút chọn mức nhớ ngay sau khi lật; trình nghe gọn hơn. Chi tiết nằm ở đầu QUALITY.md.

## 2. Phạm vi đã tích hợp

| Hạng mục         | Hiện trạng                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kho đề           | `/papers`, sáu thẻ; route riêng cho từng đề, gồm `/papers/review-1309`                                                                                   |
| Cấu trúc         | Mỗi đề 35 câu Nghe, 40 câu Đọc, hai bài Viết, ba phần Nói; tổng 172 phút                                                                                 |
| Chấm Nghe và Đọc | Năm đề có 375 khóa đáp án và lời giải; không còn đề nào không chấm                                                                                       |
| Âm thanh         | 105 MP3 tại `public/papers/audio`: 70 bài Nghe và 35 bài mẫu                                                                                             |
| Đối chiếu        | Hiện lời giải, transcript và bản dịch có trong nguồn sau khi hoàn thành                                                                                  |
| Tiến độ          | Lưu đáp án, bài Viết, phần Nói đã làm, deadline và mã phiên bản vào JSON backup và Supabase snapshot                                                     |
| Ghi âm           | Blob micro vẫn nằm trong IndexedDB; cần tải riêng khi chuyển thiết bị                                                                                    |
| Dữ liệu tĩnh     | Năm JSON đề và manifest; toàn bộ thư mục `public/papers` khoảng 67 MB                                                                                    |
| Ghi chú          | Theo từng câu hỏi hoặc cả đề, 5 gợi ý một chạm, ★ Cần nhớ; tự lưu sau 0,9 giây; tối đa 2000 ghi chú và 1,5 MB                                            |
| Sổ ghi chú       | `/notes`: tìm không dấu, lọc theo kỹ năng, đề và ★, mở lại đúng chỗ đã ghi, xóa có Hoàn tác, thùng rác 30 ngày, in; mở được khi mất mạng                 |
| Nháp             | Mỗi phần của một lượt (Nghe, Đọc, Viết, Nói) một trang, tối đa 2000 ký tự; có ở đề kho, thi thử, bài học và phòng luyện có giờ; có nút lưu thành ghi chú |
| Tô câu           | Nút “Tô câu”; bấm một câu để tô, bấm lại để bỏ; dùng được bằng Tab và Enter; một màu                                                                     |
| Nhắc sao lưu     | Trang Sổ ghi chú nhắc khi có từ 10 ghi chú mới chưa nằm trong bản sao nào                                                                                |

Nguồn trên máy nằm ở `../vstep/data`. Script `scripts/import-papers.mjs` kiểm tra cấu trúc, đáp án và audio trước khi tạo bản nhập. File `de-thi-thu-vstep-135_attempt.json` là lượt làm đã lưu, không phải đề thứ sáu. Đây là bộ đề của chủ dự án, dùng cho học cá nhân; học liệu chưa được giáo viên của Mây thẩm định.

## 3. Bằng chứng kiểm tra và triển khai

| Phép kiểm tra                    | Kết quả local                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| ESLint và TypeScript             | Đạt                                                                                      |
| Vitest                           | 339/339                                                                                  |
| Playwright trên production build | 165 ca: 157 Chromium, bốn Firefox, bốn WebKit; lượt Chromium đầy đủ mới nhất đạt 157/157 |
| Accessibility tự động            | Axe WCAG A/AA trên 16 màn, có kho đề và Review 13/09                                     |
| Build tĩnh                       | 104 trang, gồm năm route đề nhập                                                         |
| Dependency production            | `npm audit --omit=dev` báo 0 lỗ hổng                                                     |

Sau khi thêm phòng thi mô phỏng và công cụ luyện đề, lượt Chromium đầy đủ đạt 157/157 trên bản production local; Firefox và WebKit chưa chạy lại cho thay đổi này. Hai workflow [Validate Mây của nhánh](https://github.com/binhphanbp/vstep/actions/runs/37600019911) và [của PR](https://github.com/binhphanbp/vstep/actions/runs/37600046882) đều đạt trên checkout sạch. Kịch bản kiểm tra Review là đề riêng có điểm, 131 không có điểm, lưu bài qua tải lại, backup chứa lượt làm, và tab cũ không nộp chồng phần tiếp theo.

## 4. Kết quả phát hành

**Lần phát hành ghi chú, 08/10/2026:** PR #51 và #52 đều merge sau khi CI xanh. Ở PR #52, lượt CI đầu đạt 120/121; ca đỏ duy nhất là ca ghi chú trên WebKit, do chính ca kiểm thử đọc danh sách câu hỏi trước khi trang vẽ xong, đã sửa và CI chạy lại đạt trên cả ba engine. CI cũng đo hạn mức localStorage của Firefox và WebKit: đều **5,2 triệu ký tự**, bằng Chromium (máy desktop của CI), đủ cho một sổ ghi chú đầy cộng khoảng một năm học. Workflow Validate Mây và Smoke production của commit `003be7f` đều đạt.

**Lần phát hành 07/10/2026 (kho năm đề):**

1. PR #38 đã merge vào `main` sau khi CI xanh. Vercel tạo deployment Production cho SHA `ff8faef`.
2. Thẻ `may-release` trên HTTPS khớp đủ SHA merge. Smoke mở `/papers`, `/papers/review-1309`, tải manifest, Review JSON và MP3, kiểm tra security headers, chiều rộng 390 px, lỗi runtime và 404; tất cả đạt.
3. [Workflow Smoke production](https://github.com/binhphanbp/vstep/actions/runs/37600634404) của đúng deployment đạt. Kết quả trực tiếp trên URL production cũng là `Production smoke passed`.

Script `scripts/smoke-https.mjs` kiểm tra kho năm đề, file Review và một MP3. Chủ website đã chọn **không bật** cổng chờ CI trên Vercel; quy trình dựa trên CI xanh của pull request trước merge và smoke sau deploy.

## 5. Giới hạn và việc còn cần người xác nhận

- Đề 131 đã được gỡ khỏi kho. Nếu thiết bị từng lưu lượt làm đề này thì dữ liệu đó vẫn nằm trong bản sao nhưng không còn hiện trong ứng dụng; không tự tạo điểm hoặc lời giải cho đề thiếu khóa đáp án.
- Viết và Nói lưu bài, có mẫu đối chiếu, chưa chấm tự động. Số câu đúng của năm đề chưa được hiệu chuẩn để suy ra bậc VSTEP.
- Bản ghi micro không đi vào JSON hoặc Supabase snapshot; audio đề nhập không được tải sẵn để dùng offline.
- **Ưu tiên máy tính (desktop).** Gùa luyện đề trên máy tính, nên mọi kiểm tra và sửa chữa tập trung ở đó; điện thoại không phải trọng tâm. Gõ tiếng Việt trong ô nháp và ô ghi chú đã được kiểm với hai họ bộ gõ mô phỏng (gõ ghép tại chỗ; Backspace rồi chữ có dấu như Unikey và EVKey), nhưng chưa chạy phần mềm thật; nên dùng thử vài phút trên máy của Gùa.
- Chưa nghiệm thu đăng nhập và đồng bộ trên HTTPS bằng hai thiết bị thật, micro và tai nghe thật.
- Ghi chú, nháp và câu tô chỉ nằm trên máy cho đến khi người học thật sự cất một bản sao lưu ở nơi khác: Mây nhắc, có nút tải ngay, và chỉ thế thôi (đồng bộ đám mây vẫn thủ công). Hai tab sửa cùng một ghi chú thì Mây hỏi chứ không ghi đè. Một tab còn chạy bản cũ của trang có thể làm rơi ghi chú khi lưu; Mây đưa chúng về (từ trí nhớ của tab đang mở, hoặc từ bản chép trong IndexedDB), trừ trường hợp tab bản cũ lưu khi chưa từng có tab bản mới nào mở.
- Năm đề nhập là bộ đề của chủ dự án. Chủ dự án xác nhận ngày 07/10/2026 rằng chỉ dùng để học cá nhân, không chia sẻ hay kinh doanh. Địa chỉ trang hiện công khai với ai biết link; nếu muốn chỉ riêng Gùa vào được thì cần bật bảo vệ truy cập trên Vercel.

Để tiếp tục, xem `README.md` để chạy ứng dụng, `QUALITY.md` để tra ca kiểm thử, `HANDOVER.md` cho kiến trúc và `RELEASE-RUNBOOK.md` cho quy trình khôi phục.
