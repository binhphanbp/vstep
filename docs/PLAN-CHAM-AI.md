# Kế hoạch: chấm Viết và Nói bằng AI (Gemini)

Lập ngày 08/10/2026, sửa lần 2 cùng ngày theo các quyết định của chủ dự án. Trạng thái: **sẵn sàng thực thi**. Các việc chỉ chủ dự án làm được (khóa API, tài liệu bị chặn, giấy phép dữ liệu) nằm ở mục 11; đợt nào cần việc nào thì ghi rõ ở đợt đó.

## 1. Quyết định đã chốt

| # | Quyết định của chủ dự án | Hệ quả trong kế hoạch |
| --- | --- | --- |
| 1 | Bỏ hết phần giáo viên, Mây chỉ dùng cho Gùa | Đợt 0 bỏ cả “Gói gửi giáo viên” lẫn “Gói duyệt học liệu” |
| 2 | Được gửi bài làm ra dịch vụ AI | Đổi nguyên tắc riêng tư một cách công khai (mục 9) |
| 3 | Dùng **Gemini**, chủ dự án cấp khóa API; tối ưu, không gò bó chi phí | Một nhà cung cấp duy nhất cho cả Viết và Nói; không dùng thêm dịch vụ giọng nói riêng |
| 4 | Thang chấm phải hợp lý và giống thật | Dựng thang theo cấu trúc chính thức đã xác minh (mục 3); phần mô tả từng mức lấy từ văn bản gốc của ĐH Ngoại ngữ khi có |
| 5 | Không thuê được giám khảo | Đo độ chính xác bằng **dữ liệu công khai có điểm người chấm** (mục 7), kiểm đi kiểm lại bằng nhiều lớp |
| 6 | Có điểm tổng bốn kỹ năng nếu thang rõ ràng | Làm khi có bảng quy đổi chính thức của Nghe và Đọc; chưa có thì không tự đặt (mục 3.4) |

## 2. Điều phải nói thẳng: “chính xác 100%” nghĩa là gì ở đây

Không có cách chấm Viết và Nói nào, người hay máy, đúng 100%. Bộ GD&ĐT cũng biết vậy nên quy định mỗi bài Viết và Nói do **hai giám khảo chấm độc lập**; lệch từ 1 điểm trở lên thì chấm lại (Thông tư 23/2017, sửa bởi Thông tư 24/2021). Ngay giữa giám khảo người, độ đồng thuận trên các bộ dữ liệu công khai chỉ ở khoảng QWK 0,5–0,6 (bộ ELLIPSE, tính trên dữ liệu thật) và tương quan 0,66–0,71 (bộ speechocean762).

Vì thế “chuẩn chỉnh” trong kế hoạch này có nghĩa cụ thể, kiểm được:

1. **Phần đếm được thì đúng tuyệt đối**, vì code tính chứ không hỏi AI: số từ, số đoạn, đủ số từ tối thiểu, thời gian, tốc độ nói, chỗ ngập ngừng, công thức cộng điểm, làm tròn, quy đổi bậc.
2. **Mỗi lỗi AI chỉ ra là có thật**: AI phải trích nguyên văn; code kiểm câu trích có nằm trong bài không; không khớp thì loại trước khi chấm.
3. **Không cảm tính**: mỗi điểm phải gắn với mô tả của mức đó trong thang và bằng chứng trong bài; mỗi bài chấm độc lập nhiều lần, lấy trung vị.
4. **Cùng một bài, cùng một điểm**: kết quả lưu lại theo dấu của bài làm, đề, phiên bản thang, phiên bản lời nhắc và model; mở lại thấy đúng kết quả cũ.
5. **Biết mình lệch bao nhiêu so với người chấm**: đo trên dữ liệu có điểm người chấm (mục 7); **tiêu chí nào không qua ngưỡng thì không hiện điểm**, chỉ hiện nhận xét và lỗi.
6. **Không chắc thì nói là không chắc**: các lần chấm lệch quá ngưỡng thì hiện khoảng điểm và “độ tin cậy thấp”.

Mọi điểm hiện ra đều ghi: **“Điểm ước lượng theo thang VSTEP do AI chấm, không phải điểm chính thức.”**

## 3. Thang chấm

Phân loại nguồn: **CHÍNH THỨC** (Bộ GD&ĐT, ĐH Ngoại ngữ – ĐHQGHN), **HỌC THUẬT** (bài báo, luận án mô tả cách chấm thực tế), **KHÔNG CHÍNH THỨC** (trang luyện thi, tài liệu tải lên). Mây chỉ coi là luật những gì có nguồn chính thức hoặc học thuật; phần khác ghi rõ là giả định.

### 3.1 Viết (đã đủ để tính điểm)

