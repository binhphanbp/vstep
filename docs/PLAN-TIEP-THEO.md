# Kế hoạch tiếp theo — sau khi PLAN-2026-09-14 đã xong

Viết ngày 14/09/2026, sau khi cả sáu đợt của [PLAN-2026-09-14.md](PLAN-2026-09-14.md) đã merge vào `main` (`683b0e6`). Nền đối chiếu: 127 unit, 52 E2E, build 86 route, axe 14 màn.

Mọi phát hiện dưới đây **đo được từ chính mã nguồn hiện tại**, không phải cảm tính. Cách đo ghi kèm từng mục để anh kiểm lại được.

---

## 1. Ba phát hiện đo được

### 1.1 Một nửa kỳ thi vẫn cạn sau sáu ngày

Thư viện có **12 bài Đọc, 12 bài Nghe — nhưng chỉ 3 bài Viết và 3 bài Nói**. Kế hoạch ngày lấy tối đa ba bài, mỗi kỹ năng một bài, nên phần Viết/Nói hết bài trước tiên.

Mô phỏng 14 ngày ở nhịp 30 phút, trả lời đúng hết (không có lỗi để ưu tiên):

| Nhịp         | Phút được đề nghị / ngân sách | Bài lặp đầu tiên               | Số lần lặp trong 14 ngày |
| ------------ | ----------------------------- | ------------------------------ | ------------------------ |
| 20 phút/ngày | 257 / 280                     | không có                       | 0                        |
| 30 phút/ngày | 386 / 420                     | **ngày 6** (`speaking-social`) | 10                       |
| 60 phút/ngày | 497 / 840                     | ngày 7 (`writing-email`)       | 12                       |

Đọc và Nghe vẫn còn bài chưa gặp khi Nói đã lặp lần thứ tư. Tổng thời lượng theo kỹ năng: Đọc 120 phút, Nghe 108, Viết 80, **Nói 21**.

### 1.2 Ai học 60 phút/ngày chỉ được phục vụ 35 phút

Cùng mô phỏng trên: ở nhịp 60 phút, kế hoạch chỉ dùng **497/840 phút (59%)**. Nguyên nhân là hai luật cũ — tối đa **3 bài** và **mỗi kỹ năng một bài mỗi ngày** — vốn hợp lý khi thư viện có 14 bài, nay chặn đúng người muốn học nhiều hơn.

### 1.3 Hai đề độc lập đã có, nhưng không có chỗ nào so sánh hai lần thi

Lý do viết đề 02 là để đo lại. Hiện lịch sử chỉ liệt kê từng lượt kèm nhãn "Luyện có giờ"; **không màn nào đặt hai lần thi cạnh nhau**. Đây chính là nửa còn lại của F07 ("chưa đo được tiến bộ độc lập").

### Hai phát hiện nhỏ hơn, cùng loại

- **Chú giải bằng chứng**: thư viện 108/108 câu, đề 01 **28/75**, đề 02 **40/75**. Toàn bộ **70 câu Nghe của hai đề** chưa có trích dẫn, nên khi sai một câu Nghe trong phòng thi, Sổ lỗi không phát lại được đúng câu bằng chứng — thứ F11 đã làm cho phần Đọc.
- **Từ vựng có đúng 20 thẻ** (cộng tối đa 10 thẻ tự thêm từ câu "từ vựng trong ngữ cảnh"). Bộ thẻ không liên quan gì tới 24 bài Đọc/Nghe đang có.

---

## 2. Việc tôi làm được ngay

### N1. So sánh hai lần thi — S — ĐÃ XONG (đợt 1)

**Vì sao.** 1.3. Đề 02 tồn tại để làm đúng việc này.

**Việc.** Một khối trong trang Tiến bộ: mỗi lần thi đủ cấu trúc là một dòng (ngày, đề nào, số câu đúng Nghe/Đọc, thời gian dùng). Khi có từ hai lần trở lên, hiện chênh lệch **theo từng phần**, kèm câu nói thẳng điều kiện so sánh: cùng cấu trúc, **khác ngữ liệu** thì so được; **cùng một đề làm lại** thì ghi rõ là đo trí nhớ, không phải đo năng lực.

**Xong khi.** Thi đề 01 rồi đề 02 thì thấy chênh lệch từng phần; thi lại đúng một đề thì app nói thẳng đây không phải phép đo tiến bộ; chưa thi lần nào thì không hiện gì. Không quy đổi sang bậc B1/B2/C1.

