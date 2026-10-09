"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Sparkles } from "lucide-react";
import {
  CriteriaList,
  ConsentBox,
  scoreText,
  useAvailable,
} from "./grade-parts";
import { useStudy } from "./study-provider";
import { formatNoteDate } from "./note-box";
import {
  ESTIMATE_LABEL,
  PROMPT_VERSION,
  RUBRIC_VERSION,
} from "@/lib/grading/config";
import {
  GradeRequestError,
  getAiSettings,
  getServerAiSettings,
  requestWritingGrade,
  saveAiSettings,
  subscribeAiSettings,
  type RequestFailure,
} from "@/lib/grading/client";
import { errorSpans, markedPieces } from "@/lib/grading/locate";
import { requirementsFor } from "@/lib/grading/requirements";
import { BAND_LABEL, WRITING_CRITERIA, bandOf } from "@/lib/grading/scores";
import type { WritingBlock } from "@/lib/grading/measures";
import { RUBRIC_SOURCE, WRITING_RUBRIC } from "@/lib/rubric/vstep-3-5";
import { addGrade, inputHashOf, type StoredGrade } from "@/lib/grades";
import { wordCount } from "@/lib/learning";

export const failureText: Record<RequestFailure, (wait?: number) => string> = {
  passcode: () =>
    "Mã chấm bài chưa đúng. Nhập lại mã (người quản lý Mây giữ mã này).",
  "not-configured": () => "Máy chủ chưa bật chức năng chấm bằng AI.",
  rate: (wait) =>
    `Đang có bài khác được chấm hoặc đã dùng hết số lần trong một giờ. Thử lại sau ${wait ?? 60} giây.`,
  model: () =>
    "Dịch vụ chấm đang gặp lỗi. Bài làm của bạn vẫn còn nguyên; thử lại sau ít phút.",
  network: () => "Không kết nối được. Kiểm tra mạng rồi thử lại.",
  aborted: () => "Đã dừng chấm.",
  "bad-reply": () =>
    "Kết quả chấm trả về không đọc được. Thử lại; nếu vẫn vậy, báo người quản lý Mây.",
  invalid: () => "Bài này chưa gửi chấm được (dữ liệu không hợp lệ).",
  "too-large": () => "Bài viết dài quá mức cho phép chấm (8.000 ký tự).",
  "unsupported-audio": () =>
    "Bản ghi có định dạng mà dịch vụ chấm chưa đọc được (thử ghi lại bằng Chrome hoặc Edge).",
  "no-requirements": () =>
    "Đề này chưa có danh sách ý bắt buộc đã được duyệt nên chưa chấm được.",
};

const blockText: Record<WritingBlock, string> = {
  empty: "Chưa có bài làm để chấm.",
  "too-short": "Bài viết ngắn hơn 20 từ nên Mây chưa chấm.",
  "not-english": "Phần lớn bài không phải tiếng Anh nên Mây chưa chấm.",
  copied: "Bài trùng phần lớn với đề hoặc bài mẫu nên Mây chưa chấm.",
};

type Phase =
  | { name: "idle" }
  | { name: "running" }
  | { name: "error"; kind: RequestFailure; wait?: number }
  | { name: "blocked"; reason: WritingBlock };

export type GradePanelProps = {
  /** Where the grade is kept: see `paperGradeId`. */
  id: string;
  task: 1 | 2;
  slotId: string;
  prompt: string;
  text: string;
  /** Model answers for this task, so a copied sample is noticed. */
  samples?: string[];
};

/**
 * "Chấm bằng AI" for one piece of writing: asks once for agreement, sends the
 * writing and the task to the grading server only when the button is pressed,
 * and keeps what comes back with the rest of the study data. It shows nothing
 * at all while the server has grading switched off and nothing was graded.
 */