| Nội dung | Quy tắc | Nguồn |
| --- | --- | --- |
| Bài 1 | Thư hoặc email, “khoảng 120 từ” (QĐ 729) / “ít nhất 120 từ” (trang của ĐH Ngoại ngữ); chiếm 1/3 điểm Viết | CHÍNH THỨC |
| Bài 2 | Bài luận “khoảng 250 từ” / “ít nhất 250 từ”, dùng lý do và ví dụ cụ thể; chiếm 2/3 điểm Viết | CHÍNH THỨC |
| Tiêu chí | Bốn tiêu chí, mỗi tiêu chí 0–10: **hoàn thành nhiệm vụ** (ý chính và phát triển ý), **tổ chức bài** (mạch lạc và liên kết), **từ vựng** (độ rộng và độ phù hợp), **ngữ pháp** (độ rộng và độ chính xác) | HỌC THUẬT (Nguyễn Thị Ngọc Quỳnh 2018, VNU Journal of Foreign Studies) |
| Điểm một bài | Trung bình bốn tiêu chí, thang 10 | HỌC THUẬT (như trên) |
| Điểm Viết | (Bài 1 + Bài 2 × 2) / 3, làm tròn đến 0,5 | HỌC THUẬT, trọng số 1/3 – 2/3 là CHÍNH THỨC |
| Làm tròn | Phần lẻ từ 0,25 đến dưới 0,75 thành 0,5; từ 0,75 thành 1 (tức làm tròn đến 0,5 gần nhất, đúng nửa thì lên) | CHÍNH THỨC (Thông tư 23/2017) |
| Thiếu từ, lạc đề | **Không tìm thấy quy định riêng.** Mây xử lý trong tiêu chí hoàn thành nhiệm vụ: thiếu từ làm giảm mức của tiêu chí này theo mô tả thang; bài lạc đề hoàn toàn rơi vào mức thấp nhất | Giả định, ghi rõ trên màn kết quả |

### 3.2 Nói (đủ tiêu chí, còn một khoảng trống về cách cộng)

| Nội dung | Quy tắc | Nguồn |
| --- | --- | --- |
| Cấu trúc | 12 phút, ba phần: tương tác xã hội; thảo luận giải pháp; phát triển chủ đề có câu hỏi thêm | CHÍNH THỨC |
| Tiêu chí | Năm tiêu chí, mỗi tiêu chí 0–10 (0 là không trả lời, 10 là thành thạo): **ngữ pháp** (độ chính xác, độ phức tạp), **từ vựng** (độ chính xác, độ tinh tế), **phát âm** (âm, trọng âm, ngữ điệu), **độ trôi chảy** (ngập ngừng, tốc độ, tự sửa), **quản lý diễn ngôn / phát triển nội dung** (liên kết, đúng trọng tâm, mở rộng ý); tổng tối đa 50 | HỌC THUẬT (Thai & Sheehan 2022; Language Testing in Asia 2024) |
| Chấm theo phần hay cả bài | Giám khảo chấm sau khi nghe cả ba phần, cho một điểm mỗi tiêu chí | HỌC THUẬT (gián tiếp) |
| Điểm Nói | **Khoảng trống:** chưa nguồn nào nêu công thức. Mây dùng **trung bình năm tiêu chí** (tổng /50 chia 5), làm tròn 0,5, và ghi là giả định cho đến khi có văn bản | Giả định |

### 3.3 Mô tả từng mức điểm (phần còn thiếu, việc đầu tiên của Đợt 1)

Văn bản gốc cần có là **“Mô tả khái quát các điểm Viết, Nói VSTEP.3-5”**, được Trung tâm Khảo thí ĐH Ngoại ngữ liên kết từ trang định dạng đề (`vstep.vnu.edu.vn/dinh-dang-de-thi-vstep-3-5/`). Môi trường làm việc hiện chặn tên miền này nên chưa đọc được (mục 11, việc 3).

- **Có văn bản gốc:** chép nguyên văn vào `src/lib/rubric/vstep-3-5.ts`, ghi nguồn và ngày truy cập; đây là thang Mây dùng.
- **Không lấy được:** Mây dựng mô tả mức cho từng tiêu chí từ **khung CEFR** (Council of Europe, Companion Volume 2020, công khai) theo đúng quy đổi chính thức 4,0–5,5 = B1, 6,0–8,0 = B2, 8,5–10 = C1, cộng các mảnh mô tả không chính thức đã tìm được (ví dụ mức 8 của hoàn thành nhiệm vụ: “covers ALL the requirements of the tasks”). Màn kết quả khi đó ghi “thang dựng theo CEFR và mô tả công khai, chưa đối chiếu văn bản gốc”.

Thang được lưu là **dữ liệu có phiên bản** (`rubricVersion`), không rải trong lời nhắc. Đổi thang thì tăng phiên bản; kết quả cũ giữ phiên bản cũ.

### 3.4 Điểm tổng bốn kỹ năng

