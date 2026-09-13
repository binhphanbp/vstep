# Rà soát chất lượng — cập nhật 13/09/2026

Rà lại sau yêu cầu kiểm tra kỹ, gồm đọc code, tái hiện lỗi, sửa và kiểm thử hồi quy. Đây là bằng chứng cho phạm vi đã kiểm tra, không phải chứng nhận không còn lỗi hoặc hoàn thành mọi yêu cầu production.

## Lỗi dữ liệu đã tái hiện và sửa

### Phiên bản học liệu và đường ghi cloud

- Lượt học mới giữ snapshot đầy đủ của bài cùng `version`; lịch sử version 1 tương thích được nâng cấp sang snapshot khi đọc hoặc nhập. Sổ lỗi và lịch ôn dùng khóa gồm bài, version và câu hỏi. Đề có giờ giữ cả snapshot ngân hàng lẫn cấu trúc bốn phần từ lúc bắt đầu. Nháp quiz mang version; bản lệch version không áp lại chỉ số lựa chọn vào nội dung mới. Snapshot sai bài, sai kỹ năng, sai đáp án, sai tổng câu hoặc sai điểm bị từ chối ở boundary nhập dữ liệu.
- Migration `002_harden_snapshots.sql` thu hồi `insert/update/delete` trực tiếp khỏi learner, bỏ policy ghi trực tiếp và chuyển RPC sang `security definer` với `search_path` rỗng, UID/membership/revision được kiểm tra rõ. Contract DB kiểm tra các trường state cấp cao trước khi nhận snapshot; giới hạn 10 MiB cũ vẫn giữ.
- Kiểm thử hồi quy đã thất bại trên code/migration cũ: đổi đáp án làm phát sinh lỗi giả trong lịch sử; owner cập nhật trực tiếp mà revision không đổi; object chỉ có `version: 1` được DB nhận. Sau sửa, cả ba bị chặn hoặc giữ lịch sử đúng. Đề đang làm cũng được kiểm tra chấm theo snapshot cũ sau khi bank hiện hành đổi.

### Auth, backup và phát hành

- Supabase fetch có timeout 20 giây cho cả Auth và data; login treo trả lại nút cùng thông báo rõ, dữ liệu local giữ nguyên. Sync vẫn hủy khi rời trang/đổi phiên.
- Nếu cloud nhận snapshot nhưng trình duyệt không lưu được revision, app xuất ngay backup JSON và hướng dẫn tải cloud để đối chiếu, thay vì báo lỗi kỹ thuật hoặc thử ghi đè mù.
- CI chạy thêm `npm audit --omit=dev`. Workflow riêng chạy HTTPS smoke sau deployment Production và có chế độ chạy thủ công; runbook ghi cổng phát hành, rollback code/schema và khôi phục dữ liệu.

Bổ sung sau release `ac80772`: bản dự phòng trước khi nhập JSON hoặc tải cloud nay đọc lại state mới nhất, thay vì dùng snapshot từ lúc bắt đầu chờ file hoặc mạng. Kiểm thử hồi quy bao phủ cập nhật từ tab khác khi sự kiện storage chưa được xử lý. Báo cáo Word đã được đồng bộ lại sau release `f43fc23`.

### Đồng bộ đám mây khi mạng chậm và có lỗi

