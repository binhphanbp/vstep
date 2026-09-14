/**
 * Evidence and distractor notes for objective questions.
 *
 * `evidence` must be an exact substring of the lesson passage or transcript so
 * the learner can locate it; `optionNotes` explains every option in order. The
 * note for the key starts with "Đúng:" so a misplaced note fails the test; the
 * UI drops that marker because it already labels the key. Annotations describe
 * published content and never
 * change wording, options or answers, so they do not create a new lesson
 * version. `tests/unit/question-notes.test.ts` enforces both rules.
 */
export type QuestionNote = { evidence: string; optionNotes: string[] };

export const questionNotes: Record<string, QuestionNote> = {
  lc1: {
    evidence: "so we have moved your appointment to Friday at ten o'clock",
    optionNotes: [
      "Đó là lịch cũ, thứ vừa bị đổi vì bác sĩ nghỉ hôm ấy.",
      "Ghép sai: thứ Năm là ngày cũ, mười giờ là giờ mới.",
      "Ghép sai theo chiều ngược lại: thứ Sáu là ngày mới, 9h30 là giờ cũ.",
      "Đúng: lịch mới là thứ Sáu, mười giờ.",
    ],
  },
  lc2: {
    evidence:
      "Please remember to bring the results of the blood test you had in June",
    optionNotes: [
      "Đúng: thiếu kết quả xét nghiệm máu tháng Sáu thì bác sĩ phải cho làm lại.",
      "Tin nhắn không nhắc tới giấy giới thiệu.",
      "Không có chi tiết nào về thẻ thanh toán.",
      "Danh sách thuốc không được nhắc tới trong tin nhắn này.",
    ],
  },
  lc3: {
    evidence:
      "The clinic entrance on Hoa Street is closed for repairs until the end of the month.",
    optionNotes: [
      "Tin nhắn không nói cửa này dành riêng cho nhân viên.",
      "Đúng: cửa đang sửa tới cuối tháng nên bệnh nhân phải đi cửa bên.",
      "Đi thẳng lên tầng ba là đường từ cửa bên cạnh hiệu thuốc.",
      "Không có mốc năm giờ nào gắn với cửa này; năm giờ là hạn gọi lại.",
    ],
  },
  lc4: {
    evidence: "please check in at the desk first so we know you are here",
    optionNotes: [
      "Tin nhắn không nhắc tới việc thanh toán.",
      "Kết quả xét nghiệm là thứ bệnh nhân mang tới, không phải thứ tới lấy.",
      "Đúng: lý do được nói thẳng là để nhân viên biết bệnh nhân đã tới.",
      "Đổi bác sĩ là việc khác; tin nhắn chỉ mời gọi lại nếu thứ Sáu không tiện.",
    ],
  },
  lb1: {
    evidence:
      "Buses will run every fifteen minutes instead of every ten, so please allow extra time.",
    optionNotes: [
      "Đó là tần suất bình thường, thứ đang bị thay.",
      "Đúng: tuần này giãn còn mười lăm phút một chuyến.",
      "Không có mốc hai mươi phút trong thông báo.",
      "Nửa tiếng một chuyến là quá xa so với con số được nêu.",
    ],
  },
  lb2: {
    evidence:
      "The nearest stop is outside the post office, about four hundred metres further along.",
    optionNotes: [
      "Đại học chỉ được nhắc tới như điểm mà tuyến 18 chạy tới.",
      "Đúng: điểm dừng gần nhất là trước bưu điện.",
      "Bệnh viện chính là điểm dừng bị bỏ trong tuần này.",
      "Hiệu thuốc không xuất hiện trong thông báo về xe buýt.",
    ],
  },
  lb3: {
    evidence:
      "If you use a monthly card, you do not need to do anything; the card will be accepted on both routes.",
    optionNotes: [
      "Ngược với thông báo: thẻ tháng dùng được trên cả hai tuyến.",
      "Đúng: thẻ được chấp nhận ở cả hai tuyến và người dùng không phải làm gì thêm.",
      "Không có yêu cầu đăng ký nào.",
      "Vé tuyến 52 còn dùng được cho tuyến 18, nên hạn chế này không đúng.",
    ],
  },
  lb4: {
    evidence: "The change begins today and ends on Sunday evening.",
    optionNotes: [
      "Thông báo nói rõ đây là thay đổi có ngày kết thúc, không phải tuyến mới.",
      "Đúng: thay đổi kéo dài tới tối Chủ nhật, trong thời gian thi công đường.",
      "Không có chi tiết nào về giá vé tăng.",
      "Lịch chạy mới chỉ áp dụng trong tuần này.",
    ],
  },
  lt1: {
    evidence:
      "It will not raise your score by itself. What it gives you is eight weeks of feedback on your own writing",
    optionNotes: [
      "Người nói bác bỏ đúng điều này ngay ở đầu buổi.",
      "Đúng: thứ khóa học đưa ra là tám tuần nhận xét bài viết, không phải một mức điểm.",
      "Ngược lại: nghỉ nộp bài hai tuần liền là trường sẽ liên hệ.",
      "Học phí có được nhắc tới nhưng không so sánh với nơi khác.",
    ],
  },
  lt2: {
    evidence:
      "if you miss two in a row, we will contact you, because people who stop submitting usually stop attending soon afterwards",
    optionNotes: [
      "Không ai bị mất chỗ ngay; trường liên hệ trước.",
      "Không có khoản phí phạt nào.",
      "Đúng: trường liên hệ, vì ngừng nộp bài thường là dấu hiệu sắp bỏ học.",
      "Không có chuyện chuyển sang lớp sau.",
    ],
  },
  lt3: {
    evidence:
      "Marking every error takes the teacher's time and teaches the learner very little",
    optionNotes: [
      "Người nói cho rằng cách đó không hiệu quả, nên không thể là cách nhanh nhất.",
      "Không có phân biệt theo trình độ trong phần này.",
      "Đúng: tốn thời gian giáo viên mà người học thu được rất ít.",
      "Lớp nhỏ là vì giữ ở mức mười hai người, không liên quan tới cách sửa lỗi.",
    ],
  },
  lt4: {
    evidence:
      "We do not refund places given up for other reasons, because the seat cannot be filled once the course has started.",
    optionNotes: [
      "Đúng: lớp chỉ mười hai chỗ, hết nhanh, và chỗ bỏ giữa chừng không bù được.",
      "Ngược lại: chỗ hết nhanh nên tuần hai thường đã không còn.",
      "Không có chi tiết nào cho phép nhượng chỗ cho người khác.",
      "Không có ưu tiên nào dành cho học viên cũ.",
    ],
  },
  lg1: {
    evidence:
      "because a previous scheme in Block A failed when nobody explained it",
    optionNotes: [
      "Không ai yêu cầu thông báo dài hơn.",
      "Đúng: lần trước ở Block A thất bại vì không ai giải thích.",
      "Quỹ tòa nhà được nhắc tới như nơi nhận khoản tiết kiệm, không phải chỗ đang cạn.",
      "Đội thu gom chỉ được nhắc trong phần đếm thùng.",
    ],
  },
  lg2: {
    evidence: "Food waste has its own green bin beside the bicycle store.",
    optionNotes: [
      "Thùng xanh dương dành cho giấy, nhựa và kim loại.",
      "Thùng xám là cho phần rác còn lại.",
      "Đúng: rác thực phẩm có thùng xanh lá riêng cạnh nhà để xe đạp.",
      "Thông báo không cho phép bỏ tùy thùng dù có gói kín.",
    ],
  },
  lg3: {
    evidence:
      "please tell the office rather than moving the bags yourself, because the collection team counts the bins",
    optionNotes: [
      "Đó đúng là việc thông báo yêu cầu không làm.",
      "Không có hướng dẫn nào bảo chờ sang tuần.",
      "Đúng: báo văn phòng, vì đội thu gom đếm theo thùng.",
      "Đổ sang thùng xám là làm hỏng chính việc phân loại.",
    ],
  },
  lg4: {
    evidence:
      "The scheme only works if it is easy enough to follow on a busy evening.",
    optionNotes: [
      "Đúng: người nói đặt điều kiện dễ làm lên trên, và nói rõ không bắt rửa hộp hay bóc nhãn.",
      "Người nói nói thẳng là không yêu cầu rửa hộp.",
      "Không có yêu cầu kiểm tra thùng mỗi sáng.",
      "Thông báo áp dụng cho cả Block C chứ không tùy ai muốn tham gia.",
    ],
  },
  rn1: {
    evidence:
      "Still, she believes the night team deserves to be described accurately rather than treated as a footnote to the day.",
    optionNotes: [
      "Đúng: bài mở đầu bằng chuyện ít ai viết về ca đêm, các đoạn giữa cho thấy đó là một công việc khác, và câu cuối đòi được mô tả cho đúng.",
      "Ngược với bài: ít người trực hơn nên mỗi người phải tự quyết những việc bình thường được bàn với đồng nghiệp.",
      "Bài không bàn tới lương của ai cả.",
      "Bài nói về cách tổ chức ca trực, không so sánh trình độ chuyên môn.",
    ],
  },
  rn2: {
    evidence:
      "yet fewer errors meant fewer hours spent correcting paperwork, and the difference was smaller than they had feared",
    optionNotes: [
      "Ngược lại: lịch mới cần thêm người, đó chính là lý do ban quản lý lo chi phí tăng.",
      "Đúng: ít lỗi hơn nên mất ít giờ sửa giấy tờ hơn, phần chênh nhỏ hơn họ tưởng.",
      "Bài không nói đóng khoa nào ban đêm.",
      "Giờ nghỉ vẫn là hai mươi phút; không ai rút ngắn nó.",
    ],
  },
  rn3: {
    evidence:
      "because walking there and back consumed most of the twenty minutes they had",
    optionNotes: [
      "Bài không nói phòng nghỉ ồn.",
      "Không có quy định nào giới hạn ai được vào.",
      "Đúng: đi bộ tới đó rồi quay lại đã hết gần hết hai mươi phút nghỉ.",
      "Phòng có ghế êm; đó là lý do nó được dựng lên.",
    ],
  },
  rn4: {
    evidence:
      "A blood test appears in a file; a five-minute conversation at three in the morning does not.",
    optionNotes: [
      "Bài không xếp hạng trò chuyện trên xét nghiệm; nó nói về chuyện được ghi nhận hay không.",
      "Bài nói về người bệnh mất ngủ thấy dễ chịu hơn, không nói họ thích trò chuyện hơn là được điều trị.",
      "Đúng: xét nghiệm để lại hồ sơ, cuộc trò chuyện thì không, nên phần việc đó dễ bị coi nhẹ.",
      "Không có chi tiết nào nói ca đêm làm ít xét nghiệm.",
    ],
  },
  rn5: {
    evidence:
      "She does not romanticise the work. The shifts are tiring, and she admits that her weekends are quieter than she would like.",
    optionNotes: [
      "Bài nói thẳng cô ấy không tô hồng công việc, nên “khuyên ai cũng nên làm” là quá đà.",
      "Không có chi tiết nào cho thấy cô ấy hối tiếc hay muốn chuyển sang ca ngày.",
      "Đúng: mệt và mất cuối tuần, nhưng cô ấy muốn công việc được mô tả đúng thay vì bị coi là phần phụ.",
      "Bài không đặt điều kiện về kinh nghiệm cho người làm ca đêm.",
    ],
  },
  rk1: {
    evidence:
      "Mrs Tam's view is simple: the market does not need to become a supermarket, but it cannot pretend the city still shops at six in the morning.",
    optionNotes: [
      "Siêu thị chỉ là một trong hai thay đổi mở đầu câu chuyện, không phải nội dung chính.",
      "Đúng: cả bài theo một người bán hàng điều chỉnh cách bán khi khách quen chuyển sang giờ hành chính.",
      "Bài không hướng dẫn chọn rau.",
      "Bài không so sánh giá giữa bán online và bán tại sạp.",
    ],
  },
  rk2: {
    evidence: "Customers send a short message with a budget and a rough list",
    optionNotes: [
      "Người chụp ảnh, nếu có, sẽ là bà Tâm — và đó chính là việc bà không muốn làm.",
      "Bài không nhắc tới việc trả tiền trước.",
      "Đúng: một tin nhắn ngắn gồm ngân sách và danh sách sơ bộ, phần chọn rau để bà quyết.",
      "Không có chi tiết nào về đơn đặt cả tháng.",
    ],
  },
  rk3: {
    evidence: "the fee was fixed but her income was not",
    optionNotes: [
      "Bài không nói bà không biết dùng ứng dụng.",
      "Đúng: phí cố định trong khi thu nhập lên xuống, nên đó là rủi ro.",
      "Chuyện giá cố định là việc bà tự từ chối cam kết, không phải yêu cầu của công ty giao hàng.",
      "Con trai bà là người đề xuất bán online, không phải người can ngăn.",
    ],
  },
  rk4: {
    evidence:
      "Mrs Tam was doubtful: she did not want to photograph every bundle of herbs",
    optionNotes: [
      "Đúng: ngay sau từ này là hai lý do khiến bà chưa bị thuyết phục.",
      "Bài không nói tới chuyện mệt ở câu đó.",
      "Trái nghĩa với mạch câu: bà đang ngần ngại chứ không hài lòng.",
      "“Lạc lối” không khớp với việc nêu ra lý do cụ thể.",
    ],
  },
  rk5: {
    evidence:
      "although one gave up after a fortnight, saying the packing took time she did not have",
    optionNotes: [
      "Đúng: đặt cạnh hai người bắt đầu làm theo, chi tiết này cho thấy cách làm không hợp với mọi người.",
      "Chi tiết này không nói gì về việc chợ đông hơn vào buổi sáng.",
      "Bài không chê ai; người bỏ cuộc được nêu lý do rõ ràng.",
      "Bà Tâm vẫn đang bán được, nên không thể kết luận là không có lãi.",
    ],
  },
  rd1: {
    evidence: "Breakfast is served between seven and nine.",
    optionNotes: [
      "Sáu giờ là lúc chợ đông trong một bài khác, không phải giờ ăn sáng ở đây.",
      "Đúng: danh sách quy định ghi đúng khung bảy đến chín giờ.",
      "Đó là cách làm cũ, thứ đã khiến bữa sáng chậm và cả nhà mệt.",
      "Bài không gắn bữa sáng với giờ trả phòng.",
    ],
  },
  rd2: {
    evidence: "several mentioned them in positive reviews",
    optionNotes: [
      "Đúng: câu trước nói khách thấy các quy định giúp lên kế hoạch dễ hơn, nên “them” trỏ các quy định.",
      "Khách chính là người viết đánh giá, nên họ không nhắc tới chính mình ở đây.",
      "Các đánh giá là nơi chứa lời nhắc, không phải thứ được nhắc.",
      "Số lượt đặt phòng được nói ở câu sau và không phải thứ khách nhắc trong đánh giá.",
    ],
  },
  rd3: {
    evidence:
      "something they could never have organised when every day was unpredictable",
    optionNotes: [
      "Bài không nói họ thiếu tiền; số lượt đặt chỉ giảm nhẹ.",
      "Các lời phàn nàn là về bữa sáng chậm, không phải về việc không có gì để làm.",
      "Đúng: chính vì ngày đã đoán trước được nên mới tổ chức nổi buổi đi bộ.",
      "Bài không nói khu phố trở nên nổi tiếng hơn.",
    ],
  },
  rd4: {
    evidence:
      "Mai realised that saying yes to everything had made the service worse for the guests who followed the rules.",
    optionNotes: [
      "Bài không so sánh homestay với khách sạn.",
      "Đúng: từ chỗ nhận mọi yêu cầu sang chỗ đặt giới hạn rõ ràng, cả khách lẫn chủ nhà đều khá hơn.",
      "Đánh giá là thứ giúp họ nhận ra vấn đề, không phải thứ quyết định sự sống còn.",
      "Bài không khuyên đừng kinh doanh tại nhà.",
    ],
  },
  rd5: {
    evidence:
      "they remove anything that sounds like an instruction to a stranger rather than a request from a host",
    optionNotes: [
      "Đọc to cho bố nghe là để kiểm tra giọng điệu, không phải để xin quyết định.",
      "Độ dài sáu dòng được nói ở đoạn trước và không liên quan tới chi tiết này.",
      "Đúng: chi tiết này đi kèm nỗi lo nghe khó gần, và họ bỏ đi câu nào nghe như ra lệnh.",
      "Bài không nói các quy định thay đổi hằng tuần.",
    ],
  },
  rh1: {
    evidence:
      "The advice is not wrong, but it assumes that the person receiving it controls their own evening.",
    optionNotes: [
      "Đó chính là lời khuyên quen thuộc mà bài đặt câu hỏi ngược lại.",
      "Bài có nhắc các nhà nghiên cứu thận trọng, nhưng đó là một ý phụ chứ không phải luận điểm chính.",
      "Bài không bàn tới nơi làm việc theo nghĩa địa điểm.",
      "Đúng: lời khuyên giả định người nghe làm chủ buổi tối của mình, điều thường không đúng.",
    ],
  },
  rh2: {
    evidence:
      "Messages sent after eight in the evening were delivered the next morning by default, and anyone who needed an answer sooner had to say so explicitly.",
    optionNotes: [
      "Tin nhắn không bị xoá, chỉ bị hoãn chuyển.",
      "Đúng: mặc định là sáng hôm sau, trừ khi người gửi nói rõ là cần gấp.",
      "Bài không nói tin nhắn phải qua quản lý.",
      "Quy định mới bỏ đi đúng cái áp lực phải trả lời ngay.",
    ],
  },
  rh3: {
    evidence: "The habit, rather than the hour, had been the problem.",
    optionNotes: [
      "Đúng: chỉ ngủ thêm mười lăm phút nhưng thấy đỡ mệt hẳn, vì bỏ được thói quen xem điện thoại lúc nửa đêm.",
      "Bài nói ngược: mười lăm phút là thay đổi nhỏ, phần thay đổi lớn nằm ở cảm giác.",
      "Không có chi tiết nào nghi ngờ tính trung thực của nhân viên.",
      "Bài không đề xuất cấm điện thoại.",
    ],
  },
  rh4: {
    evidence: "anyone who needed an answer sooner had to say so explicitly",
    optionNotes: [
      "Đúng: phải nói rõ thành lời thay vì để người khác tự đoán là gấp.",
      "Bài không giới hạn phải nói bằng văn bản.",
      "Lịch sự hay không nằm ngoài ý của câu này.",
      "Số lần nhắc không phải điều câu này nói tới.",
    ],
  },
  rh5: {
    evidence:
      "The trial is useful for a different reason: it moved the question from what a person should do at eleven at night to what an organisation asks of people at that hour.",
    optionNotes: [
      "Bài nói thẳng sáu mươi nhân viên chưa chứng minh được chính sách này hợp với nơi khác.",
      "Đúng: giá trị nằm ở chỗ dời câu hỏi sang phía tổ chức, dù chưa phải bằng chứng.",
      "Hai nhóm làm việc lệch múi giờ là một chi phí phát sinh, không biến cả thử nghiệm thành thất bại.",
      "Ngược với bài: các thay đổi gần như không tốn kém.",
    ],
  },
  frg9: {
    evidence:
      "They were careful not to promise that it would feed the entire building.",
    optionNotes: [
      "Đúng: câu này cho thấy họ đặt kỳ vọng đúng với thứ khu vườn làm được.",
      "Người quản lý đồng ý cho vườn ở lại sau thời gian thử.",
      "Bài kể lại với giọng tán thành, không phê phán cư dân.",
      "Vườn vẫn có thu hoạch, chỉ là khiêm tốn.",
    ],
  },
  frg7: {
    evidence:
      "The group eventually agreed to distribute small portions among participating households and offer any surplus to neighbours who wanted to try the produce.",
    optionNotes: [
      "Bài không nói nhóm bán rau lấy tiền.",
      "Rau hỏng là chuyện khác; bài không nói đem rau hỏng cho hàng xóm.",
      "Đúng: phần còn lại sau khi mỗi hộ tham gia đã nhận phần của mình.",
      "Thùng gỗ được kê cao lên chứ không bị loại bỏ.",
    ],
  },
  frg6: {
    evidence:
      "Several entries were accompanied by drawings so that younger children could understand them too.",
    optionNotes: [
      "Rau trong thùng không phải thứ được minh họa.",
      "Đúng: “them” trỏ các mục ghi trong sổ, thứ được vẽ kèm hình.",
      "Cuộc họp hằng tháng xuất hiện ở đoạn cuối, không liên quan câu này.",
      "Người ghi sổ là chủ thể, không phải thứ cần hiểu.",
    ],
  },
  frm9: {
    evidence:
      "Comparing those predictions with actual performance helped some learners recognise that an easy-feeling study session could produce weak recall.",
    optionNotes: [
      "Bài nói rõ “not to rank students against one another”.",
      "Đúng: mục đích là giúp người học quyết định đúng hơn cho lần ôn sau.",
      "Có người lại đánh giá thấp bản thân, nên dự đoán sai theo cả hai chiều.",
      "Bài không đề nghị thay việc luyện tập bằng bài kiểm tra hằng tuần.",
    ],
  },
  frm8: {
    evidence:
      "A learner who confused two similar words, for instance, saw each word in a different sentence. Students then wrote a sentence of their own to demonstrate that they understood the distinction.",
    optionNotes: [
      "Bài chỉ kể một giáo viên, không so sánh hai cách dạy.",
      "Đúng: “the distinction” là khác biệt giữa hai từ dễ nhầm vừa nhắc ở câu trước.",
      "Việc so dự đoán với kết quả nằm ở đoạn sau.",
      "Giãn cách và tự nhớ lại được bàn ở phần đầu, không phải trong câu này.",
    ],
  },
  frt7: {
    evidence:
      "In some neighbourhoods, many customers already arrive on foot. Making their journeys easier may be more valuable than preserving every parking place.",
    optionNotes: [
      "Người lái xe tìm chỗ đỗ là bên mất chỗ, không phải bên được kể ở câu này.",
      "Chủ cửa hàng là bên phản đối bỏ chỗ đỗ, không phải bên có hành trình đang nói.",
      "Đúng: “their” nối lại nhóm khách đã đi bộ đến, nhắc ở câu ngay trước.",
      "Nhà quy hoạch xuất hiện ở đoạn khác của bài.",
    ],
  },
  frt6: {
    evidence: "No single measure can serve every commuter.",
    optionNotes: [
      "Đoạn mở đầu bác bỏ chính ý này: đường mới đầy gần như ngay khi vừa xây.",
      "Đúng: câu này tóm đúng mạch lập luận và đoạn kết của bài.",
      "Bài nói giá rẻ là chưa đủ; độ tin cậy và kết nối quan trọng hơn.",
      "Bài đề nghị kết hợp nhiều biện pháp, không thay thế giao thông công cộng.",
    ],
  },
  frc9: {
    evidence:
      "Linh admitted that washing cups required additional staff time. Nevertheless, she considered the reduction in disposable packaging worthwhile.",
    optionNotes: [
      "Bài không nhắc đến quy định nào bắt buộc.",
      "Đúng: “Nevertheless” đặt công rửa cốc lên bàn cân với lợi ích, và Linh thấy vẫn đáng.",
      "Bài không so sánh giá của hai loại bao bì.",
      "Bài không nói khách có thích cốc dùng lại hay không.",
    ],
  },
  frc1: {
    evidence: "she expected most customers to buy a drink and leave",
    optionNotes: [
      "Đúng: đây là điều Linh dự đoán trước khi khách bắt đầu ở lại lâu.",
      "Đặt chỗ chỉ xuất hiện sau này, khi phòng học yên tĩnh đã mở.",
      "Có khách xin nhạc nhỏ hơn, nhưng đó là điều xảy ra ngoài dự đoán.",
      "Ngồi hàng giờ là điều “Instead” — trái hẳn với dự đoán ban đầu.",
    ],
  },
  frc2: {
    evidence:
      "She decided to reserve the upstairs room for quiet study between two and six in the afternoon.",
    optionNotes: [
      "Tối thứ Năm là buổi trao đổi ngôn ngữ ở tầng trệt.",
      "Đúng: bài ghi thẳng khung giờ hai đến sáu giờ chiều.",
      "Bài không nhắc đến cuối tuần.",
      "Câu lạc bộ sách mới chỉ là dự định ở đoạn cuối.",
    ],
  },
  frc3: {
    evidence:
      "At first, Linh worried that people staying longer would reduce her income. However, many visitors returned regularly and recommended the café to their friends.",
    optionNotes: [
      "Ngược lại: sau ba tháng quán đông hơn đúng vào ngày thường.",
      "Bài khẳng định khách “did not have to pay an extra fee”.",
      "Đúng: “However” đảo lại nỗi lo — khách quay lại và giới thiệu bạn bè.",
      "Phòng học vẫn hoạt động; đoạn cuối còn bàn bước tiếp theo.",
    ],
  },
  frc4: {
    evidence:
      "A group of regular customers missed the lively conversations upstairs. Rather than ask them to leave",
    optionNotes: [
      "Nhóm đặt chỗ học là người được phục vụ, không phải người bị đề nghị rời đi.",
      "Đúng: “them” nối lại nhóm khách quen ở câu ngay trước.",
      "Bạn bè được giới thiệu xuất hiện ở đoạn trước, không phải ở câu này.",
      "Câu lạc bộ sách chưa đến quán vào thời điểm này.",
    ],
  },
  frc5: {
    evidence:
      "Linh had not increased drink prices or spent money on advertising. She believes that listening to customers helped her more than following a complicated business plan.",
    optionNotes: [
      "Bài không nói quán lỗ; ngày thường còn đông hơn trước.",
      "Bài chỉ kể lựa chọn của một quán, không kết luận về quảng cáo nói chung.",
      "Bài không hàm ý Linh lẽ ra nên quảng cáo.",
      "Đúng: câu ngay sau gắn kết quả với việc lắng nghe khách.",
    ],
  },
  frt1: {
    evidence:
      "For years, urban planners assumed that adding more roads would solve congestion.",
    optionNotes: [
      "Đường mới đầy nhanh là điều đã xảy ra, không phải điều họ giả định.",
      "Bài không nói ai tin tắc đường sẽ tự hết.",
      "Đúng: câu mở đầu nêu đúng giả định kéo dài nhiều năm này.",
      "Bài nói ngược lại: đường dễ đi thì nhiều người chọn lái xe hơn.",
    ],
  },
  frt2: {
    evidence: "may still ride a motorbike if the bus arrives unpredictably",
    optionNotes: [
      "Đúng: câu kế tiếp nhấn mạnh “Reliability”, tức giờ đến không đáng tin.",
      "Chậm đều và thất thường là hai chuyện khác nhau.",
      "Giờ cố định chính là nghĩa ngược lại.",
      "Giá vé là ý khác trong cùng đoạn, không phải nghĩa của từ này.",
    ],
  },
  frt3: {
    evidence:
      "A journey that looks short on a map may become impractical when it requires two long waits.",
    optionNotes: [
      "Bài không nhắc đến giá vé thay đổi theo giờ cao điểm.",
      "Đúng: hai lần chờ lâu là điều biến hành trình ngắn thành bất tiện.",
      "Bài không bàn đến tuyến tránh trung tâm.",
      "Chỗ đỗ xe được nhắc ở đoạn khác, gắn với cửa hàng.",
    ],
  },
  frt4: {
    evidence:
      "A painted line on a busy road, though inexpensive, may do little to reassure a nervous cyclist.",
    optionNotes: [
      "Bài nói ngược: làn tách khỏi dòng xe mới dễ thuyết phục người chưa đi xe đạp.",
      "“though inexpensive” cho thấy vạch sơn là phương án rẻ.",
      "Không gian đường là điều kiện của làn tách riêng, không phải của vạch sơn.",
      "Đúng: rẻ nhưng ít trấn an được người đi xe đạp còn e ngại.",
    ],
  },
  frt5: {
    evidence:
      "Such projects require both money and street space, which can make them politically difficult.",
    optionNotes: [
      "Đúng: câu này giải thích vì sao biện pháp hiệu quả hơn lại khó thực hiện.",
      "Bài không kết luận rằng chi phí đó là không đáng.",
      "Bài đánh giá vạch sơn là ít tác dụng, không khuyến nghị dùng thay thế.",
      "Bài nói không gian đường khó giành, không phải không bao giờ có.",
    ],
  },
  frm1: {
    evidence:
      "When the book is closed, that confident feeling can quickly disappear.",
    optionNotes: [
      "Cảm giác “obvious” xuất hiện lúc đang đọc, không phải sau khi gấp sách.",
      "Quen mặt chữ là chuyện trong lúc đọc lại.",
      "Đúng: bài đối lập cảm giác tự tin khi đọc với khả năng nhớ sau đó.",
      "Bài không nói đọc năm lần thì nhớ tốt hơn.",
    ],
  },
  frm2: {
    evidence:
      "This can feel harder than rereading, which sometimes leads students to believe that it is less effective.",
    optionNotes: [
      "Bài không nói gì về việc giáo viên có giới thiệu hay không.",
      "Đúng: chính cảm giác khó khiến người học đánh giá thấp cách này.",
      "Bài so sánh cảm giác khó, không so sánh thời gian.",
      "Bài khẳng định các cách này “do not remove the need for understanding”.",
    ],
  },
  frm3: {
    evidence:
      "If the learner cannot retrieve the answer, an earlier review and a clear explanation may help.",
    optionNotes: [
      "Bài không đề nghị bỏ chủ đề đó.",
      "Lùi lịch ôn là việc dành cho câu đã trở nên quá dễ.",
      "Chép lại định nghĩa là kiểu luyện bài phê phán.",
      "Đúng: ôn sớm hơn kèm lời giải thích rõ ràng.",
    ],
  },
  frm4: {
    evidence:
      "tasks must still be manageable, and learners need opportunities to recover",
    optionNotes: [
      "Đúng: việc khó vẫn phải nằm trong sức của người học.",
      "Nếu không thể hoàn thành thì đã trái với ý cả đoạn.",
      "Bài không nói việc học phải thú vị.",
      "Từ này nói về mức độ kham được, không phải về đo đạc.",
    ],
  },
  frm5: {
    evidence: "In fact, the effort of retrieval can strengthen later recall.",
    optionNotes: [
      "Bài nói ngược: “Some hesitation can be a sign that the brain is doing useful work”.",
      "Đúng: nỗ lực nhớ lại, khoảng cách ôn và tự đánh giá trung thực là trục của cả bài.",
      "Bài cảnh báo định nghĩa học thuộc mà không vận dụng thì giá trị hạn chế.",
      "Bài nói ứng dụng “cannot directly observe understanding”; người học vẫn phải tự xét.",
    ],
  },
  frg1: {
    evidence:
      "The manager approved a six-month trial rather than a permanent arrangement.",
    optionNotes: [
      "Một tháng không xuất hiện trong bài.",
      "Đúng: sáu tháng, và là thời hạn thử.",
      "Bài không nhắc đến thời hạn một năm.",
      "“rather than a permanent arrangement” loại bỏ phương án này.",
    ],
  },
  frg2: {
    evidence:
      "Because the site received strong afternoon sunlight, the group chose vegetables that could tolerate heat.",
    optionNotes: [
      "Đúng: “Because” nêu thẳng lý do là nắng chiều gay gắt.",
      "Người làm vườn về hưu giúp chọn cây, bài không nói ông có sẵn hạt giống.",
      "Nhà hàng tặng thùng gỗ, không đặt yêu cầu về loại rau.",
      "Bài không so sánh lượng nước giữa rau và hoa.",
    ],
  },
  frg3: {
    evidence: "Others wanted to help but did not know when they were needed.",
    optionNotes: [
      "Đúng: họ muốn giúp, chỉ không biết lúc nào cần đến mình.",
      "Mỗi hộ đều đã góp một khoản nhỏ mua đất và dụng cụ.",
      "Ca sáng và ca chiều chỉ có sau khi lịch được lập.",
      "Vấn đề của nhóm không phải chất đất.",
    ],
  },
  frg4: {
    evidence:
      "The biggest challenge was not growing the vegetables but sharing the work.",
    optionNotes: [
      "Đúng: câu này nêu thẳng khó khăn lớn nhất, và các đoạn sau vẫn xoay quanh việc chia việc, chia thu hoạch.",
      "Hai mươi hộ tham gia và người quản lý đồng ý cho vườn ở lại.",
      "Người làm vườn về hưu chỉ giúp chọn cây; sổ tay còn được lập để không phụ thuộc vào ông.",
      "Bài nói rõ cư dân “careful not to promise that it would feed the entire building”.",
    ],
  },
  frg5: {
    evidence:
      "They are now discussing a covered bench, provided it does not block the emergency path.",
    optionNotes: [
      "Nhà hàng chỉ tặng thùng gỗ trồng cây.",
      "Đúng: “provided” nêu điều kiện là không chắn lối thoát hiểm.",
      "Bài không đặt hạn trước mùa mưa cho chiếc ghế.",
      "Người làm vườn về hưu không có vai trò phê duyệt.",
    ],
  },
  rc1: {
    evidence:
      "Linh realised that she was offering more than coffee: she was providing a place to learn.",
    optionNotes: [
      "Bài không hướng dẫn pha chế; cà phê chỉ là bối cảnh của câu chuyện.",
      "Đúng: câu này bao quát cả bài, không dừng ở một chi tiết như cà phê hay lớp học.",
      "Bài không so sánh việc học ở nhà với học ở trường.",
      "Buổi trao đổi ngôn ngữ “no teacher and no formal lesson”, không phải khoá học được quảng cáo.",
    ],
  },
  rc2: {
    evidence: "They only needed to order one drink.",
    optionNotes: [
      "Trái với bài: “they did not have to pay an extra fee”.",
      "Câu lạc bộ sách mới chỉ là dự định ở đoạn cuối.",
      "Đúng: “only” cho thấy đây là điều kiện duy nhất.",
      "Buổi học tiếng Anh diễn ra ở tầng trệt, không liên quan đến phòng học yên tĩnh.",
    ],
  },
  rc3: {
    evidence:
      "A group of regular customers missed the lively conversations upstairs. Rather than ask them to leave, Linh arranged a weekly language exchange on the ground floor.",
    optionNotes: [
      "Đúng: “Rather than ask them to leave” cho thấy mục đích là giữ nhóm khách này.",
      "Phòng học yên tĩnh vẫn giữ nguyên; buổi giao lưu ở tầng trệt.",
      "Bài nói rõ “There was no teacher”.",
      "Bài không nhắc đến khách du lịch nước ngoài.",
    ],
  },
  rc4: {
    evidence:
      "However, many visitors returned regularly and recommended the café to their friends.",
    optionNotes: [
      "“Immediately” nói về thời điểm ngay lập tức, không phải tần suất.",
      "“Secretly” nghĩa là bí mật, không hợp với việc khách quay lại và giới thiệu bạn bè.",
      "“Rarely” nghĩa ngược lại: hiếm khi.",
      "Đúng: “regularly” ở đây là thường xuyên, gần nghĩa “frequently”.",
    ],
  },
  rc5: {
    evidence:
      "After three months, the café was busier on weekdays, which had previously been its quietest period.",
    optionNotes: [
      "Trái với bài: “Linh had not increased drink prices”.",
      "Đúng: “busier on weekdays” đối lập với “its quietest period” trước đó.",
      "Bài khẳng định buổi giao lưu “no teacher and no formal lesson”.",
      "Ngược lại, Linh muốn giữ vài buổi tối cho khách thường.",
    ],
  },
  rt1: {
    evidence:
      "Transport researchers call this induced demand: when driving becomes easier, more people choose to drive.",
    optionNotes: [
      "Ngược với bài: đường mới lại đầy gần như ngay khi vừa xây xong.",
      "Đúng: phần sau dấu hai chấm chính là định nghĩa của “induced demand”.",
      "Bài không nói số người đi lại giảm.",
      "Bài không bàn về giá phương tiện cá nhân.",
    ],
  },
  rt2: {
    evidence:
      "A commuter who can afford a cheap bus ticket may still ride a motorbike if the bus arrives unpredictably.",
    optionNotes: [
      "Bài không nói xe buýt bị cấm vào thành phố.",
      "Người đi làm trong ví dụ vẫn chọn xe máy, không phải đi bộ.",
      "Đúng: “unpredictably” là lý do người đi làm vẫn chọn xe máy.",
      "Chi phí đi lại do chủ lao động trả không được nhắc đến.",
    ],
  },
  rt3: {
    evidence:
      "This reduces pressure at peak times, but it cannot help workers whose jobs require a fixed schedule. Retail assistants, for example, generally need to be present when a shop opens.",
    optionNotes: [
      "Đúng: ví dụ cho thấy giới hạn của giờ làm linh hoạt.",
      "Ví dụ nằm ở đoạn về giờ làm, không phải đoạn về giá vé.",
      "Mua sắm trực tuyến không xuất hiện trong bài.",
      "Bài không nói nhóm này đạp xe đi làm.",
    ],
  },
  rt4: {
    evidence:
      "Connected lanes separated from traffic are more likely to encourage people who do not already cycle.",
    optionNotes: [
      "Chỗ đậu xe rộng hơn không được nhắc đến.",
      "Giá xe đạp không được nhắc đến.",
      "Vạch sơn rẻ nhưng “may do little to reassure a nervous cyclist”.",
      "Đúng: làn liên thông tách khỏi dòng xe mới đủ thuyết phục người chưa đạp xe.",
    ],
  },
  rt5: {
    evidence:
      "The most promising strategies combine reliable public transport, safer walking and cycling routes, and flexible working arrangements where possible.",
    optionNotes: [
      "Quá tuyệt đối: bài mở đầu đoạn kết bằng “No single measure can serve every commuter”.",
      "Đúng: “combine” nối ba nhóm giải pháp trong cùng một câu.",
      "Tác giả phê phán việc chỉ mở thêm đường, không kêu gọi dừng xây ở mọi nơi.",
      "Giờ làm linh hoạt không đồng nghĩa với việc tất cả làm việc tại nhà.",
    ],
  },
  rm1: {
    evidence:
      "But familiarity is not the same as the ability to recall information later.",
    optionNotes: [
      "Đúng: “is not the same as” là chỗ bài tách hai khái niệm.",
      "“Exhaustion” chỉ xuất hiện ở đoạn cuối với ý khác.",
      "Quá tuyệt đối: bài không nói học sinh không bao giờ hiểu.",
      "Bài chỉ nói đọc lại kém hiệu quả hơn, không phải vô ích hoàn toàn.",
    ],
  },
  rm2: {
    evidence:
      "They might explain a concept without notes or answer a short quiz.",
    optionNotes: [
      "Chép lại vẫn là nhìn vào đáp án, không phải truy xuất từ trí nhớ.",
      "Tô đậm cũng chỉ là nhìn lại văn bản.",
      "Đúng: “without notes” là dấu hiệu của việc truy xuất từ trí nhớ.",
      "Trái với định nghĩa: “Instead of repeatedly looking at an answer”.",
    ],
  },
  rm3: {
    evidence:
      "The ideal gap is not identical for every learner or every topic.",
    optionNotes: [
      "Bài không đưa ra con số cố định nào.",
      "Đúng: “not identical for every learner or every topic” loại mọi con số cố định.",
      "Trái với bài: câu quá dễ thì lần ôn sau được lùi lại.",
      "Ngược chiều: câu dễ thì giãn ra, không rút ngắn.",
    ],
  },
  rm4: {
    evidence:
      "Reviewing material across several days generally produces more durable learning than repeating it many times in one sitting.",
    optionNotes: [
      "“Entertaining” là thú vị, không liên quan đến độ bền của trí nhớ.",
      "“Immediate” ngược với ý giãn cách nhiều ngày.",
      "“Expensive” nói về chi phí, không hợp ngữ cảnh.",
      "Đúng: “durable” là bền, giữ được lâu.",
    ],
  },
  rm5: {
    evidence:
      "However, difficulty by itself is not a goal: tasks must still be manageable, and learners need opportunities to recover.",
    optionNotes: [
      "Quá tuyệt đối: bài nói chút ngập ngừng có thể là dấu hiệu tốt.",
      "Bài chỉ nói buổi học “may not always feel smooth”, không khẳng định như vậy.",
      "Đúng: “must still be manageable” là giới hạn bài đặt ra cho độ khó.",
      "Ngược lại, người học cần cơ hội hồi phục để tiến đều.",
    ],
  },
  rg1: {
    evidence:
      "They asked the building manager for permission and agreed to keep a clear path for emergency access.",
    optionNotes: [
      "Trẻ em chỉ đến thăm vườn ở đoạn sau, không phải điều kiện của quản lý.",
      "Đúng: “agreed to keep a clear path” là điều kiện đi kèm khi xin phép.",
      "Bài không nhắc đến việc bán rau.",
      "Thời hạn là “a six-month trial”, không phải một tháng.",
    ],
  },
  rg2: {
    evidence:
      "while a nearby restaurant donated used wooden boxes for planting",
    optionNotes: [
      "Hạt giống không được nhắc đến.",
      "Nhà hàng không tặng bữa ăn.",
      "Đúng: “donated” gắn với nhà hàng, còn đất và dụng cụ do cư dân góp tiền.",
      "Dụng cụ do cư dân góp tiền mua.",
    ],
  },
  rg3: {
    evidence:
      "At first, a few enthusiastic residents did most of the watering. Others wanted to help but did not know when they were needed.",
    optionNotes: [
      "Bài nói khu đất nhiều nắng chiều, và họ chọn cây chịu nóng.",
      "Chất lượng đất không được nhắc đến.",
      "Tiền mua dụng cụ đã được góp từ đầu.",
      "Đúng: vấn đề nằm ở “a few … did most of the watering”, không phải ở cây trồng.",
    ],
  },
  rg4: {
    evidence:
      "The group created a weekly schedule, with morning and evening shifts. This made responsibilities clearer and prevented the same plants from being watered twice.",
    optionNotes: [
      "Đúng: “This” đứng ngay sau câu lập lịch nên thay cho chính hành động đó.",
      "Không có hành động mua cây ngay trước “This”.",
      "Bài không nhắc đến việc dời vườn.",
      "Trẻ em xuất hiện ở đoạn sau, không phải câu trước “This”.",
    ],
  },
  rg5: {
    evidence:
      "It produced only a modest amount of food, but residents considered the new friendships its most valuable result.",
    optionNotes: [
      "Vườn không bán rau nên không có thu nhập.",
      "Đúng: “most valuable result” gắn trực tiếp với tình bạn, không phải sản lượng.",
      "Bài nói sản lượng khiêm tốn, không lấy diện tích làm giá trị.",
      "Nhà hàng đã có sẵn gần đó và chỉ tặng thùng gỗ.",
    ],
  },
  lw1: {
    evidence:
      "Please meet at the bookshop opposite the main post office instead.",
    optionNotes: [
      "Cửa bảo tàng đang sửa nên điểm hẹn cũ bị huỷ.",
      "Chợ là nơi kết thúc chuyến đi, không phải điểm hẹn.",
      "Đúng: “instead” đánh dấu điểm hẹn thay thế cho địa điểm vừa bị huỷ.",
      "Nhà ga không được nhắc đến.",
    ],
  },
  lw2: {
    evidence:
      "The starting time is now nine o'clock, so you have an extra half hour.",
    optionNotes: [
      "Mốc 8:00 không xuất hiện trong bài.",
      "8:30 là giờ dự kiến ban đầu, đã bị thay.",
      "Đúng: “is now” cho biết đây là giờ đã được sửa lại.",
      "Nửa giờ là phần được lùi thêm, không phải cộng vào 9:00.",
    ],
  },
  lw3: {
    evidence:
      "There is no need to print your ticket; just show the booking email on your phone.",
    optionNotes: [
      "Bài chỉ nói về vé, không nhắc bản đồ in.",
      "Đúng: “just show” giới hạn yêu cầu ở email đặt chỗ.",
      "Thẻ sinh viên không được nhắc đến.",
      "Bữa trưa không nằm trong giá vé và không có voucher.",
    ],
  },
  lw4: {
    evidence:
      "If heavy rain is forecast, we will send you a cancellation email by seven on Saturday morning.",
    optionNotes: [
      "Trái với bài: “the tour will go ahead, even if there is light rain”.",
      "Giờ đóng cửa của chợ không được nhắc đến.",
      "Bài không nêu số người tối thiểu.",
      "Đúng: điều kiện huỷ gắn với “heavy rain”, kèm mốc gửi email trước 7 giờ.",
    ],
  },
  ll1: {
    evidence:
      "From next Monday, we will close at eight in the evening on weekdays instead of six.",
    optionNotes: [
      "Trái với bài: “Weekend opening hours will remain the same”.",
      "Đúng: “instead of six” cho thấy giờ đóng cửa ngày thường được đổi.",
      "Bài không nhắc đến chi phí mượn sách.",
      "Bài không nhắc đến việc chuyển địa điểm.",
    ],
  },
  ll2: {
    evidence: "You cannot renew a book if another reader has reserved it.",
    optionNotes: [
      "Thời hạn mượn là ba tuần; bài không đặt mốc một tuần.",
      "Website là một cách gia hạn hợp lệ.",
      "Đúng: “cannot renew … if” nêu đúng điều kiện bị chặn.",
      "Sáu cuốn là giới hạn mượn, không phải điều kiện cấm gia hạn.",
    ],
  },
  ll3: {
    evidence: "Booking is free, but you need a library card.",
    optionNotes: [
      "Đúng: “but” tách phần miễn phí khỏi điều kiện bắt buộc là thẻ thư viện.",
      "Truyện hoàn chỉnh thuộc phần nhóm viết, và cũng không bắt buộc.",
      "Trái với bài: “Booking is free”.",
      "Mười hai là số chỗ của nhóm viết, không phải điều kiện đặt phòng.",
    ],
  },
  ll4: {
    evidence:
      "You do not need to bring a finished story, just a notebook and a willingness to share ideas.",
    optionNotes: [
      "Sách đã xuất bản không được nhắc đến.",
      "Máy tính và máy in không được nhắc đến.",
      "Trái với bài: “You do not need to bring a finished story”.",
      "Đúng: “just a notebook” là thứ duy nhất được yêu cầu mang theo.",
    ],
  },
  lr1: {
    evidence:
      "They are community events where volunteers help people fix broken household items.",
    optionNotes: [
      "Ngược tinh thần của bài: sửa thay vì mua mới.",
      "Trái với bài: “their main purpose is not to serve coffee”.",
      "Đúng: câu định nghĩa sự kiện nêu rõ việc tình nguyện viên giúp sửa đồ.",
      "Bài còn cảnh báo tình nguyện viên không làm việc vượt quá đào tạo.",
    ],
  },
  lr2: {
    evidence:
      "Owners are encouraged to take part so that they understand the repair and can attempt similar work in future.",
    optionNotes: [
      "Đúng: “so that” mở ra mục đích: tự làm được việc tương tự sau này.",
      "Sự kiện phần lớn miễn phí, chỉ nhận quyên góp cho vật tư.",
      "Ngược lại, bài khuyến khích chủ đồ cùng tham gia.",
      "Thử sản phẩm mới không được nhắc đến.",
    ],
  },
  lr3: {
    evidence:
      "Some objects cannot be fixed because spare parts are unavailable.",
    optionNotes: [
      "Bài không quy định thời lượng cho mỗi lần sửa.",
      "Đúng: “because spare parts are unavailable” là giới hạn được nói thành lời.",
      "Xe đạp chỉ là một ví dụ trong nhiều món đồ.",
      "Bài không yêu cầu người mang đồ đến phải có chứng chỉ.",
    ],
  },
  lr4: {
    evidence:
      "It overlooks the resources used to make and transport a new product, as well as the value of practical skills and community connections.",
    optionNotes: [
      "Cà phê không phải trọng tâm của mô hình này.",
      "Sự kiện dựa vào tình nguyện viên, không bàn số nhân viên trả lương.",
      "Chi phí thuê mặt bằng không được nhắc đến.",
      "Đúng: “overlooks” chỉ đúng phần người phê bình bỏ sót.",
    ],
  },
  lf1: {
    evidence:
      "provided they attended core meetings from ten to three and completed their contracted hours",
    optionNotes: [
      "Bảy đến mười là khung được chọn giờ bắt đầu, không phải giờ họp.",
      "Đúng: “core meetings from ten to three” là khung bắt buộc, khác khung chọn giờ vào.",
      "Mốc này không xuất hiện trong bài.",
      "Mốc này không xuất hiện trong bài.",
    ],
  },
  lf2: {
    evidence:
      "Most employees valued being able to organise family responsibilities.",
    optionNotes: [
      "Bài không nhắc đến lương.",
      "Nhân viên vẫn phải hoàn thành đủ giờ theo hợp đồng.",
      "Đúng: “Most employees valued” trả lời trực tiếp câu hỏi về số đông.",
      "Các cuộc họp chung vẫn bắt buộc tham dự.",
    ],
  },
  lf3: {
    evidence:
      "Teams responded by keeping a shared list of decisions and recording a short update before leaving.",
    optionNotes: [
      "Đúng: “Teams responded by…” nêu đúng hai biện pháp đi cùng nhau.",
      "Bài không nói huỷ mọi cuộc họp.",
      "Ngược với mục tiêu của thử nghiệm giờ làm linh hoạt.",
      "Bài không nhắc đến việc giảm nhân sự.",
    ],
  },
  lf4: {
    evidence:
      "Clear expectations matter more than simply allowing everyone to choose their hours.",
    optionNotes: [
      "Trái với bài: “Productivity remained roughly unchanged”.",
      "Trái với bài: “there is no single arrangement suitable for every role”.",
      "Nhóm hỗ trợ được tính phương án đổi ca, không phải ngừng trực.",
      "Đúng: câu cuối đặt “clear expectations” lên trên việc ai cũng tự chọn giờ.",
    ],
  },
};
