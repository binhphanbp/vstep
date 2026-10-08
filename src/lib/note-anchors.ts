import type { Lesson, Question } from "./content";
import type { NoteAnchor } from "./learning";
import type { NoteTarget } from "./notes";
import type { Paper, PaperItem, PaperSlot } from "./papers";

/**
 * What a note says about where it was written, built in one place so the
 * paper review, the retry drill, the lesson result and the mistakes notebook
 * all name a question the same way. The same words are what the notebook
 * filters and reads aloud, and they are kept on the note itself: the notebook
 * must open with no network and still be right about a paper that has since
 * been withdrawn.
 */
export type NotePlace = { target: NoteTarget; anchor: NoteAnchor };

const SECTION_NAMES = ["Nghe", "Đọc", "Viết", "Nói"] as const;
const SECTION_SKILLS = ["listening", "reading", "writing", "speaking"] as const;

export function paperGroup(paper: Pick<Paper, "id">) {
  return paper.id === "review-1309" ? "Review 13/09" : `Đề ${paper.id}`;
}

/** One question of an imported paper. */
export function paperItemPlace(
  paper: Pick<Paper, "id" | "version">,
  stage: number,
  slot: Pick<PaperSlot, "part">,
  item: Pick<PaperItem, "id" | "number" | "text">,
): NotePlace {
  const group = paperGroup(paper);
  return {
    target: { source: "paper", sourceId: paper.id, itemId: item.id },
    anchor: {
      source: "paper",
      sourceId: paper.id,
      version: paper.version,
      skill: SECTION_SKILLS[stage],
      group,
      label: `${group} · ${SECTION_NAMES[stage]} · ${slot.part} · Câu ${item.number}`,
      itemId: item.id,
      excerpt: item.text,
    },
  };
}

/** A Writing task or a Speaking part: they have no numbered questions. */
export function paperSlotPlace(
  paper: Pick<Paper, "id" | "version">,
  stage: number,
  slot: Pick<PaperSlot, "id" | "part" | "title" | "prompt">,
): NotePlace {
  const group = paperGroup(paper);
  return {
    target: { source: "paper", sourceId: paper.id, itemId: slot.id },
    anchor: {
      source: "paper",
      sourceId: paper.id,
      version: paper.version,
      skill: SECTION_SKILLS[stage],
      group,
      label: `${group} · ${SECTION_NAMES[stage]} · ${slot.part} · ${slot.title}`,
      itemId: slot.id,
      excerpt: slot.prompt
        .replace(/^#+\s*/gm, "")
        .replace(/\s+/g, " ")
        .trim(),
    },
  };
}

/** The whole paper: what to remember from a sitting, not from one question. */
export function paperWholePlace(
  paper: Pick<Paper, "id" | "version">,
): NotePlace {
  const group = paperGroup(paper);
  return {
    target: { source: "paper", sourceId: paper.id },
    anchor: {
      source: "paper",
      sourceId: paper.id,
      version: paper.version,
      group,
      label: `${group} · cả đề`,
    },
  };
}

/**
 * One question of a lesson, numbered by its place in the lesson: the mistakes
 * notebook and the timed exam list questions in an order of their own, and a
 * note that says "Câu 3" must mean the same question wherever it is read.
 */
export function lessonQuestionPlace(
  lesson: Pick<Lesson, "id" | "version" | "skill" | "title"> & {
    questions: Pick<Question, "id">[];
  },
  question: Pick<Question, "id" | "text">,
): NotePlace {
  const number =
    lesson.questions.findIndex((entry) => entry.id === question.id) + 1;
  return {
    target: { source: "lesson", sourceId: lesson.id, itemId: question.id },
    anchor: {
      source: "lesson",
      sourceId: lesson.id,
      version: lesson.version,
      skill: lesson.skill,
      group: lesson.title,
      label: number ? `${lesson.title} · Câu ${number}` : lesson.title,
      itemId: question.id,
      excerpt: question.text,
    },
  };
}

export function lessonWholePlace(
  lesson: Pick<Lesson, "id" | "version" | "skill" | "title">,
): NotePlace {
  return {
    target: { source: "lesson", sourceId: lesson.id },
    anchor: {
      source: "lesson",
      sourceId: lesson.id,
      version: lesson.version,
      skill: lesson.skill,
      group: lesson.title,
      label: `${lesson.title} · cả bài`,
    },
  };
}