| Nội dung | Quy tắc | Nguồn |
| --- | --- | --- |
| Điểm mỗi kỹ năng | Thang 0–10, làm tròn 0,5 | CHÍNH THỨC (QĐ 729) |
| Điểm tổng | Trung bình bốn kỹ năng, làm tròn 0,5 | CHÍNH THỨC (QĐ 729) |
| Bậc | Dưới 4,0 không xét; 4,0–5,5 bậc 3 (B1); 6,0–8,0 bậc 4 (B2); 8,5–10 bậc 5 (C1) | CHÍNH THỨC (ĐH Ngoại ngữ) |
| Nghe 35 câu, Đọc 40 câu sang thang 10 | Có một **bảng quy đổi cố định** dựng bằng phương pháp Angoff, áp cho mọi đề (luận án Nguyễn Thị Quỳnh Yến, ĐH Ngoại ngữ 2017), nhưng **chưa lấy được các con số**. Các bảng trên trang luyện thi mâu thuẫn nhau | HỌC THUẬT, số liệu còn thiếu |

Quyết định: **chưa có bảng chính thức thì Mây không hiện điểm tổng và bậc tổng**; Nghe và Đọc tiếp tục hiện số câu đúng như hiện nay. Khi lấy được bảng (từ bản tóm tắt luận án hoặc văn bản của ĐH Ngoại ngữ), Đợt 4 thêm điểm tổng. Không dùng phép chia tuyến tính, vì bảng thật dựa trên điểm cắt chứ không tuyến tính.

## 4. Chọn model và cách gọi Gemini

Thông tin dưới đây đọc từ tài liệu và SDK chính thức của Google ngày 08/10/2026; **kiểm lại ngay trước khi viết code** vì Google thay model thường xuyên.

| Model | Trạng thái | Giá mỗi triệu token (vào / ra, gồm suy nghĩ) | Ghi chú |
| --- | --- | --- | --- |
| `gemini-3.1-pro-preview` | Bản xem trước | 2 / 12 USD | Model “Pro” mạnh nhất cho suy luận phức tạp; bản xem trước có thể đổi và giới hạn chặt hơn; không tắt được phần suy nghĩ |
| `gemini-3.8-flash` | Ổn định | 0,75 / 3,75 USD (đến 31/12/2026) | Bản Flash mạnh nhất; nhận âm thanh; mức suy nghĩ thấp, vừa, cao |

- **Không chọn theo cảm tính:** Đợt 1 chạy cả hai model trên cùng bộ dữ liệu đo (mục 7), chọn model đồng thuận với người chấm cao hơn. Model được **ghim theo tên chính xác** trong cấu hình; đổi model là một thay đổi có đo lại.
- **Mức suy nghĩ:** `thinkingLevel: HIGH`.
- **Đầu ra:** JSON theo khuôn (`responseMimeType: application/json` + `responseJsonSchema`); Google chỉ đảm bảo đúng cú pháp, nên code kiểm lại từng giá trị bằng Zod.
- **Độ ngẫu nhiên:** trên dòng Gemini 3, `temperature` không còn là cách điều khiển (Google khuyên giữ mặc định, và trên 3.8 Flash tham số này bị bỏ qua); `seed` chỉ là “cố gắng hết sức”. Vì vậy độ ổn định đến từ **chấm nhiều lần lấy trung vị và lưu kết quả**, không từ một tham số.
- **Âm thanh:** Gemini nhận trực tiếp webm, ogg, opus, m4a, mp3, wav…; tối đa 100 MB mỗi yêu cầu; 32 token mỗi giây âm thanh (5 phút ≈ 9.600 token). Có chép lời nguyên văn kèm thời điểm từng từ (`audioTranscriptionConfig`, chế độ `VERBATIM`, `wordTimestamp`); nếu tùy chọn này không chạy được với model chấm thì dùng model chép lời riêng `gemini-3.5-transcribe`. **Google không công bố khả năng chấm phát âm**, nên điểm phát âm phải qua kiểm định riêng (mục 7).
- **SDK:** `@google/genai` (ghim dưới 3.0.0 vì bản 3 đòi Node 22).
- **Tầng trả phí là bắt buộc:** ở tầng miễn phí, Google dùng nội dung gửi lên để cải thiện sản phẩm và có thể cho người đọc; ở tầng trả phí thì không, chỉ lưu nhật ký có thời hạn để phát hiện lạm dụng. Mỗi yêu cầu đặt `store: false`.

## 5. Quy trình chấm Viết

Chạy trên máy chủ (mục 8). Mỗi bước có đầu ra kiểm được.

