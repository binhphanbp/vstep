# Kế hoạch: nháp, tô và ghi chú khi luyện đề

Viết ngày 08/10/2026 trên nền `main` tại `417bc52` (202 unit, 93 E2E, 111 route); rà lại và rút gọn cùng ngày sau khi anh chốt hướng. Mọi con số dưới đây là số đo hoặc đọc từ code (mục 8).

## 1. Mục tiêu

Khi tự ôn, làm đề giấy hay thi thử trên máy, Gùa phải nháp và ghi chú bằng tay: gạch chân bài đọc, ghi từ khóa khi nghe, dàn ý trước khi nói, rồi chép lại "vì sao sai" ra sổ. Mây cần thay được việc đó, **gọn, không rối, dùng được ngay**.

Phạm vi là **luyện tập**. Thi thật (ĐH Văn Lang hoặc UFM, TP.HCM) không liên quan đến Mây, nên kế hoạch không mô phỏng quy định phòng thi về giấy nháp.

## 2. Ba công cụ, một chỗ xem lại

Gùa chỉ cần biết ba thứ, giống bút và giấy khi làm đề giấy:

| Công cụ | Dùng khi | Thuộc về | Hành vi |
| --- | --- | --- | --- |
| **Nháp** | Đang làm bài: Nghe, Đọc, Viết, Nói; cả luyện thoải mái lẫn thi thử | **Lượt làm bài**, mỗi phần một trang | Ô chữ trong bảng bên cạnh câu hỏi, tự lưu. Làm lại đề là trang trắng; xem lại lượt cũ thì thấy đúng nháp của lượt đó. Có nút "Lưu thành ghi chú". Dàn ý Viết nằm ở đây nên không tính vào số từ. |
| **Tô** | Đang đọc bài, hoặc đọc bản chép lời Nghe sau khi nộp | **Lượt làm bài** | Bật "Tô" rồi bấm hoặc chạm vào một câu để tô vàng, bấm lần nữa để bỏ. Một màu. Dùng được bằng `Tab` + `Enter`. Câu đã tô có nút "Thêm ghi chú". |
| **Ghi chú** | Sau khi nộp: chữa đề, Làm lại câu sai, kết quả bài học, Sổ tay lỗi sai | **Câu hỏi** (hoặc cả đề) | Nút "Ghi chú" ở từng câu, có 5 gợi ý một chạm. Hiện lại ở mọi lần chữa câu đó, **không hiện khi đang làm bài** để khỏi lộ đáp án. Có dấu ★ "Cần nhớ". |

Năm gợi ý một chạm, sửa được sau khi chọn: "Bẫy: từ đồng nghĩa", "Bẫy: phủ định", "Không nghe kịp con số", "Đọc thiếu câu cuối đoạn", "Từ mới: …". Đây là gợi ý do Mây đặt, không phải phân loại chính thức của VSTEP.

Giải thích, dẫn chứng và ghi chú từng phương án do Mây viết sẵn (`question-notes.ts`; `explanation`, `evidence`, `notes` trong đề kho) giữ nguyên. Ghi chú của Gùa hiện cạnh đó, khác màu, nhãn "Ghi chú của Gùa".

**Trang Ghi chú** (`/notes`, một mục ở thanh bên, biểu tượng khác "Sổ tay lỗi sai"):

- tìm không dấu (dùng lại `searchFold`);
- lọc theo kỹ năng, theo đề/bài, theo ★;
- mỗi ghi chú có nhãn chỗ ghi ("Đề 133 · Nghe Part 2 · Câu 12") và nút "Mở chỗ đã ghi";
- sửa, xóa có "Hoàn tác"; dòng "Đã xóa gần đây (n)" khôi phục được trong 30 ngày;
- nút **In** in đúng danh sách đang lọc, ví dụ chỉ "★ Cần nhớ" để đọc trước ngày thi;
- hiện thêm, chỉ đọc, nhận xét giáo viên đã gõ ở "Gói gửi giáo viên".

## 3. Không làm (để gọn)

