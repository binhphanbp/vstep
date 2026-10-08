# Kế hoạch: ghi chú khi luyện đề thay cho giấy

Viết ngày 08/10/2026 trên nền `main` tại `417bc52` (202 unit, 93 E2E, 111 route); rà lại cùng ngày bằng cách đọc code và đo trực tiếp (mục 9). Mục tiêu: Gùa ghi chú ngay trong Mây khi luyện và chữa đề, tìm lại được, ôn lại được, không phải giữ sổ giấy hay ghi chú rời rạc.

Kế hoạch có bảy đợt, mỗi đợt là một PR nhỏ có test. Đợt có ích sớm nhất (ghi chú cho từng câu khi chữa đề) đứng ngay sau phần nền dữ liệu. Các phần khó hơn (ô nháp trong phòng thi, tô bài đọc) để sau.

---

## 1. Gùa cần ghi gì, ở đâu

| Lúc ghi | Ghi gì | Hiện Mây có gì | Thiếu gì |
| --- | --- | --- | --- |
| Đang nghe | Từ khóa, con số, tên riêng để chọn đáp án | Không có chỗ ghi | Ô nháp đặt cạnh câu hỏi |
| Đang đọc | Gạch chân câu chứa ý, ghi chú bên lề | Không có chỗ ghi | Tô câu trong bài và ghi chú gắn vào câu đó |
| Chuẩn bị Nói (1 phút ở Part 2 và Part 3) | Dàn ý 3–4 ý | Đồng hồ chuẩn bị, không có chỗ ghi | Ô dàn ý trong phút chuẩn bị |
| Viết | Dàn ý trước khi viết | Chỉ có ô bài viết | Ô dàn ý tách khỏi bài, không tính vào số từ |
| Sau khi chữa đề | Vì sao sai, bẫy gặp phải, từ mới, cấu trúc hay | Giải thích, dẫn chứng và ghi chú từng phương án do Mây viết sẵn; Sổ tay lỗi sai (bài học); thẻ từ tự thêm (10 câu có thẻ viết sẵn); nhận xét giáo viên gõ lại ở "Gói gửi giáo viên" | Chỗ để Gùa ghi **bằng lời của mình**, gắn với câu, với đề, với kỹ năng |
| Ôn trước ngày thi | Đọc lại những điều đã ghi, nhất là lỗi hay lặp | Lịch ôn cho câu sai và thẻ từ; buổi 10 phút | Lịch ôn cho ghi chú "cần nhớ"; bản in hoặc file để đọc |

Ghi chú viết sẵn của Mây (`question-notes.ts` cho bài học; `explanation`, `evidence`, `notes` của từng câu trong đề kho) giữ nguyên. Ghi chú của Gùa hiện cạnh đó, khác màu và khác nhãn ("Ghi chú của Gùa"), để không lẫn lời giải chuẩn với điều tự ghi.

Kết luận: phần còn thiếu không phải là "thêm một trang ghi chú", mà là **ghi được ngay tại chỗ đang học, rồi gom về một chỗ tìm được và ôn được**.

---

## 2. Nguyên tắc thiết kế

1. **Ghi nhanh hơn giấy.** Một cú bấm (hoặc một phím tắt có phím bổ trợ) mở ô ghi, gõ, xong. Không bắt chọn thẻ trước; chỗ đang ghi (đề, kỹ năng, Part, câu) được gắn tự động.
2. **Không bao giờ mất ghi chú.** Tự lưu khi ngừng gõ khoảng một giây, khi rời ô và khi rời trang. Xóa thì vào thùng rác 30 ngày, có "Hoàn tác" ngay. Có trong bản sao lưu JSON và đồng bộ Supabase. **Tab mở từ bản cũ không được phép xóa ghi chú** (mục 3.2 — rủi ro đã kiểm chứng).
3. **Giới hạn được kiểm tra trước khi ghi.** Lỗi lượt thi thứ 101: app ghi một thứ vượt giới hạn của schema, lần mở sau toàn bộ dữ liệu bị báo hỏng. Mọi thao tác thêm/sửa ghi chú đi qua một hàm kiểm tra giới hạn có unit test.
4. **Riêng tư.** Không vào file báo lỗi, không gửi cho dịch vụ AI nào, chỉ đi tới Supabase qua tài khoản đồng bộ hiện có.
5. **Không giả làm phòng thi thật.** Chưa tìm được nguồn chính thức nói phòng thi VSTEP trên máy có phát giấy nháp hay cho ghi trên màn hình hay không (đã tìm ngày 08/10/2026). Ô nháp trong phòng thi mô phỏng ghi rõ là "công cụ luyện tập" và tắt được.
6. **Desktop trước, điện thoại sau**, theo thứ tự anh đã chọn. Riêng tô bài đọc phải dùng được bằng chạm và bàn phím ngay từ đầu (mục 4, Đợt 5).

