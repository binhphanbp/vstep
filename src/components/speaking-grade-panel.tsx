"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";
import {
  ConsentBox,
  CriteriaList,
  scoreText,
  useAvailable,
} from "./grade-parts";
import { failureText } from "./grade-panel";
import { formatNoteDate } from "./note-box";
import { useStudy } from "./study-provider";
import {
  ESTIMATE_LABEL,
  PROMPT_VERSION,
  RUBRIC_VERSION,
} from "@/lib/grading/config";
import {
  GradeRequestError,
  getAiSettings,
  getServerAiSettings,
  requestSpeakingGrade,
  saveAiSettings,
  subscribeAiSettings,
  type RequestFailure,
  type SpeakingPartRequest,
} from "@/lib/grading/client";
import { AUDIO_LIMITS } from "@/lib/grading/audio-limits";
import { BAND_LABEL, SPEAKING_CRITERIA, bandOf } from "@/lib/grading/scores";
import { RUBRIC_SOURCE, SPEAKING_RUBRIC } from "@/lib/rubric/vstep-3-5";
import {
  addGrade,
  isSpeakingGrade,
  paperSpeakingGradeId,
  speakingInputHashOf,
  type StoredSpeakingGrade,
} from "@/lib/grades";
import { getRecording, recordingSeconds } from "@/lib/recordings";

export type SpeakingSlot = {
  id: string;
  part: string;
  title: string;
  prompt: string;
  cues: string[];
};

type Phase =
  | { name: "idle" }
  | { name: "running" }
  | { name: "problem"; text: string }
  | { name: "error"; kind: RequestFailure; wait?: number }
  | { name: "silent" };

const recordingId = (runId: string, slotId: string) =>
  `paper-${runId}-${slotId}`;

const questionsOf = (slot: SpeakingSlot) =>
  [slot.prompt, ...slot.cues].join("\n").slice(0, AUDIO_LIMITS.prompt);

/**
 * "Chấm bằng AI" for the whole Speaking test of a finished sitting: the
 * recordings of every part she answered go together, as an examiner hears the
 * whole test before marking. Nothing is sent until the button is pressed.
 */
export function SpeakingGradePanel({
  runId,
  slots,
  spoken,
}: {
  runId: string;
  slots: SpeakingSlot[];
  spoken: string[];
}) {
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
  const id = paperSpeakingGradeId(runId);
  const mine = slots.filter((slot) => spoken.includes(slot.id));
  const found = (state.grades as Record<string, unknown> | undefined)?.[id] as
    StoredSpeakingGrade | undefined;
  const stored = found && isSpeakingGrade(found) ? found : undefined;
  const [currentHash, setCurrentHash] = useState("");
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const metas = await Promise.all(
          mine.map(async (slot) => {
            const take = await getRecording(recordingId(runId, slot.id));
            return take
              ? {
                  id: slot.id,
                  prompt: questionsOf(slot),
                  savedAt: take.savedAt,
                  bytes: take.blob.size,
                }
              : null;
          }),
        );
        if (alive && metas.every(Boolean))
          setCurrentHash(
            await speakingInputHashOf(
              metas as NonNullable<(typeof metas)[number]>[],
            ),
          );
      } catch {
        // The recording store cannot be read: no staleness check, nothing else changes.
      }
    })();
    return () => {
      alive = false;
    };
    // `mine` is rebuilt each render; its content is what these three describe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, slots, spoken]);
  useEffect(() => () => abort.current?.abort(), []);

  if (mine.length === 0 || (available !== true && !stored)) return null;
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
      const parts: SpeakingPartRequest[] = [];
      const metas = [];
      for (const slot of mine) {
        const take = await getRecording(recordingId(runId, slot.id));
        if (!take) {
          setPhase({
            name: "problem",
            text: `Không tìm thấy bản ghi của “${slot.part}” trên máy này (bản ghi chỉ nằm ở máy đã ghi), nên chưa chấm được.`,
          });
          return;
        }
        const seconds = await recordingSeconds(take.blob);
        if (seconds === null) {
          setPhase({
            name: "problem",
            text: `Không đọc được độ dài bản ghi của “${slot.part}”; thử ghi lại phần này.`,
          });
          return;
        }
        parts.push({
          id: slot.id,
          title: `${slot.part} · ${slot.title}`,
          prompt: questionsOf(slot),
          durationSeconds: Math.min(AUDIO_LIMITS.seconds, Math.max(1, seconds)),
          audio: take.blob,
        });
        metas.push({
          id: slot.id,
          prompt: questionsOf(slot),
          savedAt: take.savedAt,
          bytes: take.blob.size,
        });
      }
      const total = parts.reduce((sum, p) => sum + p.audio.size, 0);
      if (total > AUDIO_LIMITS.bytes) {
        setPhase({
          name: "problem",
          text: `Các bản ghi nặng ${(total / 1e6).toFixed(1)} MB, quá giới hạn ${(AUDIO_LIMITS.bytes / 1e6).toFixed(1)} MB của một lần gửi. Bản ghi cũ được ghi ở chất lượng cao hơn; ghi lại phần nói (bản mới nhẹ hơn nhiều) rồi chấm.`,
        });
        return;
      }
      const reply = await requestSpeakingGrade(parts, code, controller.signal);
      if (reply.status === "blocked") {
        setPhase({ name: "silent" });
        return;
      }
      const hash = await speakingInputHashOf(metas);
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
      } else
        setPhase({
          name: "problem",
          text: "Không đọc được bản ghi trên máy này. Thử tải lại trang.",
        });
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
      <h3 id={headingId}>
        <Sparkles size={15} aria-hidden="true" /> Chấm phần Nói bằng AI
      </h3>
      <p className="help-copy">
        Mây gửi bản ghi của cả {mine.length} phần bạn đã nói để chấm như một bài
        thi Nói. Phát âm do AI nghe và ước lượng, chưa được đối chiếu với người
        chấm, nên chưa hiện điểm cho tiêu chí này.
      </p>
      <div className="button-row">
        <button
          type="button"
          className="button secondary small"
          onClick={start}
          disabled={running}
        >
          {stored ? "Chấm lại phần Nói" : "Chấm phần Nói"}
        </button>
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
      {asking && !running && (
        <ConsentBox
          what={<strong>bản ghi âm phần Nói của lượt này</strong>}
          hasPasscode={Boolean(ai.passcode)}
          onAgree={agree}
          onCancel={() => setAsking(false)}
        />
      )}
      {running && (
        <p role="status" className="help-copy">
          Đang nghe và chấm — thường mất vài phút. Bản ghi của bạn vẫn nằm yên ở
          máy này.
        </p>
      )}
      {phase.name === "problem" && (
        <p role="alert" className="notice error">
          {phase.text}
        </p>
      )}
      {phase.name === "error" && (
        <p role="alert" className="notice error">
          {failureText[phase.kind](phase.wait)}
        </p>
      )}
      {phase.name === "silent" && (
        <p role="status" className="notice">
          Hầu như không nghe thấy lời nói trong các bản ghi nên Mây chưa chấm.
        </p>
      )}
      {stored && (
        <>
          {stale && (
            <p className="notice" role="status">
              Bản ghi đã được ghi lại sau lần chấm này, nên kết quả dưới đây có
              thể không còn đúng.
            </p>
          )}
          {outdated && (
            <p className="notice" role="status">
              Lần chấm này dùng phiên bản thang hoặc lời nhắc cũ; chấm lại để
              dùng bản mới.
            </p>
          )}
          <SpeakingResult stored={stored} slots={slots} />
        </>
      )}
    </section>
  );
}

