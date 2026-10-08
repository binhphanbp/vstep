"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Recorder } from "./audio-tools";
import { deleteRecording } from "@/lib/recordings";
import { ExamCheckIn, ExamRoom } from "./paper-exam";
import { PaperReview } from "./paper-review";
import { MarkablePassage } from "./marked-text";
import {
  SCRATCH_HINTS,
  paperWork,
  passageKey,
  taskKey,
  type PaperWork,
} from "./paper-work";
import { ScratchPad } from "./scratch-pad";
import { useStudy } from "./study-provider";
import {
  addPaperRun,
  advancePaperRun,
  isFinalStage,
  paperAnswered,
  runStages,
  paperStageTotal,
  type Paper,
} from "@/lib/papers";
import { wordCount, type PaperRun, type StudyState } from "@/lib/learning";

const sectionNames = ["Nghe", "Đọc", "Viết", "Nói"];

/** A passage or a task with the switch that highlights its sentences. */
function Markable({
  text,
  markKey,
  work,
}: {
  text: string;
  markKey: string;
  work: PaperWork;
}) {
  return (
    <MarkablePassage
      key={markKey}
      text={text}
      className="paper-text"
      marks={work.marks(markKey)}
      onToggle={(sentence) => work.toggle(markKey, text, sentence)}
    />
  );
}

function activeRunFor(state: StudyState, paperId: string) {
  return (state.paperRuns ?? [])
    .filter((run) => run.paperId === paperId && !run.finishedAt)
    .at(-1);
}