---

## 3. Dữ liệu và dung lượng

### 3.1 Một ghi chú gồm gì

```ts
type Note = {
  id: string;             // uuid
  createdAt: string;      // ISO
  updatedAt: string;
  deletedAt?: string;     // thùng rác; xóa hẳn sau 30 ngày
  body: string;           // văn bản thường, tối đa 2000 ký tự
  kind: "note" | "highlight" | "scratch";
  tags: string[];         // tối đa 8, mỗi thẻ tối đa 30 ký tự
  pinned?: boolean;
  remember?: boolean;     // vào lịch ôn ghi chú
  anchor?: {
    source: "paper" | "lesson";
    sourceId: string;     // mã đề ("133") hoặc mã bài
    version: number;      // phiên bản học liệu lúc ghi
    label: string;        // "Đề 133 · Nghe Part 2 · Câu 12", tối đa 120 ký tự
    excerpt?: string;     // 1 dòng đầu của câu hỏi, tối đa 160 ký tự
    runId?: string;       // lượt thi, với ô nháp
    itemId?: string;      // mã câu (mã câu trong đề đã có tiền tố mã đề)
    sentence?: number;    // câu thứ mấy trong bài đọc, với đoạn tô
    quote?: string;       // nguyên văn đoạn tô, tối đa 300 ký tự
    color?: "yellow" | "pink" | "green";
  };
};
```

`label` và `excerpt` là bản chụp nhỏ lúc ghi, theo đúng nguyên tắc "kết quả cũ không đổi nghĩa" của Mây: Sổ ghi chú hiện được mà không phải tải file đề (~vài trăm KB mỗi đề), vẫn đọc được khi offline, và vẫn đúng khi một đề bị gỡ khỏi kho như đề 131.

Văn bản thường, xuống dòng và gạch đầu dòng bằng "-". Không làm trình soạn thảo định dạng: khó kiểm thử, dễ lỗi trên điện thoại, không cần cho ghi chú luyện thi.

### 3.2 Lưu ở đâu, và rủi ro tab cũ

Ghi chú nằm trong cùng state với tiến độ học (trường `notes`, tùy chọn). Như vậy ghi chú tự đi theo bản sao lưu JSON, đồng bộ Supabase (ràng buộc trên Supabase chỉ kiểm các trường cũ và giới hạn 10 MB, không chặn trường mới) và nút xóa dữ liệu.

**Rủi ro đã kiểm chứng:** `stateSchema` hiện dùng `z.object`, tức **bỏ đi mọi trường nó không biết**. Một tab mở từ trước bản có ghi chú (hoặc trang cũ do service worker giữ) đọc state, bỏ mất `notes`, và ở lần ghi kế tiếp sẽ ghi đè lên toàn bộ ghi chú. `updateStudy` luôn đọc bản mới nhất trước khi ghi, nhưng chính bước đọc đó đã bỏ trường lạ. Cách xử lý:

1. **Đợt 0a, phát hành riêng và trước tiên:** cho state giữ nguyên các trường cấp ngoài cùng mà phiên bản đó chưa biết (vẫn kiểm đầy đủ các trường đã biết). Từ bản này trở đi, một tab cũ không xóa được dữ liệu của bản mới.
2. Giao diện ghi chú chỉ ra mắt ở bản **sau** đó, nên tab cũ còn sót chỉ có thể là tab chưa tải lại suốt qua hai lần phát hành.
3. Unit test: bản đọc không biết `notes` vẫn ghi lại `notes` nguyên vẹn.

### 3.3 Giới hạn, đã đo

Đo ngày 08/10/2026 bằng chính mô phỏng 90 ngày học trong `learning.test.ts`, thêm ghi chú tiếng Việt có gắn câu. Máy đo là container phát triển, không phải điện thoại.

