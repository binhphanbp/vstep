import type { GradeProgress } from "./generate";

export type Progress = GradeProgress | { stage: "started" } | null;

/** What the grading is doing now, in words the learner can follow. */
export function progressText(progress: Progress) {
  if (!progress || progress.stage === "started")
    return "Đã gửi, đang chờ máy chủ bắt đầu…";
  if (progress.stage === "transcribe")
    return `Đang nghe và chép lời: xong ${progress.done}/${progress.total} phần.`;
  if (progress.stage === "extra")
    return `Các lần chấm chưa thống nhất nên đang chấm thêm: xong ${progress.done}/${progress.total} lần.`;
  return progress.done === 0
    ? `Đang chấm độc lập ${progress.total} lần cùng lúc…`
    : `Đã xong ${progress.done}/${progress.total} lần chấm độc lập.`;
}

export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
