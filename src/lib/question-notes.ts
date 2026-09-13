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