| Ghi chú | Dung lượng ghi chú | Tổng state | Ghi (stringify) | Đọc lại + kiểm schema |
| --- | --- | --- | --- | --- |
| 0 | 0 | 217 KB | 2,4 ms | 3,4 ms |
| 300 × 150 ký tự | 142 KB | 359 KB | 3,4 ms | 2,2 ms |
| 800 × 300 ký tự | 543 KB | 760 KB | 3,0 ms | 2,6 ms |
| 800 × 2000 ký tự | 2443 KB | 2659 KB | 5,2 ms | 3,6 ms |

(State 90 ngày hôm nay là 217 KB, lớn hơn con số 191 KB trong QUALITY.md vì kho bài đã thêm từ lúc đó.)

Từ số đo:

- Ghi chú bình thường (vài trăm ký tự) rất nhẹ; 300 ghi chú chỉ thêm khoảng 140 KB.
- Một ghi chú ngắn (~150 ký tự) kèm chỗ gắn chiếm khoảng 0,5 KB. Ghi 5 ghi chú như vậy mỗi ngày thì một năm khoảng 1800 ghi chú, chừng 900 KB.
- Trần đề xuất: **tối đa 2000 ghi chú (tính cả thùng rác), mỗi ghi chú 2000 ký tự, tổng ghi chú tối đa 1,5 MB** (đo bằng `Blob` như mục "Chỗ ở của dữ liệu" đang đo). Cộng dữ liệu học sau một năm, tổng khoảng 2 MB, dưới xa giới hạn 10 MB của bản sao lưu và Supabase.
- Hạn mức localStorage thật **chưa đo** trên từng trình duyệt (thường được nói là khoảng 5 MB, tính theo cách riêng của mỗi trình duyệt). Đợt 0b sẽ đo bằng Playwright trên Chromium, Firefox, WebKit, rồi mới chốt trần.
- Chi phí ghi vài ms trên máy phát triển; điện thoại chậm hơn và chưa đo. Ô ghi chú ghi xuống máy theo nhịp ngừng gõ, không theo từng phím, nên không ảnh hưởng gõ phím.
- Chạm trần thì báo rõ, gợi ý xuất bản sao hoặc dọn thùng rác, không âm thầm từ chối.

### 3.4 Nhiều tab, nhiều thiết bị

- **Hai tab cùng máy:** `updateStudy` đọc bản mới nhất trước mỗi lần ghi, nên ghi chú viết ở tab này không mất khi tab kia ghi. Nếu **cùng một ghi chú** được sửa ở hai tab, bản lưu sau cùng thắng; chấp nhận được với một người dùng.
- **Hai thiết bị:** đồng bộ hiện là bấm "Lưu lên"/"Tải về" cả bản, có revision để không ghi đè bản mới hơn. Ghi trên hai máy trước khi đồng bộ thì vẫn phải chọn giữ một bản (HANDOVER.md: "tự động đồng bộ nhiều thiết bị: chưa làm"). Trường `deletedAt` (thay vì xóa hẳn ngay) giữ chỗ cho việc gộp sau này: gộp theo `id` + `updatedAt` cần biết ghi chú nào đã bị xóa.

### 3.5 Tô bài đọc khi học liệu đổi

Đoạn tô lưu theo **câu** (số thứ tự câu + nguyên văn). Khi mở lại:

1. cùng phiên bản học liệu: tô đúng câu;
2. phiên bản khác: tìm lại nguyên văn; thấy đúng một chỗ thì tô ở đó;
3. không thấy hoặc thấy nhiều chỗ: không tô; ghi chú vẫn còn, kèm dòng "đoạn văn này đã thay đổi".

---

## 4. Các đợt triển khai

Mỗi đợt có phạm vi, nghiệm thu đo được và test. Ước lượng là số PR, không phải số ngày.

### Đợt 0a — Giữ trường lạ (1 PR rất nhỏ, phát hành riêng)

- State giữ các trường cấp ngoài cùng chưa biết; các trường đã biết vẫn kiểm như cũ.
- **Nghiệm thu:** một state có trường lạ đi qua đọc → sửa → ghi vẫn còn trường đó; mọi bản sao lưu cũ vẫn đọc được; bản sao lưu tự mâu thuẫn vẫn bị từ chối như trước.
- **Test:** unit cho đọc/ghi/nhập bản sao; toàn bộ suite hiện có phải giữ nguyên kết quả.

### Đợt 0b — Nền dữ liệu ghi chú (1 PR, chưa có giao diện ngoài Cài đặt)

