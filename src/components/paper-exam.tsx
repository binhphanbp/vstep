"use client";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LISTENING_READ_SECONDS,
  SPEAKING_PARTS,
  isFinalStage,
  paperAnswered,
  paperStageTotal,
  readingPalette,
  type Paper,
  type PaperSlot,
} from "@/lib/papers";
import { wordCount, type PaperRun } from "@/lib/learning";
import { saveRecording } from "@/lib/recordings";
import { MarkablePassage } from "./marked-text";
import {
  SCRATCH_HINTS,
  passageKey,
  taskKey,
  type PaperWork,
} from "./paper-work";
import { ScratchPad } from "./scratch-pad";

/**
 * The exam room: a sitting that behaves like the computer-based VSTEP rather
 * than like a study page. What is modelled, and where it comes from, is spelled
 * out on the check-in screen; the short version is that Listening recordings
 * play once, nothing can be revisited after a section is handed in, Speaking
 * is recorded against a clock, and the app's own chrome stays out of the way.
 */
/**
 * Passage text as the exam shows it. The imported files carry Markdown
 * headings ("# Title"); printing the hash as a character would be wrong, so a
 * heading line becomes a heading and everything else stays plain text.
 */
export function PaperText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="paper-text" lang="en">
      {lines.map((line, index) =>
        /^#{1,6}\s/.test(line) ? (
          <strong className="paper-heading" key={index}>
            {line.replace(/^#{1,6}\s+/, "")}
          </strong>
        ) : (
          <Fragment key={index}>
            {line}
            {index < lines.length - 1 ? "\n" : ""}
          </Fragment>
        ),
      )}
    </div>
  );
}

type Edit = (change: (current: PaperRun) => PaperRun) => void;
const sectionNames = ["Nghe", "Đọc", "Viết", "Nói"];
const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
function audioContext() {
  const Context =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  return Context ? new Context() : null;
}
function beep(milliseconds = 250, frequency = 880) {
  try {
    const context = audioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.15;
    oscillator.frequency.value = frequency;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + milliseconds / 1000);
    oscillator.onended = () => void context.close();
  } catch {
    // A silent device must not stop the exam from running.
  }
}

/** Opens the microphone for `seconds` and reports the loudest moment. */
async function micPeak(seconds = 3): Promise<number> {
  const media = await navigator.mediaDevices.getUserMedia({ audio: true });
  const context = audioContext();
  if (!context) {
    media.getTracks().forEach((track) => track.stop());
    return 0;
  }
  const analyser = context.createAnalyser();
  context.createMediaStreamSource(media).connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  let peak = 0;
  const started = Date.now();
  await new Promise<void>((resolve) => {
    const read = () => {
      analyser.getByteTimeDomainData(samples);
      for (const value of samples)
        peak = Math.max(peak, Math.abs(value - 128) / 128);
      if (Date.now() - started >= seconds * 1000) resolve();
      else requestAnimationFrame(read);
    };
    read();
  });
  media.getTracks().forEach((track) => track.stop());
  void context.close();
  return peak;
}