1. **Code đo:** số từ (đúng hàm `wordCount` đang dùng), số đoạn, đủ số từ tối thiểu, thời gian làm, tỉ lệ chữ tiếng Anh, độ trùng với đề (phát hiện chép đề), độ trùng với bài mẫu của chính đề đó (phát hiện chép mẫu).
2. **Yêu cầu của đề tách sẵn, có duyệt:** mỗi đề Viết của năm đề nhập, hai đề tự soạn và kho bài có danh sách ý bắt buộc (ví dụ thư trả lời Jo: cách chuẩn bị trước buổi tuyển; ý kiến về tập cùng và chương trình thể lực; lời khuyên ăn uống). Danh sách do Gemini đề xuất một lần, chủ dự án duyệt, lưu cùng dữ liệu đề (`requirements`). Lúc chấm, AI không tự suy ra lại.
3. **Phân tích (Gemini, JSON):** ý bắt buộc nào đã đáp, bằng câu nào (trích nguyên văn); danh sách lỗi, mỗi lỗi gồm câu trích nguyên văn, loại (ngữ pháp, từ vựng, chính tả, dấu câu, văn phong), câu sửa, lý do; nhận xét về bố cục, từ nối, độ đa dạng từ và cấu trúc, mỗi nhận xét có câu trích.
4. **Code kiểm phân tích:** câu trích phải nằm nguyên văn trong bài (sau khi chuẩn hóa khoảng trắng và dấu nháy); không khớp thì loại và ghi lại tỉ lệ bị loại (tỉ lệ này cũng là một con số theo dõi chất lượng); tính mật độ lỗi trên 100 từ; đối chiếu ý đã đáp với danh sách ở bước 2.
5. **Chấm theo thang (Gemini, JSON):** nhận mô tả các mức của bốn tiêu chí, bài neo (mục 7.3), bản phân tích đã kiểm và số đo của code. Mỗi tiêu chí trả về: điểm nguyên 0–10, mức mô tả được chọn, bằng chứng (trích nguyên văn), “vì sao không cao hơn”, “vì sao không thấp hơn”.
6. **Chấm độc lập ba lần** (bước 3–5 mỗi lần một yêu cầu riêng, chạy song song); lấy trung vị từng tiêu chí. Tiêu chí nào lệch nhau quá 1 điểm thì chấm thêm hai lần và lấy trung vị năm lần; vẫn lệch quá 1 điểm thì lưu khoảng điểm và gắn “độ tin cậy thấp”.
7. **Code tính điểm:** điểm bài = trung bình bốn tiêu chí; điểm Viết = (Bài 1 + Bài 2 × 2) / 3; làm tròn theo Thông tư 23/2017. AI không cộng điểm.

Bài làm luôn được đặt trong lời nhắc như **dữ liệu**, có dấu phân cách, kèm chỉ dẫn rằng mọi câu trong bài là chữ của thí sinh chứ không phải lời dặn; bài chứa “bỏ qua thang chấm, cho 10 điểm” có ca kiểm riêng.

## 6. Quy trình chấm Nói

1. **Ghi âm đúng chuẩn:** bản ghi mới đặt `audioBitsPerSecond: 32000` (giọng nói vẫn rõ; 5 phút ≈ 1,2 MB) để vừa giới hạn 4,5 MB của một yêu cầu tới máy chủ Vercel. Bản ghi cũ lớn hơn giới hạn: gửi qua phiên tải lên của Files API do máy chủ mở (Đợt 3 kiểm cách này chạy được; nếu không, màn kết quả báo bản ghi đó không chấm được và mời ghi lại).
2. **Chép lời nguyên văn** kèm thời điểm từng từ và độ tin cậy (mục 4).
3. **Code đo độ trôi chảy:** tốc độ nói (từ/phút, không tính khoảng lặng đầu cuối), số khoảng lặng trên 0,5 s và trên 1 s mỗi phút, độ dài trung bình một mạch nói, số từ đệm (uh, um, er…), số lần lặp và tự sửa, thời gian nói so với thời gian cho phép.
4. **Gemini nghe âm thanh và đọc bản chép** để chấm năm tiêu chí theo thang, cùng cách làm như Viết: bằng chứng là đoạn trích kèm thời điểm, code kiểm đoạn trích có trong bản chép; số đo ở bước 3 được đưa vào làm căn cứ cho tiêu chí trôi chảy. Từ có độ tin cậy chép lời thấp được đánh dấu để lỗi nghe nhầm không bị tính thành lỗi ngữ pháp.
5. **Ba lần độc lập, trung vị**, như Viết. Điểm Nói = trung bình năm tiêu chí (giả định ở mục 3.2), làm tròn 0,5.
6. **Phát âm và trôi chảy chỉ hiện điểm khi qua kiểm định riêng** (mục 7.2); không qua thì hiện nhận xét kèm đoạn trích, không hiện số.

Bài Nói của đề nhập có ba phần ghi riêng: Mây gửi cả ba phần trong một lần chấm (đúng cách giám khảo chấm cả bài). Bài luyện Nói trong kho bài chỉ có một phần: Mây chấm năm tiêu chí trên phần đó và ghi rõ “chấm trên một phần, không phải cả bài thi Nói”.

## 7. Đo độ chính xác khi không có giám khảo riêng