- Schema `notes` tùy chọn; `addNote`, `updateNote`, `trashNote`, `restoreNote`, `purgeTrash` kiểm trần **trước** khi ghi.
- File báo lỗi: thêm số ghi chú vào phần đếm. File này dùng danh sách trường được phép (`buildErrorReport`), nên nội dung ghi chú tự không lọt vào; test giữ điều đó.
- Cài đặt, mục "Chỗ ở của dữ liệu" (hiện có Dữ liệu học, Bản ghi âm): thêm dòng Ghi chú (số lượng, dung lượng).
- Đo hạn mức localStorage thật trên ba engine bằng Playwright, ghi vào QUALITY.md.
- **Nghiệm thu:** thêm ghi chú thứ 2001 hoặc vượt 1,5 MB bị từ chối với thông báo rõ, và lần tải trang sau dữ liệu vẫn đọc được; xuất JSON có ghi chú; nhập lại khôi phục đúng; file báo lỗi không có chữ nào của ghi chú.

### Đợt 1 — Ghi chú cho từng câu khi chữa đề (1 PR) — thay giấy nhiều nhất

- Nút "Ghi chú" ở từng câu trên các màn: chữa đề kho đề và Làm lại câu sai (`paper-review.tsx`), kết quả bài học (`practice.tsx`), Sổ tay lỗi sai (`review.tsx`).
- Ghi chú tự gắn đề, phiên bản, Part, câu; hiện ngay dưới câu đó ở **mọi lần gặp lại câu**, không chỉ trong lượt đã ghi.
- Gợi ý một chạm, sửa được: "Bẫy: từ đồng nghĩa", "Bẫy: phủ định", "Không nghe kịp con số", "Đọc thiếu câu cuối đoạn", "Từ mới: …". Đây là gợi ý do Mây đặt, không phải phân loại chính thức của VSTEP.
- Trang **Ghi chú** tối thiểu (`/notes`, mục riêng ở thanh bên, biểu tượng khác "Sổ tay lỗi sai" để không lẫn): danh sách mới nhất, tìm không dấu (dùng lại `searchFold`), sửa, xóa vào thùng rác + "Hoàn tác", nút "Mở chỗ đã ghi".
- **Nghiệm thu:** ghi chú cho câu 12 đề 133 hiện ở màn chữa đề, ở Làm lại câu sai, ở lượt thi khác của cùng đề và trong trang Ghi chú; tìm "bay" ra ghi chú có chữ "bẫy"; xóa rồi hoàn tác thì ghi chú quay lại nguyên vẹn; còn sau khi tải lại; offline vẫn mở được trang Ghi chú.
- **Test:** E2E từng màn; unit cho việc gắn và lọc theo câu; axe cho trang mới. Kiểm tay gõ tiếng Việt bằng bộ gõ Telex (Unikey/EVKey hoặc bộ gõ macOS) vì Playwright không mô phỏng được bộ gõ.

### Đợt 2 — Ghi nhanh từ mọi màn và sắp xếp (1 PR)

- Nút "Ghi nhanh" cố định và phím tắt có phím bổ trợ (ví dụ `Alt` + `G`; không dùng một chữ cái đơn vì dễ bấm nhầm khi gõ và trái WCAG 2.1.4). Hiện app chỉ có phím `Esc` đóng menu điện thoại, nên chưa có xung đột.
- Ghi chú cho cả lượt thi ("Rút kinh nghiệm đề 133") ở đầu màn chữa đề.
- Thẻ, lọc theo kỹ năng/Part/đề/thẻ, ghim, sắp theo mới sửa hoặc theo đề; xem thùng rác.
- Trang Ghi chú hiện thêm, chỉ đọc, nhận xét giáo viên đã gõ ở "Gói gửi giáo viên" (và mục "Điều mình đã tự kiểm tra" của dữ liệu cũ, nếu có), để không phải tìm ở nhiều nơi.
- Từ một ghi chú "Từ mới" tạo thẻ cho vườn từ (từ, nghĩa, câu ví dụ lấy từ câu đang chữa).
- **Nghiệm thu:** tạo một ghi chú trong dưới 5 giây từ bất kỳ màn nào; lọc theo "Nghe" + "Part 2" ra đúng; thẻ từ tạo từ ghi chú hiện trong vườn và được đếm ở trang chủ.

### Đợt 3 — Ô nháp khi đang làm bài (1 PR)