export function GradePanel({
  id,
  task,
  slotId,
  prompt,
  text,
  samples,
}: GradePanelProps) {
  const { state, update, toast } = useStudy();
  const ai = useSyncExternalStore(
    subscribeAiSettings,
    getAiSettings,
    getServerAiSettings,
  );
  const available = useAvailable();
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [asking, setAsking] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const requirements = useMemo(
    () => requirementsFor(slotId, prompt),
    [slotId, prompt],
  );
  const stored = (state.grades as Record<string, StoredGrade> | undefined)?.[
    id
  ];
  const [currentHash, setCurrentHash] = useState("");
  useEffect(() => {
    let alive = true;
    void inputHashOf({ task, prompt, text }).then(
      (hash) => alive && setCurrentHash(hash),
    );
    return () => {
      alive = false;
    };
  }, [task, prompt, text]);
  useEffect(() => () => abort.current?.abort(), []);

  if (available !== true && !stored) return null;
  const hasText = text.trim().length > 0;
  const stale = stored && currentHash && stored.inputHash !== currentHash;
  const outdated =
    stored &&
    (stored.grade.rubricVersion !== RUBRIC_VERSION ||
      stored.grade.promptVersion !== PROMPT_VERSION);

  async function grade(code: string) {
    setAsking(false);
    setPhase({ name: "running" });
    const controller = new AbortController();
    abort.current = controller;
    try {
      const reply = await requestWritingGrade(
        { task, slotId, prompt, text, samples },
        code,
        controller.signal,
      );
      if (reply.status === "blocked") {
        setPhase({ name: "blocked", reason: reply.reason });
        return;
      }
      const hash = await inputHashOf({ task, prompt, text });
      let failed: string | undefined;
      update((current) => {
        const result = addGrade(current, {
          id,
          at: new Date().toISOString(),
          inputHash: hash,
          grade: reply,
        });
        failed = result.error;
        return result.state;
      });
      if (failed) toast(failed);
      setPhase({ name: "idle" });
    } catch (error) {
      if (error instanceof GradeRequestError) {
        if (error.kind === "aborted") setPhase({ name: "idle" });
        else {
          if (error.kind === "passcode") saveAiSettings({ passcode: "" });
          setPhase({ name: "error", kind: error.kind, wait: error.retryAfter });
        }
      } else setPhase({ name: "error", kind: "network" });
    } finally {
      abort.current = null;
    }
  }

  function start() {
    if (!ai.consent || !ai.passcode) {
      setAsking(true);
      return;
    }
    void grade(ai.passcode);
  }
  function agree(typedCode: string) {
    const code = ai.passcode || typedCode;
    if (!code) return;
    saveAiSettings({ consent: true, passcode: code });
    void grade(code);
  }

  const running = phase.name === "running";
  const headingId = `grade-${id}`;
  return (
    <section className="grade-panel" aria-labelledby={headingId}>
      <h4 id={headingId}>
        <Sparkles size={15} aria-hidden="true" /> Chấm bằng AI
      </h4>
      {!requirements && !stored ? (
        <p className="help-copy">{failureText["no-requirements"]()}</p>
      ) : !hasText && !stored ? (
        <p className="help-copy">{blockText.empty}</p>
      ) : (
        <div className="button-row">
          {requirements && hasText && (
            <button
              type="button"
              className="button secondary small"
              onClick={start}
              disabled={running}
            >
              {stored ? "Chấm lại" : "Chấm bài viết này"}
            </button>
          )}
          {running && (
            <button
              type="button"
              className="button ghost small"
              onClick={() => abort.current?.abort()}
            >
              Dừng
            </button>
          )}
        </div>
      )}
      {asking && !running && (
        <ConsentBox
          what={<strong>đề bài và bài viết này</strong>}
          hasPasscode={Boolean(ai.passcode)}
          onAgree={agree}
          onCancel={() => setAsking(false)}
        />
      )}
      {running && (
        <p role="status" className="help-copy">
          Đang chấm — thường mất một đến ba phút. Bài làm của bạn vẫn nằm yên ở
          máy này.
        </p>
      )}
      {phase.name === "error" && (
        <p role="alert" className="notice error">
          {failureText[phase.kind](phase.wait)}
        </p>
      )}
      {phase.name === "blocked" && (
        <p role="status" className="notice">
          {blockText[phase.reason]}
        </p>
      )}
      {stored && (
        <>
          {stale && (
            <p className="notice" role="status">
              Bài viết đã thay đổi sau lần chấm này, nên kết quả dưới đây có thể
              không còn đúng.
            </p>
          )}
          {outdated && (
            <p className="notice" role="status">
              Lần chấm này dùng phiên bản thang hoặc lời nhắc cũ; chấm lại để
              dùng bản mới.
            </p>
          )}
          <GradeResult stored={stored} text={text} />
        </>
      )}
    </section>
  );
}

