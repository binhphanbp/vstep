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
- Màn hình bắt đầu đề đủ cấu trúc nay nói rõ bốn bài Đọc mở rộng từ bốn bài ngắn trong thư viện nhưng **cả 40 câu hỏi đều là câu riêng của đề**, còn 35 câu Nghe là nội dung mới; có kiểm thử chặn việc dùng lại bất kỳ mã câu hay đề bài nào giữa hai ngân hàng.
- Sau khi nộp, mỗi câu đã chú giải hiện câu trong ngữ liệu quyết định đáp án, lý do phương án đã chọn chưa đúng, lý do đáp án đúng và phân tích các phương án còn lại. Bài Nghe có nút phát riêng câu bằng chứng đó. Khối này cũng xuất hiện trong Sổ lỗi và phần đối chiếu sau đề có giờ, nhưng không hiện khi đang làm bài.
- Phần thi có giờ báo rõ số câu Nghe/Đọc còn bỏ trống trước khi nộp. Transcript Listening được giữ kín trong lúc làm và chỉ hiện trong phần đối chiếu sau khi hoàn thành.
- Cẩm nang sửa phạm vi Reading chính thức thành 1.900–2.500 từ, đồng thời tách rõ đề Mây hiện có dài khoảng 1.900–2.050 từ.
- Bổ sung Content Security Policy cho bản static: chỉ cho script/style của chính website, kết nối Supabase, media Blob và chặn object/frame embedding; development thêm `unsafe-eval` theo yêu cầu debug của Next.js. Zod chạy chế độ không JIT để không phát sinh vi phạm `unsafe-eval` trên Firefox; bỏ ép nâng cấp URL tài nguyên ở local để WebKit tải đúng bản production HTTP dùng cho QA.
- Thêm web app manifest, màu theme và metadata màn hình chính. Tắt prefetch ở menu cố định và dùng `zod/mini` cho schema phía client để tránh tải route chưa dùng và giảm JavaScript ban đầu.

## Đợt sửa F14–F19 (sau `cf12c02`)

- **Đề đầy đủ không còn dùng chung câu hỏi với thư viện.** 20/40 câu Đọc của đề trước đây chính là câu của bốn bài ngắn: khóa lịch ôn `lesson@version:question` không gộp được `reading-cafe@v2:rc1` với `full-reading-cafe@v2:full-rc1`, nên một hiểu nhầm sinh hai thẻ trùng từng chữ trong Sổ lỗi và `wrongCount` bị chia đôi; ai đã luyện bốn bài ngắn cũng có sẵn một nửa số điểm phần Đọc. Nay 20 câu đó được viết mới cho chính đề, mỗi câu có trích dẫn nguyên văn và phân tích đủ bốn phương án. Đo lại khả năng đoán mù theo chu kỳ trên phần Đọc của đề: **17/40 (43%)**, phân bố A:9 B:8 C:9 D:14. Bốn bài Đọc của đề lên version 3, `full-reading-memory` lên 4 — lịch ôn cũ của riêng bốn bài này không dùng lại; bài ngắn không đổi.
- **Độ chính xác theo kỹ năng không còn bị một buổi thi quét sạch.** `skillStats` lấy 5 lượt gần nhất, mà phần Nghe của đề đủ cấu trúc ghi 14 lượt riêng lẻ, nhiều lượt chỉ một câu. Nay cửa sổ tính theo 30 câu gần nhất và cộng dồn trọn từng lượt. Kiểm thử: 6 bài 5 câu đúng hết rồi 8 phần thi một câu sai hết cho **76%** thay vì 0%.
- **Bỏ lần kiểm tra toàn bộ hồ sơ mỗi giây.** Phòng thi chỉ gọi `updateStudy` khi đồng hồ chạm hạn chót; trang luyện gom giây học và ghi mỗi 10 giây, xả nốt khi rời trang hoặc nộp nên không mất giây nào; store nhớ chuỗi đã đọc và bỏ qua parse khi nội dung không đổi. Đo với hồ sơ 104 lượt (567 KiB): parse + kiểm tra Zod 3,9 ms mỗi lần, so sánh chuỗi 0,8 ms. Số lần ghi ở trang luyện giảm từ 60 xuống 6 mỗi phút, phòng thi xuống 0.
- **Phần Nói hoàn thành được trên thiết bị không có micro.** Trước đây trang luyện chặn nộp và phòng thi chỉ tạo lượt từ callback ghi âm, nên ba bài Nói giữ mãi điểm “chưa từng luyện” và chiếm một suất kế hoạch ngày. Nay có ô xác nhận đã trả lời thành tiếng mà không ghi âm: lượt được lưu, không có `recordingId` và giao diện không hứa có gì để nghe lại. Trong đề, phần Nói đánh dấu như vậy chia thời gian của phần thi như bài Viết; phần đã thu vẫn giữ thời lượng thật.
- **Bản ghi: giữ được, xóa được, chỉ đúng chỗ.** Lần lưu đầu tiên xin `navigator.storage.persist()` để trình duyệt không tự thu hồi; mỗi buổi trong Lịch sử có nút xóa kèm xác nhận; chữ trong Cài đặt sửa từ “tải từng bản tại bài Nói” thành trỏ sang Lịch sử, nơi thật sự có bản ghi của từng lượt.
- **Phòng thi nhớ ngữ liệu đang làm.** Chỉ số ngữ liệu vào `examSchema`; tải lại giữa phần Đọc 60 phút quay lại đúng văn bản đang đọc thay vì bài 1/4, và phần Viết giữ đúng bài đang viết. Chỉ số đặt lại khi sang phần mới.