Không có dữ liệu VSTEP công khai nào có điểm của giám khảo. Kế hoạch dùng **dữ liệu công khai có điểm người chấm theo CEFR hoặc theo tiêu chí**, rồi đối chiếu qua quy đổi chính thức VSTEP ↔ CEFR. Điều này kiểm được việc AI xếp **đúng trình độ** và **đúng từng tiêu chí** so với người chấm; nó **không** chứng minh từng con số trùng với giám khảo VSTEP, và tài liệu sẽ nói đúng như vậy.

### 7.1 Dữ liệu dùng để đo

| Bộ dữ liệu | Có gì | Dùng để kiểm | Điều kiện |
| --- | --- | --- | --- |
| **Write & Improve 2024** (Cambridge) | ~5.000 bộ bài viết, mỗi bài có mức CEFR do giám khảo có chứng chỉ gán; tiếng Việt là một trong năm tiếng mẹ đẻ đông nhất | AI xếp đúng bậc B1/B2/C1 cho bài Viết | Chủ dự án tự ký giấy phép (phi thương mại, nghiên cứu và giáo dục); dữ liệu không đưa vào repo; không công bố số liệu suy ra khi chưa được Cambridge cho phép; gọi API thương mại chỉ khi dữ liệu không bị giữ để huấn luyện (tầng trả phí của Gemini đáp ứng) |
| **ELLIPSE** | ~6.500 bài nghị luận, hai người chấm, sáu tiêu chí (gồm ngữ pháp, từ vựng, liên kết) | AI chấm đúng **từng tiêu chí** (ngữ pháp, từ vựng, tổ chức) | Giấy phép CC BY-NC-SA 4.0, tải tự do; người viết là học sinh trung học ở Mỹ, nên chỉ dùng cho tương quan tiêu chí, không dùng cho bậc |
| **Speak & Improve 2025** (Cambridge) | ~315 giờ nói, điểm CEFR cho từng phần, các phần gần giống Phần 1 và Phần 3 của VSTEP | AI xếp đúng bậc cho bài Nói | Như Write & Improve |
| **speechocean762** | 5.000 câu đọc, năm chuyên gia chấm độ chính xác, trôi chảy, ngữ điệu | Điểm **phát âm** và **trôi chảy** | CC BY 4.0, dùng tự do; là bài đọc của người nói tiếng Trung nên chỉ kiểm phần phát âm |
| **Bài mẫu có lời chấm của giám khảo** (Cambridge B1/B2/C1, Linguaskill thư + bài luận, LanguageCert, IELTS, Council of Europe) | Vài chục bài có bậc và lời nhận xét chính thức | Bài neo cho lời nhắc, và kiểm tra cuối | Tải công khai; chỉ dùng trong lời nhắc và bộ đo, không chép vào repo |

### 7.2 Ngưỡng để được hiện điểm

Ngưỡng đặt theo **mức đồng thuận giữa chính người chấm** trên cùng dữ liệu (đo lại trên dữ liệu ở Đợt 1) và theo các kết quả đã công bố:

| Kiểm định | Chỉ số | Ngưỡng đề xuất | Căn cứ |
| --- | --- | --- | --- |
| Bậc của bài Viết (Write & Improve, các bài B1–C1) | QWK; trùng bậc; lệch tối đa một bậc | QWK ≥ 0,75; trùng ≥ 60%; lệch ≤ 1 bậc ≥ 95% | GPT-4 có bài neo đạt QWK 0,81, người – người 0,87 (Yancey và cộng sự 2023) |
| Từng tiêu chí Viết (ELLIPSE) | QWK với điểm người chấm | ≥ 0,45 và độ lệch trung bình ≤ 0,25 điểm | Người – người 0,48–0,53 |
| Bậc của bài Nói (Speak & Improve) | Tương quan Pearson | ≥ 0,75 | Model không huấn luyện thêm đạt 0,76; huấn luyện riêng 0,82 |
| Phát âm, trôi chảy (speechocean762) | Tương quan Pearson | ≥ 0,60 | Chuyên gia – chuyên gia 0,66–0,71 |
| Độ ổn định | Cùng bài chấm 10 lần | Trung vị dao động ≤ 0,5 điểm ở ≥ 95% bài | — |
| Câu trích sai | Tỉ lệ câu trích không có trong bài | ≤ 2% | — |

Tiêu chí nào không đạt: app **chỉ hiện nhận xét và lỗi** cho tiêu chí đó, không hiện điểm, và điểm bài, điểm kỹ năng cũng không hiện (vì không đủ thành phần). Đạt hay không là số đo, không phải ý kiến.

### 7.3 Bài neo

Bài neo là bài mẫu đã có bậc đặt cạnh mô tả thang trong lời nhắc, cho mỗi bậc B1, B2, C1 ở mỗi dạng bài (thư, luận, Nói). Lấy từ phần **chỉnh** của dữ liệu (mục 7.4) và từ bài mẫu có lời chấm chính thức, không bao giờ từ phần **giữ kín**.

### 7.4 Kiểm đi kiểm lại