export function GradeResult({
  stored,
  text,
}: {
  stored: StoredGrade;
  text: string;
}) {
  const grade = stored.grade;
  const spans = useMemo(
    () =>
      errorSpans(
        text,
        grade.errors.map((error) => error.quote),
      ),
    [text, grade.errors],
  );
  const pieces = useMemo(() => markedPieces(text, spans), [text, spans]);
  const official = RUBRIC_SOURCE.official;
  return (
    <div className="grade-result">
      <p className="grade-estimate">{ESTIMATE_LABEL}</p>
      {!official && grade.rubricVersion.startsWith("cefr-fallback") && (
        <p className="help-copy">Thang chấm: {RUBRIC_SOURCE.label}.</p>
      )}
      {grade.taskScore !== null ? (
        <p className="grade-total">
          Điểm bài (ước lượng): <strong>{scoreText(grade.taskScore)}/10</strong>{" "}
          · {BAND_LABEL[bandOf(grade.taskScore)]}
        </p>
      ) : (
        <p className="help-copy">
          Chưa hiện điểm số: các tiêu chí này chưa được đối chiếu với người
          chấm, nên Mây chỉ đưa nhận xét, ý còn thiếu và lỗi trích từ chính bài
          của bạn.
        </p>
      )}
      {grade.lowConfidence && (
        <p className="notice" role="status">
          Các lần chấm độc lập chênh nhau khá nhiều ở một vài tiêu chí, nên độ
          tin cậy thấp.
        </p>
      )}
      <CriteriaList
        keys={WRITING_CRITERIA}
        rubric={WRITING_RUBRIC}
        criteria={grade.criteria}
      />
      <h5>Các ý đề yêu cầu</h5>
      <ul className="grade-requirements">
        {grade.requirements.map((requirement) => (
          <li key={requirement.id}>
            <span aria-hidden="true">
              {requirement.met === "yes"
                ? "✓"
                : requirement.met === "partly"
                  ? "~"
                  : "✗"}
            </span>{" "}
            {requirement.text}{" "}
            <span className="pill">
              {requirement.met === "yes"
                ? "đã đáp"
                : requirement.met === "partly"
                  ? "mới nhắc qua"
                  : "chưa thấy"}
            </span>
          </li>
        ))}
      </ul>
      <h5>Lỗi tìm thấy ({grade.errors.length})</h5>
      {grade.errors.length === 0 ? (
        <p className="help-copy">
          Không có lỗi nào được xác nhận qua các lần chấm.
        </p>
      ) : (
        <>
          <p
            className="grade-essay"
            lang="en"
            aria-label="Bài viết, lỗi được tô"
          >
            {pieces.map((piece, i) =>
              piece.error === undefined ? (
                <span key={i}>{piece.text}</span>
              ) : (
                <mark key={i} className="grade-err">
                  {piece.text}
                  <sup>{piece.error + 1}</sup>
                </mark>
              ),
            )}
          </p>
          <ol className="grade-errors">
            {grade.errors.map((error, i) => (
              <li key={i} value={i + 1}>
                <span lang="en">
                  “{error.quote}” → “{error.correction}”
                </span>
                <span className="pill">{error.type}</span>
                <p className="help-copy">{error.explanation}</p>
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="grade-meta">
        Chấm {formatNoteDate(stored.at)} · {grade.runs} lần chấm độc lập · mô
        hình {grade.model} · thang {grade.rubricVersion} · lời nhắc{" "}
        {grade.promptVersion} · {grade.droppedQuotes} câu trích không có trong
        bài đã bị loại · {wordCount(text)} từ
      </p>
    </div>
  );
}
