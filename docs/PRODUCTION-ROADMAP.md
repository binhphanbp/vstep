# Mây VSTEP — rà soát còn thiếu và kế hoạch hoàn thiện

Ngày rà soát: **12/09/2026**. Baseline ban đầu: **`5303d15`**. Release kỹ thuật mới nhất: **`f43fc23`**, nhánh `main`.

Đối tượng: một người học là Gùa/Rùa. Ưu tiên **Reading và Listening**. Không mở rộng thành nền tảng thương mại hoặc hệ đa người dùng.

## 1. Kết luận để ra quyết định

Website có nền tảng hoạt động tốt và bằng chứng kiểm thử đáng kể, nhưng **chưa đủ căn cứ nghiệm thu toàn bộ production và chất lượng luyện thi**. Không cần dựng lại giao diện hoặc thay tech stack. Cần hoàn thiện theo ba hướng:

1. Bảo toàn dữ liệu khi cập nhật học liệu, siết đường ghi snapshot, xử lý đầy đủ các trạng thái Auth và kiểm chứng khôi phục thực tế.
2. Hoàn thiện Listening bằng audio ổn định; kiểm định đáp án, mở rộng ngân hàng Reading/Listening và tách bài học khỏi bài đo tiến bộ.
3. Nghiệm thu trên thiết bị Gùa dùng, bổ sung quy trình phát hành/giám sát/khôi phục, đồng bộ bộ tài liệu bàn giao.

Kế hoạch đã bắt đầu được thực thi. Trạng thái phải dựa trên bằng chứng của đúng release; mục cần thiết bị, tài khoản thật hoặc chuyên gia vẫn giữ trạng thái chờ đầu vào.

| Hạng mục | Trạng thái hiện tại |
| --- | --- |
| P0-01 phiên bản học liệu | Hoàn thành trong release `f43fc23`; unit, E2E và CI đạt |
| P0-02 siết snapshot | Migration và rollback đã kiểm thử bằng PGlite; preflight Supabase thật xác nhận 1/1 snapshot tương thích; chờ chạy migration production |
| P0-03 Auth | Đã thêm timeout mạng và hướng dẫn quên mật khẩu cho mô hình một người; test đăng nhập treo đạt; chờ UAT tài khoản thật |
| P0-04 backup | Đã xử lý lỗi lưu revision sau cloud và tự xuất backup; test đạt; restore drill thiết bị thật còn mở |
| P0-05 UAT | Chờ thiết bị và thời gian của Gùa |
| P0-06 phát hành | Dependency audit, runbook và workflow smoke đã có; đã sửa workflow để kiểm tra alias production công khai và còn chờ run xác nhận của commit tài liệu |
| P0-07 tài liệu | README, STATUS, QUALITY, HANDOVER và báo cáo Word đã đồng bộ; Word đã render và xem đủ từng trang |

## 2. Bằng chứng và phạm vi kiểm tra

