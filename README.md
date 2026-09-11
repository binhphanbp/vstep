# Mây — góc học VSTEP của riêng mình

Ứng dụng tiếng Việt cho một người học tại TP.HCM, dùng Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 và Supabase tùy chọn. Chạy được ngay trên thiết bị khi chưa cấu hình dịch vụ đám mây.

**Bản HTTPS pilot:** [vstep-turtle.vercel.app](https://vstep-turtle.vercel.app). Ngày 11/09/2026 đã xác nhận 9 màn chính và toàn bộ 14 bài luyện tải đúng, trang không tồn tại trả 404, security headers hoạt động và cấu hình Supabase production đã có. Đăng nhập/đồng bộ bằng tài khoản thật, micro và thiết bị iOS/Android vẫn cần nghiệm thu trực tiếp.

## Chạy trên máy

Yêu cầu Node.js 24 và npm:

```sh
npm ci
npm run dev
```

Mở [http://127.0.0.1:3000](http://127.0.0.1:3000). Vào **Cài đặt** để chọn tên, mục tiêu, ngày thi, quỹ thời gian, kỹ năng ưu tiên và sở thích. Tiến độ bắt đầu từ dữ liệu thật.

## Có thể sử dụng

- Kế hoạch ngày giải thích lý do chọn bài theo năng lượng, lỗi đến hạn, mức chắc chắn, kết quả, recency và ngày thi; hành trình, thống kê theo giờ Việt Nam.
- 14 bài luyện ngắn bốn kỹ năng, giải thích câu hỏi, nháp Viết tự lưu, bài mẫu và tiêu chí tự kiểm tra.
- Buổi rút gọn 51 phút và đề tự biên soạn đủ cấu trúc 172 phút: 35 Nghe, 40 Đọc, 2 Viết, 3 Nói. Đồng hồ phục hồi sau tải lại, tự lưu và chuyển phần khi hết giờ.
- Sổ câu sai ưu tiên lỗi “sai nhưng rất chắc”, số lần sai, subskill, luyện nhớ lại và lịch ôn; 20 thẻ từ có ví dụ, phiên âm và phát âm.
- Ghi âm, nghe lại, tải âm thanh; bản Nói đã hoàn thành có bản lưu riêng trong lịch sử.
- Sao lưu/nhập JSON có kiểm tra; dữ liệu hỏng được giữ để phục hồi. Snapshot Supabase thủ công có kiểm tra phiên bản.
- Giao diện máy tính/điện thoại, bàn phím, reduced motion, trạng thái lỗi và trang 404.

Phân tích nỗi đau, UX và ranh giới sản phẩm: [docs/PRODUCT.md](docs/PRODUCT.md).
Báo cáo bàn giao đầy đủ: [docs/HANDOVER.md](docs/HANDOVER.md).

## Kết nối Supabase cho tài khoản riêng

1. Tạo dự án Supabase. Chạy `supabase/migrations/001_personal_study.sql` trong SQL Editor của dự án mới.
2. Tắt đăng ký công khai trong Auth; tạo tài khoản email/mật khẩu cho người học và lấy UUID tài khoản.
3. Chạy SQL bằng quyền quản trị, thay UUID thực:

```sql
insert into public.allowed_learners(user_id) values ('YOUR_AUTH_USER_UUID');
```

4. Sao chép `.env.example` thành `.env.local`, điền Project URL và **publishable key**. Không đưa secret key/service-role key vào biến `NEXT_PUBLIC_*`.
5. Khởi động lại ứng dụng (production phải build lại). Vào **Cài đặt → Đồng bộ**, đăng nhập tài khoản vừa cấp.
6. Thiết bị đầu tiên lưu lên đám mây. Thiết bị mới đăng nhập rồi tải bản đám mây về trước khi học. Khi tải về, ứng dụng xuất bản thiết bị hiện tại trước khi thay thế. Nếu xung đột phiên bản, xuất bản cục bộ rồi tải bản mới; không tự gộp hai nhánh lịch sử.

Migration bật RLS, chỉ tài khoản được cấp phép truy cập snapshot của mình. RPC kiểm tra revision trong giao dịch để tránh phiên cũ ghi đè qua luồng đồng bộ. Dự án Supabase thật đã được cấu hình và luồng đăng nhập, lưu, tải snapshot đã kiểm thử trên máy local; CI tiếp tục kiểm tra SQL/RLS độc lập bằng PostgreSQL qua PGlite. Chưa nghiệm thu đồng bộ trên thiết bị thứ hai.

## Dữ liệu và âm thanh

- Hồ sơ, đáp án, nháp và lịch sử ở localStorage; bản ghi âm ở IndexedDB. Dùng nhất quán một địa chỉ: `localhost` và `127.0.0.1` có kho dữ liệu khác nhau.
- JSON và Supabase snapshot **không bao gồm âm thanh**. Dùng nút tải bản ghi để giữ file hoặc chuyển thiết bị. Xóa dữ liệu trình duyệt/chế độ riêng tư có thể xóa kho học. Không có service worker hay cam kết offline hoàn toàn.
- Micro chỉ mở khi bấm ghi âm, cần HTTPS hoặc localhost. Dừng ghi âm và chờ nút tải xuất hiện trước khi đóng/tải lại trang. Nếu trình duyệt crash khi đang thu, đoạn chưa lưu không thể bảo đảm khôi phục.
- Giọng bài nghe/phát âm dùng speech synthesis của hệ điều hành. Hội thoại chọn giọng tiếng Anh khác nhau nếu thiết bị có đủ giọng; khả năng phát phụ thuộc thiết bị. Chưa có bản thu người nói.
- Đăng xuất đám mây vẫn giữ dữ liệu trên thiết bị. Đây là ứng dụng cho thiết bị cá nhân, không phải kho được mã hóa bằng mật khẩu đăng nhập.

## Kiểm tra và triển khai

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run test:production
```

`check` chạy ESLint, typecheck, Vitest và production build. `test:production` build rồi chạy toàn bộ Playwright trên `next start` ở cổng 3100; không dùng lại dev server cổng 3000. CI chạy bộ trình duyệt trên bản production đã build. Kiểm thử gồm chấm câu hỏi, lịch ôn, kế hoạch ngày, khôi phục deadline, cả hai bài Viết, RLS/xung đột SQL, nhiều tab cùng bài, lỗi lưu dữ liệu, từ chối micro, responsive và axe. MediaRecorder dùng nguồn micro giả lập Chromium; cần thử micro thật trên thiết bị người học. CI nằm trong `.github/workflows/check.yml`. Kết quả rà soát: [docs/QUALITY.md](docs/QUALITY.md).

Chạy bản build bằng `npm run build` rồi `npm start`. Bản pilot đã deploy trên Vercel với HTTPS và hai biến Supabase ở thời điểm build. Build cần mạng để lấy Be Vietnam Pro qua `next/font/google`. Chưa có tên miền riêng, monitoring hoặc quy trình vận hành production.

Trước khi dùng bản host với dữ liệu thật: thử đăng nhập/đồng bộ giữa hai thiết bị, xuất/khôi phục bản sao, nghe và ghi âm trên đúng điện thoại người học. Có thể dùng chế độ lưu trên thiết bị mà không bật Supabase.

## Độ chân thực của nội dung

Định dạng đối chiếu với [ULIS VSTEP Test format](https://vstep.vnu.edu.vn/test-format/) và [ĐH Sư phạm TP.HCM](https://vstep.hcmue.edu.vn/index.php/gioi-thieu/dinh-dang-de-thi/bac-345). Đề đầy đủ có đúng số câu và thời lượng theo khung; bốn bài Đọc của Mây dài khoảng 1.900–2.050 từ, nằm trong phạm vi 1.900–2.500 từ được ULIS công bố. Một phần ngữ liệu mở rộng từ bài ngắn, Viết/Nói dùng lại bài trong thư viện; không dùng đánh giá đầu vào nếu đã học trước.

Sau mỗi bài Reading/Listening ngắn, kết quả phân tách theo dạng câu hỏi và đối chiếu đáp án với mức **Đoán / Chưa chắc / Rất chắc** để chỉ ra lỗi hiểu nhầm và câu đúng còn thiếu chắc chắn. Trong đề có giờ, hộp xác nhận nộp báo rõ số câu bỏ trống; transcript Listening chỉ xuất hiện sau khi kết thúc buổi luyện.

Tất cả bài tập tự biên soạn, chưa được giáo viên thẩm định độ khó. Nghe cho phép phát lại và dùng giọng tổng hợp; đây là luyện theo cấu trúc, chưa tái hiện điều kiện phòng thi chính thức. Viết/Nói có lưu bài và tự đối chiếu, **chưa chấm bằng giáo viên hay AI**. Không quy đổi tỷ lệ đúng thành B1/B2/C1 hay hứa điểm thi. Kho hiện tại chưa đủ cho chương trình C1 toàn diện.