## Ma trận dạng câu (F13)

- **Bảng phân tích theo dạng câu đang nói sai về chính nó.** Sau mỗi buổi Reading/Listening, màn hình kết quả tách điểm theo dạng câu — nhưng 14 câu mang nhãn sai. “Why does the speaker mention a bench halfway to a park?” hỏi **chức năng của một ví dụ**, không phải một chi tiết; “Why is the river clean-up not selected?” phải **ghép hai lượt thoại** mới trả lời được; hai thông báo Part 1 (đổi sân ga, dời giờ hẹn) là dạng **thông tin bị đính chính**, dạng riêng của kỹ năng Nghe. Đã gắn lại nhãn theo đúng thứ câu hỏi đang đo. Việc này không đổi đề bài, phương án hay đáp án nên không tạo version mới — cùng quy ước đã dùng cho lớp chú giải.
- **Ngân hàng chưa từng có ma trận.** `src/lib/question-types.ts` nay định nghĩa bộ nhãn của từng kỹ năng và số câu mục tiêu; `tests/unit/question-types.test.ts` khóa lại. Đây là ma trận biên soạn của Mây, **không phải quy định chính thức**: định dạng công bố nói số câu và thời lượng, không nói tỷ lệ từng dạng.
- **Tám câu Đọc được viết mới để đủ ma trận**: hai câu từ vựng trong ngữ cảnh, ba câu từ tham chiếu, một câu ý chính và hai câu mục đích tác giả, thay cho tám câu chi tiết. Bốn bài Đọc của đề lên version 4, `full-reading-memory` lên 5; lịch ôn cũ của riêng bốn bài này không dùng lại, bài ngắn trong thư viện không đổi.

| Dạng câu | Đọc trước | Đọc sau | Nghe trước | Nghe sau |
| --- | --- | --- | --- | --- |
| Thông tin chi tiết | 20 | **14** | 29 | **18** |
| Suy luận | 9 | 9 | 1 | **5** |
| Ý chính | 3 | **4** | 2 | **3** |
| Từ vựng trong ngữ cảnh | 2 | **4** | – | – |
| Từ tham chiếu | 1 | **4** | – | – |
| Mục đích tác giả / người nói | 4 | 4 | 0 | **3** |
| Quan điểm tác giả / người nói | 1 | 1 | 3 | **4** |
| Thông tin thay đổi | – | – | 0 | **2** |