- Lấy dữ liệu mới nhất ngay trước khi gửi. Nếu người học lưu thay đổi trong lúc chờ tải lên, giao diện báo rõ còn thay đổi chưa lên cloud; lần lưu tiếp theo dùng revision vừa nhận và gửi đúng dữ liệu mới.
- Xóa thông báo thành công của lần trước khi bắt đầu đồng bộ mới, tránh hiển thị đồng thời “đã lưu” và lỗi xung đột phiên bản.
- Kiểm tra payload, revision và thời gian của bản sao trước khi phục hồi. Dữ liệu không hợp lệ nhận thông báo tiếng Việt dễ hiểu, không thay thế dữ liệu thiết bị hoặc đổ lỗi schema kỹ thuật ra màn hình.
- Ba ca lỗi đã thất bại trên bản production cũ trước khi sửa. Thêm ca tải bản sao thành công, kiểm tra file dự phòng chứa thay đổi vừa lưu trong lúc chờ mạng và hồ sơ khôi phục còn nguyên sau reload.
- Hủy yêu cầu đồng bộ khi rời trang hoặc phiên đăng nhập đổi/đăng xuất; bỏ qua phản hồi đến muộn để không phục hồi dữ liệu sau khi người học đã rời luồng này. Giới hạn chờ đồng bộ 20 giây, mở lại nút và hướng dẫn kiểm tra bản cloud nếu chưa rõ lần tải lên đã được máy chủ lưu hay chưa.
- Đăng xuất chỉ áp dụng cho phiên thiết bị hiện tại (`scope: local`), khóa thao tác cloud trong lúc chờ và giữ nguyên tiến độ học. Khi Supabase xóa phiên cục bộ nhưng máy chủ báo lỗi, thông báo phân biệt rõ đã đăng xuất trên máy và chưa xác nhận kết thúc phiên trên máy chủ.
- Bổ sung bốn ca cho đăng xuất khi server lỗi rồi đăng nhập lại, rời trang lúc đang tải, mạng treo và đăng xuất từ tab khác khi đang tải. Ba hành vi khóa nút/hủy khi rời trang/timeout đã thất bại trên bản cũ trước khi sửa.
- Tám ca cloud dùng API giả lập trong Playwright, không gửi dữ liệu đến Supabase thật. CI dùng URL/key công khai giả dành riêng cho kiểm thử; các ca này không thay thế nghiệm thu đăng nhập/sync thật giữa hai thiết bị.

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
- Sau khi nộp, mỗi câu đã chú giải hiện câu trong ngữ liệu quyết định đáp án, lý do phương án đã chọn chưa đúng, lý do đáp án đúng và phân tích các phương án còn lại. Bài Nghe có nút phát riêng câu bằng chứng đó. Khối này cũng xuất hiện trong Sổ lỗi và phần đối chiếu sau đề có giờ, nhưng không hiện khi đang làm bài.
- Phần thi có giờ báo rõ số câu Nghe/Đọc còn bỏ trống trước khi nộp. Transcript Listening được giữ kín trong lúc làm và chỉ hiện trong phần đối chiếu sau khi hoàn thành.
- Cẩm nang sửa phạm vi Reading chính thức thành 1.900–2.500 từ, đồng thời tách rõ đề Mây hiện có dài khoảng 1.900–2.050 từ.
- Bổ sung Content Security Policy cho bản static: chỉ cho script/style của chính website, kết nối Supabase, media Blob và chặn object/frame embedding; development thêm `unsafe-eval` theo yêu cầu debug của Next.js. Zod chạy chế độ không JIT để không phát sinh vi phạm `unsafe-eval` trên Firefox; bỏ ép nâng cấp URL tài nguyên ở local để WebKit tải đúng bản production HTTP dùng cho QA.
- Thêm web app manifest, màu theme và metadata màn hình chính. Tắt prefetch ở menu cố định và dùng `zod/mini` cho schema phía client để tránh tải route chưa dùng và giảm JavaScript ban đầu.

## Bằng chứng kiểm tra

