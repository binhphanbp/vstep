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

## Rà soát sâu ngày 13/09/2026 — Reading và Speaking

Đợt rà soát nhiều tác nhân song song trên `028e53e`. Các lỗi dưới đây đều đã được tái hiện trước khi sửa.

- **Bịa lượt học và xóa lịch ôn.** `advanceExam` ghi một lượt 0 điểm cho mọi bài trong phần đã hết giờ, kể cả bài người học chưa mở, rồi `recordAttempt` coi câu bỏ trống như câu sai và xóa lịch ôn của nó. Tái hiện: bỏ dở một buổi rút gọn không trả lời câu nào rồi mở lại sau 4 ngày → sinh 4 lượt 0/4 và 0/5, cộng thêm **25 phút học không có thật**, và **5 lịch ôn chu kỳ 120 ngày bị xóa sạch**. Ngày của lượt còn bị lùi về hạn chót của phần thi nên `streak()` tính thêm một ngày học. Nay phần không có câu trả lời nào không được ghi nhận, và chỉ câu thực sự trả lời sai mới làm lịch ôn đến hạn lại.
- **Thời gian phần thi bị đánh rơi.** Thời lượng trước đây luôn chia đều theo số bài trong phần, nên khi một bài không được ghi nhận thì phần thời gian của nó biến mất. Nay thời gian chia theo trọng số trên đúng các bài được ghi nhận; bài essay của đề đầy đủ vẫn nặng gấp đôi email, và khi chỉ làm một trong hai bài Viết thì bài đó nhận trọn thời gian.
- **Xem lại phần Đọc sau khi thi không có ngữ liệu.** Màn hình kết thúc chỉ hiện bản chép lời cho bài Nghe; bài Đọc chỉ có câu hỏi và giải thích, không một dòng nào của bài đọc dài ~500 từ vừa làm. Nay cả hai kỹ năng đều hiện ngữ liệu để đối chiếu.
- **Câu hỏi neo theo vị trí đoạn văn bị sai trong đề đầy đủ.** `full-rm5` hỏi "đoạn cuối" nhưng bản mở rộng nối thêm 4 đoạn, nên bằng chứng nằm ở đoạn 5/9 và không phương án nào đúng với đoạn cuối thật. Đã đổi cách hỏi cho bản đề và tách `version` riêng cho bài đó; `full-rm4`, `full-rg4` (“paragraph three”) vẫn đúng vì phần mở rộng nối phía sau. Hai kiểm thử mới chặn cả lớp lỗi này.
- **Bản ghi cũ nộp được thành buổi luyện mới.** Cổng nộp bài Nói chỉ kiểm tra "có bản ghi trong kho", mà kho thì không bao giờ xóa. Mở lại một bài Nói đã làm hôm trước rồi bấm hoàn thành là sinh một lượt học mới trỏ vào đúng đoạn âm thanh cũ, lặp lại bao nhiêu lần cũng được. Nay mỗi bản ghi mang mốc thời gian và chỉ bản mới hơn lượt đã nộp gần nhất mới được chấp nhận; bản ghi lưu từ trước khi có mốc vẫn nghe và tải được nhưng không nộp lại được.
- **Phần Nói trong đề ghi 0 phút.** Lượt Nói được tạo từ callback của máy ghi âm, mà callback này cũng chạy khi tải lại trang với bản ghi khôi phục — lúc đó không có thời lượng nên lượt bị ghi 0 giây, và `recordAttempt` giữ bản ghi đầu tiên nên con số sai đó không sửa được nữa. Nay chỉ bản ghi vừa thu mới tạo lượt.
- **Nộp phần Viết/Nói trống không có cảnh báo.** Hộp xác nhận chỉ đếm câu trắc nghiệm chưa trả lời, mà bài Viết và Nói không có câu hỏi nào; bài essay chưa viết một chữ bị bỏ đi im lặng. Nay hộp xác nhận gọi tên đúng phần còn trống.
- **Mốc bắt đầu buổi thi lấy từ đồng hồ interval.** Trình duyệt hãm `setInterval` ở tab ẩn, nên mở trang thi rồi chuyển sang việc khác, quay lại bấm bắt đầu sẽ đặt hạn chót theo thời điểm cũ và ăn mất thời gian phần đầu. Nay mốc lấy từ thời điểm bấm thật.
- **Đáp án phần Đọc đoán được mà không cần đọc.** Chuỗi đáp án bốn bài Đọc của đề đủ cấu trúc là `BCADB BCADB / BCADB BACDB / ACBDC BCADB / BCDAB BCADB`: lặp mẫu `BCADB`, nên đoán mù theo mẫu được **33/40 (82,5%)**; B chiếm 15/40. Bài Đọc ngắn 15/20, Nghe ngắn 11/16. Nguyên nhân là thứ tự lựa chọn khi biên soạn rơi vào thói quen. Nay thứ tự lựa chọn của mỗi câu được cố định từ chính mã câu hỏi (`src/lib/option-order.ts`), `optionNotes` hoán vị kèm theo, nội dung đáp án đúng không đổi. Muối được chọn bằng cách đo 3.000 ứng viên trên cả bốn ngân hàng. Đo lại sau khi sửa: phần Đọc đề đầy đủ **45%**, Nghe 49%, hai ngân hàng ngắn 50% — mức nhiễu của phép dò 1.364 mẫu chu kỳ trên 16–20 câu, không còn là quy luật. Phân bố đều lại (Đọc A:10 B:8 C:11 D:11) và không bài nào có ba đáp án giống nhau liên tiếp. Cân bằng tuyệt đối trong bài bị cố ý tránh: một bài 4 câu có đủ A, B, C, D sẽ cho phép suy ra câu cuối từ ba câu đầu. Việc này đổi nội dung đã phát hành nên mọi bài học lên version 2 (`full-reading-memory` lên 3), tức lịch ôn cũ của các bài đó không còn dùng lại.
- **Đường khôi phục dữ liệu hỏng lại phá hủy dữ liệu.** Khi `may-study-v1` không đọc được, `readInitial` giữ state rỗng và đặt `storageError`; banner đẩy người học sang Cài đặt. Nhưng ở đó `currentBackupState()` trả về đúng state rỗng ấy, nên: nút "Xuất bản sao" tạo file hồ sơ trống, "Lưu lên đám mây" ghi hồ sơ trống đè lên hàng snapshot duy nhất trên cloud, và file "bản hiện tại" hứa xuất trước khi nhập/tải cloud cũng trống — rồi `replaceStudy` ghi đè luôn chuỗi JSON hỏng, vốn là bản cuối cùng còn chứa lịch sử thật và thường sửa tay được. Nay mọi đường xuất đều lấy **nguyên văn chuỗi đang lưu** khi dữ liệu lỗi, và nút lưu lên đám mây bị khoá kèm giải thích thay vì ghi đè.
- **Đồng bộ đám mây chết hẳn trên iPhone cũ.** `fetchWithTimeout` gọi `AbortSignal.any`, mà API này chỉ có từ Safari 17.4 và Firefox 124; cả hai chiều đồng bộ đều truyền upstream signal nên luôn đi qua nhánh đó. Trên iOS 16.4–17.3, lệnh ném `TypeError` trước khi request được gửi, còn giao diện lại đổ lỗi cho mạng, migration và quyền Supabase. Nay tín hiệu upstream được chuyển tiếp thủ công vào controller, chạy được trên mọi trình duyệt.
- **Hồi quy từ chính bản sửa trước.** Khung ngữ liệu dính 52vh ở commit `bcc62f7` được gắn cho mọi kỹ năng trong trang luyện, nên trên màn hình 390×844 khung đề Viết và Nói chiếm 52% màn hình vĩnh viễn khi đang gõ hoặc ghi âm. Nay chỉ phần Đọc mới dính; đo lại: Viết 27%, Nói 38%, Nghe cuộn hết khỏi màn hình, Đọc giữ 52% như thiết kế.

