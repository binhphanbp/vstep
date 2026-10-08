# Kế hoạch: ghi chú khi luyện đề thay cho giấy

Viết ngày 08/10/2026 trên nền `main` tại `417bc52` (202 unit, 93 E2E, 111 route). Mục tiêu: Gùa ghi chú ngay trong Mây khi luyện và chữa đề, tìm lại được, ôn lại được, không phải giữ sổ giấy hay ghi chú rời rạc.

Kế hoạch chia thành sáu đợt, mỗi đợt là một PR nhỏ có test, chạy được độc lập và có giá trị ngay khi merge. Thứ tự đi từ nền dữ liệu đến tính năng dùng hằng ngày, rồi mới đến phần khó (đánh dấu trên bài đọc, điện thoại).

---

## 1. Gùa cần ghi gì, ở đâu

Đây là những thứ người luyện VSTEP thường ghi ra giấy, xếp theo lúc ghi. Mỗi dòng có chỗ tương ứng trong Mây.

| Lúc ghi | Ghi gì | Hiện Mây có gì | Thiếu gì |
| --- | --- | --- | --- |
| Đang nghe | Từ khóa, con số, tên riêng để chọn đáp án | Không có chỗ ghi | Ô nháp đặt cạnh câu hỏi |
| Đang đọc | Gạch chân câu chứa ý, ghi chú bên lề | Không có chỗ ghi | Đánh dấu đoạn văn và ghi chú gắn vào đoạn |
| Chuẩn bị Nói (1 phút) | Dàn ý 3–4 ý | Đồng hồ chuẩn bị, không có chỗ ghi | Ô dàn ý trong phút chuẩn bị |
| Viết | Dàn ý trước khi viết | Chỉ có ô bài viết | Ô dàn ý tách khỏi bài |
| Sau khi chữa đề | Vì sao sai, bẫy gặp phải, từ mới, cấu trúc hay | Giải thích, dẫn chứng và ghi chú từng phương án do Mây viết sẵn; Sổ lỗi sai tự động; thẻ từ tự thêm (chỉ 10 câu có thẻ viết sẵn); nhận xét giáo viên gõ lại | Chỗ để Gùa ghi **bằng lời của mình**, gắn với câu, với đề, với kỹ năng |
| Ôn trước ngày thi | Đọc lại những điều đã ghi, nhất là lỗi hay lặp | Lịch ôn cho câu sai và thẻ từ | Lịch ôn cho ghi chú "cần nhớ"; bản in hoặc xuất ra để đọc |

Ghi chú viết sẵn của Mây (`question-notes.ts` cho bài học, trường `explanation`/`evidence` cho đề trong kho) vẫn giữ nguyên và không bị sửa bởi ghi chú của Gùa; hai loại hiện cạnh nhau nhưng tách màu và tách nhãn, để không lẫn lời giải chuẩn với điều Gùa tự ghi.

Kết luận: phần còn thiếu không phải là "thêm một trang ghi chú", mà là **ghi được ngay tại chỗ đang học, rồi gom về một sổ tìm được và ôn được**.

---

## 2. Nguyên tắc thiết kế

Các nguyên tắc này đến từ chính các lỗi đã gặp trong các đợt rà vừa qua, không phải lý thuyết.