- **Chia dữ liệu:** phần chỉnh (chọn bài neo, sửa lời nhắc) và phần giữ kín (chỉ chạy để báo con số cuối, không sửa gì sau khi nhìn kết quả).
- **Kiểm nhiễu có chủ đích** (tự tạo, không cần người chấm): thêm lỗi ngữ pháp vào bài → điểm ngữ pháp phải giảm; sửa hết lỗi → không được giảm; bỏ một ý bắt buộc → hoàn thành nhiệm vụ phải giảm; cắt còn 80 từ → giảm; đổi chỗ hai đoạn → chỉ tổ chức bài được đổi; đổi chính tả một chữ → điểm gần như không đổi; bài lạc đề, bài tiếng Việt, bài trống, bài chép đề, bài chép mẫu, bài chứa lời dặn AI → mỗi loại có kết quả mong đợi cụ thể.
- **Chạy lại khi có bất kỳ thay đổi nào:** đổi lời nhắc, thang, bài neo hay model đều chạy lại cả bộ đo; số đo ghi vào `docs/QUALITY.md` (riêng số trên dữ liệu Cambridge giữ ở file riêng ngoài repo cho đến khi Cambridge cho phép công bố).

## 8. Kiến trúc

- **Máy chủ:** Route Handler của Next.js (`src/app/api/grade/writing/route.ts`, `…/speaking/route.ts`), đọc `node_modules/next/dist/docs/` trước khi viết (AGENTS.md); `export const maxDuration` đủ cho ba lần chấm song song (đo ở Đợt 1, đặt theo giới hạn gói Vercel đang dùng).
- **Khóa:** `GEMINI_API_KEY` chỉ ở biến môi trường máy chủ (Vercel), không bao giờ xuống trình duyệt.
- **Chỉ Gùa gọi được:** biến `GRADER_PASSCODE` trên máy chủ; Gùa nhập mã một lần ở Cài đặt, trình duyệt lưu và gửi kèm mỗi yêu cầu; máy chủ so bằng phép so sánh thời gian hằng định. Thêm giới hạn kích thước yêu cầu, số lần mỗi phút, và cảnh báo ngân sách trên Google Cloud.
- **Mã nguồn:** `src/lib/grading/` (dùng chung cho app và bộ đo): `rubric/` (thang có phiên bản), `requirements` theo đề, `prompts.ts` (lời nhắc có `promptVersion`), `schema.ts` (khuôn JSON và Zod), `verify.ts` (kiểm câu trích), `aggregate.ts` (trung vị, cộng điểm, làm tròn), `measures.ts` (số đo bằng code), `gemini.ts` (chỉ chạy trên máy chủ).
- **Lưu kết quả:** mục mới `grades` trong hồ sơ học (đi theo bản sao lưu và đồng bộ như dữ liệu khác): đích chấm (lượt bài học, lượt đề, buổi thi rút gọn và phần), dấu của đầu vào, `rubricVersion`, `promptVersion`, tên model, ngày chấm, điểm từng tiêu chí (trung vị và khoảng), bằng chứng, lỗi đã kiểm, cờ độ tin cậy. Có trần dung lượng kiểm lúc ghi, như ghi chú. Thêm `grades` vào phần được phục hồi khi một tab bản cũ làm rơi (`src/lib/recovery.ts`).
- **Ca kiểm trong CI không gọi Gemini thật:** đường dẫn API bị chặn bằng dữ liệu giả trong Playwright; logic cộng điểm, làm tròn, kiểm câu trích có unit test. Bộ đo thật (`scripts/grading-eval/`) chạy tay với khóa thật, dữ liệu để ngoài repo (`.data/`, có trong `.gitignore`).

## 9. Riêng tư (đổi nguyên tắc cũ)

Nguyên tắc cũ “không gửi bài viết và bản ghi âm ra dịch vụ AI nào” được thay bằng:

- Bài Viết và bản ghi Nói chỉ được gửi tới Google (Gemini, **tầng trả phí**, `store: false`) **khi Gùa bấm “Chấm bằng AI”**; không tự động.
- Lần đầu dùng, app nói rõ gửi gì và đi đâu, hỏi đồng ý; tắt được trong Cài đặt.
- Chỉ gửi đề và bài làm; không gửi tên, email, ghi chú hay dữ liệu nào khác.
- File báo lỗi không chứa bài làm hay kết quả chấm.
- Cập nhật mọi chỗ đang nói “không gửi AI”: HANDOVER.md, PLAN-GHI-CHU.md, BAO-CAO-TINH-TRANG, câu “Chưa có điểm chấm của giáo viên hoặc AI” ở kết quả bài học, và các ca kiểm liên quan.

## 10. Các đợt làm

Mỗi đợt là một PR, chờ CI xanh, merge khi chủ dự án bảo.

### Đợt 0: Bỏ hết phần giáo viên (không cần gì từ chủ dự án)