export function PaperRunner({ paperId }: { paperId: string }) {
  const { state, ready, storageError, update } = useStudy();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("run") ?? ""),
  );
  const [now, setNow] = useState(() => Date.now());
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState<"exam" | "practice">("exam");
  // "all" sits the whole paper; a number sits that one section on its own.
  const [scope, setScope] = useState<"all" | 0 | 1 | 2 | 3>("all");

  useEffect(() => {
    let alive = true;
    fetch(`/papers/${paperId}.json`)
      .then((response) => {
        if (!response.ok) throw Error("missing");
        return response.json() as Promise<Paper>;
      })
      .then((data) => {
        if (data.id !== paperId || data.sections.length !== 4)
          throw Error("invalid");
        if (alive) setPaper(data);
      })
      .catch(() => {
        if (alive)
          setLoadError("Không tải được đề. Kiểm tra kết nối và thử lại.");
      });
    return () => {
      alive = false;
    };
  }, [paperId]);

  const runs = (state.paperRuns ?? []).filter((run) => run.paperId === paperId);
  const run =
    selectedId === "new"
      ? undefined
      : (runs.find((entry) => entry.id === selectedId) ?? runs.at(-1));
  const active = activeRunFor(state, paperId);
  // Scratch and highlights belong to the sitting being shown, finished or not.
  const work = run ? paperWork(run, update) : undefined;

  useEffect(() => {
    if (!paper || !ready || !active) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time < active.deadline) return;
      update((current) => ({
        ...current,
        paperRuns: (current.paperRuns ?? []).map((entry) =>
          entry.id === active.id ? advancePaperRun(entry, paper, time) : entry,
        ),
      }));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [paper, ready, active, update]);

  useEffect(() => {
    if (!active) return;
    const leave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [active]);

  // The exam room takes over the screen: no sidebar, top bar or footer.
  const immersive = Boolean(
    run && !run.finishedAt && run.mode === "exam" && run.id === active?.id,
  );
  useEffect(() => {
    document.body.classList.toggle("exam-immersive", immersive);
    return () => document.body.classList.remove("exam-immersive");
  }, [immersive]);

  function createRun(chosen: "exam" | "practice") {
    if (!paper || storageError) return;
    if (chosen === "practice" && !agreed) return;
    const time = Date.now();
    const next: PaperRun = {
      id: crypto.randomUUID(),
      paperId: paper.id,
      version: paper.version,
      sourceHash: paper.sourceHash,
      startedAt: time,
      stage: scope === "all" ? 0 : scope,
      deadline:
        time + paper.sections[scope === "all" ? 0 : scope].minutes * 60_000,
      material: 0,
      answers: {},
      essays: {},
      spoken: [],
      mode: chosen,
      ...(scope === "all" ? {} : { only: scope }),
    };
    let startedId = next.id;
    let dropped: PaperRun[] = [];
    update((current) => {
      const added = addPaperRun(current.paperRuns ?? [], next);
      if (added.reused) {
        // Another tab already started this paper: carry on with that one.
        startedId = added.reused.id;
        return current;
      }
      dropped = added.dropped;
      return { ...current, paperRuns: added.runs };
    });
    // The recordings of sittings let go of by the cap go with them.
    for (const old of dropped)
      for (const slot of old.spoken)
        void deleteRecording(`paper-${old.id}-${slot}`).catch(() => {});
    setSelectedId(startedId);
    setAgreed(false);
  }

  function editRun(change: (current: PaperRun) => PaperRun) {
    if (!run || run.finishedAt) return;
    update((current) => ({
      ...current,
      paperRuns: (current.paperRuns ?? []).map((entry) =>
        entry.id === run.id &&
        !entry.finishedAt &&
        entry.stage === run.stage &&
        Date.now() < entry.deadline
          ? change(entry)
          : entry,
      ),
    }));
  }

  function markRecorded(runId: string, slotId: string) {
    // MediaRecorder may finish writing after the part changes or the last
    // section closes. The take still belongs to that sitting.
    update((current) => ({
      ...current,
      paperRuns: (current.paperRuns ?? []).map((entry) =>
        entry.id === runId
          ? { ...entry, spoken: [...new Set([...entry.spoken, slotId])] }
          : entry,
      ),
    }));
  }

  function submitStage(skipConfirm = false) {
    if (!paper || !run || run.finishedAt) return;
    const answered = paperAnswered(paper, run, run.stage);
    const total = paperStageTotal(paper, run.stage);
    const remaining = total - answered;
    const message =
      (remaining ? `Còn ${remaining}/${total} mục chưa làm. ` : "") +
      (isFinalStage(run)
        ? "Kết thúc và lưu lượt thi này?"
        : "Nộp phần này và chuyển sang phần tiếp theo? Bạn sẽ không thể quay lại sửa.");
    if (!skipConfirm && !window.confirm(message)) return;
    update((current) => ({
      ...current,
      paperRuns: (current.paperRuns ?? []).map((entry) =>
        entry.id === run.id && !entry.finishedAt && entry.stage === run.stage
          ? advancePaperRun(entry, paper, Date.now(), true)
          : entry,
      ),
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loadError)
    return (
      <div className="page">
        <p role="alert" className="notice error">
          {loadError}
        </p>
        <Link href="/papers">Về kho đề</Link>
      </div>
    );
  if (!paper || !ready)
    return <div className="loading-state">Đang mở đề {paperId}…</div>;
  const shortLabel =
    paper.id === "review-1309" ? "REVIEW 13/09" : `ĐỀ ${paper.id}`;
  const totalMinutes = paper.sections.reduce(
    (sum, section) => sum + section.minutes,
    0,
  );
  const sittingMinutes =
    scope === "all" ? totalMinutes : paper.sections[scope].minutes;

  if (!run)
    return (
      <div className="page">
        <Link href="/papers" className="help-copy">
          ← Kho đề
        </Link>
        <div className="page-heading">
          <div>
            <div className="eyebrow">ĐỀ ĐÃ NHẬP · {shortLabel}</div>
            <h1>{paper.title}</h1>
            <p>35 câu Nghe · 40 câu Đọc · hai bài Viết · ba phần Nói</p>
          </div>
        </div>
        <div className="content-grid">
          <section className="panel">
            <h2>Trước khi bắt đầu</h2>
            <div className="stack paper-stage-list">
              {paper.sections.map((section, index) => (
                <div className="history-row" key={section.skill}>
                  <strong>
                    {index + 1}. {sectionNames[index]}
                  </strong>
                  <span>{section.minutes} phút</span>
                </div>
              ))}
            </div>
            <p className="notice">
              {paper.graded
                ? "Đề có khóa đáp án cho Nghe/Đọc; chưa có giáo viên của Mây thẩm định. Viết và Nói lưu bài làm nhưng không chấm tự động."
                : "Đề này không có khóa đáp án trong dữ liệu gốc. Bạn có thể luyện đủ bốn phần, nhưng Nghe/Đọc sẽ không được chấm."}{" "}
              Đồng hồ vẫn chạy khi tải lại hoặc rời trang. Audio cần kết nối
              trong lần mở đầu tiên. Kết quả không quy đổi sang B1/B2/C1.
            </p>
            <fieldset className="exam-modes">
              <legend>Làm phần nào</legend>
              <label className="paper-option">
                <input
                  type="radio"
                  name="paper-scope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                <span>
                  <strong>Cả đề</strong>: bốn kỹ năng liên tục, {totalMinutes}{" "}
                  phút.
                </span>
              </label>
              {paper.sections.map((section, index) => (
                <label className="paper-option" key={section.skill}>
                  <input
                    type="radio"
                    name="paper-scope"
                    checked={scope === index}
                    onChange={() => setScope(index as 0 | 1 | 2 | 3)}
                  />
                  <span>
                    <strong>Chỉ {sectionNames[index]}</strong>:{" "}
                    {section.minutes} phút, tính giờ như trong đề.
                  </span>
                </label>
              ))}
            </fieldset>
            <fieldset className="exam-modes">
              <legend>Chế độ làm đề</legend>
              <label className="paper-option">
                <input
                  type="radio"
                  name="paper-mode"
                  checked={mode === "exam"}
                  onChange={() => setMode("exam")}
                />
                <span>
                  <strong>Phòng thi mô phỏng</strong> (khuyên dùng): giao diện
                  toàn màn hình, nghe một lần, Nói có giờ và ghi âm tự động.
                </span>
              </label>
              <label className="paper-option">
                <input
                  type="radio"
                  name="paper-mode"
                  checked={mode === "practice"}
                  onChange={() => setMode("practice")}
                />
                <span>
                  <strong>Luyện thoải mái</strong>: nghe lại và chuyển phần tự
                  do, ghi âm bằng tay.
                </span>
              </label>
            </fieldset>
            {mode === "practice" && (
              <>
                <label className="paper-agree">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(event) => setAgreed(event.target.checked)}
                  />
                  Tôi đã chuẩn bị tai nghe, micro và đủ {sittingMinutes} phút.
                </label>
                <button
                  type="button"
                  className="button primary"
                  disabled={!agreed || Boolean(storageError)}
                  onClick={() => createRun("practice")}
                >
                  {paper.id === "review-1309"
                    ? "Bắt đầu Review 13/09"
                    : `Bắt đầu đề ${paper.id}`}
                  {scope !== "all" && ` · chỉ ${sectionNames[scope]}`}
                </button>
              </>
            )}
            {storageError && <p role="alert">{storageError}</p>}
          </section>
        </div>
        {mode === "exam" && (
          <ExamCheckIn
            name={state.profile.name}
            paper={paper}
            only={scope === "all" ? undefined : scope}
            disabled={Boolean(storageError)}
            onStart={() => createRun("exam")}
          />
        )}
      </div>
    );

  if (!work) return null;
  if (run.finishedAt)
    return (
      <PaperReview
        paper={paper}
        run={run}
        work={work}
        runs={runs}
        shortLabel={shortLabel}
        hasActive={Boolean(active)}
        onSelect={setSelectedId}
        onRestart={() => setSelectedId(active?.id ?? "new")}
      />
    );

  if (run.mode === "exam")
    return (
      <ExamRoom
        paper={paper}
        run={run}
        now={now}
        name={state.profile.name}
        edit={editRun}
        work={work}
        markRecorded={markRecorded}
        onSubmit={() => submitStage()}
        onFinish={() => submitStage(true)}
        storageError={storageError}
      />
    );

  const section = paper.sections[run.stage];
  const slot = section.slots[Math.min(run.material, section.slots.length - 1)];
  const seconds = Math.max(0, Math.ceil((run.deadline - now) / 1000));
  const answered = paperAnswered(paper, run, run.stage);
  const total = paperStageTotal(paper, run.stage);
  return (
    <div className="page">
      <Link href="/papers" className="help-copy">
        ← Kho đề
      </Link>
      <div className="study-header">
        <div>
          <div className="eyebrow">
            {shortLabel} ·{" "}
            {run.only === undefined
              ? `PHẦN ${run.stage + 1}/4`
              : "LUYỆN RIÊNG MỘT KỸ NĂNG"}
          </div>
          <h1>{sectionNames[run.stage]}</h1>
          <p>
            {answered}/{total} mục đã làm
          </p>
        </div>
        <div
          className="paper-clock"
          role="timer"
          aria-label="Thời gian còn lại"
        >
          {Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0")}
          :{(seconds % 60).toString().padStart(2, "0")}
        </div>
      </div>
      <div className="paper-stage-strip" aria-label="Tiến độ các phần">
        {runStages(run).map((index) => (
          <span key={index} className={index === run.stage ? "current" : ""}>
            {index + 1}. {sectionNames[index]}
          </span>
        ))}
      </div>
      <section className="panel paper-workspace">
        <label className="field">
          Chọn ngữ liệu hoặc bài
          <select
            aria-label="Chọn ngữ liệu hoặc bài"
            value={Math.min(run.material, section.slots.length - 1)}
            onChange={(event) =>
              editRun((current) => ({
                ...current,
                material: Number(event.target.value),
              }))
            }
          >
            {section.slots.map((part, index) => (
              <option key={part.id} value={index}>
                {part.part} · {part.title}
              </option>
            ))}
          </select>
        </label>
        <h2>
          {slot.part} · {slot.title}
        </h2>
        {section.skill === "listening" && slot.audio && (
          <div className="paper-audio-wrap">
            <p className="help-copy">
              Audio gốc của bộ dữ liệu · có thể phát lại khi luyện.
            </p>
            <audio
              key={slot.audio}
              className="paper-audio"
              controls
              preload="none"
              src={slot.audio}
              aria-label={`Bài nghe ${slot.title}`}
            />
          </div>
        )}
        {section.skill === "listening" && (
          <ScratchPad
            key={`scratch-${slot.id}`}
            value={work.scratch(slot.id)}
            onChange={(value) => work.setScratch(slot.id, value)}
            label={`Nháp cho ${slot.part}`}
            placeholder={SCRATCH_HINTS.listening}
            defaultOpen
          />
        )}
        {section.skill === "reading" && (
          <>
            <Markable
              text={slot.passage}
              markKey={passageKey(slot.id)}
              work={work}
            />
            <ScratchPad
              key={`scratch-${slot.id}`}
              value={work.scratch(slot.id)}
              onChange={(value) => work.setScratch(slot.id, value)}
              label={`Nháp cho ${slot.part}`}
              placeholder={SCRATCH_HINTS.reading}
            />
          </>
        )}
        {slot.items.map((item) => (
          <fieldset className="paper-question" key={item.id}>
            <legend>
              {item.number}. {item.text}
            </legend>
            {item.options.map((option, index) => (
              <label className="paper-option" key={index}>
                <input
                  type="radio"
                  name={item.id}
                  value={index}
                  checked={run.answers[item.id] === index}
                  onChange={() =>
                    editRun((current) => ({
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
        ))}
        {section.skill === "writing" && (
          <>
            <Markable
              text={slot.prompt}
              markKey={taskKey(slot.id)}
              work={work}
            />
            <ScratchPad
              key={`scratch-${slot.id}`}
              value={work.scratch(slot.id)}
              onChange={(value) => work.setScratch(slot.id, value)}
              label={`Dàn ý cho ${slot.part}`}
              placeholder={SCRATCH_HINTS.writing}
              defaultOpen
            />
            <textarea
              className="writing-area"
              aria-label={`Bài viết ${slot.part}`}
              value={run.essays[slot.id] ?? ""}
              maxLength={30000}
              onChange={(event) => {
                const value = event.target.value;
                editRun((current) => ({
                  ...current,
                  essays: { ...current.essays, [slot.id]: value },
                }));
              }}
            />
            <p className="help-copy">
              {wordCount(run.essays[slot.id] ?? "")} từ · yêu cầu trong đề: ít
              nhất {slot.wordMin} từ
            </p>
          </>
        )}
        {section.skill === "speaking" && (
          <>
            {slot.prompt && (
              <Markable
                text={slot.prompt}
                markKey={taskKey(slot.id)}
                work={work}
              />
            )}
            <ScratchPad
              key={`scratch-${slot.id}`}
              value={work.scratch(slot.id)}
              onChange={(value) => work.setScratch(slot.id, value)}
              label={`Dàn ý cho ${slot.part}`}
              placeholder={SCRATCH_HINTS.speaking}
              defaultOpen
            />
            {slot.cues.length > 0 && (
              <ul>
                {slot.cues.map((cue, index) => (
                  <li key={index}>{cue}</li>
                ))}
              </ul>
            )}
            <Recorder
              key={slot.id}
              id={`paper-${run.id}-${slot.id}`}
              onReady={({ ready, duration }) => {
                if (ready && duration !== undefined)
                  markRecorded(run.id, slot.id);
              }}
            />
            <label className="paper-agree">
              <input
                type="checkbox"
                checked={run.spoken.includes(slot.id)}
                onChange={(event) =>
                  editRun((current) => ({
                    ...current,
                    spoken: event.target.checked
                      ? [...new Set([...current.spoken, slot.id])]
                      : current.spoken.filter((id) => id !== slot.id),
                  }))
                }
              />
              Tôi đã trả lời phần này (có hoặc không dùng micro).
            </label>
          </>
        )}
      </section>
      <div className="button-row paper-actions">
        <button
          type="button"
          className="button primary"
          onClick={() => submitStage()}
          disabled={Boolean(storageError)}
        >
          {isFinalStage(run)
            ? "Kết thúc buổi luyện"
            : "Nộp phần này & tiếp tục"}
        </button>
      </div>
      {storageError && (
        <p role="alert" className="notice error">
          {storageError}
        </p>
      )}
    </div>
  );
}