1. **Ghi nhanh hơn giấy.** Mở ô ghi chú bằng một cú bấm hoặc một phím tắt, gõ, xong. Không bắt chọn thẻ hay danh mục trước khi ghi; thẻ được gợi ý tự động theo chỗ đang ghi (kỹ năng, Part, đề, câu).
2. **Không bao giờ mất ghi chú.** Lưu tự động khi đang gõ (nháp trong phiên, ghi xuống máy sau khi ngừng gõ khoảng một giây và khi rời trang). Xóa thì có "Hoàn tác". Có trong bản sao lưu JSON và trong đồng bộ Supabase hiện có.
3. **Giới hạn được kiểm tra trước khi ghi, không chỉ trong schema.** Lỗi lượt thi thứ 101 cho thấy: nếu app ghi một thứ vượt giới hạn schema thì lần mở sau toàn bộ dữ liệu bị báo hỏng. Mọi thao tác thêm/sửa ghi chú phải đi qua một hàm kiểm tra giới hạn, có unit test.
4. **Riêng tư.** Ghi chú không vào file báo lỗi (như bài viết và bản ghi âm hiện nay), không gửi cho dịch vụ AI nào, chỉ đi đến Supabase qua đúng tài khoản đồng bộ hiện có.
5. **Không giả làm phòng thi thật.** Chưa xác nhận được phòng thi VSTEP trên máy có cho ghi chú trên máy hay chỉ cho giấy nháp. Trong phòng thi mô phỏng, ô nháp phải được ghi rõ là "công cụ luyện tập" và có thể tắt.
6. **Desktop trước, điện thoại sau.** Theo thứ tự anh đã chọn. Riêng phần đánh dấu bài đọc phụ thuộc thao tác chọn chữ trên màn hình cảm ứng, nên đợt đó có kiểm thử riêng trên điện thoại thật trước khi coi là xong.

---

## 3. Dữ liệu và dung lượng

### 3.1 Một ghi chú gồm gì

```ts
type Note = {
  id: string;            // uuid
  createdAt: string;     // ISO
  updatedAt: string;
  body: string;          // văn bản thường, tối đa 2000 ký tự
  kind: "note" | "highlight" | "scratch";
  tags: string[];        // tối đa 8, mỗi thẻ tối đa 30 ký tự
  pinned?: boolean;
  remember?: boolean;    // vào lịch ôn ghi chú
  anchor?: {             // ghi chú gắn với chỗ cụ thể
    source: "paper" | "lesson" | "exam";
    sourceId: string;    // mã đề hoặc mã bài
    version: number;     // phiên bản học liệu lúc ghi
    runId?: string;      // lượt thi, nếu ghi trong lúc thi
    itemId?: string;     // mã câu hỏi
    quote?: string;      // đoạn được đánh dấu, tối đa 300 ký tự
    start?: number;      // vị trí trong đoạn văn, để tô lại
    end?: number;
    color?: "yellow" | "pink" | "green";
  };
};
```

Văn bản thường, có thể xuống dòng và gạch đầu dòng bằng "-". Không làm trình soạn thảo định dạng phức tạp ở các đợt đầu: khó kiểm thử, dễ lỗi trên điện thoại, và không cần cho việc ghi chú luyện thi.

### 3.2 Lưu ở đâu

Lưu trong cùng state với tiến độ học (trường `notes`, tùy chọn), vì như vậy ghi chú **tự động** vào bản sao lưu JSON và đồng bộ Supabase hiện có mà không cần migration mới.

Dung lượng đã đo (QUALITY.md): sau 90 ngày học đều, state khoảng **191 KB**, tăng khoảng **20 KB/tháng**. Hạn mức localStorage thường là 5 MB, giới hạn nhập/đồng bộ là 10 MB. Đặt trần cho ghi chú:

- tối đa **800 ghi chú**, mỗi ghi chú tối đa **2000 ký tự**;
- trường hợp xấu nhất (800 ghi chú × 2000 ký tự, trình duyệt thường tính 2 byte mỗi ký tự trong localStorage) khoảng 3 MB, nên cần thêm **trần tổng khoảng 1,5 MB cho ghi chú**, kiểm tra trước khi ghi. Chạm trần thì báo rõ và gợi ý xuất bản sao hoặc gộp ghi chú cũ, không âm thầm từ chối;
- mục "Chỗ ở của dữ liệu" trong Cài đặt (hiện có hai dòng: Dữ liệu học và Bản ghi âm) thêm dòng Ghi chú (số lượng, dung lượng).

