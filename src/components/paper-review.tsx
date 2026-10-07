"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Recorder } from "./audio-tools";
import { PaperText } from "./paper-exam";
import {
  itemStatus,
  paperScore,
  partBreakdown,
  runStages,
  stageMinutes,
  type ItemStatus,
  type Paper,
  type PaperItem,
  type PaperSlot,
} from "@/lib/papers";
import { wordCount, type PaperRun } from "@/lib/learning";

const sectionNames = ["Nghe", "Đọc", "Viết", "Nói"];
const LETTERS = "ABCD";

function Translation({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <details>
      <summary>{label}</summary>
      <div className="paper-text" lang="vi">
        {text}
      </div>
    </details>
  );
}

function SampleAnswers({ slot }: { slot: PaperSlot }) {
  if (!slot.samples.length) return null;
  return (
    <details className="paper-samples">
      <summary>Bài mẫu để đối chiếu sau khi nộp</summary>
      {slot.samples.map((sample, index) => (
        <section key={index} className="paper-sample">
          <h4>{sample.title || `Bài mẫu ${index + 1}`}</h4>
          {sample.band && (
            <p className="help-copy">Nhãn nguồn: {sample.band}</p>
          )}
          <PaperText text={sample.text} />
          {sample.translation && (
            <details>
              <summary>Bản dịch tiếng Việt</summary>
              <div className="paper-text" lang="vi">
                {sample.translation}
              </div>
            </details>
          )}
          {sample.audio.map((audio, audioIndex) => (
            <audio
              key={audio}
              className="paper-audio"
              controls
              preload="none"
              src={audio}
              aria-label={`Bài mẫu ${index + 1}, bản nghe ${audioIndex + 1}`}
            />
          ))}
        </section>
      ))}
    </details>
  );
}