Mỗi bài Đọc của đề nay có đủ sáu nhóm dạng câu và không quá 5 câu chi tiết. Phần Nghe được viết theo sàn và trần thay vì số chính xác: Part 1 là tám thông báo ngắn vài câu, ép trải đều ở đó sẽ thành bịa ra suy luận mà ngữ liệu không có. 18/35 câu chi tiết vẫn là nhiều; mở rộng ngân hàng Nghe còn là việc phía trước.

Viết lại tám câu làm đổi đáp án, nên phép đo đoán mù theo chu kỳ được chạy lại và thứ tự phương án của tám câu mới được dò trên 65.536 tổ hợp: phần Đọc của đề còn **16/40 (40%)**, thấp hơn cả trước đợt này (17/40), và phân bố đáp án đều tuyệt đối A:10 B:10 C:10 D:10.

Lớp chú giải bằng chứng theo đó phủ **64/111** câu (trước là 56/111): tám câu mới đều có trích dẫn nguyên văn và phân tích đủ bốn phương án.

## Đợt 1 của kế hoạch 14/09: đo cho đúng và không bỏ sót bài nào

- **Độ chính xác không còn tính lượt làm lại (A1, đóng phần lớn F07).** `skillStats` trước đây lấy 30 câu gần nhất bất kể là lần đầu gặp bài hay lần làm lại bài đã biết đáp án. Đo được: hai bài Đọc lần đầu đúng 2/5 mỗi bài cho **40%**; làm lại đúng hết bốn lần đẩy lên **80%**, vượt ngưỡng 65% mà `todayPlan` dùng để ưu tiên kỹ năng đang yếu — tức chỉ bằng việc lặp lại, kỹ năng yếu mất ưu tiên. Nay lượt đầu của mỗi `lesson@version` là lượt đo năng lực, lượt sau đếm riêng. Cách làm là **suy ra từ thứ tự thời gian, không thêm trường vào `attemptSchema`**, nên mọi bản sao lưu cũ vẫn nhập được. Bài được viết lại nội dung tính là lần đầu trở lại, vì đó là ngữ liệu người học chưa gặp.
- **Sổ lỗi biết quên (A2).** Tái hiện trước khi sửa: làm sai `rc1`, làm lại cả bài đúng hết, thẻ vẫn nằm trong sổ và vẫn `due = true` — chỉ nút ôn trong chính màn Sổ lỗi mới dời lịch, nên số lỗi chỉ có thể tăng. Nay trả lời đúng trong một buổi luyện được tính như một lần ôn đạt và dời lịch; thẻ chuyển sang nhóm "đã sửa được" và không còn đến hạn. Sai lại thì thẻ quay lại hàng đợi, `wrongCount` tăng tiếp.
- **Không bài nào nằm ngoài tầm với (A3).** `writing-essay` dài 40 phút nên không thể thỏa `minutes <= remaining` ở nhịp 30 phút: mô phỏng 14 ngày cho thấy nó **chưa từng được đưa ra một lần nào**. Nay bài dài hơn ngân sách được đề nghị dưới dạng **chia buổi** khi đã 14 ngày chưa đụng tới và còn đủ một nửa thời lượng, có nhãn "chia buổi" cùng lý do trên thẻ bài, và chỉ trừ nửa ngân sách của hôm nay. Mô phỏng lại: essay xuất hiện ngày 6, và cả **14/14 bài** đều có đường vào kế hoạch ngày.
- Trang Tiến bộ tách hai con số kèm giải thích; thẻ kỹ năng ở trang chính đổi nhãn thành "Độ chính xác lần đầu"; màn Sổ lỗi đếm riêng *đang cần sửa* và *đã sửa được*.

## Đợt 2 của kế hoạch 14/09: chọn bài theo dạng câu đang sai