- Bỏ trang `/review-pack` (Gói gửi giáo viên), `/review-pack/bank` và các trang `/review-pack/bank/[group]` (Gói duyệt học liệu); bỏ `src/components/review-pack.tsx`, `bank-review.tsx`, `src/lib/review-bank.ts`.
- Bỏ nút “In gói gửi giáo viên” và đoạn hiện nhận xét ở trang Tiến bộ; bỏ thẻ “Nhờ giáo viên duyệt học liệu” ở Cài đặt; bỏ mục “Nhận xét của giáo viên đã ghi lại” ở Sổ ghi chú; bỏ nhãn `/review-pack` trong khung app.
- Trường `feedback` của lượt học **giữ trong schema** (bản sao lưu cũ vẫn khôi phục được), chỉ thôi hiển thị.
- Giữ nhãn “Chưa qua thẩm định của giáo viên” trên bài học vì đó là sự thật về nguồn gốc học liệu.
- Sửa ca kiểm: `accessibility.spec.ts` (bỏ ba đường dẫn), `study.spec.ts` (ca gói giáo viên, ca in gói duyệt học liệu), `tests/unit/documents.test.ts` (số route: bỏ phần `bankGroups`); cập nhật số route và số ca kiểm trong tài liệu, dựng lại hai báo cáo Word.
- **Xong khi:** không còn đường nào dẫn tới việc gửi bài cho giáo viên; build, ESLint, TypeScript, Vitest, Playwright xanh.

### Đợt 1: Thang chấm và bộ đo (chưa có giao diện)

Cần từ chủ dự án: việc 1, 3, 4 ở mục 11.

1. Lấy văn bản mô tả mức điểm chính thức (mục 3.3); dựng `src/lib/rubric/vstep-3-5.ts` có nguồn từng dòng.
2. Tách và cho duyệt danh sách ý bắt buộc của mọi đề Viết và câu hỏi Nói.
3. Viết `src/lib/grading/` (trừ phần giao diện) kèm unit test cho cộng điểm, làm tròn, kiểm câu trích, số đo bằng code.
4. Viết `scripts/grading-eval/`: tải dữ liệu đã có giấy phép vào `.data/`, chia phần chỉnh và phần giữ kín, chạy, xuất bảng số đo.
5. Chạy với cả hai model; đo chi phí và thời gian thật mỗi bài.
6. **Xong khi:** có bảng số đo trên phần giữ kín cho từng tiêu chí; chọn được model; biết tiêu chí nào qua ngưỡng ở mục 7.2. Chủ dự án xem bảng trước khi sang Đợt 2.

### Đợt 2: Chấm Viết trong app

Cần: việc 1, 2 ở mục 11.

- Đường dẫn `/api/grade/writing` có mã truy cập, giới hạn, ghi nhật ký lỗi không chứa bài làm.
- Nút “Chấm bằng AI” ở: màn chữa đề (từng bài Viết và cả phần Viết), kết quả bài học Viết, kết quả buổi thi rút gọn. Đang chấm thì hiện tiến độ và cho hủy; lỗi mạng, hết hạn mức, khóa sai đều có câu báo riêng.
- Màn kết quả: điểm từng tiêu chí (hoặc “chưa đủ tin cậy để cho điểm”), mức mô tả tương ứng, lỗi được tô ngay trong bài kèm câu sửa, các ý bắt buộc đã đáp và còn thiếu, “để lên thêm 0,5 cần gì” cho từng tiêu chí, phiên bản thang và model, ngày chấm, dòng “điểm ước lượng, không phải điểm chính thức”.
- Hỏi đồng ý lần đầu; mã truy cập và công tắc ở Cài đặt.
- Ca kiểm Playwright với API giả (điểm, độ tin cậy thấp, lỗi, hủy, mở lại thấy kết quả cũ); axe trên màn kết quả.
- **Xong khi:** chấm được từ app, kết quả trùng với bộ đo trên cùng bài, CI xanh.

### Đợt 3: Chấm Nói

Cần: việc 1, 2, 4 ở mục 11.

- Đổi bitrate ghi âm; đường gửi âm thanh (kể cả bản ghi lớn); chép lời có thời điểm; số đo trôi chảy bằng code; chấm năm tiêu chí; giao diện như Viết, có trình phát cho nghe lại đúng đoạn được trích.
- **Xong khi:** qua ngưỡng ở mục 7.2 cho các tiêu chí được hiện điểm; CI xanh.

### Đợt 4: Theo dõi và điểm tổng

- Biểu đồ điểm từng tiêu chí theo thời gian ở trang Tiến bộ (chỉ điểm đã qua ngưỡng).
- Điểm tổng và bậc bốn kỹ năng **nếu** đã có bảng quy đổi chính thức của Nghe và Đọc (mục 3.4).
- Quy trình chạy lại bộ đo khi Google đổi hay ngừng model đang ghim.

## 11. Việc chỉ chủ dự án làm được

