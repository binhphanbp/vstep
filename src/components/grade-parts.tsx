"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { gradingAvailable } from "@/lib/grading/client";
import {
  clock,
  progressText,
  type Progress,
} from "@/lib/grading/progress-text";

export type { Progress };
import { BAND_LABEL, type Band } from "@/lib/grading/scores";
import type { Descriptor } from "@/lib/rubric/vstep-3-5";

/** Is grading switched on at the server? null until it has answered. */
export function useAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void gradingAvailable().then((value) => alive && setAvailable(value));
    return () => {
      alive = false;
    };
  }, []);
  return available;
}

/** One sentence pointing at the grading panel, only while the server can grade. */
export function AiGradeHint() {
  const available = useAvailable();
  return available
    ? " Muốn có điểm ước lượng thì bấm “Chấm bằng AI” ở khung bên dưới."
    : null;
}

export const scoreText = (value: number) => String(value).replace(".", ",");

/**
 * The agreement a learner gives once before anything is sent: what goes, where
 * it goes, and that nothing goes unless she presses the button. `what` names
 * the material being sent; the passcode field shows only until one is saved.
 */
export function ConsentBox({
  what,
  hasPasscode,
  onAgree,
  onCancel,
}: {
  what: React.ReactNode;
  hasPasscode: boolean;
  onAgree: (typedCode: string) => void;
  onCancel: () => void;
}) {
  const [typedCode, setTypedCode] = useState("");
  return (
    <form
      className="grade-consent"
      onSubmit={(event) => {
        event.preventDefault();
        onAgree(typedCode.trim());
      }}
    >
      <p>
        Khi bạn bấm đồng ý, {what} sẽ được gửi tới máy chủ của Mây rồi tới
        Google (Gemini, gói trả phí: Google không dùng nội dung gửi lên để cải
        thiện sản phẩm của họ) để chấm. Không gửi tên, ghi chú hay dữ liệu nào
        khác. Chỉ gửi khi bạn bấm nút chấm; tắt lúc nào cũng được ở{" "}
        <Link href="/settings">Cài đặt</Link>.
      </p>
      {!hasPasscode && (
        <label>
          Mã chấm bài (người quản lý Mây đưa)
          <input
            type="password"
            autoComplete="off"
            value={typedCode}
            onChange={(event) => setTypedCode(event.target.value)}
          />
        </label>
      )}
      <div className="button-row">
        <button
          type="submit"
          className="button primary small"
          disabled={!hasPasscode && !typedCode.trim()}
        >
          Đồng ý và chấm
        </button>
        <button type="button" className="button ghost small" onClick={onCancel}>
          Để sau
        </button>
      </div>
    </form>
  );
}

type CriterionItem = {
  score: number;
  low: number;
  high: number;
  unsure: boolean;
  band: Band;
  evidence: string[];
  whyNotHigher: string;
  whyNotLower: string;
  toRaise: string;
  showScore: boolean;
  validated?: boolean;
};

/** One row per criterion: the mark (or why there is none), the nearest level, and the reasons. */
export function CriteriaList({
  keys,
  rubric,
  criteria,
}: {
  keys: readonly string[];
  rubric: Record<string, { label: string; scale: Record<Band, Descriptor> }>;
  criteria: Record<string, CriterionItem>;
}) {
  return (
    <ul className="grade-criteria">
      {keys.map((key) => {
        const item = criteria[key];
        const entry = rubric[key];
        return (
          <li key={key}>
            <div className="grade-criterion-head">
              <strong>{entry.label}</strong>
              {item.showScore ? (
                <>
                  <span className="pill">
                    {scoreText(item.score)}/10
                    {item.low !== item.high
                      ? ` (các lần chấm: ${scoreText(item.low)}–${scoreText(item.high)})`
                      : ""}
                  </span>
                </>
              ) : (
                <span className="pill">chưa hiện điểm</span>
              )}
              {item.unsure && <span className="pill">độ tin cậy thấp</span>}
            </div>
            <p className="help-copy">
              Gần mức nào: {BAND_LABEL[item.band]} — {entry.scale[item.band].vi}
            </p>
            <details>
              <summary>Vì sao và làm gì để lên mức</summary>
              {item.evidence.length > 0 && (
                <ul>
                  {item.evidence.map((quote, i) => (
                    <li key={i} lang="en">
                      “{quote}”
                    </li>
                  ))}
                </ul>
              )}
              <p>
                <strong>Chưa cao hơn vì:</strong> {item.whyNotHigher}
              </p>
              <p>
                <strong>Không thấp hơn vì:</strong> {item.whyNotLower}
              </p>
              <p>
                <strong>Để lên thêm nửa bậc:</strong> {item.toRaise}
              </p>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * What the screen shows while a grading runs, which takes minutes: a moving
 * spinner, the time so far, a bar that fills as stages finish, and what is
 * happening. A button that only goes grey looks the same as a frozen page.
 */
export function Waiting({
  progress,
  what,
  onStop,
}: {
  progress: Progress;
  /** "bài viết" or "bản ghi": what stays safe on this device. */
  what: string;
  onStop: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(
      () => setSeconds(Math.round((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);
  const known =
    progress && progress.stage !== "started" && progress.total > 0
      ? progress
      : null;
  return (
    <div className="grade-wait" aria-busy="true">
      <div className="grade-wait-head">
        <span className="grade-spinner" aria-hidden="true" />
        <strong>Đang chấm</strong>
        <span className="grade-clock" aria-hidden="true">
          {clock(seconds)}
        </span>
        <button type="button" className="button ghost small" onClick={onStop}>
          Dừng
        </button>
      </div>
      <progress
        className="grade-bar"
        max={known?.total}
        value={known?.done}
        aria-label="Tiến độ chấm"
      />
      <p role="status" aria-live="polite">
        {progressText(progress)}
      </p>
      <p className="help-copy">
        Thường mất một đến ba phút. Cứ để trang này mở; {what} của bạn vẫn nằm
        yên ở máy này.
        {seconds > 240
          ? " Đã lâu hơn thường lệ; nếu quá năm phút máy chủ sẽ tự dừng và báo lỗi."
          : ""}
      </p>
    </div>
  );
}

/** The error line plus, below it, a short technical note she can read out if it keeps happening. */
export function ErrorNotice({
  text,
  detail,
}: {
  text: string;
  detail?: string;
}) {
  return (
    <div role="alert" className="notice error">
      <p>{text}</p>
      {detail && <p className="grade-detail">Chi tiết kỹ thuật: {detail}</p>}
    </div>
  );
}

/**
 * Said once above any mark that no examiner comparison has validated: what the
 * number is and is not, so it is read as an estimate to follow progress by.
 */
export function EstimateNotice({
  criteria,
}: {
  criteria: Record<string, { showScore: boolean; validated?: boolean }>;
}) {
  const unchecked = Object.values(criteria).some(
    (item) => item.showScore && item.validated !== true,
  );
  if (!unchecked) return null;
  return (
    <p className="notice" role="note">
      Các điểm này <strong>chưa được so với điểm của người chấm</strong>, nên có
      thể lệch so với điểm thi thật. Dùng để theo dõi mình tiến bộ và biết cần
      sửa gì, đừng coi là điểm dự đoán chắc chắn.
    </p>
  );
}
