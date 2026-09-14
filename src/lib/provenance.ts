/**
 * Who wrote each lesson, and whether anyone has checked it.
 *
 * The material is written by the app's author and has not been validated by a
 * VSTEP teacher. That was true before this file and stated only in the project
 * documents, where the learner never sees it — so a lesson could carry a "B1"
 * label on screen with nothing saying the label is an authoring intention
 * rather than a calibration.
 *
 * The status lives here rather than in `content.ts` so that a review changes
 * provenance without touching a published lesson, which would otherwise bump
 * its version and throw away the review schedule attached to it.
 */
export type ReviewStatus = "self" | "reviewed";
export type Provenance = {
  /** Who wrote the material. */
  author: string;
  status: ReviewStatus;
  /** Only ever set together with a date, and only by a real person. */
  reviewer?: string;
  /** ISO date of the review. */
  reviewedOn?: string;
  /** Where the material came from and what may be done with it. */
  source: string;
};
/** Everything in the bank today: written for this app, not yet validated. */
export const defaultProvenance: Provenance = {
  author: "Tự biên soạn cho Mây",
  status: "self",
  source:
    "Ngữ liệu viết riêng cho ứng dụng này, không trích từ đề thi hay tài liệu có bản quyền.",
};
/**
 * Overrides by lesson id. Empty today and that is the honest state: nothing in
 * the bank has been through a teacher. A row may be added only when a named
 * person has really read the lesson on a real date.
 */
export const provenanceById: Record<string, Provenance> = {};
export function provenanceFor(lessonId: string): Provenance {
  return provenanceById[lessonId] ?? defaultProvenance;
}
export function provenanceLabel(provenance: Provenance): string {
  return provenance.status === "reviewed"
    ? `Đã được ${provenance.reviewer} thẩm định ngày ${provenance.reviewedOn}`
    : "Chưa qua thẩm định của giáo viên";
}