Nếu sau này Gùa ghi nhiều hơn mức này, bước tiếp theo là tách ghi chú sang IndexedDB và một bảng Supabase riêng (cần migration và RLS, việc của chủ dự án). Kế hoạch này không làm bước đó trước khi có số đo thật.

### 3.3 Đồng bộ giữa hai thiết bị

Đồng bộ hiện tại là bấm "Lưu lên"/"Tải về" toàn bộ bản sao, có kiểm tra revision để không ghi đè bản mới hơn. Hệ quả cho ghi chú: nếu ghi trên điện thoại rồi ghi trên máy tính **trước khi đồng bộ**, một bên sẽ phải chọn bản nào giữ. Đợt 0 không đổi điều này; HANDOVER.md đã ghi "tự động đồng bộ nhiều thiết bị: chưa làm". Gộp ghi chú từ hai bản sao (theo `id` và `updatedAt`) là việc đáng làm sau, ghi ở mục 7.

### 3.4 Ghi chú gắn với bài đọc khi học liệu đổi

Đoạn được đánh dấu lưu cả vị trí lẫn nguyên văn (`quote`). Khi mở lại:

1. cùng phiên bản học liệu: tô đúng vị trí;
2. phiên bản khác: tìm lại `quote` trong bài mới; tìm thấy đúng một chỗ thì tô ở đó;
3. không tìm thấy hoặc thấy nhiều chỗ: không tô, ghi chú vẫn còn trong sổ kèm dòng "đoạn văn này đã thay đổi".

---

## 4. Các đợt triển khai

Mỗi đợt có: phạm vi, tiêu chí nghiệm thu đo được, và test. Ước lượng là số PR, không phải số ngày.

### Đợt 0 — Nền dữ liệu (1 PR, không có giao diện mới ngoài Cài đặt)

- Schema `notes` tùy chọn; bản sao lưu cũ không có trường này vẫn hợp lệ.
- Các hàm `addNote`, `updateNote`, `removeNote`, `restoreNote` kiểm tra trần (số lượng, độ dài, tổng dung lượng) **trước** khi ghi.
- Báo lỗi (error report) chỉ đếm số ghi chú, không chứa nội dung.
- Cài đặt: thêm dòng dung lượng ghi chú.

**Nghiệm thu:** bản sao lưu cũ khôi phục được; thêm ghi chú thứ 801 bị từ chối với thông báo rõ, và lần tải trang sau dữ liệu vẫn đọc được (đúng loại lỗi của lượt thi thứ 101); xuất JSON có ghi chú; file báo lỗi không có nội dung ghi chú.
**Test:** unit cho trần và schema; E2E tải lại sau khi chạm trần.

### Đợt 1 — Sổ ghi chú (`/notes`) (1 PR)

- Mục "Sổ ghi chú" ở thanh bên.
- Tạo, sửa (tự lưu), xóa có "Hoàn tác" trong vài giây.
- Tìm kiếm không dấu (dùng lại `searchFold` của vườn từ), lọc theo kỹ năng, Part, đề, thẻ; ghim lên đầu; sắp theo mới sửa hoặc theo đề.
- Mỗi ghi chú gắn với đề/câu có nút "Mở chỗ đã ghi" đưa về đúng màn đó.
- Phím tắt trên máy tính để mở ô ghi chú mới, luôn kèm phím bổ trợ (ví dụ `Alt` + `G`). Không dùng một chữ cái đơn: dễ bấm nhầm khi đang gõ và trái WCAG 2.1.4. Hiện app chỉ có một phím tắt (`Esc` đóng menu điện thoại), nên chưa có xung đột.

**Nghiệm thu:** tạo một ghi chú trong dưới 5 giây từ bất kỳ màn nào có nút ghi chú; tìm "bay" ra ghi chú có "bẫy"; xóa nhầm rồi hoàn tác thì ghi chú quay lại nguyên vẹn; dữ liệu còn sau khi tải lại.
**Test:** E2E tạo/sửa/tìm/lọc/xóa/hoàn tác/tải lại; axe cho trang mới.