- **Nghe:** ô nháp cạnh câu hỏi, gõ được khi bản ghi đang phát.
- **Nói:** ô dàn ý trong phút chuẩn bị Part 2 và Part 3 (Part 1 không có thời gian chuẩn bị), hiện tiếp trong lúc nói.
- **Viết:** ô dàn ý tách khỏi bài, không tính vào số từ.
- Nháp gắn với lượt thi, xem lại ở màn chữa đề, chuyển thành ghi chú thường bằng một nút.
- Phòng thi mô phỏng (`paper-exam.tsx`): màn xác nhận có lựa chọn bật/tắt ô nháp; khi bật ghi rõ "công cụ luyện tập; chưa xác nhận phòng thi thật cho ghi trên máy".
- **Nghiệm thu:** gõ nháp khi đang nghe không làm dừng hay phát lại bản ghi, quy tắc nghe một lần vẫn đúng; nháp còn sau khi tải lại giữa phần thi; tắt ô nháp thì không hiện ở phần nào của lượt đó; số từ bài Viết không đổi khi có dàn ý.

### Đợt 4 — Ôn ghi chú và mang theo (1 PR)

- "Cần nhớ" đưa ghi chú vào lịch ôn (dùng lại `scheduleReview` như thẻ từ và câu sai), hiện ở trang chủ và có thể vào buổi 10 phút.
- Xuất: bản in (bố cục in sẵn, không có thanh bên và nút) và file Markdown theo đề hoặc theo thẻ, để đọc trên điện thoại hoặc gửi giáo viên.
- Trang "Trước ngày thi": ghi chú ghim, ghi chú cần nhớ, các thẻ lỗi lặp nhiều nhất.
- **Nghiệm thu:** ghi chú cần nhớ đến hạn hiện ở trang chủ; file xuất mở đúng tiếng Việt và chỉ chứa ghi chú; bản in sạch.

### Đợt 5 — Tô câu và ghi chú trên bài đọc (1–2 PR)

- **Tô theo câu** là cách chính: bật chế độ tô thì mỗi câu của bài thành một mục bấm được (chuột, chạm, hoặc `Tab` + `Enter`), chọn màu, thêm ghi chú. Cách này dùng được bằng bàn phím và trên điện thoại, không phụ thuộc thao tác bôi chọn chữ vốn khó trên màn cảm ứng và không làm được bằng bàn phím trong văn bản thường (trừ khi bật caret browsing).
- Bôi chọn tự do chỉ là cách phụ trên máy tính, tô theo câu chứa đoạn đã chọn.
- Áp vào hai chỗ hiển thị bài: `PaperText` (đề kho: phòng thi, luyện, chữa đề) và khối `.passage` của bài học (`practice.tsx`, `exam.tsx`); bản chép lời Nghe chỉ sau khi nộp. Bản dịch không tô.
- Trong phòng thi mô phỏng chỉ tô màu, ghi chú để sau.
- Gắn lại khi học liệu đổi theo mục 3.5.
- **Nghiệm thu:** tô ba câu, tải lại, cả ba còn đúng chỗ; đổi phiên bản bài trong test thì câu còn thấy được tô lại, câu mất báo "đã thay đổi"; làm được toàn bộ bằng bàn phím; trình đọc màn hình đọc được câu đã tô; **kiểm trên điện thoại thật** trước khi đóng đợt.

---

## 5. Không làm trong kế hoạch này

- Trình soạn thảo định dạng (in đậm, bảng, chèn ảnh).
- Vẽ tay hoặc chụp ảnh ghi chú giấy: cần IndexedDB và không đi qua đồng bộ hiện có.
- Gợi ý hay tóm tắt ghi chú bằng AI: trái nguyên tắc không gửi nội dung học ra dịch vụ AI.
- Chia sẻ ghi chú qua đường dẫn.

---

## 6. Rủi ro và cách giảm