| Bỏ | Vì sao / thay bằng gì |
| --- | --- |
| Thẻ tự đặt | Lọc tự động theo kỹ năng, Part, đề đã đủ; thẻ tự đặt thêm một bước mỗi lần ghi |
| Ghim | Gộp vào ★ |
| Nhiều màu tô | Một màu là đủ để tìm lại câu chứa ý |
| Nút ghi nhanh toàn cục, phím tắt | Nháp và ghi chú đã nằm đúng chỗ đang học |
| Trang "Trước ngày thi" | Lọc ★ + In |
| Tạo thẻ từ từ ghi chú | Vườn từ chỉ nhận thẻ viết sẵn; thẻ tự tạo là thay đổi mô hình dữ liệu riêng, để sau |
| Lịch ôn giãn cách cho ghi chú, file Markdown | Để sau nếu ★ + In chưa đủ |
| Trình soạn thảo định dạng, ảnh, vẽ tay | Khó kiểm thử, không cần cho luyện đề |
| Gợi ý bằng AI | Nội dung học không gửi ra dịch vụ AI |

## 4. Các đợt

Bốn PR. Mỗi đợt có test và dùng được ngay khi merge.

### Đợt 0 — Giữ trường lạ (rất nhỏ, phát hành riêng trước)

**Vì sao trước tiên:** `stateSchema` (`src/lib/learning.ts`) hiện dùng `z.object`, tức **bỏ mọi trường nó chưa biết**. Đã tái hiện bằng unit test tạm: một tab chạy bản cũ (hoặc trang cũ service worker còn giữ) đọc state, bỏ mất `notes`, rồi ghi đè ở lần lưu kế tiếp. `updateStudy` luôn đọc bản mới nhất trước khi ghi, nhưng chính bước đọc đó đã bỏ trường lạ.

- **Sửa:** state giữ nguyên các trường cấp ngoài cùng chưa biết; các trường đã biết vẫn kiểm như cũ.
- **Nghiệm thu:** state có trường lạ đi qua đọc → sửa → ghi vẫn còn trường đó; bản sao lưu cũ vẫn đọc được; bản sao lưu tự mâu thuẫn vẫn bị từ chối.
- Giao diện ghi chú chỉ ra ở bản **sau** bản này.

### Đợt 1 — Ghi chú cho từng câu + trang Ghi chú

Đây là phần thay giấy nhiều nhất: chép "vì sao sai" sau khi chữa đề.

**Nền dữ liệu:**

- Trường `notes` tùy chọn trong state.
- Các hàm `addNote`, `updateNote`, `trashNote`, `restoreNote` kiểm trần **trước** khi ghi. Lỗi lượt thi thứ 101 cho thấy: ghi vượt giới hạn schema thì lần mở sau toàn bộ dữ liệu bị báo hỏng.
- `buildErrorReport` thêm số ghi chú. Hàm này chỉ lấy các trường được liệt kê, nên nội dung ghi chú tự không lọt vào; có test giữ điều đó.
- Cài đặt, mục "Chỗ ở của dữ liệu": thêm dòng Ghi chú (số lượng, dung lượng).
- Đo hạn mức localStorage thật trên Chromium, Firefox, WebKit bằng Playwright, ghi vào QUALITY.md.

**Màn có nút Ghi chú:**

- `paper-review.tsx`: chữa đề và Làm lại câu sai (`RetryDrill`);
- `practice.tsx`: kết quả bài học;
- `review.tsx`: Sổ tay lỗi sai.

Ghi chú cả đề ("Rút kinh nghiệm đề 133") nằm ở đầu màn chữa đề.

**Nghiệm thu:**

- Ghi chú cho câu 12 đề 133 hiện ở màn chữa đề, ở Làm lại câu sai, ở lượt khác của cùng đề và trong trang Ghi chú.
- Không hiện khi đang làm đề đó lần nữa.
- Tìm "bay" ra ghi chú có chữ "bẫy".
- Xóa rồi Hoàn tác thì ghi chú quay lại nguyên vẹn.
- Còn sau khi tải lại; trang Ghi chú mở được khi offline.
- Thêm mục vượt trần bị từ chối rõ ràng, và lần tải sau dữ liệu vẫn đọc được.
- Xuất JSON có ghi chú; nhập lại khôi phục đúng.

**Test:**

