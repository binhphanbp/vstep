/**
 * The question bank cut into documents a teacher can actually mark.
 *
 * "Nhờ giáo viên duyệt học liệu" had no starting point in the app: the bank
 * lives in TypeScript, and nobody is going to read `content.ts`. These groups
 * are the printable unit — one sitting's worth of marking each, so a reviewer
 * can take Reading today and Listening next week rather than facing all 42
 * lessons at once.
 */
import { lessons, type Lesson, type Skill } from "./content";
import { fullExamLessons } from "./full-exam-content";
import { fullExam2Lessons } from "./full-exam-02";

export type BankGroup = {
  id: string;
  title: string;
  /** What this document is, said to the person marking it. */
  blurb: string;
  lessons: Lesson[];
};

const bySkill = (skill: Skill) => lessons.filter((l) => l.skill === skill);

export const bankGroups: BankGroup[] = [
  {
    id: "reading",
    title: "Thư viện Đọc",
    blurb: "Các bài Đọc ngắn dùng để luyện hằng ngày.",
    lessons: bySkill("reading"),
  },
  {
    id: "listening",
    title: "Thư viện Nghe",
    blurb:
      "Các bài Nghe ngắn. Phần chữ in ở đây là lời thoại, khi luyện thì Gùa chỉ được nghe.",
    lessons: bySkill("listening"),
  },
  {
    id: "writing",
    title: "Thư viện Viết",
    blurb: "Đề Viết và bài mẫu tự biên soạn kèm theo mỗi đề.",
    lessons: bySkill("writing"),
  },
  {
    id: "speaking",
    title: "Thư viện Nói",
    blurb: "Đề Nói và bài mẫu tự biên soạn kèm theo mỗi đề.",
    lessons: bySkill("speaking"),
  },
  {
    id: "full",
    title: "Đề đủ cấu trúc 01",
    blurb: "Đề dùng để đo tiến bộ, gồm phần Đọc và phần Nghe.",
    lessons: fullExamLessons,
  },
  {
    id: "full2",
    title: "Đề đủ cấu trúc 02",
    blurb: "Đề thứ hai, dùng để so sánh với lần thi thử trước.",
    lessons: fullExam2Lessons,
  },
];

export const bankGroup = (id: string) =>
  bankGroups.find((group) => group.id === id);

/** Every question in the bank counted once, for the documents that quote it. */
export const bankQuestionCount = bankGroups.reduce(
  (total, group) =>
    total + group.lessons.reduce((sum, l) => sum + l.questions.length, 0),
  0,
);