**Đã làm.** `examSittings(state)` gom các lượt `exam:<id>:<bài>` về đúng buổi thi sinh ra chúng, tự nhận đề theo tiền tố học liệu (`exam2-` → đề 02, `full-` → đề 01, còn lại là buổi rút gọn), cộng đúng/tổng theo từng kỹ năng và tổng số phút. `compareSittings(state)` lấy hai buổi đủ cấu trúc gần nhất, trả chênh lệch theo **điểm phần trăm** cho Nghe và Đọc kèm cờ `comparable`, cờ này là `false` khi hai buổi cùng một đề. Khối "Những lần thi thử" trong trang Tiến bộ hiện từng dòng và câu kết luận tương ứng. Viết và Nói chỉ đếm số bài đã nộp — không có điểm, vì không có ai chấm.

**Đo được.** 4 ca unit (gom buổi, so hai đề khác nhau, từ chối so khi lặp đề, im lặng khi mới thi một lần) và 1 ca E2E dựng sẵn hai buổi rồi kiểm cả hai câu kết luận.

### N2. Kế hoạch dùng đúng ngân sách người học có — S — ĐÃ XONG (đợt 1)

**Vì sao.** 1.2.

**Việc.** Bỏ trần cứng 3 bài: xếp bài tới khi hết ngân sách (trần an toàn 6 bài để không dựng một danh sách vô tận). Cho phép kỹ năng lặp lại **trong cùng một ngày** chỉ khi ngân sách còn dư và không còn kỹ năng nào chưa có bài. Lý do trên thẻ bài nói rõ vì sao bài thứ tư có mặt.

**Xong khi.** Ở nhịp 60 phút, phần ngân sách được dùng tăng rõ rệt so với 59% hiện tại; ở nhịp 20–30 phút kế hoạch **không đổi** (có test khoá cả hai).

**Đã làm.** Vòng chọn bài cũ giữ nguyên (tối đa 3 bài, mỗi kỹ năng một bài). Sau nó là một vòng thứ hai chỉ chạy khi còn ít nhất `PLAN_EXTRA_MINUTES = 12` phút: xếp thêm bài còn vừa ngân sách, ưu tiên kỹ năng hôm nay chưa có bài nào, tối đa 2 bài cho một kỹ năng và `PLAN_MAX_LESSONS = 6` bài cho cả ngày. Mỗi bài thêm mang lý do "Hôm nay còn N phút trong ngân sách". Kế hoạch trả thêm `spare` — số phút không dùng tới — để test đọc được.

**Đo được.** Mô phỏng 14 ngày, trả lời đúng hết, đo phút được đề nghị trên ngân sách:

| Nhịp         | Trước   | Sau         |               |
| ------------ | ------- | ----------- | ------------- |
| 20 phút/ngày | 264/280 | 264/280     | không đổi     |
| 30 phút/ngày | 359/420 | 359/420     | không đổi     |
| 45 phút/ngày | 461/630 | 551/630     | 73% → 87%     |
| 60 phút/ngày | 495/840 | **752/840** | 59% → **90%** |

(Số của bảng 1.2 đo bằng một mô phỏng hơi khác nên lệch vài phút; hai cột trên đo bằng cùng một kịch bản nên so được với nhau.) Kế hoạch mặc định 30 phút vẫn đúng ba bài cũ: `listening-weekend`, `reading-cafe`, `speaking-social`. 4 ca unit khoá: không bao giờ vượt ngân sách ở 6 nhịp khác nhau, ngày ngắn giữ nguyên 18/20 và 24/30 phút, giờ học 60 phút dùng quá 45 phút và không kỹ năng nào chiếm quá 2 bài, mọi bài thêm đều có lý do.

### N3. Ngân hàng Viết và Nói — M

**Vì sao.** 1.1. Đây là nửa kỳ thi đang mỏng nhất, và cũng là nửa khó tự học nhất.

**Việc.** Thêm **6 đề Viết** (3 task 1, 3 task 2, mỗi đề có bài mẫu để đối chiếu từng tiêu chí) và **6 đề Nói** (2 cho mỗi phần). Đề mới mang mã mới; không sửa đề đã phát hành.

**Xong khi.** Thư viện đạt 9 Viết + 9 Nói; mô phỏng 14 ngày ở nhịp 30 phút không còn lặp bài Nói trước ngày 10; mỗi đề Viết có bài mẫu dài hơn số từ tối thiểu; bộ tiêu chí tự kiểm tra nhận đúng task 1 hay task 2 cho mọi đề mới.

### N4. Chú giải cho phần Nghe của hai đề — M

**Vì sao.** Phát hiện nhỏ ở mục 1: sai một câu Nghe trong phòng thi thì Sổ lỗi không phát lại được câu bằng chứng.