- E2E từng màn; axe cho trang mới; unit cho trần và lọc.
- Kiểm tay gõ tiếng Việt bằng Telex (Unikey/EVKey hoặc bộ gõ macOS), vì Playwright không mô phỏng được bộ gõ.

### Đợt 2 — Nháp + Tô khi làm bài

**Màn làm bài:**

- `paper-runner.tsx` (luyện thoải mái);
- `paper-exam.tsx` (thi thử);
- `practice.tsx` (bài học);
- `exam.tsx` (phòng luyện có giờ).

Xem lại ở `paper-review.tsx` và kết quả bài học.

- **Nháp bài học** dùng lại `state.drafts`, giống mẫu `drafts["quiz:<id>"]` đã có (xóa khi nộp, `practice.tsx`). Nháp nằm ở `drafts["scratch:<lessonId>"]`, nên lúc đang làm không cần đổi schema. Khi nộp, nháp không rỗng chuyển thành một mục nháp gắn với lượt đó, rồi ô nháp được xóa.
- **Nháp và tô của đề kho** gắn mã lượt thi và phần thi. `addPaperRun` (`src/lib/papers.ts`) bỏ lượt cũ nhất khi vượt `MAX_PAPER_RUNS = 100` và trả về danh sách `dropped`. Nháp và tô của các lượt đó được dọn cùng lúc; ghi chú Gùa đã lưu thành ghi chú thì giữ.
- **Tách câu để tô** dùng lại logic của `speechChunks` / `shieldDots` (`src/lib/speech.ts`), vốn đã không cắt "Dr. Hart", "3.5", "a.m.". Logic này được tách thành một hàm trả về vị trí câu trong văn bản gốc, dùng chung cho đọc to và tô.
- **Tô áp vào hai chỗ hiển thị:** `PaperText` (`paper-exam.tsx`, dùng cho thi thử, luyện và chữa đề) và khối `.passage` (`practice.tsx`, `exam.tsx`). Bản dịch không tô. Bản chép lời Nghe chỉ tô được sau khi nộp.
- **Nói:** ô nháp dùng được trong phút chuẩn bị Part 2 và Part 3 (Part 1 không có thời gian chuẩn bị, theo `papers.ts`), và vẫn hiện trong lúc nói.
- **Bàn phím và chạm:** tô theo câu thay vì bôi chọn tự do. Trên chữ thường, bôi chọn bằng bàn phím không làm được nếu chưa bật caret browsing, và bôi chọn trên màn cảm ứng khó dùng.

**Nghiệm thu:**

- Gõ nháp khi bản ghi đang phát không làm dừng hay phát lại; quy tắc nghe một lần trong thi thử vẫn đúng.
- Nháp và câu tô còn sau khi tải lại giữa phần thi.
- Làm lại đề là trang trắng; xem lại lượt cũ thấy đúng nháp và tô của lượt đó.
- Số từ bài Viết không đổi khi có dàn ý trong nháp.
- Lượt thứ 101 bỏ lượt cũ nhất cùng nháp và tô của nó, không bỏ ghi chú đã lưu.
- Tô và bỏ tô được hoàn toàn bằng bàn phím.

### Đợt 3 — ★ Cần nhớ, In, nhắc sao lưu

- ★ trên ghi chú; lọc ★ trong trang Ghi chú.
- Bố cục in sẵn: không có thanh bên và nút; mỗi ghi chú kèm nhãn và trích câu hỏi.
- Nhắc xuất bản sao khi số ghi chú tăng nhiều kể từ lần sao lưu gần nhất.
- **Nghiệm thu:** bản in đúng danh sách đang lọc, đúng tiếng Việt, không có giao diện thừa.

## 5. Dữ liệu và dung lượng

### 5.1 Một mục gồm gì