/** The recording of a Listening part, replayable at a chosen speed. */
function ReviewAudio({ src, title }: { src: string; title: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [rate, setRate] = useState(1);
  return (
    <div className="review-audio">
      <audio
        ref={audio}
        className="paper-audio"
        controls
        preload="none"
        src={src}
        aria-label={`Nghe lại: ${title}`}
        onPlay={(event) => {
          event.currentTarget.playbackRate = rate;
        }}
      />
      <label>
        Tốc độ
        <select
          value={rate}
          onChange={(event) => {
            const next = Number(event.target.value);
            setRate(next);
            if (audio.current) audio.current.playbackRate = next;
          }}
        >
          <option value={0.75}>0,75×</option>
          <option value={0.9}>0,9×</option>
          <option value={1}>1×</option>
          <option value={1.15}>1,15×</option>
        </select>
      </label>
    </div>
  );
}

const MARKS: Record<Exclude<ItemStatus, "ungraded">, string> = {
  correct: "✓ Đúng",
  wrong: "✗ Sai",
  blank: "○ Bỏ trống",
};

function Mark({ status }: { status: ItemStatus }) {
  if (status === "ungraded") return null;
  return <span className={`review-mark ${status}`}>{MARKS[status]}</span>;
}

function chosenText(item: PaperItem, chosen: number | undefined) {
  return chosen === undefined
    ? "Bỏ trống"
    : `${LETTERS[chosen]}. ${item.options[chosen].text}`;
}

/** Explanation, evidence and per-option notes, shown once an answer is known. */
function Explanation({ item }: { item: PaperItem }) {
  if (item.answer === null) return null;
  return (
    <>
      <p>
        Đáp án: {LETTERS[item.answer]}. {item.options[item.answer].text}
      </p>
      {item.explanation && <p>{item.explanation}</p>}
      {item.evidence && (
        <p className="help-copy">Dẫn chứng nguồn: {item.evidence}</p>
      )}
      {item.notes.some(Boolean) && (
        <ul>
          {item.notes.map(
            (note, i) =>
              note && (
                <li key={i}>
                  {LETTERS[i]}: {note}
                </li>
              ),
          )}
        </ul>
      )}
    </>
  );
}

type RetryEntry = { item: PaperItem; slot: PaperSlot; stage: number };

/**
 * Another go at the questions a sitting got wrong or left blank, one at a
 * time with the answer shown straight after. Nothing here changes the saved
 * sitting: the result of the exam stays the result of the exam.
 */
function RetryDrill({
  entries,
  onClose,
}: {
  entries: RetryEntry[];
  onClose: () => void;
}) {
  const [queue, setQueue] = useState(entries);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const done = index >= queue.length;
  const right = queue.filter(
    (entry) => picks[entry.item.id] === entry.item.answer,
  ).length;

  if (done) {
    const missed = queue.filter(
      (entry) => picks[entry.item.id] !== entry.item.answer,
    );
    return (
      <section className="panel retry-drill" aria-label="Làm lại câu sai">
        <h2>
          Làm lại xong: đúng {right}/{queue.length} câu
        </h2>
        <p className="help-copy">
          Lượt làm lại chỉ để luyện; kết quả đã lưu của lượt thi không đổi.
        </p>
        <div className="button-row">
          {missed.length > 0 && (
            <button
              type="button"
              className="button primary"
              onClick={() => {
                setQueue(missed);
                setIndex(0);
                setPicks({});
              }}
            >
              Làm lại {missed.length} câu vẫn sai
            </button>
          )}
          <button type="button" className="button secondary" onClick={onClose}>
            Về trang kết quả
          </button>
        </div>
      </section>
    );
  }

  const { item, slot, stage } = queue[index];
  const pick = picks[item.id];
  const answered = pick !== undefined;
  return (
    <section className="panel retry-drill" aria-label="Làm lại câu sai">
      <div className="retry-head">
        <h2>
          Làm lại câu sai · {index + 1}/{queue.length}
        </h2>
        <button type="button" className="button secondary" onClick={onClose}>
          Dừng làm lại
        </button>
      </div>
      <p className="help-copy">
        {sectionNames[stage]} · {slot.part} · {slot.title}
      </p>
      {stage === 0 && slot.audio && (
        <ReviewAudio src={slot.audio} title={slot.title} />
      )}
      {stage === 1 && (
        <details className="retry-passage" open>
          <summary>Bài đọc</summary>
          <PaperText text={slot.passage} />
        </details>
      )}
      <fieldset className="paper-question">
        <legend>
          {item.number}. {item.text}
        </legend>
        {item.options.map((option, optionIndex) => (
          <label className="paper-option" key={optionIndex}>
            <input
              type="radio"
              name={`retry-${item.id}`}
              checked={pick === optionIndex}
              disabled={answered}
              onChange={() =>
                setPicks((current) => ({ ...current, [item.id]: optionIndex }))
              }
            />
            <span>
              {LETTERS[optionIndex]}. {option.text}
            </span>
          </label>
        ))}
      </fieldset>
      {answered && (
        <div className="paper-review-item" role="status">
          <Mark status={pick === item.answer ? "correct" : "wrong"} />
          <Explanation item={item} />
          {stage === 0 && slot.transcript && (
            <details>
              <summary>Bản chép lời bài nghe</summary>
              <PaperText text={slot.transcript} />
            </details>
          )}
        </div>
      )}
      <div className="button-row">
        <button
          type="button"
          className="button primary"
          disabled={!answered}
          onClick={() => setIndex(index + 1)}
        >
          {index === queue.length - 1 ? "Xem kết quả làm lại" : "Câu tiếp theo"}
        </button>
      </div>
    </section>
  );
}

function scopeLabel(run: PaperRun) {
  return run.only === undefined ? "Cả đề" : `Chỉ ${sectionNames[run.only]}`;
}

function sameMaterialAs(paper: Paper, run: PaperRun) {
  return (
    run.version === paper.version &&
    (!run.sourceHash || run.sourceHash === paper.sourceHash)
  );
}

export function PaperReview({
  paper,
  run,
  runs,
  shortLabel,
  hasActive,
  onSelect,
  onRestart,
}: {
  paper: Paper;
  run: PaperRun;
  runs: PaperRun[];
  shortLabel: string;
  hasActive: boolean;
  onSelect: (id: string) => void;
  onRestart: () => void;
}) {
  const [onlyMissed, setOnlyMissed] = useState(false);
  const [retry, setRetry] = useState<RetryEntry[] | null>(null);
  const stages = runStages(run);
  const sameMaterial = sameMaterialAs(paper, run);
  const graded = paper.graded && sameMaterial;
  const objective = stages.filter((stage) => stage < 2) as (0 | 1)[];
  const scores = paperScore(paper, run).filter((_, stage) =>
    stages.includes(stage),
  );
  const timing = stageMinutes(run);
  const missed: RetryEntry[] = graded
    ? objective.flatMap((stage) =>
        paper.sections[stage].slots.flatMap((slot) =>
          slot.items
            .filter((item) => {
              const status = itemStatus(item, run);
              return status === "wrong" || status === "blank";
            })
            .map((item) => ({ item, slot, stage })),
        ),
      )
    : [];
  const finished = runs.filter((entry) => entry.finishedAt);

  if (retry)
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">{shortLabel} · LÀM LẠI CÂU SAI</div>
            <h1>{paper.title}</h1>
          </div>
        </div>
        <RetryDrill
          entries={retry}
          onClose={() => {
            setRetry(null);
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );

  return (
    <div className="page">
      <Link href="/papers" className="help-copy">
        ← Kho đề
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {shortLabel} · ĐÃ HOÀN THÀNH
            {run.only !== undefined && ` · ${scopeLabel(run).toUpperCase()}`}
          </div>
          <h1>{paper.title}</h1>
          <p>Kết quả lưu trong bản sao dữ liệu Mây.</p>
        </div>
      </div>
      {!sameMaterial && (
        <p className="notice error">
          Học liệu của đề đã đổi từ khi làm lượt này. Giữ nguyên đáp án đã lưu;
          chưa đối chiếu điểm với khóa đáp án hiện tại.
        </p>
      )}
      {graded && scores.length > 0 && (
        <div className="stat-grid">
          {scores.map((score) => (
            <div className="stat-card" key={score.skill}>
              <span>{score.skill === "listening" ? "Nghe" : "Đọc"}</span>
              <strong>
                {score.correct}/{score.total}
              </strong>
              <small>
                Đã chọn {score.answered}/{score.total} câu · chưa quy đổi bậc
              </small>
            </div>
          ))}
        </div>
      )}
      {!paper.graded && objective.length > 0 && (
        <p className="notice">
          Đề này không có khóa đáp án. Đáp án bạn đã chọn vẫn được lưu, nhưng
          không có điểm hoặc lời giải để đối chiếu.
        </p>
      )}
      <div className="button-row paper-actions">
        {missed.length > 0 && (
          <button
            type="button"
            className="button primary"
            onClick={() => {
              setRetry(missed);
              window.scrollTo({ top: 0 });
            }}
          >
            Làm lại {missed.length} câu sai và bỏ trống
          </button>
        )}
        <button type="button" className="button secondary" onClick={onRestart}>
          {hasActive ? "Tiếp tục lượt đang làm" : "Làm lại đề này"}
        </button>
        {runs.length > 1 && (
          <select
            aria-label="Xem lượt thi"
            value={run.id}
            onChange={(event) => onSelect(event.target.value)}
          >
            {runs.map((entry, index) => (
              <option key={entry.id} value={entry.id}>
                Lượt {index + 1} · {scopeLabel(entry)} ·{" "}
                {new Date(entry.startedAt).toLocaleDateString("vi-VN")}
              </option>
            ))}
          </select>
        )}
      </div>

      {(timing.length > 0 || (graded && objective.length > 0)) && (
        <div className="review-summary">
          {timing.length > 0 && (
            <section className="panel">
              <h2>Thời gian đã dùng</h2>
              <table className="review-table">
                <thead>
                  <tr>
                    <th scope="col">Phần</th>
                    <th scope="col">Đã dùng</th>
                    <th scope="col">Thời gian của phần</th>
                  </tr>
                </thead>
                <tbody>
                  {timing.map(({ stage, minutes }) => (
                    <tr key={stage}>
                      <th scope="row">{sectionNames[stage]}</th>
                      <td>
                        {minutes < 1
                          ? "dưới 1 phút"
                          : `${Math.round(minutes)} phút`}
                      </td>
                      <td>{paper.sections[stage].minutes} phút</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {graded && objective.length > 0 && (
            <section className="panel">
              <h2>Kết quả theo từng phần</h2>
              <table className="review-table">
                <thead>
                  <tr>
                    <th scope="col">Phần</th>
                    <th scope="col">Đúng</th>
                    <th scope="col">Sai</th>
                    <th scope="col">Bỏ trống</th>
                  </tr>
                </thead>
                <tbody>
                  {objective.flatMap((stage) =>
                    partBreakdown(paper, run, stage).map((part) => (
                      <tr key={`${stage}-${part.part}`}>
                        <th scope="row">
                          {sectionNames[stage]} · {part.part}
                        </th>
                        <td>
                          {part.correct}/{part.total}
                        </td>
                        <td>{part.wrong}</td>
                        <td>{part.blank}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}

      {finished.length > 1 && (
        <section className="panel review-attempts">
          <h2>Các lượt đã làm đề này</h2>
          <table className="review-table">
            <thead>
              <tr>
                <th scope="col">Lượt</th>
                <th scope="col">Ngày</th>
                <th scope="col">Phần đã làm</th>
                <th scope="col">Nghe</th>
                <th scope="col">Đọc</th>
              </tr>
            </thead>
            <tbody>
              {finished.map((entry) => {
                const comparable = paper.graded && sameMaterialAs(paper, entry);
                const [listening, reading] = paperScore(paper, entry);
                const sat = runStages(entry);
                const cell = (stage: number, score: typeof listening) =>
                  !sat.includes(stage)
                    ? "—"
                    : comparable
                      ? `${score.correct}/${score.total}`
                      : "không chấm";
                return (
                  <tr
                    key={entry.id}
                    aria-current={entry.id === run.id ? "true" : undefined}
                  >
                    <th scope="row">{runs.indexOf(entry) + 1}</th>
                    <td>
                      {new Date(entry.startedAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td>{scopeLabel(entry)}</td>
                    <td>{cell(0, listening)}</td>
                    <td>{cell(1, reading)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {graded && objective.length > 0 && (
        <fieldset className="review-filter">
          <legend>Hiện câu hỏi Nghe và Đọc</legend>
          <label>
            <input
              type="radio"
              name="review-filter"
              checked={!onlyMissed}
              onChange={() => setOnlyMissed(false)}
            />
            Tất cả câu
          </label>
          <label>
            <input
              type="radio"
              name="review-filter"
              checked={onlyMissed}
              onChange={() => setOnlyMissed(true)}
            />
            Chỉ câu sai và bỏ trống ({missed.length})
          </label>
        </fieldset>
      )}

      {stages.map((index) => {
        const section = paper.sections[index];
        const slots = section.slots
          .map((slot) => ({
            slot,
            items:
              onlyMissed && graded
                ? slot.items.filter((item) => {
                    const status = itemStatus(item, run);
                    return status === "wrong" || status === "blank";
                  })
                : slot.items,
          }))
          .filter(
            ({ items }) =>
              !(onlyMissed && graded) || index > 1 || items.length > 0,
          );
        return (
          <section className="panel paper-review" key={section.skill}>
            <h2>
              {index + 1}. {sectionNames[index]}
            </h2>
            {slots.length === 0 && (
              <p className="help-copy">
                Không có câu sai hay bỏ trống trong phần này.
              </p>
            )}
            {slots.map(({ slot, items }) => {
              const marks = slot.items.map((item) => itemStatus(item, run));
              const wrong = marks.filter(
                (mark) => mark === "wrong" || mark === "blank",
              ).length;
              return (
                <details key={slot.id}>
                  <summary>
                    {slot.part} · {slot.title}
                    {graded && slot.items.length > 0 && (
                      <span className="review-count">
                        {" "}
                        · đúng {slot.items.length - wrong}/{slot.items.length}
                      </span>
                    )}
                  </summary>
                  {index === 0 && slot.audio && (
                    <ReviewAudio src={slot.audio} title={slot.title} />
                  )}
                  {slot.passage && <PaperText text={slot.passage} />}
                  <Translation
                    label="Bản dịch bài đọc"
                    text={slot.passageTranslation}
                  />
                  {slot.transcript && (
                    <details>
                      <summary>Bản chép lời bài nghe</summary>
                      <PaperText text={slot.transcript} />
                      <Translation
                        label="Bản dịch bài nghe"
                        text={slot.transcriptTranslation}
                      />
                    </details>
                  )}
                  {slot.prompt && <PaperText text={slot.prompt} />}
                  <Translation
                    label="Bản dịch đề bài"
                    text={slot.promptTranslation}
                  />
                  {slot.cues.length > 0 && (
                    <ul>
                      {slot.cues.map((cue, i) => (
                        <li key={i}>{cue}</li>
                      ))}
                    </ul>
                  )}
                  {items.map((item) => (
                    <div className="paper-review-item" key={item.id}>
                      <strong>
                        {item.number}. {item.text}
                      </strong>{" "}
                      {sameMaterial && <Mark status={itemStatus(item, run)} />}
                      <p>Đã chọn: {chosenText(item, run.answers[item.id])}</p>
                      {(item.translation ||
                        item.options.some((option) => option.translation)) && (
                        <details>
                          <summary>Bản dịch câu hỏi và lựa chọn</summary>
                          {item.translation && (
                            <p lang="vi">{item.translation}</p>
                          )}
                          <ul lang="vi">
                            {item.options.map(
                              (option, optionIndex) =>
                                option.translation && (
                                  <li key={optionIndex}>
                                    {LETTERS[optionIndex]}. {option.translation}
                                  </li>
                                ),
                            )}
                          </ul>
                        </details>
                      )}
                      {sameMaterial && <Explanation item={item} />}
                    </div>
                  ))}
                  {section.skill === "writing" && (
                    <>
                      <h4>Bài viết của bạn</h4>
                      <p className="help-copy">
                        {wordCount(run.essays[slot.id] ?? "")} từ
                        {slot.wordMin
                          ? ` · đề yêu cầu ít nhất ${slot.wordMin} từ`
                          : ""}
                      </p>
                      <PaperText
                        text={run.essays[slot.id] || "Chưa có bài làm"}
                      />
                    </>
                  )}
                  {section.skill === "speaking" &&
                    run.spoken.includes(slot.id) && (
                      <Recorder id={`paper-${run.id}-${slot.id}`} readOnly />
                    )}
                  <SampleAnswers slot={slot} />
                </details>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