export function ExamCheckIn({
  name,
  paper,
  only,
  disabled,
  onStart,
}: {
  name: string;
  paper: Paper;
  /** Set when only one section is sat. */
  only?: 0 | 1 | 2 | 3;
  disabled: boolean;
  onStart: () => void;
}) {
  const stages = only === undefined ? [0, 1, 2, 3] : [only];
  const minutes = stages.reduce(
    (sum, stage) => sum + paper.sections[stage].minutes,
    0,
  );
  const [agreed, setAgreed] = useState(false);
  const [mic, setMic] = useState<"idle" | "testing" | "ok" | "quiet" | "error">(
    "idle",
  );
  async function testMic() {
    setMic("testing");
    try {
      setMic((await micPeak()) > 0.04 ? "ok" : "quiet");
    } catch {
      setMic("error");
    }
  }
  return (
    <section className="panel exam-checkin" aria-label="Kiểm tra trước khi thi">
      <h2>Thông tin thí sinh</h2>
      <dl className="exam-facts">
        <div>
          <dt>Thí sinh</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt>Đề thi</dt>
          <dd>{paper.title}</dd>
        </div>
        <div>
          <dt>Các phần</dt>
          <dd>
            {stages
              .map((i) => `${sectionNames[i]} ${paper.sections[i].minutes}′`)
              .join(" · ")}
          </dd>
        </div>
      </dl>
      <h2>Kiểm tra âm thanh và micro</h2>
      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          onClick={() => beep(900, 660)}
        >
          Phát âm thanh thử
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={mic === "testing"}
          onClick={() => void testMic()}
        >
          {mic === "testing"
            ? "Đang nghe… hãy nói vài câu"
            : "Kiểm tra micro (3 giây)"}
        </button>
      </div>
      <p className="help-copy" role="status">
        {mic === "ok" && "Micro hoạt động: đã nghe thấy tiếng nói."}
        {mic === "quiet" &&
          "Chưa nghe thấy tiếng. Kiểm tra micro đã chọn đúng và chưa bị tắt tiếng."}
        {mic === "error" &&
          "Không mở được micro. Cho phép micro ở thanh địa chỉ nếu bạn muốn ghi âm phần Nói."}
        {mic === "idle" &&
          "Tai nghe và micro nên được kiểm tra trước khi bắt đầu. Bước này không bắt buộc."}
      </p>
      <h2>Quy định trong phòng thi mô phỏng</h2>
      <ul className="exam-rules">
        {stages.includes(0) && (
          <li>
            <strong>Nghe:</strong> mỗi đoạn ghi âm chỉ phát{" "}
            <strong>một lần</strong>, tự động, sau một khoảng ngắn để đọc câu
            hỏi. Không tạm dừng, không tua, không nghe lại, không quay lại đoạn
            trước.
          </li>
        )}
        {stages.includes(1) && (
          <li>
            <strong>Đọc:</strong> bài đọc ở bên trái, câu hỏi ở bên phải. Bạn có
            thể chuyển giữa các bài trong phần Đọc.
          </li>
        )}
        {(stages.includes(2) || stages.includes(3)) && (
          <li>
            {stages.includes(2) && (
              <>
                <strong>Viết:</strong> gõ trực tiếp, có đếm số từ.{" "}
              </>
            )}
            {stages.includes(3) && (
              <>
                <strong>Nói:</strong> máy ghi âm theo giờ từng phần; Part 2 và
                Part 3 có 1 phút chuẩn bị.
              </>
            )}
          </li>
        )}
        <li>
          {only === undefined
            ? "Hết giờ một phần, bài làm tự lưu và chuyển sang phần tiếp theo. Phần đã nộp không mở lại được."
            : "Hết giờ, bài làm tự lưu và lượt luyện kết thúc. Bài đã nộp không mở lại được."}{" "}
          Đồng hồ vẫn chạy khi tải lại hoặc rời trang.
        </li>
        <li>
          <strong>Nháp và tô câu:</strong> mỗi phần có ô nháp, và bài đọc hoặc
          đề bài có nút “Tô câu”. Đây là công cụ luyện tập của Mây, lưu cùng
          lượt thi và không tính điểm hay số từ.
        </li>
        <li>Kết quả chỉ là số câu đúng, không quy đổi sang bậc VSTEP.</li>
      </ul>
      <p className="notice">
        Mô phỏng dựa trên mô tả công khai của các trung tâm thi và luyện thi,
        chưa phải tài liệu chính thức: đơn vị tổ chức thi có thể khác ở chi tiết
        như thời gian đọc câu hỏi trước mỗi đoạn nghe, việc có cho quay lại câu
        trước trong phần Đọc, hay giờ riêng của từng phần Nói. Hãy xem hướng dẫn
        của nơi bạn đăng ký thi.
      </p>
      <label className="paper-agree">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        Tôi đã đeo tai nghe, đã kiểm tra micro và có đủ {minutes} phút liên tục.
      </label>
      <button
        type="button"
        className="button primary"
        disabled={!agreed || disabled}
        onClick={onStart}
      >
        Chấp nhận và bắt đầu thi
      </button>
    </section>
  );
}