**Việc.** Viết trích dẫn nguyên văn + phân tích bốn phương án cho **70 câu Nghe** của đề 01 và đề 02, cộng 12 câu Đọc còn thiếu của đề 01. Làm theo lô, mỗi lô một commit.

**Xong khi.** Chú giải phủ **258/258 câu**; test hiện có tự bắt trích dẫn sai vì nó đối chiếu với transcript.

### N5. Thẻ từ mọc ra từ chính bài đã học — M

**Vì sao.** Bộ 20 thẻ không liên quan gì tới bài học; một người nhắm B2 cần nhiều hơn thế.

**Việc.** Chọn **40–60 từ** từ chính ngữ liệu 24 bài Đọc/Nghe (ưu tiên từ xuất hiện lại ở đề thi), mỗi thẻ có IPA, nghĩa tiếng Việt, ví dụ **lấy đúng câu trong bài cô ấy đã gặp**, và mã bài nguồn. Thẻ hiện ra theo tiến độ: chỉ vào bộ ôn khi bài chứa nó đã được học.

**Xong khi.** Bộ thẻ tăng lên 60–80; mỗi thẻ truy được về một bài có thật và ví dụ khớp nguyên văn (có test); thẻ của bài chưa học không xuất hiện trong buổi ôn.

### N6. Chặn tài liệu trôi khỏi sự thật — S

**Vì sao.** Đây là lần thứ ba tài liệu lệch: bìa báo cáo Word ghi 57 unit/40 E2E suốt ba release; hôm nay ba dòng trong `PRODUCTION-ROADMAP.md` vẫn nói app **chưa có** siêu dữ liệu biên tập (F06), **chưa có** offline (F10) và tài liệu đang dùng số 57/40 (F09) — cả ba đều đã làm xong.

**Việc.** Cập nhật ba dòng đó cho đúng, và thêm một **test đọc tài liệu**: số bài, số câu, số route và số kiểm thử ghi trong `STATUS.md`/`QUALITY.md` phải khớp với con số đếm được từ mã nguồn. Sai lệch thì CI đỏ, không phải đợi người đọc phát hiện.

**Xong khi.** Sửa một con số trong tài liệu mà quên nơi khác thì CI báo ngay.

---

## 3. Thứ tự đề xuất

| Đợt | Nội dung                                                              | Vì sao trước                                               |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | **N1** so sánh hai lần thi · **N2** dùng đúng ngân sách — **đã xong** | Nhỏ, đóng nốt F07 và mở khoá giá trị của đề 02             |
| 2   | **N3** ngân hàng Viết/Nói                                             | Nửa kỳ thi đang mỏng nhất                                  |
| 3   | **N6** chặn tài liệu trôi · **N5** thẻ từ từ bài học                  | Một việc nhỏ có tính phòng ngừa, một việc vừa              |
| 4   | **N4** chú giải phần Nghe (nhiều lô)                                  | Khối lớn nhất, mang tính hoàn thiện chứ không mở tính năng |

---

## 4. Việc chỉ anh làm được (không đổi)

| Việc                                                                               | Vì sao vẫn chờ                                                                                           |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **F12** — 4 số liệu phần Nói của ULIS                                              | Tôi không truy cập được nguồn công bố từ môi trường này; không dựng khung thời lượng dựa trên phỏng đoán |
| **B7** — đời sống thật của Gùa                                                     | Để viết ngữ liệu đúng bối cảnh cô ấy sống, thay vì bảy chủ đề chung                                      |
| **C1** — rubric chính thức của đơn vị tổ chức                                      | Không có thì phần tiêu chí vẫn phải gọi đúng tên: tiêu chí tự kiểm tra của Mây                           |
| **Thẩm định học liệu** bởi giáo viên VSTEP                                         | Mọi bài đang hiện "Chưa qua thẩm định"; C2 đã biến việc này thành một thao tác in                        |
| **Vercel chỉ promote sau khi CI xanh**, bảo vệ nhánh `main`, kênh nhận lỗi, uptime | Nằm ngoài repository                                                                                     |
| **UAT trên đúng điện thoại Gùa** · diễn tập khôi phục từ bản sao                   | Cần thiết bị thật và thời gian của hai người                                                             |

---

## 5. Điều tôi sẽ không làm nếu không được yêu cầu

- Không chấm Viết/Nói bằng AI (quy tắc dự án cấm gửi nội dung học ra API ngoài).
- Không quy đổi bất kỳ con số nào sang bậc B1/B2/C1.
- Không gọi bất cứ thứ gì tôi viết là "đề thi thật" hay "rubric chính thức".
- Không sửa nội dung bài đã phát hành để chạy theo một chỉ số; sửa nội dung là lên version và mất lịch ôn.