- **Kế hoạch ngày biết dạng câu, không chỉ biết kỹ năng (B1).** `questionTypeStats` đếm đúng/sai theo nhãn dạng câu của F13, **chỉ tính lượt đầu** của mỗi `lesson@version` (A1) và bỏ qua câu để trống vì không trả lời thì không phải là sai dạng đó. Một dạng chỉ được coi là điểm yếu khi đã làm ít nhất **3 câu** (`TYPE_EVIDENCE_MINIMUM`), xếp theo tỉ lệ sai rồi tới số câu sai dù đã chọn "Rất chắc". Hai dạng yếu nhất cộng điểm cho bài chứa chúng (tối đa 24 điểm) và thành lý do đọc được trên thẻ bài: "Thông tin chi tiết: sai 6/7 câu đã làm".
- **Sửa luôn chỗ kế hoạch bị khoá.** Đo trước khi sửa, mô phỏng người học bỏ trống mọi câu trong 14 ngày: chỉ **7/14** bài từng được đưa ra — điểm ưu tiên theo lỗi đến hạn lớn tới mức nửa thư viện không bao giờ xuất hiện. Trần điểm "sai dù rất chắc" hạ từ `sai × 30` xuống `min(45, sai × 15)`, và mỗi ngày luôn có **một suất dành cho bài chưa gặp** trước khi xếp phần còn lại. Mô phỏng lại cùng kịch bản: **13/14** bài.
- **Màn "Chỗ mình hay vấp" (B2).** Sổ lỗi có thêm phần đầu trang theo dạng câu: mỗi dòng một thanh tỉ lệ kèm con số viết bằng chữ ("Sai 6/7 câu"), nhãn riêng cho số câu sai dù đã chọn "Rất chắc", và một liên kết "Luyện dạng này" dẫn thẳng tới bài chứa dạng đó (ưu tiên bài chưa làm). Dạng chưa đủ 3 câu thì nói thẳng "chưa đủ để kết luận" thay vì vẽ thanh rỗng. Thanh dùng một màu duy nhất, có `role="img"` kèm nhãn đọc được, và con số luôn nằm ở phần chữ nên không có thông tin nào chỉ nằm ở màu.
- Đo lại ở 390px và chạy axe WCAG A/AA: đạt.

## Đợt 3 của kế hoạch 14/09 (A4): mở rộng ngân hàng — 16 bài mới

- **Thêm 4 bài Đọc ngắn**: `reading-nightshift` (Công việc, B2, 10 phút), `reading-market` (Cuộc sống Sài Gòn, B1, 10 phút), `reading-homestay` (Du lịch, B1, 8 phút), `reading-sleep` (Sức khoẻ, B2, 10 phút). Bài mới mang mã mới; không sửa một chữ nào của bài đã phát hành nên không bài nào phải lên version và lịch ôn hiện có không mất.
- **Viết theo ma trận dạng câu.** 20 câu mới phân bố: 4 ý chính, 5 thông tin chi tiết, 4 suy luận, 2 từ vựng trong ngữ cảnh, 2 mục đích tác giả, 2 quan điểm tác giả, 1 từ tham chiếu — không bài nào quá 2 câu chi tiết, tức không bài nào là bài dò thông tin.
- **Đo lại chu kỳ đáp án sau khi thêm**: ngân hàng Đọc ngắn 40 câu, đoán mù theo chu kỳ tốt nhất còn **45%** (ngưỡng test là 65% cho ngân hàng nhỏ), phân bố đáp án A/B/C/D là 9/9/10/12 và không bài nào có hai đáp án giống nhau liên tiếp quá hai lần.
- **Chú giải đầy đủ ngay từ đầu**: cả 20 câu đều có trích dẫn nguyên văn khớp ngữ liệu và bốn ghi chú phương án, đúng chuẩn F11 — test chú giải phủ toàn bộ 12 bài Đọc/Nghe ngắn hiện có.
- **Kho cho kế hoạch ngày sau bốn bài Đọc**: 141 → 219 phút. Mô phỏng 14 ngày vẫn đưa ra được mọi bài trong thư viện.
- Test lọc thư viện trong E2E nay đếm số bài từ chính ngân hàng thay vì con số cứng, nên thêm bài không còn làm đỏ một phép kiểm tra không liên quan.
- **Thêm 4 bài Nghe ngắn**: `listening-clinic` (Sức khoẻ, B1, tin nhắn thoại đổi lịch hẹn), `listening-bus` (Giao thông, B1, thông báo đổi tuyến tạm thời), `listening-course` (Giáo dục, B2, buổi giới thiệu khóa học), `listening-recycling` (Môi trường, B2, thông báo phân loại rác). 16 câu mới chỉ có **5 câu chi tiết**; phần còn lại là thông tin thay đổi, ý chính, suy luận, mục đích và quan điểm người nói — đúng hướng đã sửa ở F13, nơi phần Nghe từng có 29/35 câu chi tiết.
- **Đo lại ngân hàng Nghe ngắn sau khi thêm** (32 câu): đoán mù theo chu kỳ tốt nhất **50%**, phân bố đáp án 7/7/9/9. Cả 16 câu đều có trích dẫn nguyên văn khớp transcript và bốn ghi chú phương án.
- **Thêm 4 bài Đọc và 4 bài Nghe nữa** để khép A4: `reading-tutor` (Giáo dục), `reading-river` (Môi trường), `reading-bikes` (Giao thông), `reading-interview` (Công việc); `listening-hotel` (Du lịch), `listening-water` (Cuộc sống Sài Gòn), `listening-handover` (Công việc), `listening-pharmacy` (Sức khoẻ).
- **Kết quả cuối đợt**: thư viện 14 → **30 bài** (12 Đọc, 12 Nghe, 3 Viết, 3 Nói); kho cho kế hoạch ngày 141 → **329 phút**; build sinh 61 route (trước là 45); chú giải bằng chứng phủ **136/183 câu**.
- **Đo lại toàn ngân hàng ngắn sau khi thêm**: Đọc 60 câu — đoán mù theo chu kỳ **40%**, phân bố 15/13/14/18; Nghe 48 câu — **43,8%**, phân bố 12/10/13/13. Cả hai đều tốt hơn trước khi thêm bài, vì ngân hàng lớn hơn thì một mẫu lặp khó trùng hơn.
- **Một điều chỉnh test đã ghi lại trong kế hoạch**: phép kiểm tra "mọi bài đều có đường vào kế hoạch ngày" nâng cửa sổ mô phỏng từ 14 lên 21 ngày, vì thư viện nay nhiều hơn hai tuần học; bài muộn nhất xuất hiện ngày 15. Điều được kiểm tra vẫn là không bài nào nằm ngoài tầm với.