```ts
type Note = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;          // "Đã xóa gần đây", xóa hẳn sau 30 ngày
  kind: "note" | "scratch" | "highlight";
  body: string;                // tối đa 2000 ký tự (nháp tối đa 4000)
  star?: boolean;              // ★ Cần nhớ
  anchor?: {
    source: "paper" | "lesson";
    sourceId: string;          // mã đề hoặc mã bài
    version: number;           // phiên bản học liệu lúc ghi
    label: string;             // "Đề 133 · Nghe Part 2 · Câu 12"
    excerpt?: string;          // một dòng đầu câu hỏi
    runId?: string;            // lượt thi (nháp, tô)
    attemptId?: string;        // lượt bài học (nháp, tô)
    section?: number;          // phần thi của nháp
    itemId?: string;           // câu hỏi (mã câu đề kho đã có tiền tố mã đề)
    sentence?: number;         // câu thứ mấy trong bài (tô)
    quote?: string;            // nguyên văn câu tô, tối đa 300 ký tự
  };
};
```

- `label` và `excerpt` là bản chụp nhỏ lúc ghi, theo nguyên tắc "kết quả cũ không đổi nghĩa" của Mây. Trang Ghi chú không phải tải file đề, chạy được khi offline, và vẫn đúng khi một đề bị gỡ khỏi kho như đề 131.
- Khi học liệu đổi phiên bản, câu tô được tìm lại theo nguyên văn. Thấy đúng một chỗ thì tô ở đó; không thấy thì ghi chú vẫn còn, kèm dòng "đoạn văn này đã thay đổi".

### 5.2 Lưu ở đâu

Trong cùng state với tiến độ học. Nhờ vậy ghi chú tự đi theo:

- bản sao lưu JSON (giới hạn nhập 10 MB);
- đồng bộ Supabase: ràng buộc chỉ kiểm các trường cũ và tổng 10 MB, không chặn trường mới;
- nút xóa dữ liệu.

### 5.3 Trần, đã đo

Đo ngày 08/10/2026 bằng mô phỏng 90 ngày học trong `learning.test.ts`, thêm ghi chú tiếng Việt có gắn câu. Máy đo là container phát triển, không phải điện thoại.

| Ghi chú | Dung lượng ghi chú | Tổng state | Ghi (stringify) | Đọc lại + kiểm schema |
| --- | --- | --- | --- | --- |
| 0 | 0 | 217 KB | 2,4 ms | 3,4 ms |
| 300 × 150 ký tự | 142 KB | 359 KB | 3,4 ms | 2,2 ms |
| 800 × 300 ký tự | 543 KB | 760 KB | 3,0 ms | 2,6 ms |
| 800 × 2000 ký tự | 2443 KB | 2659 KB | 5,2 ms | 3,6 ms |

State 90 ngày hôm nay là 217 KB. Con số 191 KB trong QUALITY.md đo trước khi kho bài được thêm.

- Một ghi chú ngắn (~150 ký tự) kèm chỗ gắn chiếm khoảng 0,5 KB. Ghi 5 cái mỗi ngày trong một năm là khoảng 1800 ghi chú, chừng 900 KB.
- **Trần: 2000 mục, 1,5 MB**, tính cả nháp và tô, đo bằng `Blob` như "Chỗ ở của dữ liệu". Cộng dữ liệu học sau một năm, tổng khoảng 2 MB, dưới xa giới hạn 10 MB của bản sao lưu và Supabase.
- Dung lượng nháp và tô cho 100 lượt thi sẽ đo khi có code (Đợt 2), chưa ước lượng ở đây.
- Hạn mức localStorage thật chưa đo; Đợt 1 đo trên ba engine rồi mới chốt trần.
- Thời gian ghi trên điện thoại chưa đo. Ô chữ ghi xuống máy khi ngừng gõ khoảng một giây, khi rời ô và khi rời trang, không theo từng phím.
- Chạm trần thì báo rõ và gợi ý dọn "Đã xóa gần đây" hoặc xuất bản sao, không âm thầm từ chối.

### 5.4 Nhiều tab, nhiều thiết bị

- **Hai tab cùng máy:** `updateStudy` đọc bản mới nhất trước mỗi lần ghi, nên mục viết ở tab này không mất khi tab kia ghi. Sửa **cùng một** ghi chú ở hai tab thì bản lưu sau cùng thắng.
- **Hai thiết bị:** đồng bộ hiện là bấm "Lưu lên"/"Tải về" cả bản, có revision. Ghi trên hai máy trước khi đồng bộ thì vẫn phải chọn giữ một bản. Trường `deletedAt` giữ chỗ cho việc gộp theo `id` + `updatedAt` sau này.