- Đọc luồng Auth/cloud/backup, schema state, cách dựng Sổ lỗi và kết quả, AudioPlayer/Recorder, SQL grants/RLS/RPC, CI và tài liệu bàn giao.
- Xác nhận [CI của commit f43fc23](https://github.com/binhphanbp/vstep/actions/runs/34687798626) đã thành công; trạng thái deployment Vercel của chính commit này thành công.
- Release mới đạt **53 unit tests, 40 E2E trên production build**, lint, TypeScript, audit dependency và build 45 route. Mười ca cloud giả lập cùng các ca snapshot học liệu mới đều đạt.
- Đếm trực tiếp từ content: Reading ngắn 4 bài/20 câu; Listening ngắn 4 bài/16 câu; đề đầy đủ có Reading 4 đoạn/40 câu và Listening 14 ngữ liệu/35 câu. Tổng **111 câu Reading/Listening**, trong đó **75 câu thuộc cùng một đề đầy đủ**. Không được gọi 14 ngữ liệu Listening của đề này là 14 đề thi.
- Nội dung dạng câu đã có ý chính, chi tiết, quan điểm, từ vựng và suy luận trong ngân hàng tổng. Không đồng nghĩa từng dạng đã có đủ bài để luyện nhiều tuần.
- Đối chiếu lại [định dạng VSTEP.3-5 của ULIS](https://vstep.vnu.edu.vn/test-format/): Reading 4 đoạn/40 câu, 60 phút, 1.900–2.500 từ; Listening 3 phần/35 câu, khoảng 40 phút. Cấu trúc hiện có đáp ứng số lượng cơ bản; số câu và thời lượng không chứng minh độ khó hoặc chất lượng đề.
- Chưa thẩm định ngữ nghĩa từng câu trong toàn bộ 111 câu; chưa thử thiết bị thật; chưa có kết quả học tập thực nghiệm. Đây không phải kiểm toán bảo mật toàn diện.

## 3. Phát hiện cụ thể

| Mã | Trạng thái bằng chứng | Phát hiện và ảnh hưởng | Ưu tiên |
| --- | --- | --- | --- |
| F01 | Đã phát hành | Attempt mới lưu snapshot có version; đề đang làm giữ bank đã mở; draft lệch version bị tách; lịch sử và Sổ lỗi dùng snapshot. Backup v1 vẫn đọc được. | P0-01 |
| F02 | Migration đã kiểm thử, chờ production | Migration 002 thu hồi direct DML, dùng RPC security definer có kiểm tra UID/membership/revision và thêm contract payload. Direct owner update và payload thiếu cấu trúc bị từ chối trong PGlite. | P0-02 |
| F03 | Đã gia cố, chờ UAT thật | Mọi fetch Supabase có timeout 20 giây; sync vẫn có controller riêng; test đăng nhập/sync treo đạt. UI hướng dẫn chủ website reset tài khoản thay vì mở signup. UAT recovery thật còn mở. | P0-03 |
| F04 | Đã gia cố, restore drill còn mở | Khi cloud đã lưu nhưng local revision thất bại, app tự xuất backup và hướng dẫn đối chiếu; test đạt. Cloud vẫn chỉ có một snapshot, JSON vẫn không chứa audio theo thiết kế. | P0-04 |
| F05 | Xác nhận từ code | Listening dùng speech synthesis, đọc theo câu, phụ thuộc voice của hệ điều hành. Có phát/dừng/tốc độ; chưa có audio cố định, pause/resume/seek/timeline và transcript có timecode. Chế độ thi cho nghe lại. | P1, chặn nghiệm thu Listening chân thực |
| F06 | Đã version hóa kỹ thuật, còn thiếu biên tập | Đã có version và snapshot lịch sử. Chưa có trạng thái biên tập, người duyệt, nguồn hoặc quyền sử dụng, bằng chứng đáp án có cấu trúc hay nhóm bài học và checkpoint riêng. Một đề đầy đủ và 8 bài ngắn không đủ làm ngân hàng luyện dài hạn. | P1 |
| F07 | Xác nhận từ logic/tài liệu | Có cá nhân hóa và thống kê, nhưng chưa có diagnostic/checkpoint bằng bài chưa từng học. Độ chính xác 5 lượt gần nhất có thể gồm bài làm lại; chưa đo được mức tiến bộ độc lập. | P1 |
| F08 | Đã hoàn thành phần trong repository | CI có audit dependency; workflow smoke HTTPS chạy sau deployment và runbook release hoặc rollback đã có. Quy tắc bảo vệ branch, kênh nhận lỗi và uptime bên ngoài repository vẫn cần chủ website xác nhận. | P0/P2 vận hành |
| F09 | Đã sửa | HANDOVER, script Word, STATUS và QUALITY dùng cùng số liệu release 53 unit và 40 E2E. DOCX đã được render và xem đủ từng trang. | P0-07 |
| F10 | Xác nhận từ code/tài liệu | Chưa có offline đầy đủ, đồng bộ audio, xóa/quản lý kho bản ghi trong UI, hoặc chấm Writing/Speaking. Đây là phần chưa xây có chủ đích, không phải lỗi của nút hiện tại. | P2/P3 |

**Giới hạn của F02:** RLS vẫn giới hạn tài khoản/row; chưa phát hiện lộ dữ liệu chéo người dùng. UI hiện tại dùng RPC đúng. Vấn đề là đường cập nhật trực tiếp của chính tài khoản được phép có thể bỏ qua quy tắc revision và kiểm tra payload, không phải bằng chứng đã có người khai thác hoặc dữ liệu thật bị hỏng.

Nguồn mã chính: `src/lib/content.ts:8`, `src/lib/learning.ts:27`, `src/lib/learning.ts:329`, `src/components/settings.tsx:361`, `src/components/settings.tsx:383`, `src/components/settings.tsx:491`, `src/components/audio-tools.tsx:16`, `supabase/migrations/001_personal_study.sql:14`, `supabase/migrations/001_personal_study.sql:28`, `.github/workflows/check.yml`, `scripts/create_handover_docx.py:322`.

## 4. Những phần đã có, cần giữ và kiểm thử hồi quy

- Next.js/React/TypeScript, giao diện hồng pastel responsive, tên gọi Gùa/Rùa, custom cursor có reduced motion.
- Kế hoạch ngày theo năng lượng, quỹ thời gian, lỗi đến hạn, confidence và kỹ năng ưu tiên; không bịa điểm hoặc thành tích.
- Luyện Reading/Listening, lưu nháp, chấm trắc nghiệm, giải thích, Sổ lỗi, lịch ôn và phản hồi theo dạng câu.
- Hai chế độ có giờ, lưu hai bài Viết riêng và ghi âm từng phần Nói; transcript Listening mở trong phần đối chiếu sau khi hoàn thành.
- Lưu local-first, kiểm tra JSON, bảo vệ dữ liệu hỏng, backup trước restore, RLS, RPC revision, báo thay đổi phát sinh trong lúc tải lên, hủy sync khi rời trang/đổi phiên.
- CI, kiểm thử ba browser engine, axe, security headers và error boundaries.

Không đưa các phần này trở lại backlog như chưa làm. Chỉ sửa khi phát hiện lỗi hoặc khi thay đổi mới ảnh hưởng đến chúng.

## 5. Backlog thực hiện và tiêu chí hoàn tất

### P0 — dữ liệu và vận hành an toàn

| ID | Công việc cụ thể | Tiêu chí hoàn tất | Phụ thuộc / người thực hiện |
| --- | --- | --- | --- |
| P0-01 | Đóng băng revision học liệu hiện có; bổ sung phiên bản nội dung vào attempt/exam/draft, định danh lựa chọn ổn định hoặc lưu snapshot đáp án/ngữ liệu cần để xem lại; tách dữ liệu legacy. | Nộp bài → sửa đáp án/đảo lựa chọn/xóa khỏi ngân hàng active → lịch sử và giải thích cũ vẫn nhất quán. Nhập backup v1 vẫn đọc được; không tự chấm lại lịch sử; đề đang làm không đổi nội dung giữa phiên. | Kỹ thuật; làm trước P1 |
| P0-02 | Migration mới siết quyền ghi snapshot; không sửa ngược migration 001 đã chạy. Chọn RPC có quyền ghi kiểm soát, xác minh UID/membership trong function, schema-qualified identifiers và `search_path` an toàn; thu hồi direct DML phù hợp. Kiểm tra payload tại boundary DB theo contract đã chốt. | Direct insert/update bị từ chối; RPC đúng vẫn lưu; revision cũ, payload sai/thiếu/quá lớn bị từ chối; anon/tài khoản không được cấp phép/row khác bị chặn. Thử concurrent save: một bản thắng, bản còn lại conflict, không silent overwrite. Có backup và rollback migration. | Kỹ thuật; thống nhất schema với P0-01 |
| P0-03 | Hoàn thiện vòng đời Auth khi mạng treo/rời trang/đổi tài khoản; trạng thái chờ rõ, không chồng thao tác và không báo kết quả cũ. Chọn quy trình khôi phục mật khẩu phù hợp một người dùng: chủ website hỗ trợ qua Supabase trước, hoặc recovery link nếu SMTP/redirect được cấu hình. | Test hung login/logout, lỗi mạng, token hết hạn, quay lại tab, phản hồi muộn; UI có đường phục hồi, dữ liệu học không mất. Diễn tập đổi mật khẩu; không đưa mật khẩu/token vào log. Không mở đăng ký công khai. | Kỹ thuật + chủ website cho bước tài khoản thật |
| P0-04 | Hoàn thiện backup/restore: chỉ dẫn nơi lưu file, trạng thái lần backup/sync, xử lý lỗi lưu revision sau khi cloud thành công, kho đầy, JSON lớn và hai tab ghi gần đồng thời. Chọn cơ chế một tab được ghi hoặc phối hợp ghi nếu tái hiện mất cập nhật. | Export rồi import trên profile mới khôi phục đúng hồ sơ/lượt học/nháp/lịch ôn; cloud conflict không ghi đè âm thầm; mô phỏng quota/read-only storage không báo thành công sai. Có bản dự phòng ngoài cùng thiết bị. Không cam kết gộp dữ liệu đa thiết bị tự động. | Kỹ thuật + chủ website |
| P0-05 | Nghiệm thu HTTPS trên máy tính và điện thoại Gùa thực dùng, theo kịch bản ở Mục 7. | Có biên bản gồm thiết bị/OS/browser/commit/ngày/kết quả; không còn lỗi chặn học hoặc mất dữ liệu. Thử account thật ở host và sync A→B→A; giữ dữ liệu gốc trước UAT. | Gùa/chủ website + kỹ thuật; sau P0-01…04 |
| P0-06 | Chốt release pipeline và vận hành tối thiểu: kiểm tra thiết lập Vercel/GitHub; chỉ promote production khi CI đạt; smoke HTTPS; kiểm tra dependency; kênh báo lỗi tối thiểu không thu dữ liệu nhạy cảm; runbook rollback và backup. | Một release thử qua đủ cổng; smoke gồm Settings/Reading/Listening/404; chủ website nhận biết được lỗi, biết nơi xem và cách quay lại release tốt. Diễn tập rollback code và kiểm tra tương thích schema; không tự rollback DB bằng xóa dữ liệu. | Kỹ thuật + chủ website |
| P0-07 | Đồng bộ README, STATUS, QUALITY, HANDOVER và Word từ một nguồn số liệu release; ghi rõ phạm vi pilot/production/học liệu. | Các tài liệu cùng commit, số test, tính năng và mục còn mở; link được kiểm tra; Word render và xem từng trang. Không giữ số test hard-code cũ trong phần “hiện tại”. | Kỹ thuật; chốt sau CI/UAT |

### P1 — Reading/Listening đủ tốt để học thật và đo tiến bộ

| ID | Công việc cụ thể | Tiêu chí hoàn tất | Phụ thuộc / người thực hiện |
| --- | --- | --- | --- |
| P1-01 | Lập ma trận và kiểm định **111 câu hiện có**: mục tiêu/subskill, bằng chứng trong passage/transcript, lý do đáp án đúng và distractor sai, mức khó dự kiến, người duyệt, nguồn/quyền sử dụng, version. | Không có câu mơ hồ/chưa duyệt trong bộ được gắn nhãn đã kiểm định. Mỗi câu có một đáp án được chứng minh; sửa nội dung tạo version mới, giữ lịch sử. B1/B2/C1 chỉ là mức biên soạn nếu chưa hiệu chuẩn. | P0-01; người biên soạn + giáo viên VSTEP |
| P1-02 | Bổ sung pipeline file audio và player Listening: tải/preload/error/retry, pause/resume, tiến độ, tua đoạn trong chế độ học, tốc độ; transcript có timecode sau nộp hoặc ở chế độ học rõ ràng; chính sách âm thanh khi chuyển bài/tab. | Audio/transcript khớp; không phát chồng; tiếng Anh và giọng nhân vật nhất quán; mạng chậm/404/tắt màn hình không khiến UI treo; kiểm tra nghe thực tế trên điện thoại/tai nghe. TTS chỉ là fallback có nhãn. Nội dung có quyền sử dụng. | Học liệu đã chốt; kỹ thuật + người cung cấp/thu âm |
| P1-03 | Nâng vòng chữa bài Reading/Listening: chỉ đoạn bằng chứng, giải thích distractor, chỉ ra lỗi vì không hiểu hay vì đoán; gợi ý một bước luyện tiếp; Listening nghe lại đúng đoạn sai; Reading hỗ trợ đối chiếu câu hỏi và đoạn đọc trên mobile. | Gùa hoàn thành một vòng làm → hiểu lỗi → luyện lại → ôn sau; có test transcript không lộ trong chế độ thi, mapping câu/audio và bàn phím/mobile. Không chỉ tăng số thẻ hoặc animation. | P1-01/02 |
| P1-04 | Mở rộng ngân hàng theo ma trận; mục tiêu đợt đầu đề xuất **thêm 8 bài Reading và 8 bài Listening ngắn**, cùng **2 bộ Reading/Listening đủ cấu trúc**. Chốt lại số lượng theo lịch thi/quỹ học; tránh đổi vài từ rồi coi là đề mới. | Nội dung đã duyệt, ID/version không trùng, có đủ phân bố subskill/chủ đề/mức khó; nội dung mới không làm mất dữ liệu cũ. Chỉ phát hành số bài hoàn tất QA, không nhồi ngân hàng để đạt con số. | P1-01; giáo viên/biên soạn là phụ thuộc chính |
| P1-05 | Tách Learn/Drill khỏi Diagnostic/Checkpoint; dành ít nhất hai bộ đo độc lập trong ngân hàng mới. Lưu first exposure, phiên bản đề và điều kiện làm. Hiển thị lần đầu/làm lại riêng trong tiến bộ; checkpoint không bị Daily Mission gợi ý trước. | Không lộ đề checkpoint trong thư viện/ngày học thông thường; so sánh bằng dữ liệu chưa học, có ghi số câu và độ phủ subskill. Không suy ra điểm chứng chỉ từ phần trăm đúng. | P1-04; giáo viên xác nhận thiết kế |
| P1-06 | Pilot 5–7 ngày và hiệu chỉnh cá nhân hóa: chốt mục tiêu/ngày thi/quỹ thời gian, quan sát bài bỏ dở, thời lượng và phản hồi khó hiểu; ưu tiên sửa trở ngại học thật. | Có ghi nhận ngắn mỗi ngày, danh sách vấn đề có mức độ, một vòng cải tiến và kiểm tra lại. Không dùng streak làm bằng chứng đã tăng trình độ. Nếu chọn C1 khi chưa có học liệu tương ứng, UI phải nói rõ giới hạn. | Gùa + chủ website + kỹ thuật |

**Ghi chú về thi chân thực:** tạo chế độ học và chế độ mô phỏng tách bạch. Số lượt nghe, thời gian đọc câu hỏi, chuyển phần và khoảng nghỉ phải đối chiếu hướng dẫn của đơn vị thi mục tiêu; không tự áp luật “nghe một lần” hoặc quy đổi điểm chỉ từ suy đoán. Nguồn định dạng chính thức ở Mục 2 mới xác nhận cấu trúc tổng quát.

### P2 — cải thiện sau khi P0 và Reading/Listening đạt

- Từ vựng gắn với lỗi thật, thẻ do Gùa lưu, ngữ cảnh từ passage/transcript; tránh chỉ mở rộng danh sách tĩnh 20 từ.
- Theo dõi xu hướng subskill, tách bài mới/bài làm lại, checkpoint và review; thử lịch sử 1.000–10.000 lượt để quyết định phân trang/giảm tính toán và thời điểm cần chuyển kho dữ liệu. Chưa có benchmark thì chưa khẳng định hiệu năng ở mức này.
- Quản lý dung lượng audio, xóa từng bản đã backup, giải thích bản ghi nào chỉ ở thiết bị; cân nhắc Supabase Storage khi thực sự cần đồng bộ audio.
- PWA/offline nếu có nhu cầu thực: cache và cập nhật có version; xử lý bài/audio chưa tải; không hiển thị “offline” khi chỉ có manifest.
- Audit accessibility thủ công với bàn phím, zoom 200%, screen reader, vùng đọc dài và nút phát; kiểm tra hiệu năng mobile trước/sau khi thêm audio, không dùng một điểm Lighthouse đơn lẻ để nghiệm thu.

### P3 — Writing/Speaking, thực hiện sau

- Writing: feedback theo rubric → ba lỗi ưu tiên → rewrite → so sánh bản sửa; bắt đầu từ giáo viên hoặc bộ phản hồi được hiệu chỉnh.
- Speaking: giữ ghi âm/nghe lại/tải; sau đó cân nhắc transcript và feedback, rồi vòng ghi lại.
- Nếu có AI: server boundary, secret phía server, yêu cầu chủ động từ người học, giới hạn chi phí, timeout, schema output, rubric version, chống chấm bịa; điểm gợi ý phải phân biệt với điểm chính thức.
- Không cần làm AI trước khi hoàn thiện chất lượng Reading/Listening.

## 6. Thứ tự thực hiện và ước lượng

Các số dưới đây là **ước lượng công sức**, không phải lịch giao chắc chắn; cần điều chỉnh sau khi biết thiết bị/ngày thi và nhận học liệu.

| Đợt | Phạm vi | Ước lượng | Điều kiện kết thúc |
| --- | --- | --- | --- |
| A | P0-01/02: đóng băng học liệu, lịch sử theo version, migration toàn vẹn snapshot | 3–5 ngày kỹ thuật | Regression dữ liệu và SQL đạt; migration thử thành công; có rollback |
| B | P0-03/04/06: Auth, backup, phát hành và vận hành | 3–5 ngày kỹ thuật | Các nhánh lỗi đạt, restore drill và phát hành thử đạt |
| C | P0-05/07: thiết bị thật, bàn giao đồng nhất | 1–2 ngày làm việc, tùy thời gian người học | Biên bản UAT và tài liệu release hoàn chỉnh |
| D | P1-01: giáo viên kiểm định bank hiện có và chuẩn bị audio/ngân hàng mới | Tiến hành song song A–C; giáo viên xác nhận lịch riêng | Có nội dung được duyệt và quyền sử dụng; không tự ấn định thời hạn thay giáo viên |
| E | P1-02/03: player và vòng chữa Reading/Listening | 4–7 ngày kỹ thuật sau khi có audio/transcript mẫu | UAT player + review loop đạt trên thiết bị thật |
| F | P1-04/05: đưa bank đã duyệt vào app, diagnostic/checkpoint | 3–5 ngày kỹ thuật sau khi học liệu sẵn sàng; công biên soạn riêng | Bank đúng blueprint, checkpoint không lộ, lịch sử tương thích |
| G | P1-06: dùng thử và hiệu chỉnh | 5–7 ngày sử dụng thực + 1–2 ngày sửa/kiểm tra | Vấn đề chặn học đã đóng, có phản hồi người học |

Tổng phần kỹ thuật và bàn giao đến hết G khoảng **15–26 ngày công**, chưa gồm biên soạn/thu âm/thẩm định chuyên môn và thời gian chờ phản hồi. Có thể phát hành từng phần nhỏ đã đạt; không cần chờ mọi việc P2/P3 để dùng Reading/Listening. Đợt A là việc nên bắt đầu trước.

Chuỗi phụ thuộc chính: **đóng băng/version học liệu → sửa dữ liệu/DB → kiểm định nội dung → audio + chữa bài → bank độc lập → checkpoint → pilot**. Thu âm phải theo transcript đã duyệt để tránh phải làm lại. Không tăng ngân hàng trước khi giải quyết F01.

## 7. Kịch bản nghiệm thu thực tế

Mỗi dòng ghi: commit, URL, thiết bị/OS/browser, ngày, người thử, kết quả, link ảnh/log đã loại thông tin nhạy cảm. Dùng bản sao học tập để thử thao tác có thể thay thế dữ liệu; không yêu cầu gửi mật khẩu trong chat.

| Kịch bản | Thao tác | Kết quả bắt buộc |
| --- | --- | --- |
| UAT-01 Reading | Làm dở → reload → làm xong → xem bằng chứng/giải thích → vào Sổ lỗi → ôn lại | Đáp án, confidence, thời gian và số lượt học đúng; không nộp trùng |
| UAT-02 Listening | Phát bằng loa/tai nghe; dừng/chuyển bài; mất mạng; khóa/mở màn hình; nộp và mở transcript | Không chồng tiếng; UI nói đúng trạng thái; transcript chỉ hiện đúng chế độ; không mất đáp án |
| UAT-03 Có giờ | Chuyển tab, ngủ máy, reload gần hết giờ và quay lại | Deadline giữ đúng; không nộp nhầm phần; kết quả/nháp nhất quán |
| UAT-04 Cloud | Đăng nhập HTTPS: A lưu → B tải → B học và lưu → A tải | Hồ sơ/lượt học/nháp/lịch ôn khớp; không phải chỉ thông báo “thành công” |
| UAT-05 Conflict | Hai thiết bị xuất phát cùng bản, mỗi bên học thêm, lần lượt lưu | Bản cũ bị từ chối; giữ bản local; người học hiểu cách backup/restore |
| UAT-06 Recovery | Export JSON, mở profile mới và import; tải lại cloud; kiểm tra file audio riêng nếu đã có | Dữ liệu khôi phục khớp; file backup mở được; hiểu phạm vi không chứa audio |
| UAT-07 Auth | Sai mật khẩu, mạng treo, đăng xuất một thiết bị, đăng nhập lại, hỗ trợ đổi mật khẩu | Có lối thoát và thông báo đúng; thiết bị khác không bị đăng xuất ngoài ý muốn |
| UAT-08 Vận hành | Promote một release đã đạt CI, xác nhận HTTPS, diễn tập trở về bản tốt | Chủ website thao tác được, dữ liệu giữ nguyên, không cần sửa SQL tùy tiện |

Writing/Speaking không chặn release ưu tiên R/L về chất lượng chấm, nhưng chức năng ghi âm đang hiện hữu phải được smoke-test hoặc ghi rõ thiết bị chưa hỗ trợ; không giấu lỗi ở tính năng đang cung cấp.

## 8. Điều kiện gọi là hoàn tất

**Release vận hành cá nhân:** P0 đóng; không còn lỗi mất dữ liệu/không thể học; CI và HTTPS smoke đạt cho đúng commit; có UAT hai thiết bị, backup/restore và rollback đã thử; tài liệu khớp release.

**Release Reading/Listening hoàn chỉnh theo phạm vi đã chốt:** thêm P1-01…06; học liệu được duyệt, audio ổn định, bank đủ quỹ học đã thống nhất, checkpoint độc lập và vòng chữa bài dùng được. Không lấy số lượng test thay chất lượng học liệu.

**Hệ luyện bốn kỹ năng toàn diện:** thêm phản hồi Writing/Speaking có chất lượng. Đây là milestone sau, không nên gắn nhãn đã xong trong release ưu tiên Reading/Listening.

Chưa dùng phần trăm “hoàn thành 100%” khi phạm vi/đầu vào/UAT chưa đóng. Theo dõi từng mục bằng: chưa làm → đang làm → chờ đầu vào/QA → đã đạt, kèm bằng chứng.

## 9. Đầu vào cần chốt, không cản trở bắt đầu việc kỹ thuật

1. Bậc mục tiêu, ngày thi và đơn vị thi dự kiến; B2 trong app đang là mặc định, không coi đó là mục tiêu đã xác nhận của Gùa.
2. Điện thoại/OS/trình duyệt, máy tính và tai nghe thường dùng; quỹ học thực tế mỗi ngày.
3. Người có thể duyệt học liệu và nguồn audio có quyền sử dụng; nếu chưa có, tiếp tục bản tự biên soạn/TTS có nhãn, chưa gắn “đã kiểm định”.
4. Một buổi thử 30–45 phút cho cloud/backup/thiết bị, và 5–7 ngày pilot cho phản hồi học tập.
5. Chủ website giữ quyền truy cập GitHub/Vercel/Supabase và chọn cách hỗ trợ quên mật khẩu. Không cần gửi secret qua tài liệu hoặc chat.

**Không đưa vào phạm vi mặc định:** thanh toán, đa người dùng, bảng xếp hạng, CMS lớn, microservice, auto-sync hợp nhất mọi lịch sử, tên miền trả phí hoặc dịch vụ AI thu phí. Chỉ bổ sung khi có nhu cầu cụ thể.