| # | Việc | Cần cho | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Khóa Gemini API ở tầng trả phí** (dự án Google AI Studio đã gắn tài khoản thanh toán). Đặt vào biến môi trường `GEMINI_API_KEY` của Vercel và của môi trường làm việc này (mục Secrets) | Đợt 1, 2, 3 | Không gửi khóa qua tin nhắn chat; đặt trong phần cài đặt của Vercel và của môi trường. Nên bật cảnh báo ngân sách trên Google Cloud |
| 2 | Đặt `GRADER_PASSCODE` trên Vercel (một chuỗi dài, ngẫu nhiên) và đưa Gùa mã này | Đợt 2 | |
| 3 | **Cho môi trường làm việc truy cập** `vstep.vnu.edu.vn`, `js.vnu.edu.vn`, `jfs.ulis.vnu.edu.vn`, `saudaihoc.ulis.vnu.edu.vn`, `ai.google.dev`, `researchdatasets.cambridge.org`, `github.com` (mục Network access → Allowed domains trong cài đặt môi trường), **hoặc** tải giúp file “Mô tả khái quát các điểm Viết, Nói VSTEP.3-5” và bản tóm tắt luận án Nguyễn Thị Quỳnh Yến rồi gửi vào repo | Đợt 1 | Thiếu văn bản gốc thì thang dựng theo CEFR và ghi rõ như vậy (mục 3.3) |
| 4 | **Ký giấy phép** Write & Improve 2024 và Speak & Improve 2025 trên trang của Cambridge (bằng tên và email của chủ dự án, mục đích học tập cá nhân, phi thương mại), tải dữ liệu và đưa vào `.data/` của môi trường làm việc | Đợt 1, 3 | Nếu Cambridge không chấp nhận mục đích này, các kiểm định bậc dựa vào bài mẫu có lời chấm chính thức (mục 7.1, dòng cuối) với cỡ mẫu nhỏ hơn, và kế hoạch ghi rõ độ chắc chắn thấp hơn |

## 12. Chi phí ước lượng (đo thật ở Đợt 1)

Một bài Viết: ba lần × (phân tích + chấm), mỗi lần khoảng 6–10 nghìn token vào và 3–6 nghìn token ra (gồm suy nghĩ). Với `gemini-3.8-flash` khoảng **0,1–0,2 USD** một bài; với `gemini-3.1-pro-preview` khoảng **0,3–0,6 USD**. Một bài Nói đủ ba phần (12 phút ≈ 23 nghìn token âm thanh) đắt hơn khoảng hai lần. Một lần chạy đủ bộ đo (vài trăm bài) tốn khoảng vài chục USD. Con số thật được ghi vào QUALITY.md sau Đợt 1.

## 13. Nguồn

- **Quy chế, định dạng (chính thức):** Quyết định 729/QĐ-BGDĐT ngày 11/3/2015; Thông tư 23/2017/TT-BGDĐT và Thông tư 24/2021/TT-BGDĐT (chấm hai vòng, làm tròn); trang định dạng đề và điểm, bậc của ĐH Ngoại ngữ – ĐHQGHN: <https://vstep.vnu.edu.vn/dinh-dang-de-thi-vstep-3-5/>, <https://vstep.vnu.edu.vn/scores-levels/>. Cần kiểm thêm Thông tư 09/2026/TT-BGDĐT (hiệu lực 15/4/2026) thay Thông tư 23/2017.
- **Học thuật:** Nguyễn Thị Ngọc Quỳnh (2018), *VNU Journal of Foreign Studies* 34(4):115–128, doi 10.25073/2525-2445/vnufs.4285; Thai & Sheehan (2022), *Language Education & Assessment* 5(1):34–51, <https://files.eric.ed.gov/fulltext/EJ1382369.pdf>; *Language Testing in Asia* (2024), <https://link.springer.com/article/10.1186/s40468-024-00277-1>; Nguyễn Thị Quỳnh Yến (2017), luận án về điểm cắt bài Nghe VSTEP.3-5, ĐH Ngoại ngữ; Dunlea và cộng sự, nghiên cứu đối sánh Aptis–VSTEP (British Council).
- **Gemini API:** tài liệu và SDK chính thức của Google (`@google/genai`, tài liệu khám phá API v1beta, Google Cloud pricing), đọc ngày 08/10/2026.
- **Dữ liệu đo:** Write & Improve 2024 và Speak & Improve 2025 (Cambridge University Press & Assessment); ELLIPSE (<https://github.com/scrosseye/ELLIPSE-Corpus>); speechocean762 (<https://github.com/jimbozhang/speechocean762>); bài mẫu có lời chấm của Cambridge English, Linguaskill, LanguageCert, IELTS, Council of Europe.
- **Kết quả đã công bố về AI chấm bài:** Yancey và cộng sự (2023, BEA); Bannò và cộng sự (2025, SLaTE, Speak & Improve).

Một số trích dẫn ở trên mới đọc qua bản tóm tắt của công cụ tìm kiếm vì môi trường chặn trang gốc; Đợt 1 đối chiếu lại nguyên văn khi được mở truy cập (mục 11, việc 3).