## 6. Rủi ro và cách giảm

| Rủi ro | Trạng thái | Cách giảm |
| --- | --- | --- |
| Tab từ bản cũ xóa mất ghi chú | **Đã tái hiện** | Đợt 0 phát hành riêng trước giao diện |
| Ghi vượt giới hạn làm hỏng dữ liệu | Đã xảy ra với lượt thi thứ 101 | Kiểm trần trước khi ghi; test tải lại sau khi chạm trần |
| Hết dung lượng trình duyệt | Kích thước đã đo; hạn mức thật chưa đo | Trần 1,5 MB; đo ba engine ở Đợt 1; hiện trong Cài đặt |
| Nháp, tô mồ côi khi lượt thi cũ bị bỏ | Đọc từ `addPaperRun` | Dọn theo `dropped`; unit test |
| Ghi chú lộ đáp án khi làm lại đề | Thiết kế | Chỉ hiện sau khi nộp |
| Gõ tiếng Việt bằng bộ gõ lỗi | Playwright không mô phỏng được | Kiểm tay với Telex ở Đợt 1 |
| Xóa nhầm | — | Hoàn tác + "Đã xóa gần đây" 30 ngày |
| Ghi chú lọt vào file báo lỗi | `buildErrorReport` dùng danh sách trường được phép | Unit test giữ điều đó |

## 7. Anh đã chốt

1. Nháp, tô và ghi chú là để **luyện**; thi thật không liên quan. Nháp có sẵn ở mọi chế độ làm bài, kể cả thi thử, không cần nút bật tắt.
2. Thứ tự: Đợt 0 → 1 → 2 → 3, như trên.
3. Trần: 2000 mục, 1,5 MB; chốt lại sau khi đo hạn mức thật ở Đợt 1.

## 8. Đã kiểm chứng khi rà lại (08/10/2026)

| Điều kế hoạch dựa vào | Cách kiểm | Kết quả |
| --- | --- | --- |
| Trường mới tự đi theo sao lưu và đồng bộ | Đọc `settings.tsx` (nhập 10 MB, `stateSchema.parse`), migration `001`/`002` | Đúng; Supabase chỉ kiểm các trường cũ và tổng 10 MB |
| Tab cũ không làm mất trường mới | Unit test tạm: `stateSchema.parse` trên state có `notes` | **Sai**: trường bị bỏ → thêm Đợt 0 |
| Nhiều tab không ghi đè nhau | Đọc `updateStudy` | Đúng: đọc bản mới nhất trước khi ghi |
| File báo lỗi không chứa ghi chú | Đọc `buildErrorReport` | Đúng: chỉ các trường được liệt kê |
| Chi phí ghi/đọc khi có nhiều ghi chú | Đo trên mô phỏng 90 ngày (mục 5.3) | Vài ms; state 90 ngày hôm nay 217 KB |
| Mã câu đủ để gắn ghi chú | Đọc 5 file đề | 75 câu mỗi đề, mã không trùng, có tiền tố mã đề |
| Nháp bài học không cần đổi schema | Đọc `practice.tsx` | `drafts["quiz:<id>"]` đã dùng mẫu này và được xóa khi nộp |
| Lượt thi cũ bị bỏ thì biết lượt nào | Đọc `addPaperRun` | Trả về `dropped` khi vượt `MAX_PAPER_RUNS = 100` |
| Phút chuẩn bị Nói | `papers.ts` | Part 1: 0 giây; Part 2 và 3: 60 giây |
| Tách câu không cắt sai | `speechChunks`, `shieldDots` | Đã xử lý tước hiệu, số thập phân, e.g./i.e., a.m./p.m. |
| Tô bằng bàn phím trên bài đọc | Bài là chữ thường (`PaperText`, `.passage`) | Bôi chọn bằng bàn phím không làm được nếu không bật caret browsing → tô theo câu |
| "Điều mình đã tự kiểm tra" còn được ghi | Tìm nơi ghi `reflection` | Không: chỉ còn hiển thị dữ liệu cũ |
| Sổ tay lỗi sai gồm câu của đề kho | Đọc `mistakeReviews` | Không: chỉ câu trong bài học; ghi chú câu đề kho gắn ở màn chữa đề |
