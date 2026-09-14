/**
 * Mây's own self-check criteria for Writing and Speaking.
 *
 * **These are not the examiner's band descriptors.** The official rubric of the
 * body running the exam is not available to this project, so nothing here is
 * called a rubric or a score: it is a checklist written against what each task
 * asks for, and the learner rates herself on it. If the real descriptors are
 * supplied later, they replace this file rather than sitting beside it.
 *
 * Each criterion says what to look for concretely, because "coherence" is not
 * something a learner can check her own paragraph against, while "each
 * paragraph opens with its own point" is.
 */
export type Criterion = {
  id: string;
  /** What is being looked at. */
  label: string;
  /** The question she asks of her own work. */
  question: string;
  /** How to tell, in one concrete move. */
  look: string;
};
export type CriteriaGroup = {
  key: string;
  title: string;
  items: Criterion[];
};
const writingTask1: Criterion[] = [
  {
    id: "w1-task",
    label: "Đủ yêu cầu của đề",
    question: "Mình đã đáp lại từng yêu cầu trong đề chưa?",
    look: "Đếm số gạch đầu dòng trong đề, rồi chỉ đúng câu trong bài đáp lại từng gạch.",
  },
  {
    id: "w1-shape",
    label: "Bố cục và giọng điệu thư",
    question: "Thư có mở, thân, kết và giọng phù hợp với người nhận chưa?",
    look: "Tìm lời chào, lý do viết, phần đề nghị hoặc yêu cầu, và lời kết.",
  },
  {
    id: "w1-language",
    label: "Ngữ pháp và chính tả",
    question: "Mình đã soát lại thì, mạo từ, số ít/số nhiều chưa?",
    look: "Đọc lại từng câu, kiểm tra động từ chính có khớp chủ ngữ.",
  },
  {
    id: "w1-length",
    label: "Độ dài",
    question: "Bài đã đạt số từ tối thiểu chưa?",
    look: "Xem ô đếm từ ngay trên khung viết.",
  },
];
const writingTask2: Criterion[] = [
  {
    id: "w2-position",
    label: "Quan điểm rõ ràng",
    question: "Người đọc biết mình nghĩ gì sau khi đọc đoạn mở đầu chưa?",
    look: "Chỉ ra một câu nói thẳng quan điểm, không phải câu nhắc lại đề.",
  },
  {
    id: "w2-structure",
    label: "Mỗi đoạn một ý",
    question: "Từng đoạn có một ý chính riêng và câu mở đoạn chưa?",
    look: "Đọc câu đầu mỗi đoạn; nếu hai đoạn nói cùng một điều thì gộp lại.",
  },
  {
    id: "w2-support",
    label: "Lý do và ví dụ",
    question: "Mỗi ý có lý do hoặc ví dụ cụ thể, không chỉ nói chung chung?",
    look: "Với mỗi ý, tìm câu bắt đầu bằng “vì”, “ví dụ” hoặc một con số, một tình huống thật.",
  },
  {
    id: "w2-language",
    label: "Câu và từ nối",
    question: "Câu dài ngắn xen kẽ và từ nối dùng đúng chỗ chưa?",
    look: "Tìm một câu ghép và một câu ngắn; kiểm tra “however”, “therefore” có đúng nghĩa.",
  },
  {
    id: "w2-length",
    label: "Độ dài",
    question: "Bài đã đạt số từ tối thiểu chưa?",
    look: "Xem ô đếm từ ngay trên khung viết.",
  },
];
const speakingPart1: Criterion[] = [
  {
    id: "s1-answer",
    label: "Trả lời trực tiếp",
    question: "Mình trả lời thẳng câu hỏi rồi mới mở rộng chưa?",
    look: "Nghe lại mười giây đầu mỗi câu: có câu trả lời trực tiếp ở đó không.",
  },
  {
    id: "s1-detail",
    label: "Ý mở rộng",
    question: "Mỗi câu có thêm một lý do hoặc một ví dụ chưa?",
    look: "Đếm số câu chỉ dài một dòng; đó là những câu cần thêm ý.",
  },
  {
    id: "s1-delivery",
    label: "Cách nói",
    question: "Mình nói rõ, có ngắt nghỉ, không đọc bài soạn sẵn chưa?",
    look: "Nghe lại và để ý chỗ nào đang đọc thay vì đang nói.",
  },
  {
    id: "s1-review",
    label: "Tự nghe lại",
    question: "Mình đã nghe lại bản ghi và chọn ra một chỗ cần sửa chưa?",
    look: "Ghi lại một câu cụ thể muốn nói lại, không phải cảm giác chung.",
  },
];
const speakingPart2: Criterion[] = [
  {
    id: "s2-options",
    label: "Nói đủ các phương án",
    question: "Mình đã nhắc tới cả các phương án trong đề trước khi chọn chưa?",
    look: "Đếm số phương án trong đề và số phương án mình thực sự nói đến.",
  },
  {
    id: "s2-choice",
    label: "Lý do chọn",
    question: "Lý do chọn có được nêu rõ và so sánh với phương án khác chưa?",
    look: "Tìm một câu dạng “tốt hơn … vì …” trong phần nói của mình.",
  },
  {
    id: "s2-language",
    label: "Cấu trúc so sánh",
    question: "Mình có dùng được câu so sánh hoặc câu điều kiện chưa?",
    look: "Nghe lại và tìm “more … than”, “the best option”, “if we …”.",
  },
  {
    id: "s2-review",
    label: "Tự nghe lại",
    question: "Mình đã nghe lại và chọn ra một chỗ cần sửa chưa?",
    look: "Ghi lại một câu cụ thể muốn nói lại.",
  },
];
const speakingPart3: Criterion[] = [
  {
    id: "s3-coverage",
    label: "Phát triển đủ nhánh",
    question:
      "Mình đã nói tới các gợi ý trong đề và thêm ý của riêng mình chưa?",
    look: "Đếm số gợi ý trong đề; đánh dấu gợi ý nào mình bỏ qua.",
  },
  {
    id: "s3-depth",
    label: "Chiều sâu từng ý",
    question: "Mỗi nhánh có lý do và ví dụ chưa?",
    look: "Với mỗi nhánh, tìm một câu giải thích và một câu ví dụ.",
  },
  {
    id: "s3-followup",
    label: "Câu hỏi mở rộng",
    question: "Mình đã trả lời các câu hỏi mở rộng ở cuối đề chưa?",
    look: "Đọc lại ba câu hỏi cuối đề và kiểm tra mình có nói về từng câu.",
  },
  {
    id: "s3-delivery",
    label: "Cách nói",
    question: "Mình nói liền mạch, ngắt nghỉ hợp lý chưa?",
    look: "Nghe lại và để ý những quãng lặng dài hơn ba giây.",
  },
];
/** The self-check for a lesson, or null for lessons that are marked by answers. */
export function criteriaFor(lesson: {
  id: string;
  skill: string;
  part: string;
}): CriteriaGroup | null {
  if (lesson.skill === "writing")
    return lesson.id === "writing-essay"
      ? { key: "w2", title: "Tự kiểm tra bài luận", items: writingTask2 }
      : { key: "w1", title: "Tự kiểm tra bài thư", items: writingTask1 };
  if (lesson.skill !== "speaking") return null;
  if (lesson.part.includes("Part 2"))
    return { key: "s2", title: "Tự kiểm tra phần 2", items: speakingPart2 };
  if (lesson.part.includes("Part 3"))
    return { key: "s3", title: "Tự kiểm tra phần 3", items: speakingPart3 };
  return { key: "s1", title: "Tự kiểm tra phần 1", items: speakingPart1 };
}
/** Every criterion in the app, for looking one up by id from history. */
export const allCriteria: Criterion[] = [
  ...writingTask1,
  ...writingTask2,
  ...speakingPart1,
  ...speakingPart2,
  ...speakingPart3,
];
export const selfCheckLevels = [
  { value: 1, label: "Chưa đạt" },
  { value: 2, label: "Tạm ổn" },
  { value: 3, label: "Tự tin" },
] as const;
/** Said in the interface wherever the self-check appears. */
export const SELF_CHECK_DISCLAIMER =
  "Đây là tiêu chí tự kiểm tra của Mây, không phải thang chấm của hội đồng thi. Kết quả tự đánh giá không quy đổi thành điểm.";
