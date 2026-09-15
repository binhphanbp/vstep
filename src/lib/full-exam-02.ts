import type { Lesson, Question } from "./content";
import { withStableOptionOrder } from "./option-order";
import { questionNotes } from "./question-notes";
/**
 * The second full-length paper.
 *
 * One paper cannot measure twice. Sitting the same exam again measures memory,
 * so a learner who takes a mock at the start and another at the end of a
 * course learns nothing from comparing them unless the papers are different.
 * Paper 01 also reuses the whole of the library's Writing and Speaking, which
 * makes those sections a second sitting of lessons already done.
 *
 * So this paper shares nothing with paper 01 or with the library: its own
 * passages, its own transcripts, its own question ids, and its own Writing and
 * Speaking prompts. `tests/unit/full-exam.test.ts` enforces that.
 */
type Item = {
  id: string;
  text: string;
  options: string[];
  answer: number;
  explanation: string;
  /** Defaults to the commonest type, as in the first paper. */
  tag?: string;
  /** Exact quote from this paper's passage, for the review loop. */
  evidence?: string;
  /** One note per option, in authored order, the key prefixed "Đúng:". */
  notes?: string[];
};
const ask = ({ notes, tag, ...item }: Item): Question => {
  // Reading notes are written beside their passage in this file. The listening
  // notes were written later and live with every other lesson's, in
  // question-notes.ts, so a reviewer looking for a transcript quote finds all
  // of them in one place.
  const shared = questionNotes[item.id];
  return withStableOptionOrder({
    ...item,
    tag: tag ?? "Thông tin chi tiết",
    evidence: item.evidence ?? shared?.evidence,
    optionNotes: notes ?? shared?.optionNotes,
  });
};
const listen = (
  id: string,
  title: string,
  part: string,
  text: string,
  items: Item[],
  minutes: number,
): Lesson => ({
  id,
  version: 1,
  skill: "listening",
  title,
  subtitle: "Đề số 02 · Giọng đọc tổng hợp",
  topic: "Luyện đề",
  level: "B2",
  minutes,
  part,
  text,
  questions: items.map(ask),
  tips: [],
});
const read = (
  id: string,
  title: string,
  part: string,
  text: string,
  items: Item[],
): Lesson => ({
  id,
  version: 1,
  skill: "reading",
  title,
  subtitle: "Đề số 02 · Bài đọc dài",
  topic: "Luyện đề",
  level: "B2",
  minutes: 15,
  part,
  text,
  questions: items.map(ask),
  tips: [],
});