| Rủi ro | Kiểm chứng | Cách giảm |
| --- | --- | --- |
| Tab từ bản cũ xóa mất ghi chú | **Đã tái hiện**: schema hiện bỏ trường lạ | Đợt 0a phát hành riêng trước giao diện |
| Ghi vượt giới hạn làm hỏng dữ liệu | Đã xảy ra với lượt thi thứ 101 | Kiểm trần trước khi ghi, test tải lại sau khi chạm trần |
| Hết dung lượng trình duyệt | Đã đo kích thước; hạn mức thật chưa đo | Trần 1,5 MB, đo ba engine ở Đợt 0b, hiện trong Cài đặt |
| Mất ghi chú khi xóa dữ liệu trình duyệt | — | Có trong sao lưu và đồng bộ; nhắc sao lưu khi số ghi chú tăng nhiều kể từ lần sao lưu cuối |
| Ghi trên hai thiết bị trước khi đồng bộ | Hành vi hiện có của đồng bộ | Nói rõ trong giao diện; `deletedAt` giữ chỗ cho gộp sau |
| Gõ nháp làm chậm phòng thi | Ghi mất vài ms trên máy phát triển | Ghi theo nhịp ngừng gõ; E2E giữ quy tắc nghe một lần |
| Gõ tiếng Việt bằng bộ gõ bị lỗi | Playwright không mô phỏng được | Kiểm tay với Telex ở Đợt 1 |
| Xóa nhầm | — | Thùng rác 30 ngày + Hoàn tác |
| Ghi chú lọt vào file báo lỗi | File báo lỗi dùng danh sách trường được phép | Unit test giữ điều đó |

---

## 7. Việc sau kế hoạch (chưa cam kết)

- Gộp ghi chú khi tải bản sao từ thiết bị khác thay vì chọn một bên.
- Tách ghi chú sang IndexedDB và bảng Supabase riêng nếu số đo thật cho thấy cần.
- Ảnh chụp ghi chú giấy.

---

## 8. Cần anh quyết

1. **Ô nháp trong phòng thi mô phỏng:** nên hỏi điểm thi Gùa đăng ký xem có phát giấy nháp hay cho ghi trên máy không. Có giấy hoặc có ô ghi thì để bật sẵn; không có thì để tắt sẵn cho gần thật. Chưa có câu trả lời thì kế hoạch để bật sẵn, có nút tắt.
2. **Thứ tự:** đang là 0a → 0b → 1 → 2 → 3 → 4 → 5. Nếu Gùa sắp thi và cần luyện nháp khi nghe hơn, có thể đưa Đợt 3 lên trước Đợt 2.
3. **Trần:** 2000 ghi chú, 1,5 MB. Theo số đo, 5 ghi chú ngắn mỗi ngày trong một năm dùng khoảng 900 KB; ghi dài hơn thì chạm trần sớm hơn và app báo trước. Nâng được sau khi đo hạn mức thật ở Đợt 0b.

---

## 9. Đã kiểm chứng khi rà lại (08/10/2026)

| Điều kế hoạch dựa vào | Cách kiểm | Kết quả |
| --- | --- | --- |
| Trường mới tự đi theo sao lưu và đồng bộ | Đọc `settings.tsx` (nhập 10 MB, `stateSchema.parse`), `001`/`002` migration | Đúng; Supabase chỉ kiểm các trường cũ và tổng 10 MB |
| Tab cũ không làm mất trường mới | Unit test tạm: `stateSchema.parse` trên state có `notes` | **Sai** — trường bị bỏ; thêm Đợt 0a |
| Nhiều tab không ghi đè nhau | Đọc `updateStudy` | Đúng — đọc bản mới nhất trước khi ghi |
| File báo lỗi không chứa ghi chú | Đọc `buildErrorReport` | Đúng — chỉ các trường được liệt kê |
| Chi phí ghi/đọc khi có nhiều ghi chú | Đo trên mô phỏng 90 ngày (mục 3.3) | Vài ms; state 90 ngày hôm nay 217 KB |
| Mã câu đủ để gắn ghi chú | Đọc 5 file đề | 75 câu mỗi đề, mã không trùng và có tiền tố mã đề |
| Phút chuẩn bị Nói | `papers.ts` | Part 1: 0 giây; Part 2 và 3: 60 giây |
| Có thể tô bằng bàn phím trên bài đọc | Văn bản bài là chữ thường (`PaperText`, `.passage`) | Bôi chọn bằng bàn phím không làm được nếu không bật caret browsing → đổi sang tô theo câu |
| Phòng thi thật có cho ghi chú | Tìm web | Không tìm được nguồn chính thức; giữ "chưa xác nhận" |
| Mục "Điều mình đã tự kiểm tra" còn được ghi | Tìm nơi ghi `reflection` | Không — chỉ còn hiển thị cho dữ liệu cũ; không coi là chỗ ghi hiện có |
| Sổ tay lỗi sai gồm câu của đề kho | Đọc `mistakeReviews` | Không — chỉ câu trong bài học; ghi chú cho câu đề kho gắn ở màn chữa đề |