export function SpeakingResult({
  stored,
  slots,
}: {
  stored: StoredSpeakingGrade;
  slots: SpeakingSlot[];
}) {
  const grade = stored.grade;
  return (
    <div className="grade-result">
      <p className="grade-estimate">{ESTIMATE_LABEL}</p>
      {!RUBRIC_SOURCE.official &&
        grade.rubricVersion.startsWith("cefr-fallback") && (
          <p className="help-copy">Thang chấm: {RUBRIC_SOURCE.label}.</p>
        )}
      {grade.speakingScore !== null ? (
        <p className="grade-total">
          Điểm Nói (ước lượng):{" "}
          <strong>{scoreText(grade.speakingScore)}/10</strong> ·{" "}
          {BAND_LABEL[bandOf(grade.speakingScore)]}
          <span className="help-copy">
            {" "}
            Tính bằng trung bình năm tiêu chí; chưa tìm thấy văn bản chính thức
            nói cách cộng điểm Nói.
          </span>
        </p>
      ) : (
        <p className="help-copy">
          Chưa hiện điểm số: các tiêu chí này chưa được đối chiếu với người
          chấm, nên Mây chỉ đưa nhận xét và những câu trích từ chính lời nói của
          bạn.
        </p>
      )}
      {grade.lowConfidence && (
        <p className="notice" role="status">
          Các lần chấm độc lập chênh nhau khá nhiều ở một vài tiêu chí, nên độ
          tin cậy thấp.
        </p>
      )}
      <CriteriaList
        keys={SPEAKING_CRITERIA}
        rubric={SPEAKING_RUBRIC}
        criteria={grade.criteria}
      />
      <h5>Bản chép lời (do máy nghe và chép)</h5>
      {grade.parts.map((part) => {
        const slot = slots.find((candidate) => candidate.id === part.id);
        return (
          <details key={part.id}>
            <summary>{slot ? `${slot.part} · ${slot.title}` : part.id}</summary>
            <p className="grade-essay" lang="en">
              {part.transcript || "(không nghe thấy lời nói)"}
            </p>
            {part.timesPlausible && part.fluency ? (
              <p className="help-copy">
                Đo từ thời điểm từng từ: khoảng{" "}
                {Math.round(part.fluency.wordsPerMinute)} từ mỗi phút,{" "}
                {part.fluency.pausesPerMinute.toFixed(1)} chỗ ngừng từ nửa giây
                trở lên mỗi phút, {part.fluency.fillers} từ đệm (uh, um…).
              </p>
            ) : (
              <p className="help-copy">
                Chưa đo được độ trôi chảy bằng số cho phần này: thời điểm từng
                từ do máy trả về không khớp độ dài bản ghi.
              </p>
            )}
          </details>
        );
      })}
      <p className="grade-meta">
        Chấm {formatNoteDate(stored.at)} · {grade.runs} lần chấm độc lập · mô
        hình {grade.model} · thang {grade.rubricVersion} · lời nhắc{" "}
        {grade.promptVersion} · {grade.droppedQuotes} câu trích không có trong
        bản chép đã bị loại
      </p>
    </div>
  );
}