function Question({
  item,
  run,
  edit,
}: {
  item: PaperSlot["items"][number];
  run: PaperRun;
  edit: Edit;
}) {
  return (
    <fieldset className="paper-question" id={`q-${item.id}`}>
      <legend>
        {item.number}. {item.text}
      </legend>
      {item.options.map((option, index) => (
        <label className="paper-option" key={index}>
          <input
            type="radio"
            name={item.id}
            checked={run.answers[item.id] === index}
            onChange={() =>
              edit((current) => ({
                ...current,
                answers: { ...current.answers, [item.id]: index },
              }))
            }
          />
          <span>
            {"ABCD"[index]}. {option.text}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

type ListenPhase = "reading" | "playing" | "done" | "blocked" | "failed";

function ListeningSlot({
  slot,
  run,
  edit,
  work,
  isLast,
  onNext,
}: {
  slot: PaperSlot;
  run: PaperRun;
  edit: Edit;
  work: PaperWork;
  isLast: boolean;
  onNext: () => void;
}) {
  const alreadyHeard = (run.heard ?? []).includes(slot.id);
  // Whether this screen was opened after the recording had already played, e.g.
  // after a reload; decided once, so the wording does not flip mid-listen.
  const [openedAfterPlay] = useState(alreadyHeard);
  const [phase, setPhase] = useState<ListenPhase>(
    alreadyHeard ? "done" : "reading",
  );
  const [wait, setWait] = useState(LISTENING_READ_SECONDS);
  const audio = useRef<HTMLAudioElement>(null);
  const started = useRef(false);

  const begin = useCallback(() => {
    const element = audio.current;
    if (!element || started.current) return;
    started.current = true;
    element.play().catch((error: unknown) => {
      started.current = false;
      setPhase(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "blocked"
          : "failed",
      );
    });
  }, []);

  useEffect(() => {
    if (phase !== "reading") return;
    if (wait <= 0) {
      begin();
      return;
    }
    const timer = window.setTimeout(() => setWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, wait, begin]);

  function markHeard() {
    setPhase("playing");
    edit((current) =>
      (current.heard ?? []).includes(slot.id)
        ? current
        : { ...current, heard: [...(current.heard ?? []), slot.id] },
    );
  }

  const first = slot.items[0]?.number;
  const last = slot.items.at(-1)?.number;
  const status = {
    reading: `Đọc câu hỏi. Bản ghi âm sẽ phát sau ${wait} giây và chỉ phát một lần.`,
    playing: "Đang phát bản ghi âm. Không thể tạm dừng hoặc nghe lại.",
    done: openedAfterPlay
      ? "Bản ghi âm của phần này đã phát và không phát lại được."
      : "Bản ghi âm đã kết thúc.",
    blocked: "Trình duyệt chưa cho phát tự động.",
    failed: alreadyHeard
      ? "Bản ghi âm bị gián đoạn và không phát lại được. Bạn có thể làm tiếp và bấm Tiếp theo."
      : "Không phát được bản ghi âm. Kiểm tra kết nối và tai nghe rồi bấm thử lại.",
  }[phase];
  return (
    <div className="exam-slot">
      <h2>
        {slot.part} · {first === last ? `Câu ${first}` : `Câu ${first}–${last}`}
      </h2>
      {slot.audio && (
        <audio
          ref={audio}
          src={slot.audio}
          preload="auto"
          onPlaying={markHeard}
          onEnded={() => setPhase("done")}
          onError={() => {
            started.current = false;
            setPhase("failed");
          }}
        />
      )}
      <p className={`exam-audio-status ${phase}`} role="status">
        {status}
      </p>
      {(phase === "blocked" || phase === "failed") && !alreadyHeard && (
        <button type="button" className="button secondary" onClick={begin}>
          Phát bản ghi âm (chỉ một lần)
        </button>
      )}
      <ScratchPad
        value={work.scratch(slot.id)}
        onChange={(value) => work.setScratch(slot.id, value)}
        label={`Nháp cho ${slot.part}`}
        placeholder={SCRATCH_HINTS.listening}
        defaultOpen
      />
      {slot.items.map((item) => (
        <Question key={item.id} item={item} run={run} edit={edit} />
      ))}
      <div className="button-row exam-foot">
        <button
          type="button"
          className="button primary"
          // "blocked" is a recording not yet played: it has to be started first.
          // A recording that fails outright must not trap the sitting, though.
          disabled={
            phase === "reading" || phase === "playing" || phase === "blocked"
          }
          onClick={onNext}
        >
          {isLast ? "Nộp phần Nghe" : "Tiếp theo"}
        </button>
      </div>
    </div>
  );
}

function ListeningRoom({
  paper,
  run,
  edit,
  work,
  onSubmit,
}: {
  paper: Paper;
  run: PaperRun;
  edit: Edit;
  work: PaperWork;
  onSubmit: () => void;
}) {
  const slots = paper.sections[0].slots;
  const index = Math.min(run.material, slots.length - 1);
  return (
    <ListeningSlot
      key={slots[index].id}
      slot={slots[index]}
      run={run}
      edit={edit}
      work={work}
      isLast={index === slots.length - 1}
      onNext={() =>
        index === slots.length - 1
          ? onSubmit()
          : edit((current) => ({ ...current, material: index + 1 }))
      }
    />
  );
}

function ReadingRoom({
  paper,
  run,
  edit,
  work,
}: {
  paper: Paper;
  run: PaperRun;
  edit: Edit;
  work: PaperWork;
}) {
  const slots = paper.sections[1].slots;
  const index = Math.min(run.material, slots.length - 1);
  const slot = slots[index];
  const palette = readingPalette(paper);
  const go = (target: number) =>
    edit((current) => ({ ...current, material: target }));
  return (
    <div className="exam-slot">
      <nav className="exam-palette" aria-label="Danh sách câu hỏi">
        {palette.map(({ item, slotIndex }) => (
          <button
            type="button"
            key={item.id}
            className={`${run.answers[item.id] !== undefined ? "answered" : ""} ${slotIndex === index ? "here" : ""}`}
            aria-label={`Câu ${item.number}${run.answers[item.id] !== undefined ? ", đã trả lời" : ""}`}
            onClick={() => {
              go(slotIndex);
              window.setTimeout(
                () =>
                  document
                    .getElementById(`q-${item.id}`)
                    ?.scrollIntoView({ block: "center" }),
                30,
              );
            }}
          >
            {item.number}
          </button>
        ))}
      </nav>
      <h2>{slot.part}</h2>
      <div className="exam-split">
        <section
          className="exam-pane exam-passage"
          tabIndex={0}
          aria-label={`Bài đọc ${index + 1}`}
        >
          <MarkablePassage
            key={slot.id}
            text={slot.passage}
            className="paper-text"
            marks={work.marks(passageKey(slot.id))}
            onToggle={(sentence) =>
              work.toggle(passageKey(slot.id), slot.passage, sentence)
            }
          />
        </section>
        <section className="exam-pane" aria-label="Câu hỏi">
          {slot.items.map((item) => (
            <Question key={item.id} item={item} run={run} edit={edit} />
          ))}
        </section>
      </div>
      <ScratchPad
        key={slot.id}
        value={work.scratch(slot.id)}
        onChange={(value) => work.setScratch(slot.id, value)}
        label={`Nháp cho ${slot.part}`}
        placeholder={SCRATCH_HINTS.reading}
      />
      <div className="button-row exam-foot">
        <button
          type="button"
          className="button secondary"
          disabled={index === 0}
          onClick={() => go(index - 1)}
        >
          Bài trước
        </button>
        <button
          type="button"
          className="button primary"
          disabled={index === slots.length - 1}
          onClick={() => go(index + 1)}
        >
          Bài tiếp theo
        </button>
      </div>
    </div>
  );
}

function WritingRoom({
  paper,
  run,
  edit,
  work,
}: {
  paper: Paper;
  run: PaperRun;
  edit: Edit;
  work: PaperWork;
}) {
  const slots = paper.sections[2].slots;
  const index = Math.min(run.material, slots.length - 1);
  const slot = slots[index];
  const text = run.essays[slot.id] ?? "";
  const words = wordCount(text);
  return (
    <div className="exam-slot">
      <div className="exam-tabs" role="tablist" aria-label="Bài viết">
        {slots.map((entry, tab) => (
          <button
            type="button"
            role="tab"
            key={entry.id}
            aria-selected={tab === index}
            className={tab === index ? "current" : ""}
            onClick={() => edit((current) => ({ ...current, material: tab }))}
          >
            {entry.part}
            {(run.essays[entry.id] ?? "").trim() ? " ✓" : ""}
          </button>
        ))}
      </div>
      <div className="exam-split">
        <section className="exam-pane" aria-label="Đề bài">
          <MarkablePassage
            key={slot.id}
            text={slot.prompt}
            className="paper-text"
            marks={work.marks(taskKey(slot.id))}
            onToggle={(sentence) =>
              work.toggle(taskKey(slot.id), slot.prompt, sentence)
            }
          />
          <ScratchPad
            key={`scratch-${slot.id}`}
            value={work.scratch(slot.id)}
            onChange={(value) => work.setScratch(slot.id, value)}
            label={`Dàn ý cho ${slot.part}`}
            placeholder={SCRATCH_HINTS.writing}
            defaultOpen
          />
        </section>
        <section className="exam-pane" aria-label="Bài làm">
          <textarea
            className="writing-area exam-writing"
            aria-label={`Bài viết ${slot.part}`}
            value={text}
            maxLength={30000}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            onChange={(event) => {
              const value = event.target.value;
              edit((current) => ({
                ...current,
                essays: { ...current.essays, [slot.id]: value },
              }));
            }}
          />
          <p className="help-copy" role="status">
            {words} từ · yêu cầu: ít nhất {slot.wordMin} từ
          </p>
        </section>
      </div>
    </div>
  );
}

type CaptureResult = "ok" | "denied" | "unsupported" | "error" | "cancelled";
function useCapture(id: string) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  // Bumped whenever a take is finished: a take that was still waiting for the
  // microphone then knows it is stale and must not start recording behind a
  // part that has already ended.
  const generation = useRef(0);
  const start = useCallback(
    async (onLost?: () => void): Promise<CaptureResult> => {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        return "unsupported";
      const mine = ++generation.current;
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (mine !== generation.current) {
          media.getTracks().forEach((track) => track.stop());
          return "cancelled";
        }
        stream.current = media;
        const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
          (candidate) => MediaRecorder.isTypeSupported(candidate),
        );
        const next = new MediaRecorder(
          media,
          type ? { mimeType: type } : undefined,
        );
        chunks.current = [];
        next.ondataavailable = (event) => {
          if (event.data.size) chunks.current.push(event.data);
        };
        // A take that stops on its own (microphone unplugged or taken by another
        // app) is not one that finish() stopped, and finish() clears the ref first.
        next.onstop = next.onerror = () => {
          if (recorder.current === next) onLost?.();
        };
        recorder.current = next;
        beep();
        next.start(1000);
        return "ok";
      } catch (error) {
        stream.current?.getTracks().forEach((track) => track.stop());
        return error instanceof DOMException && error.name === "NotAllowedError"
          ? "denied"
          : "error";
      }
    },
    [],
  );
  /** Stops the take and files it under this part; true when it was kept. */
  const finish = useCallback((): Promise<boolean> => {
    generation.current++;
    const active = recorder.current;
    const media = stream.current;
    recorder.current = null;
    stream.current = null;
    if (!active) {
      media?.getTracks().forEach((track) => track.stop());
      return Promise.resolve(false);
    }
    // Whatever was recorded is kept, including a take that stopped by itself.
    const keep = async () => {
      media?.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks.current, { type: active.mimeType });
      if (!blob.size) return false;
      try {
        await saveRecording(id, blob);
        window.dispatchEvent(
          new CustomEvent("may-recording-saved", { detail: id }),
        );
        return true;
      } catch {
        return false;
      }
    };
    if (active.state !== "recording") return keep();
    return new Promise((resolve) => {
      active.onstop = () => void keep().then(resolve);
      active.stop();
    });
  }, [id]);
  return useMemo(() => ({ start, finish }), [start, finish]);
}

function SpeakingRoom({
  paper,
  run,
  now,
  edit,
  work,
  markRecorded,
  onFinish,
}: {
  paper: Paper;
  run: PaperRun;
  now: number;
  edit: Edit;
  work: PaperWork;
  markRecorded: (runId: string, slotId: string) => void;
  onFinish: () => void;
}) {
  const slots = paper.sections[3].slots;
  const index = Math.min(run.material, slots.length - 1);
  const slot = slots[index];
  const plan = SPEAKING_PARTS[Math.min(index, SPEAKING_PARTS.length - 1)];
  const current = run.speak?.slot === slot.id ? run.speak : undefined;
  const capture = useCapture(`paper-${run.id}-${slot.id}`);
  const [micProblem, setMicProblem] = useState("");
  // True once the microphone is open and the take is really being recorded.
  const [micReady, setMicReady] = useState(false);
  const marker = useRef(markRecorded);
  useEffect(() => {
    marker.current = markRecorded;
  }, [markRecorded]);
  const talking = current?.phase === "talk";

  useEffect(() => {
    if (!talking) return;
    const runId = run.id;
    const slotId = slot.id;
    let live = true;
    void capture
      .start(() => {
        if (!live) return;
        setMicReady(false);
        setMicProblem(
          "Micro bị ngắt giữa chừng. Phần đã ghi được giữ lại; bạn vẫn có thể nói tiếp và bấm kết thúc.",
        );
      })
      .then((result) => {
        if (live && result === "ok") setMicReady(true);
        if (!live || result === "ok" || result === "cancelled") return;
        setMicProblem(
          result === "denied"
            ? "Chưa được cấp quyền micro. Cho phép micro ở thanh địa chỉ, hoặc tiếp tục không ghi âm."
            : "Không ghi âm được trên thiết bị này. Bạn vẫn có thể trả lời thành tiếng và tiếp tục.",
        );
      });
    return () => {
      live = false;
      setMicReady(false);
      void capture.finish().then((kept) => {
        if (kept) marker.current(runId, slotId);
      });
    };
  }, [talking, slot.id, run.id, capture]);

  function advancePart() {
    if (index === slots.length - 1) {
      onFinish();
      return;
    }
    edit((state) => ({ ...state, speak: undefined, material: index + 1 }));
  }
  function beginTalk() {
    edit((state) => ({
      ...state,
      speak: {
        slot: slot.id,
        phase: "talk",
        until: Date.now() + plan.talkSeconds * 1000,
      },
    }));
  }
  function beginPart() {
    if (plan.prepSeconds === 0) return beginTalk();
    edit((state) => ({
      ...state,
      speak: {
        slot: slot.id,
        phase: "prep",
        until: Date.now() + plan.prepSeconds * 1000,
      },
    }));
  }
  const left = current
    ? Math.max(0, Math.ceil((current.until - now) / 1000))
    : 0;
  useEffect(() => {
    if (!current || now < current.until) return;
    if (current.phase === "prep") beginTalk();
    else {
      // Answered aloud without a recording: the part still counts as done.
      if (micProblem) marker.current(run.id, slot.id);
      advancePart();
    }
    // The transition fires once per expiry; beginTalk/advancePart read the
    // latest run through edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, current]);

  return (
    <div className="exam-slot">
      <h2>
        {slot.part} · phần Nói {index + 1}/{slots.length}
      </h2>
      {!current && (
        <section className="panel exam-intro">
          <p>
            {plan.prepSeconds
              ? `Bạn có ${plan.prepSeconds / 60} phút chuẩn bị, rồi nói tối đa ${plan.talkSeconds / 60} phút. Máy tự bắt đầu ghi âm sau tiếng bíp.`
              : `Bạn nói tối đa ${plan.talkSeconds / 60} phút. Máy ghi âm sau tiếng bíp.`}{" "}
            Không thể ghi lại bản mới sau khi kết thúc phần này.
          </p>
          <button type="button" className="button primary" onClick={beginPart}>
            Bắt đầu {slot.part}
          </button>
        </section>
      )}
      {current && (
        <>
          <p
            className={`exam-speak-clock ${current.phase}`}
            role="timer"
            aria-label={
              current.phase === "prep" ? "Thời gian chuẩn bị" : "Thời gian nói"
            }
          >
            {current.phase === "prep"
              ? "Chuẩn bị"
              : micReady
                ? "Đang ghi âm"
                : micProblem
                  ? "Không ghi âm được"
                  : "Đang mở micro"}{" "}
            · {clock(left)}
          </p>
          <MarkablePassage
            key={slot.id}
            text={slot.prompt}
            className="paper-text"
            marks={work.marks(taskKey(slot.id))}
            onToggle={(sentence) =>
              work.toggle(taskKey(slot.id), slot.prompt, sentence)
            }
          />
          {slot.cues.length > 0 && slot.prompt.length < 200 && (
            <ul className="exam-cues" lang="en">
              {slot.cues.map((cue, cueIndex) => (
                <li key={cueIndex}>{cue}</li>
              ))}
            </ul>
          )}
          <ScratchPad
            key={`scratch-${slot.id}`}
            value={work.scratch(slot.id)}
            onChange={(value) => work.setScratch(slot.id, value)}
            label={`Dàn ý cho ${slot.part}`}
            placeholder={SCRATCH_HINTS.speaking}
            defaultOpen
          />
          {micProblem && (
            <p className="notice error" role="alert">
              {micProblem}
            </p>
          )}
          <div className="button-row exam-foot">
            {current.phase === "prep" ? (
              <button
                type="button"
                className="button secondary"
                onClick={beginTalk}
              >
                Bắt đầu nói ngay
              </button>
            ) : (
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  if (micProblem) marker.current(run.id, slot.id);
                  advancePart();
                }}
              >
                {index === slots.length - 1
                  ? "Kết thúc phần Nói"
                  : "Kết thúc phần này"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ExamRoom({
  paper,
  run,
  now,
  name,
  edit,
  work,
  markRecorded,
  onSubmit,
  onFinish,
  storageError,
}: {
  paper: Paper;
  run: PaperRun;
  now: number;
  name: string;
  edit: Edit;
  work: PaperWork;
  markRecorded: (runId: string, slotId: string) => void;
  onSubmit: () => void;
  onFinish: () => void;
  storageError: string;
}) {
  const seconds = Math.max(0, Math.ceil((run.deadline - now) / 1000));
  const answered = paperAnswered(paper, run, run.stage);
  const total = paperStageTotal(paper, run.stage);
  return (
    <div className="exam-room">
      <header className="exam-head">
        <div>
          <strong>
            VSTEP ·{" "}
            {paper.id === "review-1309" ? "Review 13/09" : `Đề ${paper.id}`}
          </strong>
          <span>{name}</span>
        </div>
        <div className="exam-where">
          <strong>
            {run.only === undefined
              ? `Phần ${run.stage + 1}/4 · ${sectionNames[run.stage]}`
              : `Luyện riêng · ${sectionNames[run.stage]}`}
          </strong>
          <span>
            {answered}/{total} đã làm
          </span>
        </div>
        <div className="exam-controls">
          <div
            className={`paper-clock ${seconds <= 300 ? "low" : ""}`}
            role="timer"
            aria-label="Thời gian còn lại của phần này"
          >
            {clock(seconds)}
          </div>
          {run.stage !== 3 && (
            <button
              type="button"
              className="button secondary"
              onClick={onSubmit}
              disabled={Boolean(storageError)}
            >
              {isFinalStage(run) ? "Nộp bài" : "Nộp phần này"}
            </button>
          )}
          <Link
            className="exam-exit"
            href="/papers"
            onClick={(event) => {
              if (
                !window.confirm(
                  run.stage === 0
                    ? "Thoát phòng thi? Đồng hồ vẫn chạy và bài làm được giữ, nhưng bản ghi âm đang phát sẽ không phát lại khi bạn quay về."
                    : "Thoát phòng thi? Đồng hồ vẫn chạy và bài làm được giữ.",
                )
              )
                event.preventDefault();
            }}
          >
            Thoát
          </Link>
        </div>
      </header>
      <div className="exam-main">
        {run.stage === 0 && (
          <ListeningRoom
            paper={paper}
            run={run}
            edit={edit}
            work={work}
            onSubmit={onSubmit}
          />
        )}
        {run.stage === 1 && (
          <ReadingRoom paper={paper} run={run} edit={edit} work={work} />
        )}
        {run.stage === 2 && (
          <WritingRoom paper={paper} run={run} edit={edit} work={work} />
        )}
        {run.stage === 3 && (
          <SpeakingRoom
            paper={paper}
            run={run}
            now={now}
            edit={edit}
            work={work}
            markRecorded={markRecorded}
            onFinish={onFinish}
          />
        )}
        {/* A failed save is announced once, by the app shell above. */}
      </div>
    </div>
  );
}
