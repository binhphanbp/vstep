# Phản hồi báo cáo đánh giá tiến độ Mây VSTEP

**Nguồn đánh giá:** `docs/Bao-cao-danh-gia-tien-do-May-VSTEP.docx`  
**Ngày đối chiếu:** 10/09/2026  
**Mốc code được đối chiếu:** `9f4d8eaa42e1c93a12b08d96bc6aed7466fad6cf`

## Kết luận

Báo cáo hợp lý, thẳng thắn và bám đúng codebase. Kết luận quan trọng nhất được chấp nhận: giữ kiến trúc hiện tại, dừng mở rộng phần trang trí và chuyển trọng tâm sang learning loop, chất lượng học liệu cùng nghiệm thu sử dụng thật. Các tỷ lệ phần trăm tiến độ trong báo cáo là ước lượng quản trị, không phải số đo tự động; chúng hữu ích để xác định ưu tiên nhưng không nên dùng như KPI chính xác.

## Đối chiếu từng nhóm nhận xét

| Nhận xét                                                         | Kết luận sau kiểm tra code                                                              | Quyết định                                                 |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Next.js + TypeScript + Tailwind + local-first + Supabase phù hợp | Đúng. Kiến trúc khớp nhu cầu một người học, có backup và conflict guard                 | Giữ nguyên, không rewrite                                  |
| Exam engine và độ bền kỹ thuật đi trước giá trị học tập          | Đúng. Test bao phủ tốt nhưng content bank còn nhỏ, Viết/Nói chưa có feedback chuyên môn | Ưu tiên learning core                                      |
| Daily Mission cá nhân hóa còn nông                               | Đúng ở mốc đánh giá. Planner cũ chủ yếu dựa trên focus, topic, level và accuracy tổng   | Đã nâng lên vòng v2 đầu tiên                               |
| Sổ lỗi thiếu confidence và phân loại lỗi                         | Đúng. Trước đây chỉ có tag và lịch ôn                                                   | Đã bổ sung confidence, số lần sai và ưu tiên misconception |
| Diagnostic/checkpoint độc lập chưa có                            | Đúng. Đề hiện tại có thể lặp ngữ liệu đã học                                            | Chờ ngân hàng unseen được kiểm định                        |
| Listening bằng TTS chưa đủ chân thực                             | Đúng. TTS phù hợp dựng luồng, chưa thay audio người nói                                 | Giữ cảnh báo, chờ audio có quyền sử dụng                   |
| Writing/Speaking mới ở mức tự luyện                              | Đúng. Chưa có rubric feedback hoặc STT                                                  | Đưa vào milestone sau content QA                           |
| Đã chạy hoàn chỉnh trên điện thoại                               | Chưa đủ bằng chứng. Playwright mới kiểm tra viewport responsive                         | Sửa lại câu chữ; cần UAT thiết bị thật                     |
| Không có hạng mục code dở dang                                   | Dễ gây hiểu nhầm                                                                        | Thu hẹp thành “không có task dở trong milestone nền tảng”  |
| URL Vercel cũ trong GitHub About trả 404                         | Đúng với URL `vstep-livid`; URL mới `vstep-turtle` đã trả HTTP 200 ngày 10/09/2026      | Đã thay bằng deployment HTTPS hoạt động                    |

## Thay đổi đã triển khai từ báo cáo

1. Bài trắc nghiệm hỏi mức chắc chắn sau mỗi đáp án: **Đoán / Chưa chắc / Rất chắc**. Dữ liệu được autosave cùng nháp và lưu trong attempt; dữ liệu cũ vẫn đọc được.
2. Sổ lỗi sắp xếp câu đến hạn trước, sau đó ưu tiên câu sai dù người học đã chọn “Rất chắc” và câu sai lặp lại. Mỗi mục hiển thị subskill hiện có, confidence và số lần sai.
3. Daily Mission chấm ưu tiên theo lỗi đến hạn, lỗi tự tin cao, accuracy gần đây, recency gap, ngày thi, focus, sở thích, level, mood và diversity guard.
4. Mỗi bài trong kế hoạch hôm nay hiển thị tối đa hai lý do ngắn để Gùa hiểu vì sao hệ thống chọn bài.
5. Báo cáo bàn giao đã bỏ các câu khẳng định quá mức về điện thoại, mức sẵn sàng dùng hằng ngày và phạm vi “không còn code dở”.
6. URL production cũ 404 đã được thay bằng `https://vstep-turtle.vercel.app`; smoke test xác nhận route chính, 404 và security headers.

## Việc chưa thể hoàn tất chỉ bằng sửa code

| Hạng mục                     | Đầu vào bắt buộc                                            | Tiêu chí tiếp tục                                          |
| ---------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Content QA                   | Giáo viên/mentor VSTEP rà đáp án, rubric, level và độ khó   | Có biên bản review và version cho từng bộ nội dung         |
| Diagnostic/checkpoint unseen | Ngân hàng câu hỏi độc lập, chưa xuất hiện trong Learn/Drill | Đủ metadata skill/subskill/difficulty/evidence/source      |
| Listening audio người thật   | File audio có quyền sử dụng, transcript và timecode         | Nghe rõ trên thiết bị thật, đúng nhịp từng phần thi        |
| Writing feedback             | Rubric đã chốt và bộ bài mẫu/feedback để hiệu chỉnh         | Feedback có evidence, top issues và vòng rewrite           |
| Speaking feedback            | STT phù hợp tiếng Anh của người học, rubric và consent      | Có pause/repetition/timing và vòng ghi lại                 |
| Production UAT               | Tài khoản học và thiết bị thật                              | Login/sync/micro/restore đạt trên URL HTTPS đã có          |
| Real-device UAT              | Điện thoại và máy tính Gùa thực sự dùng                     | Hoàn thành Nghe, Đọc, ghi âm, mini exam, reload và restore |

## Thứ tự tiếp theo

1. Nghiệm thu đăng nhập/sync trên bản HTTPS và hai thiết bị thật.
2. Cho Gùa dùng 5–7 ngày; thu các chỗ khó hiểu, bài bỏ cuộc, thời lượng thực và mức chắc chắn.
3. Nhờ giáo viên review content hiện có và xây bank unseen.
4. Hiệu chỉnh trọng số Daily Mission từ dữ liệu pilot.
5. Làm một feedback loop hoàn chỉnh cho Writing trước, sau đó mới mở rộng sang Speaking.

Các hạng mục AI chỉ được triển khai qua server boundary. Secret không được đặt trong biến `NEXT_PUBLIC_*`; người học phải chủ động yêu cầu feedback và output phải được validate theo schema có version.