- Phần Đọc trong đề có giờ trước đây dùng khung ngữ liệu thường: đo trên máy, khung cao 2.353 px và câu hỏi đầu tiên nằm ở y≈3.442 px, tức phải cuộn khoảng bốn màn hình điện thoại mới tới câu 1 rồi cuộn ngược lại để tra từng chi tiết. Trang luyện tập đã có khung dính nhưng phòng thi thiếu lớp `reading-panel`. Nay hai nơi dùng chung khung dính, tự cuộn; trên màn hình hẹp khung giới hạn 52vh nên ngữ liệu vẫn hiện khi trả lời câu cuối của bài. Có kiểm thử E2E khóa lại hành vi này.
- Sổ luyện Nói: "Luyện lại" trước đây giữ nguyên trạng thái đã có bản ghi, nên có thể nộp lại chính bản ghi cũ thành một lượt học mới. Nay vòng mới yêu cầu ghi âm lại.
- Màn hình bắt đầu đề đủ cấu trúc nay nói rõ 20/40 câu Đọc là câu của bốn bài ngắn trong thư viện, còn 35 câu Nghe là nội dung mới; có kiểm thử giữ cho con số này không lệch khi bổ sung học liệu.
- Sau khi nộp, mỗi câu đã chú giải hiện câu trong ngữ liệu quyết định đáp án, lý do phương án đã chọn chưa đúng, lý do đáp án đúng và phân tích các phương án còn lại. Bài Nghe có nút phát riêng câu bằng chứng đó. Khối này cũng xuất hiện trong Sổ lỗi và phần đối chiếu sau đề có giờ, nhưng không hiện khi đang làm bài.
- Phần thi có giờ báo rõ số câu Nghe/Đọc còn bỏ trống trước khi nộp. Transcript Listening được giữ kín trong lúc làm và chỉ hiện trong phần đối chiếu sau khi hoàn thành.
- Cẩm nang sửa phạm vi Reading chính thức thành 1.900–2.500 từ, đồng thời tách rõ đề Mây hiện có dài khoảng 1.900–2.050 từ.
- Bổ sung Content Security Policy cho bản static: chỉ cho script/style của chính website, kết nối Supabase, media Blob và chặn object/frame embedding; development thêm `unsafe-eval` theo yêu cầu debug của Next.js. Zod chạy chế độ không JIT để không phát sinh vi phạm `unsafe-eval` trên Firefox; bỏ ép nâng cấp URL tài nguyên ở local để WebKit tải đúng bản production HTTP dùng cho QA.
- Thêm web app manifest, màu theme và metadata màn hình chính. Tắt prefetch ở menu cố định và dùng `zod/mini` cho schema phía client để tránh tải route chưa dùng và giảm JavaScript ban đầu.

## Bằng chứng kiểm tra

- 74 kiểm thử Vitest: logic học, version học liệu, confidence, chẩn đoán theo dạng câu và planner, cá nhân hóa dữ liệu cũ, độ đầy đủ cấu trúc, dữ liệu/khôi phục và SQL/RLS trên PostgreSQL qua PGlite. Sáu ca mới kiểm chứng chú giải bằng chứng: trích dẫn phải trùng nguyên văn ngữ liệu, mỗi lựa chọn có đúng một ghi chú, chỉ đáp án đúng được đánh dấu “Đúng:”, không có chú giải mồ côi và chú giải theo đúng câu được dùng lại trong đề đầy đủ.
- 42 kiểm thử Playwright trên bản production: 38 ca Chromium, hai ca Firefox và hai ca WebKit. Phạm vi gồm mười ca cloud giả lập, toàn bộ tám bài Reading/Listening trên mobile ở cả ba engine, tải backup JSON đa trình duyệt, phục hồi bài, lưu hai bài Viết, ghi âm khi chuyển phần, nhiều tab, import/export, dung lượng bị chặn, micro bị từ chối, con trỏ tùy biến, manifest, CSP không dùng eval, header bảo vệ và HTTP 404.
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