- 64 kiểm thử Vitest: logic học, version học liệu, confidence, chẩn đoán theo dạng câu và planner, cá nhân hóa dữ liệu cũ, độ đầy đủ cấu trúc, dữ liệu/khôi phục và SQL/RLS trên PostgreSQL qua PGlite. Sáu ca mới kiểm chứng chú giải bằng chứng: trích dẫn phải trùng nguyên văn ngữ liệu, mỗi lựa chọn có đúng một ghi chú, chỉ đáp án đúng được đánh dấu “Đúng:”, không có chú giải mồ côi và chú giải theo đúng câu được dùng lại trong đề đầy đủ.
- 40 kiểm thử Playwright trên bản production: 36 ca Chromium, hai ca Firefox và hai ca WebKit. Phạm vi gồm mười ca cloud giả lập, toàn bộ tám bài Reading/Listening trên mobile ở cả ba engine, tải backup JSON đa trình duyệt, phục hồi bài, lưu hai bài Viết, ghi âm khi chuyển phần, nhiều tab, import/export, dung lượng bị chặn, micro bị từ chối, con trỏ tùy biến, manifest, CSP không dùng eval, header bảo vệ và HTTP 404.
- Axe WCAG A/AA trên 13 màn, cộng kết quả đề đầy đủ mở giải thích trên mobile; kiểm tra chiều rộng các màn chính ở 390 px.
- ESLint, TypeScript, production build: đạt.
- `npm audit --omit=dev`: không báo lỗ hổng ngày 13/09/2026. Đây là kết quả advisory hiện có, không thay thế rà soát bảo mật toàn diện.
- GitHub Actions run `34733331145` đạt cho release `6cdbbfe`: lint, typecheck, 57 unit, build 45 route, audit dependency và 40 E2E trên Chromium, Firefox, WebKit.
- Smoke test bản HTTPS `https://vstep-turtle.vercel.app` ngày 13/09/2026: workflow run `34733348658` đối chiếu đúng SHA release; 23 route gồm 9 màn chính và 14 bài luyện tải đúng trên Chromium, Firefox và WebKit, không tràn ngang ở 390 px; route giả HTTP 404, HSTS/CSP và các header bảo vệ hiện diện. Luồng Reading/Listening chấm điểm, phân tích và mở transcript sau khi nộp không có lỗi runtime.
- Supabase production đã áp dụng migration 002 ngày 13/09/2026. Hậu kiểm xác nhận contract tồn tại, `authenticated` không có quyền UPDATE trực tiếp, không còn policy ghi trực tiếp, RPC dùng `SECURITY DEFINER`, và một snapshot hiện có vẫn nguyên vẹn.
- Lighthouse mobile chạy ba lần trên bản production local sau tối ưu: tổng payload giảm từ khoảng 516 KiB xuống 376 KiB, JavaScript từ 354 KiB xuống 218 KiB và phần JavaScript chưa dùng từ 169 KiB xuống 26 KiB. Accessibility và Best Practices đạt 100; Performance dao động 73–84 do mô phỏng CPU. SEO 60 là hệ quả chủ đích của `noindex` cho ứng dụng cá nhân.

## Giới hạn còn mở

Chú giải bằng chứng mới phủ 56/111 câu Reading/Listening: toàn bộ 36 câu của 8 bài ngắn, cộng 20 câu Reading được đề đầy đủ dùng lại. 35 câu Nghe và 20 câu Đọc riêng của đề đầy đủ chưa có chú giải, nên các câu này vẫn chỉ hiện phần giải thích cũ. Kiểm thử chỉ xác minh trích dẫn khớp ngữ liệu và cấu trúc ghi chú, không thay cho thẩm định chuyên môn về độ khó hay tính chuẩn xác của lập luận.

Đã có môi trường HTTPS pilot nhưng chưa thử đăng nhập/sync bằng tài khoản thật trên host, micro/giọng đọc trên thiết bị người học, bản thu người nói, thẩm định độ khó từ giáo viên hay chức năng chấm Viết/Nói. Supabase thật đã được cấu hình và kiểm thử riêng theo `STATUS.md`. Đã có smoke test bằng engine WebKit nhưng chưa xác minh Safari/iOS trên thiết bị thật. Đồng bộ giữa tab giúp tránh ghi đè tuần tự thường gặp, không phải giao thức hợp nhất chỉnh sửa đồng thời như trình soạn thảo cộng tác. Dữ liệu vẫn cần sao lưu theo README, âm thanh tải riêng.