### Đợt 2 — Ghi chú tại chỗ khi chữa đề (1 PR)

Đây là chỗ thay giấy nhiều nhất.

- Màn chữa đề kho đề, kết quả bài học, Sổ lỗi sai, Làm lại câu sai: mỗi câu có nút "Ghi chú cho câu này". Ghi chú tự gắn đề, Part, câu, dạng câu, và hiện ngay dưới câu đó ở mọi lần gặp lại.
- Gợi ý nhanh (chọn một chạm, có thể sửa): "Bẫy: từ đồng nghĩa", "Bẫy: phủ định", "Không nghe kịp con số", "Đọc thiếu câu cuối đoạn", "Từ mới: …". Đây là gợi ý do Mây đặt, không phải phân loại chính thức của VSTEP.
- Ghi chú cho cả lượt thi ("Rút kinh nghiệm đề 133"): ở đầu màn chữa đề.
- Từ ghi chú tạo nhanh một thẻ từ cho vườn (từ, nghĩa, câu ví dụ lấy từ câu đang chữa), mở rộng ngoài 10 câu có thẻ viết sẵn hiện nay.

**Nghiệm thu:** ghi chú gắn với câu 12 của đề 133 hiện ở màn chữa đề, ở Làm lại câu sai và trong Sổ ghi chú; đổi lượt thi khác của cùng đề vẫn thấy (gắn theo câu, không chỉ theo lượt); thẻ từ tạo từ ghi chú xuất hiện trong vườn và được đếm ở trang chủ.
**Test:** E2E cho từng màn; unit cho việc gắn và lọc theo câu.

### Đợt 3 — Ô nháp khi đang làm bài (1 PR)

- **Nghe:** ô nháp cạnh câu hỏi, gõ được trong lúc bản ghi phát (không làm mất tiêu điểm của nút, không chặn phím).
- **Nói:** ô dàn ý trong phút chuẩn bị Part 2 và Part 3, hiện tiếp trong lúc nói.
- **Viết:** ô dàn ý tách khỏi bài viết, không tính vào số từ.
- Nháp được lưu với lượt thi, xem lại ở màn chữa đề, chuyển thành ghi chú thường bằng một nút.
- Trong phòng thi mô phỏng: bật mặc định, ghi rõ "công cụ luyện tập; chưa xác nhận phòng thi thật có cho ghi trên máy". Màn xác nhận có lựa chọn tắt để luyện đúng điều kiện chỉ có trí nhớ hoặc giấy.

**Nghiệm thu:** gõ nháp trong lúc nghe không làm dừng hay lặp bản ghi (quy tắc nghe một lần vẫn giữ); nháp còn sau khi tải lại giữa phần thi; tắt ô nháp thì không hiện ở bất cứ phần nào của lượt đó.
**Test:** E2E trong phòng thi mô phỏng cho Nghe, Nói, Viết; kiểm tra số từ không đổi khi có dàn ý.

### Đợt 4 — Đánh dấu và ghi chú trên bài đọc (1–2 PR)

- Chọn một đoạn trong bài Đọc (hoặc bản chép lời bài Nghe sau khi nộp), chọn màu, thêm ghi chú. Đoạn được tô ở mọi lần mở lại.
- Dùng được ở chế độ luyện thoải mái, màn chữa đề và bài học. Trong phòng thi mô phỏng: chỉ tô màu, ghi chú để sau (tránh làm rối giao diện thi).
- Bàn phím: chọn đoạn bằng Shift + mũi tên rồi phím tắt để tô; trình đọc màn hình đọc được đoạn đã tô.
- Gắn lại khi học liệu đổi theo mục 3.4.