export const fullListening2: Lesson[] = [
  listen(
    "exam2-listen-1",
    "Library opening hours",
    "Part 1 · Thông báo 1",
    `Good afternoon. This is an announcement about opening hours during the examination period. From Monday the third, the library will open at seven in the morning instead of eight, and will close at ten in the evening as usual. The group study rooms on the second floor must be booked online; walk-in use is not possible during this period. Returns can be left in the box beside the main door at any time, including when the building is closed.`,
    [
      {
        id: "e2l1",
        text: "What is changing from Monday the third?",
        options: [
          "The closing time",
          "The opening time",
          "The rules for returning books",
          "The location of the return box",
        ],
        answer: 1,
        explanation:
          "Giờ mở cửa sớm hơn một tiếng, từ 8 giờ thành 7 giờ; giờ đóng cửa giữ nguyên.",
        tag: "Thông tin thay đổi",
      },
    ],
    1,
  ),
  listen(
    "exam2-listen-2",
    "A delivery for the office",
    "Part 1 · Thông báo 2",
    `This message is for staff on the fourth floor. A delivery of office chairs arrives tomorrow morning and the goods lift will be reserved between eight and eleven. Please use the stairs or the passenger lift during those hours. If you are expecting a delivery of your own, ask the sender to schedule it for the afternoon. The corridor outside meeting room two will be blocked for a short time while the chairs are unpacked.`,
    [
      {
        id: "e2l2",
        text: "What should staff do between eight and eleven?",
        options: [
          "Work from another floor",
          "Avoid the goods lift",
          "Cancel meetings in room two",
          "Unpack the chairs themselves",
        ],
        answer: 1,
        explanation:
          "Thang chở hàng bị giữ riêng cho đợt giao ghế; nhân viên dùng cầu thang hoặc thang khách.",
      },
    ],
    1,
  ),
  listen(
    "exam2-listen-3",
    "A note about the car park",
    "Part 1 · Thông báo 3",
    `Attention residents. Resurfacing work begins in the car park on Saturday and will take two days. Cars left in bays one to twenty must be moved before Friday evening; vehicles remaining there will have to stay until Monday. Bays twenty-one to forty are not affected. The pedestrian gate stays open throughout, but the vehicle entrance will be closed while the surface is drying.`,
    [
      {
        id: "e2l3",
        text: "Which cars must be moved before Friday evening?",
        options: [
          "Those in bays one to twenty",
          "Those in bays twenty-one to forty",
          "All cars in the car park",
          "Only cars belonging to visitors",
        ],
        answer: 0,
        explanation:
          "Chỉ ô 1–20 nằm trong khu vực thi công; ô 21–40 không bị ảnh hưởng.",
      },
    ],
    1,
  ),
  listen(
    "exam2-listen-4",
    "A reminder from the clinic",
    "Part 1 · Thông báo 4",
    `This is a reminder for patients booked for a health check this week. Please arrive fifteen minutes before your appointment so that your details can be checked. Bring a list of any medicines you take, including ones bought without a prescription. You do not need to bring previous test results; the clinic already holds them. If you cannot attend, telephone before eight in the morning on the day so the appointment can be offered to someone else.`,
    [
      {
        id: "e2l4",
        text: "What does the speaker ask patients to bring?",
        options: [
          "Their previous test results",
          "A list of the medicines they take",
          "A referral letter from a doctor",
          "Payment in cash",
        ],
        answer: 1,
        explanation:
          "Cần mang danh sách thuốc đang dùng, kể cả thuốc mua không cần đơn; kết quả xét nghiệm cũ thì phòng khám đã có.",
      },
    ],
    1,
  ),
  listen(
    "exam2-listen-5",
    "Before the tour begins",
    "Part 1 · Thông báo 5",
    `Welcome to the museum. Before the tour starts, a few words about photography. You may take photographs in the main halls without flash. Photography is not permitted in the textile room, where the light damages the fabric. Large bags must be left in the cloakroom, which is free of charge. The tour lasts about fifty minutes and finishes in the courtyard, where you are welcome to stay as long as you like.`,
    [
      {
        id: "e2l5",
        text: "Why is photography forbidden in the textile room?",
        options: [
          "The room is too small for groups",
          "The light would damage the fabric",
          "The exhibits are on loan",
          "Visitors block the corridor",
        ],
        answer: 1,
        explanation: "Người nói nêu lý do: ánh sáng làm hỏng vải.",
        tag: "Mục đích người nói",
      },
    ],
    1,
  ),
  listen(
    "exam2-listen-6",
    "A change to the evening class",
    "Part 1 · Thông báo 6",
    `A message for everyone in the Tuesday evening cookery class. Next week the class moves to the training kitchen on the ground floor, because the usual room is being painted. The time is unchanged. Ingredients will be provided as always, but please bring your own container if you would like to take food home. The lift to the ground floor is out of service, so allow a little extra time.`,
    [
      {
        id: "e2l6",
        text: "What is the main point of this announcement?",
        options: [
          "The class will be taught by someone else",
          "The class has moved to a different room",
          "The class now starts earlier",
          "The class has been cancelled",
        ],
        answer: 1,
        explanation:
          "Trọng tâm là đổi phòng sang bếp huấn luyện tầng trệt vì phòng cũ đang sơn; giờ học không đổi.",
        tag: "Ý chính",
      },
    ],
    1,
  ),
  listen(
    "exam2-listen-7",
    "Water testing this week",
    "Part 1 · Thông báo 7",
    `Residents of building B may notice workers on the roof this week. They are testing the water tanks, which is routine and happens twice a year. The supply will not be interrupted, but water may look slightly cloudy for an hour after each test. This is air in the pipes and is not a fault. If the water is still cloudy the next morning, please tell the office rather than the workers, who will already have left the site.`,
    [
      {
        id: "e2l7",
        text: "What should residents do if the water is still cloudy the next morning?",
        options: [
          "Speak to the workers on the roof",
          "Tell the office",
          "Boil the water before drinking",
          "Wait another full day",
        ],
        answer: 1,
        explanation:
          "Thợ đã rời công trường nên phải báo văn phòng, không phải báo thợ.",
      },
    ],
    1,
  ),
  listen(
    "exam2-listen-8",
    "Tickets for the concert",
    "Part 1 · Thông báo 8",
    `This is an announcement for people waiting for concert tickets. Online sales open at ten tomorrow morning, an hour earlier than advertised on the posters. Each person may buy four tickets. Students can claim a discount, but only at the box office and only with a valid card; the discount is not available online. Tickets bought online can be collected on the evening of the concert or shown on a phone at the door.`,
    [
      {
        id: "e2l8",
        text: "What has changed from what the posters said?",
        options: [
          "The number of tickets each person may buy",
          "The time online sales open",
          "The price of student tickets",
          "The date of the concert",
        ],
        answer: 1,
        explanation:
          "Bán trực tuyến mở lúc 10 giờ, sớm hơn một tiếng so với áp phích.",
        tag: "Thông tin thay đổi",
      },
    ],
    1,
  ),
  listen(
    "exam2-listen-9",
    "Choosing a phone plan",
    "Part 2 · Hội thoại 1",
    `Nam: I need to change my phone plan. The one I have gives me far more data than I use.\nLan: How much are you paying?\nNam: Two hundred thousand a month for thirty gigabytes. I use about eight.\nLan: There is a plan at a hundred and twenty for ten gigabytes. If you go over, it slows down rather than charging you extra.\nNam: Slowing down sounds worse than paying a little more.\nLan: It depends. When I went over last month I could still send messages and read email; it was only video that suffered.\nNam: That I could live with. What about the contract?\nLan: Twelve months. There is a monthly option, but it costs thirty thousand more and I would not bother unless you are moving abroad.\nNam: I am staying. One more thing: does the number stay the same?\nLan: Yes, as long as you change inside the same company. Moving to another company takes a few days and you have to ask them to transfer it.`,
    [
      {
        id: "e2l9",
        text: "How much data does Nam actually use each month?",
        options: [
          "About eight gigabytes",
          "About ten gigabytes",
          "About twelve gigabytes",
          "About thirty gigabytes",
        ],
        answer: 0,
        explanation: "Gói của Nam có 30 GB nhưng anh ấy chỉ dùng khoảng 8 GB.",
      },
      {
        id: "e2l10",
        text: "What happens on the cheaper plan if the data runs out?",
        options: [
          "The connection stops completely",
          "The speed drops instead of extra charges",
          "An extra fee is added automatically",
          "The plan upgrades to a larger one",
        ],
        answer: 1,
        explanation:
          "Vượt hạn mức thì tốc độ chậm lại chứ không bị tính thêm tiền.",
      },
      {
        id: "e2l11",
        text: "What does Lan think about the monthly contract option?",
        options: [
          "It is worth the extra cost for most people",
          "It is only sensible if you are leaving the country",
          "It is cheaper over a whole year",
          "It is the only way to keep your number",
        ],
        answer: 1,
        explanation:
          "Lan nói đắt hơn ba mươi nghìn mỗi tháng và chỉ đáng nếu sắp ra nước ngoài.",
        tag: "Quan điểm người nói",
      },
      {
        id: "e2l12",
        text: "What can be understood about keeping the same number?",
        options: [
          "It is automatic in every case",
          "It is simple within one company but slower between companies",
          "It is impossible once a contract ends",
          "It costs extra whichever plan is chosen",
        ],
        answer: 1,
        explanation:
          "Đổi gói trong cùng nhà mạng thì giữ số ngay; chuyển sang nhà mạng khác mất vài ngày và phải yêu cầu chuyển.",
        tag: "Suy luận",
      },
    ],
    3,
  ),
  listen(
    "exam2-listen-10",
    "Planning a team lunch",
    "Part 2 · Hội thoại 2",
    `Mai: We need to book somewhere for the team lunch. There are fourteen of us.\nHoa: The place near the river took a group of twenty last year, but the noise made conversation impossible.\nMai: Then not there. What about the restaurant beside the office?\nHoa: They only hold tables for an hour at lunchtime. We would be asked to leave halfway through.\nMai: Two hours is the minimum, really.\nHoa: There is the small place on Nguyen Du street. It is quiet and they let groups stay, but they do not take card payments.\nMai: We can manage cash if we know in advance. Do they do vegetarian food?\nHoa: Three dishes, and they will make more if we ask when booking. That is the part people forget.\nMai: I will ask when I call. Shall we say Friday?\nHoa: Thursday is better. Two people are away on Friday and they will mind being left out more than they will mind the day.`,
    [
      {
        id: "e2l13",
        text: "Why does Hoa reject the restaurant by the river?",
        options: [
          "It cannot seat fourteen people",
          "It was too noisy for conversation",
          "It is too far from the office",
          "It does not serve vegetarian food",
        ],
        answer: 1,
        explanation:
          "Chỗ đó đủ chỗ cho nhóm hai mươi người, nhưng ồn tới mức không nói chuyện được.",
      },
      {
        id: "e2l14",
        text: "What is the problem with the restaurant beside the office?",
        options: [
          "It closes at lunchtime",
          "It holds tables for only an hour",
          "It does not accept bookings",
          "It costs more than the others",
        ],
        answer: 1,
        explanation:
          "Giữ bàn một tiếng vào buổi trưa, trong khi nhóm cần ít nhất hai tiếng.",
      },
      {
        id: "e2l15",
        text: "What must the team remember when booking the place on Nguyen Du street?",
        options: [
          "To ask for extra vegetarian dishes in advance",
          "To pay a deposit online",
          "To arrive before midday",
          "To bring their own drinks",
        ],
        answer: 0,
        explanation:
          "Nhà hàng làm thêm món chay nếu hỏi lúc đặt bàn — Hoa nói đó là phần người ta hay quên.",
        tag: "Suy luận",
      },
      {
        id: "e2l16",
        text: "Why does Hoa prefer Thursday?",
        options: [
          "The restaurant is closed on Friday",
          "Two colleagues would miss a Friday lunch",
          "Thursday is cheaper",
          "The team finishes early on Thursday",
        ],
        answer: 1,
        explanation:
          "Hai người vắng mặt thứ Sáu, và họ sẽ phiền vì bị bỏ lỡ hơn là vì đổi ngày.",
        tag: "Quan điểm người nói",
      },
    ],
    3,
  ),
  listen(
    "exam2-listen-11",
    "Asking about a course refund",
    "Part 2 · Hội thoại 3",
    `Tuan: I signed up for the photography course but my shifts have changed. Can I get a refund?\nClerk: When does your course start?\nTuan: In eleven days.\nClerk: Then a full refund is possible. We refund in full up to seven days before the first session; after that it is half.\nTuan: What if I move to the evening group instead?\nClerk: Transfers are free at any time, even after the course begins, as long as there is a place. The evening group has two.\nTuan: That might suit me better. Can I decide tomorrow?\nClerk: You can, but I cannot hold a place without a booking. If both places go today, the next evening course starts in March.\nTuan: Then let us move me now. Will the fee change?\nClerk: The evening course costs the same. You will need the camera for the second week rather than the first, because the evening group starts indoors.`,
    [
      {
        id: "e2l17",
        text: "Why can Tuan have a full refund?",
        options: [
          "He has not attended any session",
          "His course starts in more than seven days",
          "His shifts were changed by his employer",
          "He is moving to another city",
        ],
        answer: 1,
        explanation:
          "Chính sách hoàn tiền tính theo mốc bảy ngày trước buổi đầu; khoá của Tuấn còn mười một ngày nên vẫn nằm trong mức hoàn đủ.",
        tag: "Suy luận",
      },
      {
        id: "e2l18",
        text: "What does the clerk say about transferring to another group?",
        options: [
          "It costs half the course fee",
          "It is free whenever there is a place",
          "It is only possible before the course begins",
          "It requires a written request",
        ],
        answer: 1,
        explanation:
          "Chuyển nhóm miễn phí bất cứ lúc nào, kể cả sau khi khoá đã bắt đầu, miễn là còn chỗ.",
      },
      {
        id: "e2l19",
        text: "Why does the clerk suggest deciding today?",
        options: [
          "The refund policy changes tomorrow",
          "The two evening places may be taken",
          "The fee rises next week",
          "The office is closed tomorrow",
        ],
        answer: 1,
        explanation:
          "Không giữ chỗ nếu chưa đặt; hết hai chỗ thì phải chờ khoá tháng Ba.",
        tag: "Mục đích người nói",
      },
      {
        id: "e2l20",
        text: "What is different about the evening group?",
        options: [
          "The camera is needed a week later",
          "The fee is slightly higher",
          "It runs for fewer weeks",
          "It has no practical sessions",
        ],
        answer: 0,
        explanation:
          "Nhóm tối bắt đầu trong nhà nên cần máy ảnh từ tuần thứ hai, không phải tuần đầu.",
      },
    ],
    3,
  ),
  listen(
    "exam2-listen-12",
    "What a small library learned",
    "Part 3 · Bài nói 1",
    `Thank you for coming. I want to describe what happened when our small branch library changed what it measured. For years we reported one number: how many books were borrowed. It fell every year, and every year the report said the same thing — fewer loans, less use, perhaps less need for the building.\n\nThen a colleague pointed out that we were counting the one activity that had moved online. People still came; they came to use the computers, to sit somewhere warm and quiet, to ask staff to help them fill in a form. None of that appeared anywhere.\n\nSo we started counting three things instead: visits, hours of computer use, and the number of times someone asked staff a question that took more than five minutes to answer. Loans kept falling. The other three rose sharply, and the long questions rose fastest of all.\n\nI want to be careful about what this proves. It does not prove that the library is more useful than it was, because we have no comparable figures from before. What it changed was the conversation with the council: instead of defending a falling number, we could describe what the building was actually for. The funding did not increase, but it stopped being cut, which in that year was the better outcome.\n\nThe lesson I take is not about libraries. It is that the number you report becomes the thing you are judged on, whether or not it is the thing you do.`,
    [
      {
        id: "e2l21",
        text: "What is the speaker's main point?",
        options: [
          "Libraries should stop lending books",
          "What you measure decides what you are judged on",
          "Online services have made libraries unnecessary",
          "Funding should follow visitor numbers",
        ],
        answer: 1,
        explanation:
          "Câu cuối nói thẳng: con số được báo cáo trở thành thứ người ta dùng để đánh giá mình.",
        tag: "Ý chính",
      },
      {
        id: "e2l22",
        text: "Which figure rose fastest?",
        options: [
          "Visits",
          "Hours of computer use",
          "Long questions asked of staff",
          "Loans of books",
        ],
        answer: 2,
        explanation:
          "Cả ba chỉ số mới đều tăng, nhưng số câu hỏi dài cho nhân viên tăng nhanh nhất.",
      },
      {
        id: "e2l23",
        text: "Why does the speaker say the result does not prove the library is more useful?",
        options: [
          "The new figures were collected by volunteers",
          "There are no comparable figures from earlier years",
          "The council rejected the report",
          "Loans are the only reliable measure",
        ],
        answer: 1,
        explanation:
          "Người nói tự giới hạn kết luận: không có số liệu tương đương từ trước để so sánh.",
        tag: "Quan điểm người nói",
      },
      {
        id: "e2l24",
        text: "What changed after the new figures were reported?",
        options: [
          "The funding increased",
          "The funding stopped being cut",
          "The branch moved to a larger building",
          "The staff were reduced",
        ],
        answer: 1,
        explanation:
          "Ngân sách không tăng, nhưng ngừng bị cắt — người nói coi đó là kết quả tốt hơn trong năm ấy.",
      },
      {
        id: "e2l25",
        text: "What can be understood about the falling loan figures?",
        options: [
          "They were recorded incorrectly",
          "They measured an activity that had moved online",
          "They were caused by shorter opening hours",
          "They rose again after the change",
        ],
        answer: 1,
        explanation:
          "Đồng nghiệp chỉ ra rằng thư viện đang đếm đúng hoạt động đã chuyển lên mạng.",
        tag: "Suy luận",
      },
    ],
    4,
  ),
  listen(
    "exam2-listen-13",
    "The bus lane that moved",
    "Part 3 · Bài nói 2",
    `Good morning. I am going to talk about a piece of road that was rebuilt twice, and what the second attempt got right.\n\nThe first design put the bus lane beside the pavement, which is where most people expect it. It failed for a reason nobody had modelled: every delivery van in the street stopped in it. Drivers were not being difficult — there was nowhere else to stop, and a delivery takes four minutes. Buses spent longer waiting behind vans than they had spent in ordinary traffic.\n\nThe second design moved the bus lane to the middle of the road and gave deliveries six marked bays at the kerb. That sounds obvious in hindsight. It was not obvious at the time, because putting buses in the middle means building islands for passengers to wait on, and islands cost money that a lane of paint does not.\n\nThe result: journey times fell by about a fifth, and the number of vans stopped in the bus lane fell close to zero. I would rather report both numbers than the first alone, because the second explains the first.\n\nOne warning. This worked on a wide street with space for islands. On a narrow street the same design removes the pavement, and I have seen that proposed seriously. The lesson is not "put bus lanes in the middle". It is that a lane fails where the vehicles it excludes have nowhere else to go.`,
    [
      {
        id: "e2l26",
        text: "Why did the first bus lane fail?",
        options: [
          "Buses were too wide for it",
          "Delivery vans had nowhere else to stop",
          "Drivers ignored the signs deliberately",
          "It was painted the wrong colour",
        ],
        answer: 1,
        explanation:
          "Người nói nói rõ tài xế không cố tình gây khó: không còn chỗ nào khác để dừng.",
      },
      {
        id: "e2l27",
        text: "What made the second design expensive?",
        options: [
          "Islands had to be built for passengers",
          "The road had to be widened",
          "More buses had to be bought",
          "The pavement had to be replaced",
        ],
        answer: 0,
        explanation:
          "Đưa làn xe buýt vào giữa đường thì phải xây đảo chờ cho hành khách, tốn hơn nhiều so với kẻ vạch sơn.",
      },
      {
        id: "e2l28",
        text: "Why does the speaker report both numbers?",
        options: [
          "Because the council asked for them",
          "Because the second number explains the first",
          "Because the first number was unreliable",
          "Because the numbers were collected together",
        ],
        answer: 1,
        explanation:
          "Người nói nói thẳng: số xe tải dừng trong làn gần bằng không giải thích vì sao thời gian hành trình giảm.",
        tag: "Mục đích người nói",
      },
      {
        id: "e2l29",
        text: "What is the speaker's warning about other streets?",
        options: [
          "The same design needs a wide street",
          "Bus lanes should never be painted",
          "Deliveries should be banned entirely",
          "Journey times cannot be measured reliably",
        ],
        answer: 0,
        explanation:
          "Trên đường hẹp, cùng thiết kế đó ăn mất vỉa hè — và người nói đã thấy có nơi đề xuất nghiêm túc như vậy.",
        tag: "Quan điểm người nói",
      },
      {
        id: "e2l30",
        text: "What general lesson does the speaker draw?",
        options: [
          "Bus lanes belong in the middle of the road",
          "A lane fails when excluded vehicles have nowhere to go",
          "Paint is always cheaper than building",
          "Journey times matter more than deliveries",
        ],
        answer: 1,
        explanation:
          'Bài học được nêu ở câu cuối, và chính người nói bác bỏ cách hiểu "cứ đưa làn vào giữa".',
        tag: "Ý chính",
      },
    ],
    4,
  ),
  listen(
    "exam2-listen-14",
    "Why the trial ran twice",
    "Part 3 · Bài nói 3",
    `Thanks for staying. I want to describe a training trial that we ran, got wrong, and ran again.\n\nThe question was simple: does a short refresher course reduce mistakes on the assembly line? We trained one team, left another untrained, and compared error rates for six weeks. Errors fell in the trained team by nearly a third. We were about to recommend the course for everyone.\n\nThen the line manager asked which shifts the two teams worked. The trained team worked mornings; the untrained team worked nights. Night errors are higher in every month we have records for, course or no course. We had measured the shift, not the training.\n\nThe second trial trained half of each shift. The fall was real but much smaller — about eight per cent — and it disappeared after four months unless people had a short practical session in between. That is a less exciting finding, and it is the one we published internally.\n\nI tell this story when people ask why a trial takes so long. It is not the running. It is that the first version of almost any comparison is measuring something you did not intend, and the only way to find out is to let someone who knows the work look at your design before you believe it.`,
    [
      {
        id: "e2l31",
        text: "What was wrong with the first trial?",
        options: [
          "The teams worked different shifts",
          "The course was too short",
          "The error rates were recorded by hand",
          "Six weeks was not long enough",
        ],
        answer: 0,
        explanation:
          "Nhóm được huấn luyện làm ca sáng, nhóm còn lại làm ca đêm — phép so sánh đo ca làm chứ không đo khoá học.",
      },
      {
        id: "e2l32",
        text: "What did the second trial find?",
        options: [
          "No reduction in errors at all",
          "A smaller reduction that faded without practice",
          "A larger reduction than the first trial",
          "A reduction only among new staff",
        ],
        answer: 1,
        explanation:
          "Giảm khoảng 8% và biến mất sau bốn tháng nếu không có buổi thực hành ngắn xen giữa.",
      },
      {
        id: "e2l33",
        text: "Why does the speaker mention the line manager?",
        options: [
          "To show who paid for the trial",
          "To show that someone who knew the work spotted the flaw",
          "To explain why the course was designed badly",
          "To criticise the training department",
        ],
        answer: 1,
        explanation:
          "Chính người quản lý dây chuyền hỏi về ca làm — đúng ý người nói ở đoạn cuối: cần người hiểu công việc soi thiết kế.",
        tag: "Mục đích người nói",
      },
      {
        id: "e2l34",
        text: "What does the speaker imply about exciting results?",
        options: [
          "They are usually the ones worth publishing",
          "They often come from a comparison measuring the wrong thing",
          "They are impossible in training research",
          "They should be reported to managers first",
        ],
        answer: 1,
        explanation:
          "Kết quả hấp dẫn ban đầu là do đo nhầm; kết quả kém hấp dẫn hơn mới là kết quả được công bố.",
        tag: "Suy luận",
      },
      {
        id: "e2l35",
        text: "What is the speaker's answer to why trials take so long?",
        options: [
          "Because running them is slow",
          "Because the first design usually measures the wrong thing",
          "Because staff resist being observed",
          "Because results must be repeated three times",
        ],
        answer: 1,
        explanation:
          "Người nói nói rõ: mất thời gian không phải ở khâu chạy, mà ở chỗ bản so sánh đầu tiên thường đo nhầm.",
        tag: "Ý chính",
      },
    ],
    4,
  ),
];