## Đợt 4 của kế hoạch 14/09: ngày thi, ngày bận, mốc thật và thẻ từ

- **Ngày thi thành việc của tuần (B3).** `examDate` trước đây chỉ cộng 12 điểm cho bài B2 khi còn ≤30 ngày — nói y hệt nhau ở ngày 30 và ngày 2. Nay `examWeekPlan` chia thành ba giai đoạn (**>42 ngày** xây nền, **15–42** luyện dạng đang sai, **≤14** tập nhịp thi) và trang Lộ trình hiện 2–3 việc cụ thể dựng từ dữ liệu thật: số bài chưa gặp, thẻ từ đến hạn, dạng câu đang sai kèm tỉ lệ, số lỗi đến hạn, đã thi thử hay chưa. Không có ngày thi, hoặc ngày đã qua, thì hàm trả `null` và giao diện nói thẳng là chưa có mốc nào.
- **Buổi 10 phút cho ngày bận (B4).** Mức "Hơi mệt" trước đây chỉ hạ ngân sách xuống 15 phút rồi vẫn phục vụ bài tiêu chuẩn — bài ngắn nhất là 6 phút, phần lớn 8–10 phút — nên ngày mệt thành lựa chọn được ăn cả ngã về không. Nay có một buổi ngắn hơn cả một bài: một ngữ liệu Nghe ≤8 phút (ưu tiên bài chưa gặp), tối đa 3 thẻ từ đến hạn và câu sai nhiều lần nhất. Không có thẻ hay lỗi nào đến hạn thì nói thẳng là không có.
- **Chỉ chúc mừng việc đã xảy ra (B5).** `milestones` dựng bốn loại mốc, mỗi mốc kèm bằng chứng: chuỗi ≥3 ngày (kèm ngày buổi gần nhất), lần đầu hoàn thành đề có giờ, lần đầu đúng trọn một dạng câu **từng sai trước đó** (lần sạch phải có ≥3 câu cùng dạng), và từ đã nhớ qua mốc 60 ngày. Không có mốc nào thì trang chính giữ câu động viên cũ thay vì dựng thành tích.
- **Thẻ từ lớn lên theo lỗi thật (B6).** 10 thẻ viết tay cho toàn bộ câu "từ vựng trong ngữ cảnh" (6 câu thư viện + 4 câu đề đầy đủ), có nghĩa tiếng Việt và IPA, ví dụ lấy đúng câu trong ngữ liệu đã gặp. Trạng thái chỉ lưu mã câu hỏi và thời điểm thêm; `savedWords` là trường **tùy chọn** nên mọi bản sao lưu cũ vẫn nhập được — có test khoá điều này.
- Một sửa nhỏ về tương phản: số thứ tự trong buổi 10 phút dùng `#a3305f` thay cho `--rose`, vì ở cỡ 11px trên nền hồng nhạt màu thương hiệu chỉ đạt 4,32:1, dưới ngưỡng 4,5:1.