**Nghiệm thu:** tô ba đoạn, tải lại, cả ba còn đúng chỗ; sửa nội dung bài trong test (phiên bản mới) thì đoạn còn tìm thấy được tô lại, đoạn không còn thì báo "đã thay đổi"; dùng được hoàn toàn bằng bàn phím.
**Test:** unit cho việc gắn lại; E2E cho tô/tải lại/đổi phiên bản; **kiểm thử trên điện thoại thật** (chọn chữ bằng tay) trước khi đóng đợt.

### Đợt 5 — Ôn ghi chú và mang theo (1 PR)

- Đánh dấu "Cần nhớ" đưa ghi chú vào lịch ôn (dùng lại thuật toán lịch ôn của thẻ từ), hiện ở trang chủ cùng số thẻ đến hạn.
- Xuất ghi chú: in (bố cục in sẵn), hoặc tải file Markdown/văn bản theo đề hoặc theo thẻ, để đọc trên điện thoại hoặc gửi giáo viên.
- Trang "Trước ngày thi": gom ghi chú ghim, ghi chú "cần nhớ", và các lỗi lặp nhiều nhất.

**Nghiệm thu:** ghi chú "cần nhớ" đến hạn hiện ở trang chủ và trong buổi 10 phút; file xuất mở được, đúng tiếng Việt, không chứa dữ liệu khác; bản in không có thanh bên và nút.
**Test:** unit cho lịch ôn và nội dung file xuất; E2E in và tải file.

---

## 5. Không làm trong kế hoạch này

- Trình soạn thảo định dạng phức tạp (in đậm, bảng, chèn ảnh).
- Vẽ tay hoặc chụp ảnh ghi chú giấy: cần lưu ảnh trong IndexedDB và không đi qua đồng bộ hiện có. Để sau nếu Gùa thật sự cần.
- Gợi ý ghi chú bằng AI hoặc tóm tắt tự động: trái với nguyên tắc không gửi nội dung học ra dịch vụ AI.
- Chia sẻ ghi chú cho người khác qua đường dẫn.

---

## 6. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
| --- | --- |
| Dung lượng localStorage | Trần số lượng và tổng dung lượng, kiểm tra trước khi ghi; hiện trong Cài đặt |
| Mất ghi chú khi xóa dữ liệu trình duyệt | Có trong bản sao lưu và đồng bộ; nhắc sao lưu khi số ghi chú tăng đáng kể kể từ lần sao lưu cuối |
| Ghi trên hai thiết bị trước khi đồng bộ | Nói rõ trong giao diện đồng bộ; gộp theo `id` + `updatedAt` là việc sau (mục 7) |
| Gõ nháp làm chậm hoặc rối phòng thi | Ô nháp ghi xuống máy sau khi ngừng gõ, không mỗi phím; E2E kiểm quy tắc nghe một lần vẫn đúng |
| Chọn chữ trên điện thoại khó dùng | Đợt 4 kiểm thử trên máy thật trước khi đóng |
| Ghi chú lọt vào file báo lỗi | Unit test kiểm file báo lỗi không chứa nội dung ghi chú |

---

## 7. Việc sau kế hoạch (chưa cam kết)

- Gộp ghi chú khi tải bản sao từ thiết bị khác thay vì chọn một bên.
- Tách ghi chú sang IndexedDB và bảng Supabase riêng nếu số đo cho thấy cần.
- Ảnh chụp ghi chú giấy.

---

## 8. Cần anh quyết

1. **Phòng thi mô phỏng:** ô nháp bật mặc định (dễ luyện) hay tắt mặc định (gần thi thật hơn)? Kế hoạch đang chọn bật mặc định, có nút tắt.
2. **Thứ tự:** kế hoạch đi 0 → 1 → 2 → 3 → 4 → 5. Nếu Gùa cần ghi khi chữa đề nhất, có thể làm Đợt 2 ngay sau Đợt 0 và để trang Sổ ghi chú đầy đủ (Đợt 1) theo sau.
3. **Trần dung lượng:** 800 ghi chú và khoảng 1,5 MB có đủ với cách Gùa học không? Có thể nâng sau khi đo dữ liệu thật.