export const fullReading2: Lesson[] = [
  read(
    "exam2-read-1",
    "The museum that asked what to keep",
    "Đề số 02 · Reading 1",
    `When the city museum ran out of storage, the obvious answer was to build more of it. Storage is expensive, and the building it would have replaced was a workshop the museum used for school visits, so the director asked a different question first: of the forty thousand objects in the store, how many would anyone miss?\n\nThat question is harder to answer than it sounds. A museum cannot simply discard what it holds; most objects were given on conditions, and some were bought with public money. There is also a professional discomfort about disposal, because a curator who removes an object is making a judgement on behalf of people who are not yet born. The director accepted all of this and narrowed the question: rather than asking what to throw away, the museum asked what it could not explain.\n\nStaff went through one storeroom at a time and wrote a single sentence for each object saying why it was in the collection. The sentence had to be specific. "Typical of the period" was not accepted, because it fits almost anything. Where nobody could write the sentence, the object was photographed, catalogued properly for the first time, and marked for review. About one object in nine ended up in that group.\n\nThe next step surprised the staff who had expected an argument about disposal. The marked objects were put on open shelves in the workshop for a month, with their photographs and the blank space where the sentence should have been, and visitors were invited to write the missing sentence themselves. Several hundred people did. Most sentences were guesses, but a few were not: a retired shipyard worker identified a tool that had been catalogued as agricultural, and two sisters recognised a school photograph that contained their mother.\n\nThe museum kept nearly everything. Only four hundred objects were eventually transferred to other collections, and none was destroyed. By the measure the director had started with — space saved — the exercise was close to a failure. By another measure it was not: eleven thousand objects now had a sentence explaining them, written by someone who had looked at them, and the workshop had been full of people for a month.\n\nA visiting colleague from a larger museum was sceptical. She pointed out that public suggestions are unreliable, that a month of goodwill does not solve a storage problem, and that the same exercise in a national collection would produce thousands of unusable sentences. The director did not disagree. She replied that the exercise was designed for a museum of this size, where a curator can still know a storeroom, and that she would not recommend it to anyone who could not read every sentence submitted.\n\nWhat the museum did next is less often reported. It changed what a new acquisition requires: nothing is now accepted without the sentence written in advance, by the person proposing it. Three offers were declined in the following year, which the director considers the clearest result of the whole exercise.`,
    [
      {
        id: "e2r1",
        text: "Which of these best describes what the museum did?",
        options: [
          "A museum solved its storage problem by disposing of objects",
          "A museum replaced the question of what to discard with the question of what it could explain",
          "Public involvement should decide what museums collect",
          "Small museums cannot manage large collections",
        ],
        answer: 1,
        explanation:
          "Cả bài xoay quanh việc đổi câu hỏi: không hỏi bỏ cái gì, mà hỏi cái gì không giải thích nổi.",
        tag: "Ý chính",
        evidence:
          "rather than asking what to throw away, the museum asked what it could not explain",
        notes: [
          "Bảo tàng gần như không bỏ gì: chỉ 400 hiện vật được chuyển đi và không hiện vật nào bị huỷ.",
          "Đúng: câu này là bước ngoặt của cả bài.",
          "Công chúng được mời viết câu giải thích, nhưng không quyết định bảo tàng sưu tầm gì.",
          "Bài không kết luận bảo tàng nhỏ không quản nổi bộ sưu tập lớn.",
        ],
      },
      {
        id: "e2r2",
        text: "Why did the director not simply build more storage?",
        options: [
          "The museum had no money at all",
          "It would have replaced the workshop used for school visits",
          "The city refused planning permission",
          "The collection was due to be transferred",
        ],
        answer: 1,
        explanation:
          "Kho mới sẽ thay chỗ xưởng dùng cho các buổi học của trường, nên câu hỏi được đặt lại trước.",
        evidence:
          "the building it would have replaced was a workshop the museum used for school visits",
        notes: [
          "Bài nói kho đắt, không nói bảo tàng hết sạch tiền.",
          "Đúng: xây kho đồng nghĩa mất xưởng dành cho học sinh.",
          "Không có chi tiết nào về giấy phép xây dựng.",
          "Việc chuyển hiện vật xảy ra ở cuối, sau khi rà soát.",
        ],
      },
      {
        id: "e2r3",
        text: "What sentence did staff have to write for each object?",
        options: [
          "A description of its condition",
          "A specific reason why it was in the collection",
          "An estimate of its value",
          "The name of the person who donated it",
        ],
        answer: 1,
        explanation:
          "Mỗi hiện vật cần một câu nói rõ vì sao nó nằm trong bộ sưu tập, và phải cụ thể.",
        evidence:
          "wrote a single sentence for each object saying why it was in the collection",
        notes: [
          "Tình trạng hiện vật không phải điều được yêu cầu.",
          "Đúng: một câu nêu lý do hiện vật có mặt trong bộ sưu tập.",
          "Bài không nhắc tới việc định giá.",
          "Người tặng chỉ được nhắc tới trong phần điều kiện hiến tặng.",
        ],
      },
      {
        id: "e2r4",
        text: "Why was “typical of the period” rejected?",
        options: [
          "It was too technical for visitors",
          "It could describe almost any object",
          "It repeated the catalogue entry",
          "It was written in the wrong language",
        ],
        answer: 1,
        explanation:
          "Câu đó bị loại vì hợp với gần như mọi hiện vật, tức là không nói được điều gì riêng.",
        evidence:
          '"Typical of the period" was not accepted, because it fits almost anything.',
        notes: [
          "Vấn đề không nằm ở chỗ khó hiểu với khách tham quan.",
          "Đúng: câu đó đúng với gần như mọi thứ nên vô nghĩa.",
          "Bài không so sánh câu này với mục lục cũ.",
          "Ngôn ngữ không phải vấn đề được nêu.",
        ],
      },
      {
        id: "e2r5",
        text: "“that group” in paragraph three refers to:",
        options: [
          "the objects nobody could explain in a sentence",
          "the staff who went through the storerooms",
          "the visitors who wrote sentences",
          "the objects bought with public money",
        ],
        answer: 0,
        explanation:
          "Nhóm được nhắc tới là các hiện vật không ai viết nổi câu giải thích, đã chụp ảnh và đánh dấu để rà soát.",
        tag: "Từ tham chiếu",
        evidence:
          "Where nobody could write the sentence, the object was photographed, catalogued properly for the first time, and marked for review. About one object in nine ended up in that group.",
        notes: [
          "Đúng: câu trước mô tả đúng nhóm hiện vật không giải thích được.",
          "Nhân viên là người viết câu, không phải thứ được xếp vào nhóm.",
          "Khách tham quan xuất hiện ở đoạn sau.",
          "Hiện vật mua bằng tiền công được nhắc ở đoạn hai, không phải nhóm này.",
        ],
      },
      {
        id: "e2r6",
        text: "What did the shipyard worker's contribution show?",
        options: [
          "That public suggestions are usually accurate",
          "That some visitors knew things the catalogue had wrong",
          "That the objects were incorrectly stored",
          "That the museum needed more curators",
        ],
        answer: 1,
        explanation:
          "Phần lớn câu của khách chỉ là phỏng đoán, nhưng vài câu thì không: một công cụ bị xếp nhầm thành nông cụ đã được nhận đúng.",
        tag: "Suy luận",
        evidence:
          "a retired shipyard worker identified a tool that had been catalogued as agricultural",
        notes: [
          "Bài nói rõ phần lớn câu viết là phỏng đoán.",
          "Đúng: một số khách biết điều mà mục lục ghi sai.",
          "Cách lưu trữ không phải điều được chỉ ra.",
          "Bài không rút ra kết luận về số lượng cán bộ.",
        ],
      },
      {
        id: "e2r7",
        text: "Why does the writer mention the space the museum saved?",
        options: [
          "To show the exercise failed by its original measure",
          "To explain why the workshop was closed",
          "To compare the museum with a national collection",
          "To argue that storage is never the real problem",
        ],
        answer: 0,
        explanation:
          "Theo thước đo ban đầu — tiết kiệm chỗ — việc này gần như thất bại; giá trị nằm ở thước đo khác.",
        tag: "Mục đích tác giả",
        evidence:
          "By the measure the director had started with — space saved — the exercise was close to a failure.",
        notes: [
          "Đúng: chi tiết này thừa nhận thất bại theo đúng mục tiêu ban đầu.",
          "Xưởng không bị đóng; nó đầy người suốt một tháng.",
          "So sánh với bảo tàng quốc gia là ý của đồng nghiệp ở đoạn sau.",
          "Bài không phủ nhận vấn đề kho bãi là có thật.",
        ],
      },
      {
        id: "e2r8",
        text: "How did the director respond to the visiting colleague?",
        options: [
          "She rejected the criticism as unfair",
          "She agreed and limited what she would recommend",
          "She promised to repeat the exercise nationally",
          "She said the criticism came too late",
        ],
        answer: 1,
        explanation:
          "Giám đốc không phản bác, chỉ giới hạn phạm vi khuyến nghị: chỉ hợp với bảo tàng cỡ này.",
        evidence:
          "The director did not disagree. She replied that the exercise was designed for a museum of this size",
        notes: [
          "Bà ấy không bác bỏ lời phê bình.",
          "Đúng: đồng ý và tự giới hạn phạm vi áp dụng.",
          "Không có lời hứa nhân rộng toàn quốc.",
          "Thời điểm phê bình không được nhắc tới.",
        ],
      },
      {
        id: "e2r9",
        text: "“sceptical” in the sixth paragraph is closest in meaning to:",
        options: ["doubtful", "enthusiastic", "confused", "impatient"],
        answer: 0,
        explanation:
          "Ngay sau từ này là ba lý do bà ấy chưa tin vào cách làm, nên nghĩa là còn hoài nghi.",
        tag: "Từ vựng trong ngữ cảnh",
        evidence:
          "A visiting colleague from a larger museum was sceptical. She pointed out that public suggestions are unreliable",
        notes: [
          "Đúng: bà ấy nêu ba lý do để chưa tin.",
          "Trái nghĩa với mạch câu.",
          "Bà ấy không hề bối rối; lập luận rất rõ.",
          "Sốt ruột không khớp với các lý do được nêu.",
        ],
      },
      {
        id: "e2r10",
        text: "What does the director consider the clearest result?",
        options: [
          "The four hundred transferred objects",
          "The new rule for accepting acquisitions",
          "The month of visitors in the workshop",
          "The eleven thousand new sentences",
        ],
        answer: 1,
        explanation:
          "Quy định mới — không nhận hiện vật nếu chưa có câu giải thích — khiến ba lời tặng bị từ chối, và bà ấy coi đó là kết quả rõ nhất.",
        tag: "Suy luận",
        evidence:
          "Three offers were declined in the following year, which the director considers the clearest result of the whole exercise.",
        notes: [
          "Số hiện vật chuyển đi là kết quả nhỏ nhất theo chính bài viết.",
          "Đúng: quy định mới cho lần nhận hiện vật tiếp theo.",
          "Tháng đông khách là kết quả đáng kể nhưng không phải điều bà ấy nêu ở cuối.",
          "Mười một nghìn câu là thành quả của đợt rà soát, không phải thay đổi về quy định.",
        ],
      },
    ],
  ),
  read(
    "exam2-read-2",
    "What the riders already knew",
    "Đề số 02 · Reading 2",
    `A delivery company with three hundred riders had a problem it could describe precisely and not explain. Roughly one delivery in twenty arrived late, and the late ones were not spread evenly: a small number of addresses produced most of them. The routing software had been rebuilt twice. Neither version made a difference, because the software was solving the journey between addresses, and the delay was happening at the addresses themselves.\n\nThe operations manager decided to ask the riders. This was less obvious than it now sounds. The company measured riders on delivery time, so asking them why deliveries were slow invited an answer that protected them. To avoid that, the questions were about places rather than people: not "why were you late", but "which addresses cost you time, and what happens there".\n\nThe answers were unglamorous and almost entirely unknown to the office. One building had a bell that could not be heard from the top floor. A gated street opened at eight and closed at six, so afternoon deliveries required a detour of eleven minutes that no map showed. A block of flats had two entrances numbered identically, one of which no longer existed on any online map. In a market area, riders lost time not to traffic but to finding somewhere to leave a bike where it would not be moved.\n\nTwo riders had kept their own notebooks for years and had never been asked to share them; one of them said she had assumed the office had the same information and had chosen to ignore it. The company built a list of these places and began attaching a note to each delivery. The notes were short and written by riders: "bell broken, call from street"; "gate shuts at six, approach from the west". Within two months, late deliveries at the listed addresses fell by more than half. What the office had treated as a routing problem had been, in most cases, a knowledge problem, and the knowledge already existed inside the company.\n\nThe manager is careful about how this is described. She points out that the notes work because riders trust that they will not be used against them, and that the trust is fragile: a single decision to compare riders by how many notes they file would end it. She also notes that the biggest fall came from twelve addresses, and that the remaining late deliveries are a much harder problem, spread thinly and without a common cause.\n\nOne change was rejected. A proposal to publish the notes to customers was dropped after a rider pointed out that "bell broken" tells anyone reading it that the building has an entrance nobody answers. The notes stay internal, and the customer sees only a different arrival estimate.\n\nAsked what she would do differently, the manager says she would have asked earlier, and would have asked about places from the start. The first draft of her questionnaire asked riders to rate their own routes out of ten. Nobody, she says, gives a useful answer to that.`,
    [
      {
        id: "e2r11",
        text: "What was wrong with the company's approach before it asked the riders?",
        options: [
          "It measured the wrong deliveries",
          "It solved journeys while the delay happened at addresses",
          "It had too few riders for the area",
          "It relied on out-of-date maps only",
        ],
        answer: 1,
        explanation:
          "Phần mềm giải bài toán quãng đường giữa các địa chỉ, còn chỗ mất thời gian lại nằm ngay tại địa chỉ.",
        tag: "Ý chính",
        evidence:
          "because the software was solving the journey between addresses, and the delay was happening at the addresses themselves",
        notes: [
          "Số liệu giao muộn được mô tả là chính xác; vấn đề không nằm ở phép đo.",
          "Đúng: phần mềm giải sai chỗ.",
          "Bài không nói thiếu người giao hàng.",
          "Bản đồ cũ chỉ là một trong nhiều nguyên nhân được kể sau đó.",
        ],
      },
      {
        id: "e2r12",
        text: "Why were the questions asked about places rather than people?",
        options: [
          "Riders were not allowed to speak about colleagues",
          "Riders were measured on delivery time, so questions about them invited self-protection",
          "The office already knew who the slow riders were",
          "Place names were easier to record",
        ],
        answer: 1,
        explanation:
          "Vì riders bị đo bằng thời gian giao, hỏi thẳng lý do chậm sẽ chỉ nhận về câu trả lời tự bảo vệ.",
        tag: "Mục đích tác giả",
        evidence:
          "The company measured riders on delivery time, so asking them why deliveries were slow invited an answer that protected them.",
        notes: [
          "Không có quy định nào cấm nói về đồng nghiệp.",
          "Đúng: cách đo hiệu suất khiến câu hỏi về người trở nên vô dụng.",
          "Bài không nói văn phòng biết ai chậm.",
          "Dễ ghi chép không phải lý do được nêu.",
        ],
      },
      {
        id: "e2r13",
        text: "What was the problem at the gated street?",
        options: [
          "The gate was permanently locked",
          "Afternoon deliveries needed a detour no map showed",
          "The street had no numbers",
          "Bikes were not allowed inside",
        ],
        answer: 1,
        explanation:
          "Cổng đóng lúc sáu giờ nên buổi chiều phải đi vòng mười một phút mà không bản đồ nào hiện.",
        evidence:
          "so afternoon deliveries required a detour of eleven minutes that no map showed",
        notes: [
          "Cổng có mở, từ tám giờ tới sáu giờ.",
          "Đúng: đường vòng mười một phút không có trên bản đồ.",
          "Bài không nói phố thiếu số nhà.",
          "Chuyện chỗ để xe là ở khu chợ, không phải phố có cổng.",
        ],
      },
      {
        id: "e2r14",
        text: "What cost riders time in the market area?",
        options: [
          "Heavy traffic on the approach roads",
          "Finding a safe place to leave a bike",
          "Waiting for shops to open",
          "Carrying goods up stairs",
        ],
        answer: 1,
        explanation:
          "Bài nói rõ: mất thời gian không phải vì giao thông mà vì tìm chỗ để xe không bị dời đi.",
        evidence:
          "riders lost time not to traffic but to finding somewhere to leave a bike where it would not be moved",
        notes: [
          "Bài phủ định đúng phương án này.",
          "Đúng: tìm chỗ để xe an toàn.",
          "Giờ mở cửa cửa hàng không được nhắc tới.",
          "Việc mang hàng lên cầu thang thuộc toà nhà có chuông hỏng.",
        ],
      },
      {
        id: "e2r15",
        text: "What kind of problem did the late deliveries turn out to be?",
        options: [
          "A knowledge problem the company already had inside it",
          "A staffing problem needing more riders",
          "A software problem needing a third rebuild",
          "A customer problem caused by wrong addresses",
        ],
        answer: 0,
        explanation:
          "Văn phòng coi đó là bài toán định tuyến, nhưng phần lớn là bài toán thông tin — và thông tin đã có sẵn trong công ty.",
        evidence:
          "had been, in most cases, a knowledge problem, and the knowledge already existed inside the company",
        notes: [
          "Đúng: kiến thức đã nằm sẵn trong đội ngũ.",
          "Không có đề xuất tuyển thêm người.",
          "Phần mềm đã dựng lại hai lần mà không ăn thua; lần thứ ba không phải giải pháp.",
          "Địa chỉ sai không phải nguyên nhân được nêu.",
        ],
      },
      {
        id: "e2r16",
        text: "“it” in the fifth paragraph, in “would end it”, refers to:",
        options: [
          "the riders' trust",
          "the list of addresses",
          "the fall in late deliveries",
          "the manager's job",
        ],
        answer: 0,
        explanation:
          "Câu trước nói ghi chú chỉ hiệu quả khi riders tin rằng nó không bị dùng để chống lại họ; niềm tin đó dễ vỡ.",
        tag: "Từ tham chiếu",
        evidence:
          "the notes work because riders trust that they will not be used against them, and that the trust is fragile: a single decision to compare riders by how many notes they file would end it",
        notes: [
          "Đúng: thứ sẽ chấm dứt là niềm tin vừa được nói tới.",
          "Danh sách địa chỉ không bị đe doạ bởi việc so sánh riders.",
          "Mức giảm giao muộn là hệ quả, không phải thứ câu này trỏ tới.",
          "Bài không nói gì về công việc của người quản lý.",
        ],
      },
      {
        id: "e2r17",
        text: "What does the manager say about the remaining late deliveries?",
        options: [
          "They will disappear as more notes are filed",
          "They are harder because they have no common cause",
          "They are caused by the same twelve addresses",
          "They are not worth measuring",
        ],
        answer: 1,
        explanation:
          "Phần giảm mạnh đến từ mười hai địa chỉ; số còn lại rải rác và không có nguyên nhân chung.",
        tag: "Suy luận",
        evidence:
          "the remaining late deliveries are a much harder problem, spread thinly and without a common cause",
        notes: [
          "Bà ấy không hứa chúng sẽ tự biến mất.",
          "Đúng: rải rác và không có nguyên nhân chung.",
          "Mười hai địa chỉ là nơi tạo ra phần giảm, không phải phần còn lại.",
          "Không ai nói thôi không đo nữa.",
        ],
      },
      {
        id: "e2r18",
        text: "Why was publishing the notes to customers rejected?",
        options: [
          "Customers found them difficult to understand",
          "A note could tell a stranger which entrance nobody answers",
          "The notes changed too often to publish",
          "Riders did not want their writing shown",
        ],
        answer: 1,
        explanation:
          'Một rider chỉ ra rằng "chuông hỏng" nói cho bất kỳ ai đọc biết toà nhà có lối vào không ai trả lời.',
        tag: "Suy luận",
        evidence:
          'A proposal to publish the notes to customers was dropped after a rider pointed out that "bell broken" tells anyone reading it that the building has an entrance nobody answers.',
        notes: [
          "Bài không nói khách khó hiểu ghi chú.",
          "Đúng: đó là rủi ro an ninh cho cư dân.",
          "Tần suất thay đổi không được nhắc tới.",
          "Không ai ngại chữ viết của mình bị hiện ra.",
        ],
      },
      {
        id: "e2r19",
        text: "“unglamorous” in the third paragraph is closest in meaning to:",
        options: [
          "ordinary and unexciting",
          "difficult to believe",
          "expensive",
          "badly explained",
        ],
        answer: 0,
        explanation:
          "Các ví dụ ngay sau đó đều là chuyện nhỏ và tầm thường: chuông không nghe thấy, cổng đóng lúc sáu giờ.",
        tag: "Từ vựng trong ngữ cảnh",
        evidence:
          "The answers were unglamorous and almost entirely unknown to the office.",
        notes: [
          "Đúng: các ví dụ theo sau đều là chuyện thường ngày.",
          "Không có gì khó tin trong các câu trả lời đó.",
          "Chi phí không phải điều được nói tới.",
          "Các ghi chú được viết rất rõ, chỉ là ngắn.",
        ],
      },
      {
        id: "e2r20",
        text: "What does the manager's first draft questionnaire suggest?",
        options: [
          "Riders prefer numerical questions",
          "A question about one's own performance produces little",
          "Ten-point scales are more accurate than notes",
          "Questionnaires should be written by the office",
        ],
        answer: 1,
        explanation:
          "Bản nháp đầu bảo riders tự chấm tuyến của mình trên thang mười điểm, và bà ấy nói không ai trả lời hữu ích cho câu đó.",
        tag: "Suy luận",
        evidence:
          "The first draft of her questionnaire asked riders to rate their own routes out of ten. Nobody, she says, gives a useful answer to that.",
        notes: [
          "Bài nói ngược lại: câu hỏi kiểu chấm điểm không thu được gì.",
          "Đúng: hỏi về chính mình thì không ra thông tin dùng được.",
          "Thang mười điểm chính là thứ bị bỏ.",
          "Chính văn phòng viết bản nháp đầu, và nó là bản không dùng được.",
        ],
      },
    ],
  ),
  read(
    "exam2-read-3",
    "The school that moved its exams",
    "Đề số 02 · Reading 3",
    `For as long as anyone at the school could remember, the end-of-year examinations had been held in the last week of May. Two years ago they were moved to the second week of June, and the reason was not educational: the hall was needed for building work. The head of year expected complaints and a dip in results. She got the complaints. The results did not dip, and the difference in what students said about the fortnight beforehand was large enough that the school kept the new date.\n\nThe explanation appears to be the revision period rather than the examinations themselves. Under the old calendar, revision overlapped with the last two weeks of teaching, so students were preparing for papers while still meeting new material. The new date created a clear gap: teaching finished, then a week of supported revision, then the papers. Nothing was added; the same days were arranged differently.\n\nThe school measured what it could. Attendance during revision week rose from sixty-one to eighty-four per cent. The number of students asking for extra sessions more than doubled, and — the figure the head of year found most telling — the number who asked for help with a subject they were not failing rose sharply. Under the old arrangement, only students in difficulty asked for anything.\n\nThere were costs, and the school has been open about them. June is hotter, and the hall is not air-conditioned; two afternoon papers had to be moved to the morning. Two teachers lost the first week of their summer course, which the school had to pay to rearrange. A family holiday booked a year in advance was disrupted, and the school allowed that student to sit one paper early under supervision, a decision it says it would not repeat because of the pressure it put on staff.\n\nThe head of year is cautious about claiming too much. Results in the second year were slightly better than the first, but the cohorts were different and nobody can separate the calendar from the students. What she is confident about is narrower: the revision week now does what it was always supposed to do, and it did not before, because it was not a week.\n\nTwo other schools have asked about the change, one of them after reading a single paragraph about it in a newsletter. The advice given to both was the same: the gain came from separating teaching and revision, not from the month. A school that moves its papers later while still teaching new material in the final fortnight will have changed the date and nothing else.`,
    [
      {
        id: "e2r21",
        text: "Why were the examinations originally moved?",
        options: [
          "To improve results",
          "Because the hall was needed for building work",
          "Because teachers asked for a longer term",
          "To match other schools in the area",
        ],
        answer: 1,
        explanation:
          "Bài nói thẳng lý do không mang tính giáo dục: hội trường cần cho việc xây sửa.",
        evidence:
          "the reason was not educational: the hall was needed for building work",
        notes: [
          "Kết quả không đổi và cũng không phải lý do ban đầu.",
          "Đúng: hội trường được dùng cho công việc xây dựng.",
          "Không có yêu cầu nào từ giáo viên về độ dài học kỳ.",
          "Bài không nhắc tới các trường khác ở thời điểm đổi lịch.",
        ],
      },
      {
        id: "e2r22",
        text: "What is the main reason the new date seems to have helped?",
        options: [
          "Students had more days of revision",
          "Revision no longer overlapped with new teaching",
          "The papers themselves were made easier",
          "The weather was better in June",
        ],
        answer: 1,
        explanation:
          "Không thêm ngày nào; chỉ là dạy xong rồi mới ôn, thay vì ôn trong lúc vẫn học bài mới.",
        tag: "Ý chính",
        evidence:
          "The new date created a clear gap: teaching finished, then a week of supported revision, then the papers. Nothing was added; the same days were arranged differently.",
        notes: [
          "Bài nói rõ không có ngày nào được thêm vào.",
          "Đúng: tách phần dạy khỏi phần ôn.",
          "Không có chi tiết nào nói đề dễ hơn.",
          "Tháng Sáu nóng hơn và đó là một bất lợi.",
        ],
      },
      {
        id: "e2r23",
        text: "What happened to attendance during revision week?",
        options: [
          "It fell slightly",
          "It rose from 61 to 84 per cent",
          "It stayed the same",
          "It was not recorded",
        ],
        answer: 1,
        explanation: "Tỉ lệ đi học tuần ôn tăng từ 61% lên 84%.",
        evidence:
          "Attendance during revision week rose from sixty-one to eighty-four per cent.",
        notes: [
          "Ngược với số liệu trong bài.",
          "Đúng: từ 61% lên 84%.",
          "Con số thay đổi rõ rệt.",
          "Trường có đo và công bố con số này.",
        ],
      },
      {
        id: "e2r24",
        text: "Which figure did the head of year find most telling?",
        options: [
          "The rise in attendance",
          "The doubling of extra sessions",
          "Requests for help in subjects students were not failing",
          "The improvement in results",
        ],
        answer: 2,
        explanation:
          "Bà ấy chú ý nhất tới việc học sinh hỏi thêm cả ở môn mình không bị đuối — điều trước đây không xảy ra.",
        tag: "Suy luận",
        evidence:
          "the number who asked for help with a subject they were not failing rose sharply",
        notes: [
          "Tỉ lệ đi học là con số đầu tiên, không phải con số bà ấy nhấn mạnh.",
          "Số buổi phụ đạo tăng gấp đôi, nhưng vẫn không phải con số được nêu là đáng chú ý nhất.",
          "Đúng: học sinh không đuối cũng bắt đầu hỏi.",
          "Kết quả thi được nói tới ở đoạn sau và chính bà ấy thận trọng với nó.",
        ],
      },
      {
        id: "e2r25",
        text: "Why does the writer describe the costs of the change?",
        options: [
          "To argue that the change should be reversed",
          "To show the school reported the disadvantages as well",
          "To explain why two teachers left",
          "To criticise the family that complained",
        ],
        answer: 1,
        explanation:
          "Đoạn này liệt kê thiệt hại và nói rõ trường công khai chúng, chứ không chỉ khoe phần được.",
        tag: "Mục đích tác giả",
        evidence: "There were costs, and the school has been open about them.",
        notes: [
          "Bài không đề nghị quay lại lịch cũ.",
          "Đúng: nêu cả mặt bất lợi.",
          "Hai giáo viên mất tuần đầu khoá hè, không phải nghỉ việc.",
          "Bài không chê gia đình nào cả.",
        ],
      },
      {
        id: "e2r26",
        text: "What does the school say about letting a student sit a paper early?",
        options: [
          "It worked well and will be offered again",
          "It would not be repeated because of the pressure on staff",
          "It was refused by the examination board",
          "It became the standard arrangement",
        ],
        answer: 1,
        explanation: "Trường nói sẽ không làm lại vì áp lực đặt lên đội ngũ.",
        evidence:
          "a decision it says it would not repeat because of the pressure it put on staff",
        notes: [
          "Trường nói ngược lại.",
          "Đúng: không lặp lại vì áp lực cho nhân sự.",
          "Không có hội đồng nào từ chối; chính trường cho phép.",
          "Đó là ngoại lệ một lần, không thành thông lệ.",
        ],
      },
      {
        id: "e2r27",
        text: "“it” in “it did not before, because it was not a week” refers to:",
        options: [
          "the revision week",
          "the examination timetable",
          "the building work",
          "the summer course",
        ],
        answer: 0,
        explanation:
          "Cả câu nói về tuần ôn: nay nó làm đúng việc của nó, trước kia thì không vì nó không thực sự là một tuần.",
        tag: "Từ tham chiếu",
        evidence:
          "the revision week now does what it was always supposed to do, and it did not before, because it was not a week",
        notes: [
          "Đúng: chủ ngữ của cả câu là tuần ôn.",
          'Lịch thi là thứ được đổi, không phải thứ "không phải một tuần".',
          "Việc xây sửa chỉ là nguyên nhân ban đầu.",
          "Khoá hè thuộc phần thiệt hại ở đoạn trước.",
        ],
      },
      {
        id: "e2r28",
        text: "How confident is the head of year about the better results?",
        options: [
          "She treats them as proof the change worked",
          "She is cautious because the cohorts were different",
          "She believes they were caused by the weather",
          "She thinks they will fall again next year",
        ],
        answer: 1,
        explanation:
          "Bà ấy nói rõ không tách được ảnh hưởng của lịch thi khỏi khác biệt giữa các khoá học sinh.",
        tag: "Quan điểm tác giả",
        evidence:
          "the cohorts were different and nobody can separate the calendar from the students",
        notes: [
          "Bà ấy tránh đúng cách hiểu này.",
          "Đúng: hai khoá khác nhau nên không kết luận được.",
          "Thời tiết được nêu như một bất lợi, không phải nguyên nhân kết quả.",
          "Bài không dự đoán kết quả năm sau.",
        ],
      },
      {
        id: "e2r29",
        text: "“cohorts” in the fifth paragraph is closest in meaning to:",
        options: [
          "groups of students in a given year",
          "subjects on the timetable",
          "members of staff",
          "sets of examination papers",
        ],
        answer: 0,
        explanation:
          'Câu nói không tách được lịch thi khỏi chính học sinh, nên "cohorts" chỉ các nhóm học sinh của từng năm.',
        tag: "Từ vựng trong ngữ cảnh",
        evidence:
          "Results in the second year were slightly better than the first, but the cohorts were different",
        notes: [
          "Đúng: nhóm học sinh của từng năm.",
          "Môn học không phải thứ được so sánh ở đây.",
          "Giáo viên được nhắc ở đoạn trước, trong phần thiệt hại.",
          "Bộ đề không phải thứ khác nhau giữa hai năm theo bài này.",
        ],
      },
      {
        id: "e2r30",
        text: "What advice was given to the two other schools?",
        options: [
          "Move the papers to June as well",
          "Separate teaching from revision, whatever the month",
          "Extend the revision period to two weeks",
          "Measure attendance before changing anything",
        ],
        answer: 1,
        explanation:
          "Lời khuyên là tách phần dạy khỏi phần ôn; chỉ đổi tháng mà vẫn dạy bài mới thì chẳng thay đổi gì.",
        tag: "Suy luận",
        evidence:
          "the gain came from separating teaching and revision, not from the month",
        notes: [
          'Chính bài bác bỏ cách hiểu "cứ dời sang tháng Sáu".',
          "Đúng: tách dạy khỏi ôn mới là điều tạo ra khác biệt.",
          "Không ai đề nghị kéo dài tuần ôn thành hai tuần.",
          "Đo tỉ lệ đi học là việc trường đã làm, không phải lời khuyên được nêu.",
        ],
      },
    ],
  ),
  read(
    "exam2-read-4",
    "The quiet hour",
    "Đề số 02 · Reading 4",
    `A supermarket chain introduced a quiet hour in one of its stores: for sixty minutes on a Tuesday morning, the music was switched off, the tills stopped beeping, the lights were lowered, and staff were asked not to use the public address system except in an emergency. The idea came from a customer whose son found ordinary shopping unbearable, and the company expected to run it for a month as a gesture.\n\nWhat the company did not expect was who came. The families it had in mind did come, and said the hour made a weekly task possible rather than exhausting. But most of the additional customers were older people, several of whom told staff that they had found the store increasingly difficult and had begun shopping online, which they disliked. None of them had ever described the noise as a problem; asked directly, they had said the store was fine.\n\nThe manager is careful about how that is interpreted. It does not mean that customers lie, she says. It means that people describe what they can name. A person who leaves a shop feeling tired does not necessarily connect that feeling to a sound they stopped noticing years ago, and a survey asking "is the store too noisy" will collect the answer no.\n\nThe measurable effects were modest and mixed. Sales during the hour were slightly lower than a normal Tuesday morning, which the company had predicted, because quiet hours attract shoppers with a list. Sales across the whole day were marginally higher. Staff reported fewer mistakes at the tills, and one supervisor said the hour was the only time she could hear a colleague ask for help from two aisles away.\n\nThere were complaints. Some customers found the lowered lights made labels hard to read, and the company restored full lighting in the fresh food aisles after two weeks. A small number of shoppers assumed the store was closing and left. Two staff said the silence made the shift feel longer, and the company now rotates who works that hour rather than assigning it to the same team.\n\nThe chain has since extended the quiet hour to forty stores, choosing the sites by the age of the surrounding population rather than by sales, and has been careful not to describe it as a health measure. It is a shopping hour that suits people the ordinary store does not suit, which is a smaller claim and one the company can support. The manager of the original store says the part she would defend most strongly is the least visible: the instruction not to use the public address system. Everything else, she says, people notice and adapt to. The announcements are the thing that cannot be predicted, and an hour without them is an hour a person can plan.`,
    [
      {
        id: "e2r31",
        text: "What does the quiet hour turn out to be mainly about?",
        options: [
          "A shop change that helped people it had not been designed for",
          "A campaign to reduce noise in public places",
          "The decline of shopping in physical stores",
          "How supermarkets increase their sales",
        ],
        answer: 0,
        explanation:
          "Giờ yên tĩnh được nghĩ ra cho một nhóm, nhưng phần lớn khách tăng thêm lại là người cao tuổi.",
        tag: "Ý chính",
        evidence: "But most of the additional customers were older people",
        notes: [
          "Đúng: nhóm hưởng lợi rộng hơn nhóm được nhắm tới ban đầu.",
          "Bài không nói về một chiến dịch giảm tiếng ồn nói chung.",
          "Mua sắm trực tuyến chỉ là một chi tiết trong lời kể của khách lớn tuổi.",
          "Doanh thu trong giờ đó còn thấp hơn bình thường.",
        ],
      },
      {
        id: "e2r32",
        text: "What were staff asked not to do during the hour?",
        options: [
          "Speak to customers",
          "Use the public address system except in an emergency",
          "Open new tills",
          "Restock the shelves",
        ],
        answer: 1,
        explanation:
          "Nhân viên được yêu cầu không dùng hệ thống loa trừ trường hợp khẩn cấp.",
        evidence:
          "staff were asked not to use the public address system except in an emergency",
        notes: [
          "Không ai bị cấm nói chuyện với khách.",
          "Đúng: không dùng loa trừ khi khẩn cấp.",
          "Bài không nhắc tới việc mở thêm quầy.",
          "Việc xếp hàng lên kệ không được nêu.",
        ],
      },
      {
        id: "e2r33",
        text: "What had the older customers said when asked directly about the store?",
        options: [
          "That it was too noisy",
          "That it was fine",
          "That the lights were too bright",
          "That they preferred shopping online",
        ],
        answer: 1,
        explanation:
          "Chưa ai từng gọi tiếng ồn là vấn đề; khi được hỏi thẳng, họ nói cửa hàng ổn.",
        evidence:
          "None of them had ever described the noise as a problem; asked directly, they had said the store was fine.",
        notes: [
          "Chính điều này họ chưa từng nói.",
          "Đúng: họ trả lời cửa hàng ổn.",
          "Ánh sáng là phàn nàn của nhóm khác, sau khi giảm đèn.",
          "Họ chuyển sang mua online nhưng không thích, và đó không phải câu trả lời khi được hỏi.",
        ],
      },
      {
        id: "e2r34",
        text: "What does the manager mean by “people describe what they can name”?",
        options: [
          "Customers are often dishonest in surveys",
          "A problem someone has stopped noticing will not appear in an answer",
          "Surveys should use simpler language",
          "Shoppers prefer to complain in person",
        ],
        answer: 1,
        explanation:
          "Người rời cửa hàng trong mệt mỏi không nhất thiết nối cảm giác đó với âm thanh họ đã thôi để ý từ lâu.",
        tag: "Suy luận",
        evidence:
          "A person who leaves a shop feeling tired does not necessarily connect that feeling to a sound they stopped noticing years ago",
        notes: [
          "Bà ấy nói thẳng điều đó không có nghĩa là khách nói dối.",
          "Đúng: thứ đã thôi được để ý thì không hiện ra trong câu trả lời.",
          "Bài không bàn tới cách diễn đạt của bảng hỏi.",
          "Hình thức phàn nàn không phải điều được nói tới.",
        ],
      },
      {
        id: "e2r35",
        text: "Why were sales during the hour slightly lower?",
        options: [
          "Fewer customers came in total",
          "Quiet hours attract shoppers who buy from a list",
          "Some tills were closed",
          "Prices were reduced during the hour",
        ],
        answer: 1,
        explanation:
          "Công ty đã dự đoán điều này: giờ yên tĩnh thu hút người mua theo danh sách.",
        evidence: "because quiet hours attract shoppers with a list",
        notes: [
          "Bài nói số khách tăng thêm, không giảm.",
          "Đúng: khách mua theo danh sách nên mua ít hơn.",
          "Không có chi tiết nào về việc đóng quầy.",
          "Không có đợt giảm giá nào được nhắc tới.",
        ],
      },
      {
        id: "e2r36",
        text: "What did the company change after two weeks?",
        options: [
          "It restored full lighting in the fresh food aisles",
          "It moved the hour to another day",
          "It turned the music back on",
          "It stopped the trial in that store",
        ],
        answer: 0,
        explanation:
          "Vì nhãn hàng khó đọc dưới ánh sáng giảm, đèn khu thực phẩm tươi được bật lại như cũ.",
        evidence:
          "the company restored full lighting in the fresh food aisles after two weeks",
        notes: [
          "Đúng: bật lại đèn ở khu thực phẩm tươi.",
          "Ngày trong tuần không đổi.",
          "Nhạc vẫn tắt trong giờ yên tĩnh.",
          "Thử nghiệm không bị dừng; nó còn mở rộng ra bốn mươi cửa hàng.",
        ],
      },
      {
        id: "e2r37",
        text: "“them” in the final paragraph, in “an hour without them”, refers to:",
        options: [
          "the announcements",
          "the lowered lights",
          "the older customers",
          "the forty stores",
        ],
        answer: 0,
        explanation:
          "Câu trước nói về các thông báo trên loa — thứ không đoán trước được; một giờ không có chúng là một giờ có thể lên kế hoạch.",
        tag: "Từ tham chiếu",
        evidence:
          "The announcements are the thing that cannot be predicted, and an hour without them is an hour a person can plan.",
        notes: [
          "Đúng: các thông báo trên loa vừa được nhắc ngay trước đó.",
          "Đèn giảm đã được bật lại ở khu thực phẩm tươi.",
          "Khách lớn tuổi là người hưởng lợi, không phải thứ bị loại bỏ.",
          "Bốn mươi cửa hàng là quy mô mở rộng.",
        ],
      },
      {
        id: "e2r38",
        text: "Why does the company avoid calling the quiet hour a health measure?",
        options: [
          "Because doctors objected to the claim",
          "Because it prefers a smaller claim it can support",
          "Because the hour is not popular enough",
          "Because health claims are illegal in advertising",
        ],
        answer: 1,
        explanation:
          "Công ty gọi đó là một giờ mua sắm hợp với những người mà cửa hàng thường ngày không hợp — một tuyên bố nhỏ hơn và chứng minh được.",
        tag: "Mục đích tác giả",
        evidence: "which is a smaller claim and one the company can support",
        notes: [
          "Không có ý kiến bác sĩ nào trong bài.",
          "Đúng: chọn tuyên bố nhỏ hơn nhưng có căn cứ.",
          "Giờ này được mở rộng ra bốn mươi cửa hàng, tức là có người dùng.",
          "Bài không bàn tới quy định quảng cáo.",
        ],
      },
      {
        id: "e2r39",
        text: "What can be understood about the staff reaction?",
        options: [
          "All staff preferred the quiet hour",
          "The company changed the rota after two staff found it hard",
          "Staff were not consulted at all",
          "Staff mistakes increased during the hour",
        ],
        answer: 1,
        explanation:
          "Hai nhân viên thấy ca trực dài hơn, nên công ty luân phiên người làm giờ đó thay vì cố định một tổ.",
        tag: "Suy luận",
        evidence:
          "Two staff said the silence made the shift feel longer, and the company now rotates who works that hour",
        notes: [
          "Không phải tất cả: hai người thấy khó chịu.",
          "Đúng: đổi sang luân phiên sau phản hồi của họ.",
          "Chính phản hồi của nhân viên dẫn tới thay đổi, nên họ có được hỏi.",
          "Bài nói lỗi ở quầy tính tiền *giảm* đi.",
        ],
      },
      {
        id: "e2r40",
        text: "“modest” in the fourth paragraph is closest in meaning to:",
        options: ["small", "surprising", "temporary", "uncertain"],
        answer: 0,
        explanation:
          "Các con số ngay sau đó đều là thay đổi nhỏ: doanh thu giờ đó thấp hơn chút, cả ngày cao hơn chút.",
        tag: "Từ vựng trong ngữ cảnh",
        evidence: "The measurable effects were modest and mixed.",
        notes: [
          "Đúng: các con số theo sau đều nhỏ.",
          "Bài không mô tả các con số là bất ngờ.",
          "Không có gì cho thấy hiệu ứng chỉ tạm thời.",
          "Các con số được nêu khá rõ, không phải chưa chắc chắn.",
        ],
      },
    ],
  ),
];
const paper = (
  lesson: Omit<Lesson, "version" | "questions" | "topic">,
): Lesson => ({
  ...lesson,
  version: 1,
  topic: "Luyện đề",
  questions: [],
});
/** Paper 02 writes its own Writing tasks instead of reusing the library's. */
export const fullWriting2: Lesson[] = [
  paper({
    id: "exam2-writing-1",
    skill: "writing",
    title: "A reply to the building manager",
    subtitle: "Đề số 02 · Thư trả lời có đủ ý",
    level: "B1",
    minutes: 20,
    part: "Task 1 • Letter",
    minWords: 120,
    text: `You live in a block of flats. The building manager has sent this notice to all residents:\n\n"From next month the bicycle store will be closed for repairs for six weeks. Residents may leave bicycles in the ground-floor corridor. Please reply if this causes you a problem."\n\nWrite a reply to the building manager. Explain how the change affects you, suggest one alternative arrangement, and ask one question about the repairs. Write at least 120 words. Do not include your real name or address.`,
    tips: [
      "Đọc kỹ ba yêu cầu trong đề và trả lời đủ cả ba.",
      "Giọng lịch sự, trung tính: Dear Sir or Madam, … / Yours faithfully, …",
      "Câu hỏi ở cuối nên cụ thể, ví dụ hỏi ngày hoàn thành.",
    ],
    sample: `Dear Sir or Madam,\n\nI am writing about the notice concerning the bicycle store. I use my bicycle to travel to work every morning, and leaving it in the ground-floor corridor would be difficult for me, because the corridor is narrow and I would have to carry the bicycle past the lift doors.\n\nI would like to suggest an alternative. The car park has two unused bays near the pedestrian gate. If a temporary rack were placed there, residents with bicycles could continue to use them safely during the repairs, and the corridor would remain clear for everyone else.\n\nCould you also tell me which week the repairs are expected to finish? I ask because I have a long trip planned at the end of next month and would like to know whether the store will be open by then.\n\nThank you for considering my suggestion.\n\nYours faithfully,\nA resident of flat 4B`,
  }),
  paper({
    id: "exam2-writing-2",
    skill: "writing",
    title: "Working from home",
    subtitle: "Đề số 02 · Bài luận nêu quan điểm",
    level: "B2",
    minutes: 40,
    part: "Task 2 • Essay",
    minWords: 250,
    text: `Some people believe that employees should be allowed to work from home whenever they wish. Others think that regular time in a shared workplace is necessary.\n\nDiscuss both views and give your own opinion. Write at least 250 words. Use your own ideas and examples; do not copy the question.`,
    tips: [
      "Nêu quan điểm của mình ngay đoạn mở, đừng để tới cuối bài.",
      "Mỗi đoạn một ý chính, có lý do và ví dụ cụ thể.",
      "Dành 3 phút cuối soát thì, mạo từ và từ nối.",
    ],
    sample: `The question of where work should happen has moved from a practical detail to a real disagreement. Some argue that employees should choose freely; others believe that time together in one place is necessary. In my view, the choice should sit with the team rather than with either the individual alone or the employer alone.\n\nThose who defend working from home point to time saved and to concentration. A person who does not spend two hours travelling has two hours more, and quiet work such as writing or analysis is often done better away from an open office. There is also a fairness argument: a parent or a person with a long commute is not less capable, and a rigid office rule quietly excludes them.\n\nThe opposite view is not simply nostalgia. New colleagues learn by overhearing, and a question that takes ten seconds in a room can take a day in messages. Trust between people who have never met is thinner, and it is trust that carries a team through a difficult month.\n\nBoth arguments describe something real, which is why a single rule for everyone fails. My own position is that a team should agree which days it meets and protect them, while leaving the rest to each person. That keeps the part of office life that cannot be replaced - the unplanned conversation - without pretending that every task needs a desk in one building.\n\nThe decision should also be reviewed. A rule that suited a team last year may not suit it after three people join, and the honest answer is to look again rather than to defend the original choice.`,
  }),
];
/** Paper 02 writes its own Speaking parts too. */
export const fullSpeaking2: Lesson[] = [
  paper({
    id: "exam2-speaking-1",
    skill: "speaking",
    title: "Talking about where you live",
    subtitle: "Đề số 02 · Part 1 · Trả lời tự nhiên",
    level: "B1",
    minutes: 4,
    part: "Part 1 • Social interaction",
    text: `Answer these questions. Speak for about three minutes in total.\n\n1. Where do you live now, and how long have you lived there?\n2. What do you like most about your neighbourhood?\n3. Is there anything you would change about it?\n4. Do you prefer living in a city or in a smaller town? Why?`,
    tips: [
      "Trả lời thẳng câu hỏi rồi mới mở rộng bằng một lý do.",
      "Thêm một ví dụ thật cho mỗi câu, tránh trả lời một dòng.",
      "Nói tự nhiên, đừng đọc bài soạn sẵn.",
    ],
  }),
  paper({
    id: "exam2-speaking-2",
    skill: "speaking",
    title: "Choosing a gift for a colleague",
    subtitle: "Đề số 02 · Part 2 · So sánh và chọn",
    level: "B2",
    minutes: 4,
    part: "Part 2 • Solution discussion",
    text: `Situation: A colleague is leaving your office after five years. The team has a small budget and wants to give one gift.\n\nThree suggestions have been made:\n• A gift voucher for a bookshop\n• A photograph album with pictures and messages from the team\n• A dinner with the whole team at a restaurant\n\nCompare the three suggestions and say which one you would choose, and why.`,
    tips: [
      "Nói tới cả ba phương án trước khi chốt lựa chọn.",
      "Nêu rõ tiêu chí: chi phí, ý nghĩa lâu dài, ai tham gia được.",
      "Dùng cấu trúc so sánh: more personal than…, the main advantage is…",
    ],
  }),
  paper({
    id: "exam2-speaking-3",
    skill: "speaking",
    title: "Learning outside the classroom",
    subtitle: "Đề số 02 · Part 3 · Phát triển chủ đề",
    level: "B2",
    minutes: 5,
    part: "Part 3 • Topic development",
    text: `Topic: People learn as much outside the classroom as inside it.\n\nDevelop the topic using these suggested ideas:\n• Learning from work or daily tasks\n• Learning from other people\n• Learning online\n• Your own ideas\n\nFollow-up questions:\n1. What can be learned outside a classroom that cannot be taught inside one?\n2. Should employers pay for learning that is not directly about the job?\n3. How can someone tell whether they are really learning or only spending time?`,
    tips: [
      "Phát triển đủ các nhánh gợi ý rồi thêm ý riêng của mình.",
      "Mỗi nhánh cần một lý do và một ví dụ cụ thể.",
      "Chừa thời gian cho ba câu hỏi mở rộng ở cuối.",
    ],
  }),
];
export const fullExam2Lessons: Lesson[] = [
  ...fullListening2,
  ...fullReading2,
  ...fullWriting2,
  ...fullSpeaking2,
];