## Đợt 5 của kế hoạch 14/09: Viết/Nói có tiêu chí, Nghe có player

- **Tiêu chí ngay cạnh bài làm (C1).** Trước đây Viết/Nói chỉ có một checklist bốn dòng đánh dấu có/không. Nay mỗi phần có bộ tiêu chí riêng (Viết task 1, Viết task 2, Nói phần 1–3), mỗi tiêu chí kèm **cách kiểm cụ thể**, và ba mức tự chấm. Buổi học chỉ được ghi khi đã chấm đủ; phần tự chấm lưu vào `selfCheck` của lượt học và hiện lại trong lịch sử. **Nói rõ ở mọi nơi hiện tiêu chí**: đây là tiêu chí tự kiểm tra của Mây, không phải thang chấm của hội đồng thi — vì rubric chính thức chưa có (mục 7 ý 8 của kế hoạch).
- **Gói gửi giáo viên (C2).** Route mới `/review-pack?attempt=<id>`: đề bài, bài làm, bảng tiêu chí trống cho người chấm, dòng "việc cần làm tiếp", CSS in bỏ điều hướng và các phần chỉ dùng trên máy. Nút in nằm ở hàng riêng chứ không ở tiêu đề trang, vì hành động ở tiêu đề bị ẩn dưới 800px — có test khoá việc nút này vẫn thấy ở 390px. Nhận xét nhận được gõ lại vào đúng lượt học (`feedback`).
- **Player Nghe (D1).** Âm thanh là giọng tổng hợp của thiết bị nên đơn vị tua được là **câu**: dòng thời gian ghi "Câu 3/18" kèm thanh tiến độ, tua một câu về trước/sau, nghe lại đúng câu đang nghe, tạm dừng/tiếp tục. Không hiện nội dung chữ của câu nào, nên dải điều khiển vẫn an toàn trong phòng thi. Thiết bị không có giọng tiếng Anh thì nói thẳng ra thay vì đọc bằng giọng mặc định mà không giải thích.
- Hai trường mới trong `attemptSchema` (`selfCheck`, `feedback`) đều **tùy chọn**, có test khoá việc lượt học và bản sao lưu cũ vẫn parse; mức tự chấm ngoài khoảng 1–3 bị từ chối.
- Axe WCAG A/AA chạy thêm trên route mới `/review-pack`; tổng số màn kiểm tra accessibility lên 14.

## Bằng chứng kiểm tra

