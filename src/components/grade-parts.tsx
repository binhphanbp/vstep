"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { gradingAvailable } from "@/lib/grading/client";
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
                <span className="pill">
                  {scoreText(item.score)}/10
                  {item.low !== item.high
                    ? ` (các lần chấm: ${scoreText(item.low)}–${scoreText(item.high)})`
                    : ""}
                </span>
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