- 111 kiểm thử Vitest: logic học, version học liệu, confidence, chẩn đoán theo dạng câu và planner, cá nhân hóa dữ liệu cũ, độ đầy đủ cấu trúc, dữ liệu/khôi phục và SQL/RLS trên PostgreSQL qua PGlite. Sáu ca mới kiểm chứng chú giải bằng chứng: trích dẫn phải trùng nguyên văn ngữ liệu, mỗi lựa chọn có đúng một ghi chú, chỉ đáp án đúng được đánh dấu “Đúng:”, không có chú giải mồ côi và chú giải theo đúng câu được dùng lại trong đề đầy đủ.
- 50 kiểm thử Playwright trên bản production: 46 ca Chromium, hai ca Firefox và hai ca WebKit. Phạm vi gồm mười ca cloud giả lập, toàn bộ tám bài Reading/Listening trên mobile ở cả ba engine, tải backup JSON đa trình duyệt, phục hồi bài, lưu hai bài Viết, ghi âm khi chuyển phần, nhiều tab, import/export, dung lượng bị chặn, micro bị từ chối, con trỏ tùy biến, manifest, CSP không dùng eval, header bảo vệ và HTTP 404.
- Axe WCAG A/AA trên 14 màn, cộng kết quả đề đầy đủ mở giải thích trên mobile; kiểm tra chiều rộng các màn chính ở 390 px. Các phép kiểm tra này nằm trong `tests/e2e/accessibility.spec.ts` và `resilience.spec.ts` nên chạy lại ở mọi release, kể cả `32422fa`.
- ESLint, TypeScript, production build: đạt.
- `npm audit --omit=dev`: không báo lỗ hổng ngày 13/09/2026. Đây là kết quả advisory hiện có, không thay thế rà soát bảo mật toàn diện.
- GitHub Actions run `34790572846` đạt cho release `32422fa` ngày 14/09/2026: lint, typecheck, **81 unit**, build 45 route, audit dependency và **44 E2E** trên Chromium, Firefox, WebKit. Smoke production run `34790590164` của cùng commit cũng đạt. (Mốc trước đó: run `34733331145` cho release `6cdbbfe` với 57 unit và 40 E2E.)
- Smoke test bản HTTPS `https://vstep-turtle.vercel.app` ngày 13/09/2026: workflow run `34733348658` đối chiếu đúng SHA release; 23 route gồm 9 màn chính và 14 bài luyện tải đúng trên Chromium, Firefox và WebKit, không tràn ngang ở 390 px; route giả HTTP 404, HSTS/CSP và các header bảo vệ hiện diện. Luồng Reading/Listening chấm điểm, phân tích và mở transcript sau khi nộp không có lỗi runtime.
- Supabase production đã áp dụng migration 002 ngày 13/09/2026. Hậu kiểm xác nhận contract tồn tại, `authenticated` không có quyền UPDATE trực tiếp, không còn policy ghi trực tiếp, RPC dùng `SECURITY DEFINER`, và một snapshot hiện có vẫn nguyên vẹn.
- Lighthouse mobile chạy ba lần trên bản production local sau tối ưu: tổng payload giảm từ khoảng 516 KiB xuống 376 KiB, JavaScript từ 354 KiB xuống 218 KiB và phần JavaScript chưa dùng từ 169 KiB xuống 26 KiB. Accessibility và Best Practices đạt 100; Performance dao động 73–84 do mô phỏng CPU. SEO 60 là hệ quả chủ đích của `noindex` cho ứng dụng cá nhân.

## Giới hạn còn mở

Chú giải bằng chứng phủ 136/183 câu Reading/Listening: toàn bộ 108 câu của 24 bài ngắn, cộng 28 câu Đọc của đề đầy đủ. 35 câu Nghe và 12 câu Đọc còn lại của đề đầy đủ chưa có chú giải, nên các câu này vẫn chỉ hiện phần giải thích cũ. Kiểm thử chỉ xác minh trích dẫn khớp ngữ liệu và cấu trúc ghi chú, không thay cho thẩm định chuyên môn về độ khó hay tính chuẩn xác của lập luận.

Đã có môi trường HTTPS pilot nhưng chưa thử đăng nhập/sync bằng tài khoản thật trên host, micro/giọng đọc trên thiết bị người học, bản thu người nói, thẩm định độ khó từ giáo viên hay chức năng chấm Viết/Nói. Supabase thật đã được cấu hình và kiểm thử riêng theo `STATUS.md`. Đã có smoke test bằng engine WebKit nhưng chưa xác minh Safari/iOS trên thiết bị thật. Đồng bộ giữa tab giúp tránh ghi đè tuần tự thường gặp, không phải giao thức hợp nhất chỉnh sửa đồng thời như trình soạn thảo cộng tác. Dữ liệu vẫn cần sao lưu theo README, âm thanh tải riêng.
