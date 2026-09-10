"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Lightbulb,
  Search,
  Sparkles,
} from "lucide-react";
import { lessons, skillNames, type Lesson, type Question } from "@/lib/content";
import {
  scoreAnswers,
  wordCount,
  type Attempt,
  type Confidence,
} from "@/lib/learning";
import { useStudy } from "./study-provider";
import { SkillIcon } from "./icons";
import { AudioPlayer, Recorder } from "./audio-tools";
import { getRecording, saveRecording } from "@/lib/recordings";
import { readQuizDraft } from "@/lib/quiz-draft";
export function PracticeLibrary() {
  const params = useSearchParams();
  const initial = params.get("skill");
  const [skill, setSkill] = useState(
    initial && ["listening", "reading", "writing", "speaking"].includes(initial)
      ? initial
      : "all",
  );
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const { state } = useStudy();
  const filtered = lessons.filter(
    (l) =>
      (skill === "all" || l.skill === skill) &&
      (level === "all" || l.level === level) &&
      `${l.title} ${l.topic} ${l.subtitle}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <BookOpen size={15} />
            PRACTICE MAKES PROGRESS
          </div>
          <h1>Mỗi kỹ năng, một chút vững vàng.</h1>
          <p>Chọn một bài vừa sức. Học chậm cũng được, miễn là mình hiểu.</p>
        </div>
        <span className="pill">{lessons.length} bài tự biên soạn</span>
      </div>
      <div className="filters">
        {(["all", "listening", "reading", "writing", "speaking"] as const).map(
          (s) => (
            <button
              className={`filter ${skill === s ? "active" : ""}`}
              onClick={() => setSkill(s)}
              key={s}
              aria-pressed={skill === s}
            >
              {s === "all" ? "Tất cả" : skillNames[s]}
            </button>
          ),
        )}
        <input
          className="search-input"
          aria-label="Tìm bài học"
          placeholder="Tìm chủ đề, bài học…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="filters">
        <label
          className="field"
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          Mức bài
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Mức bài"
            style={{ minHeight: 35, padding: "4px 10px", width: 130 }}
          >
            <option value="all">B1 và B2</option>
            <option>B1</option>
            <option>B2</option>
          </select>
        </label>
      </div>
      {filtered.length ? (
        <div className="lesson-grid">
          {filtered.map((l) => {
            const done = state.attempts.some((a) => a.lessonId === l.id);
            return (
              <Link
                className="lesson-card"
                href={`/practice/${l.id}`}
                key={l.id}
              >
                <div className="card-top">
                  <SkillIcon skill={l.skill} />
                  <span className="pill">
                    {l.level} · {l.topic}
                  </span>
                </div>
                <div className="lesson-kicker">
                  {skillNames[l.skill]} · {l.part}
                </div>
                <h2>{l.title}</h2>
                <p>{l.subtitle}</p>
                <div className="card-bottom">
                  <span>
                    {done
                      ? "✓ Đã khám phá"
                      : `${l.minutes} phút · ${l.questions.length ? `${l.questions.length} câu` : "Thực hành"}`}
                  </span>
                  <ArrowRight size={16} />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={32} />
          <h2>Chưa có bài phù hợp</h2>
          <p>Thử một từ khóa ngắn hơn hoặc đổi bộ lọc nhé.</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setSkill("all");
              setLevel("all");
            }}
          >
            Xoá bộ lọc
          </button>
        </div>
      )}
      <p className="help-copy">
        Bài ngắn phục vụ học kỹ năng, không phải đề thi chính thức. Mức B1/B2 là
        mức biên soạn dự kiến, chưa được chuẩn hoá bằng khảo thí.
      </p>
    </div>
  );
}
export function QuestionCard({
  question,
  index,
  chosen,
  submitted,
  onChoose,
  confidence,
  onConfidence,
}: {
  question: Question;
  index: number;
  chosen?: number;
  submitted: boolean;
  onChoose: (value: number) => void;
  confidence?: Confidence;
  onConfidence?: (value: Confidence) => void;
}) {
  return (
    <fieldset className="question">
      <legend>
        {index + 1}. {question.text}
      </legend>
      {question.options.map((option, i) => (
        <label
          key={i}
          className={`option ${chosen === i ? "chosen" : ""} ${submitted && i === question.answer ? "correct" : ""} ${submitted && chosen === i && i !== question.answer ? "wrong" : ""}`}
        >
          <input
            type="radio"
            name={question.id}
            value={i}
            checked={chosen === i}
            disabled={submitted}
            onChange={() => onChoose(i)}
          />
          <span>
            <strong style={{ fontWeight: 500 }}>{"ABCD"[i]}.</strong> {option}
          </span>
        </label>
      ))}
      {onConfidence && chosen !== undefined && !submitted && (
        <div className="confidence-check" aria-label="Mức độ chắc chắn">
          <span>Bạn chắc đến đâu?</span>
          <div>
            {(
              [
                ["guess", "Đoán"],
                ["unsure", "Chưa chắc"],
                ["sure", "Rất chắc"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={confidence === value ? "selected" : ""}
                aria-pressed={confidence === value}
                onClick={() => onConfidence(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {submitted && (
        <div className="explanation">
          <strong>
            {chosen === question.answer
              ? "Chính xác."
              : chosen === undefined
                ? "Bạn chưa chọn đáp án."
                : "Mình xem lại một chút nhé."}
          </strong>{" "}
          {question.explanation}
        </div>
      )}
    </fieldset>
  );
}
export function PracticeSession({ lesson }: { lesson: Lesson }) {
  const { state, update, addAttempt, toast } = useStudy();
  const [result, setResult] = useState<Attempt | null>(null);
  const draft = readQuizDraft(state.drafts[`quiz:${lesson.id}`], lesson);
  const answers = result?.answers ?? draft.answers;
  const confidence = result?.confidence ?? draft.confidence;
  const seconds = result?.seconds ?? draft.seconds;
  const [checks, setChecks] = useState<string[]>([]);
  const [hasRecording, setHasRecording] = useState(false);
  const text = state.drafts[lesson.id] ?? "";
  const started = useRef(0);
  const lock = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    started.current = Date.now();
    const activity = () => {
      started.current = Date.now();
    };
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    window.addEventListener("scroll", activity, true);
    const t = setInterval(() => {
      if (
        !document.hidden &&
        !lock.current &&
        Date.now() - started.current < 120000
      )
        update((s) => {
          const current = readQuizDraft(s.drafts[`quiz:${lesson.id}`], lesson);
          return {
            ...s,
            drafts: {
              ...s.drafts,
              [`quiz:${lesson.id}`]: JSON.stringify({
                ...current,
                seconds: Math.min(18000, current.seconds + 1),
              }),
            },
          };
        });
    }, 1000);
    return () => {
      clearInterval(t);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("scroll", activity, true);
    };
  }, [lesson, update]);
  const checklist =
    lesson.skill === "writing"
      ? [
          "Mình đã trả lời đủ các yêu cầu trong đề.",
          "Các đoạn có ý chính và nối với nhau hợp lý.",
          "Mình đã kiểm tra thì, mạo từ, số ít/số nhiều.",
          "Từ vựng phù hợp và không lặp lại quá nhiều.",
        ]
      : [
          "Mình đã trả lời trực tiếp và giải thích lý do.",
          "Mình đã thêm ví dụ hoặc so sánh khi cần.",
          "Mình nghe lại và nhận ra một chỗ cần cải thiện.",
          "Mình nói rõ, có ngắt nghỉ, không đọc cả bài soạn sẵn.",
        ];
  async function submit() {
    if (lock.current) return;
    setError("");
    if (
      lesson.questions.length &&
      lesson.questions.some((q) => answers[q.id] === undefined)
    ) {
      setError(
        "Bạn còn câu chưa trả lời. Chọn đáp án cho từng câu trước khi xem kết quả nhé.",
      );
      return;
    }
    if (
      lesson.questions.length &&
      lesson.questions.some((q) => confidence[q.id] === undefined)
    ) {
      setError(
        "Chọn mức độ chắc chắn cho từng câu để Mây nhận ra phần Gùa đang hiểu nhầm và xếp lịch ôn đúng hơn.",
      );
      return;
    }
    if (lesson.skill === "writing" && wordCount(text) < 10) {
      setError("Hãy viết ít nhất một đoạn ngắn (10 từ) trước khi hoàn thành.");
      return;
    }
    if (lesson.skill === "speaking" && !hasRecording) {
      setError(
        "Ghi âm câu trả lời trước khi hoàn thành để có thể nghe lại và cải thiện nhé.",
      );
      return;
    }
    const a: Attempt = {
      id: crypto.randomUUID(),
      lessonId: lesson.id,
      skill: lesson.skill,
      date: new Date().toISOString(),
      answers,
      confidence,
      ...scoreAnswers(lesson.id, answers),
      seconds,
      text: lesson.skill === "writing" ? text : undefined,
      reflection: checks,
    };
    lock.current = true;
    if (lesson.skill === "speaking") {
      try {
        const blob = await getRecording(lesson.id);
        if (!blob) throw Error("missing");
        await saveRecording(a.id, blob);
        a.recordingId = a.id;
      } catch {
        lock.current = false;
        setError(
          "Chưa lưu được bản ghi vào lịch sử. Tải bản ghi xuống, kiểm tra dung lượng thiết bị rồi thử lại.",
        );
        return;
      }
    }
    addAttempt(a);
    setResult(a);
    update((s) => ({
      ...s,
      drafts: { ...s.drafts, [`quiz:${lesson.id}`]: "" },
    }));
    toast(`Đã lưu buổi học. Một bước tiến nhỏ của ${state.profile.name}!`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function retry() {
    lock.current = false;
    setResult(null);
    update((s) => ({
      ...s,
      drafts: { ...s.drafts, [`quiz:${lesson.id}`]: "" },
    }));
    setError("");
    setChecks([]);
    started.current = Date.now();
  }
  return (
    <div className="page">
      <Link className="back-link" href="/practice">
        <ArrowLeft size={15} />
        Về kho bài học
      </Link>
      <div className="study-header">
        <div>
          <div className="eyebrow">
            {skillNames[lesson.skill]} · {lesson.part} · {lesson.level}
          </div>
          <h1>{lesson.title}</h1>
          <p>{lesson.subtitle}</p>
        </div>
        <span className="timer">
          <Clock3 size={16} />
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          <span className="muted" style={{ fontSize: 11 }}>
            {" "}
            / {lesson.minutes} phút gợi ý
          </span>
        </span>
      </div>
      {result && (
        <div className="result-banner">
          <span className="result-score">
            {result.total ? (
              `${result.correct}/${result.total}`
            ) : (
              <CheckCircle2 size={35} />
            )}
          </span>
          <div>
            <h2>
              {result.total
                ? result.correct === result.total
                  ? "Một bài luyện thật vững vàng!"
                  : "Mỗi lỗi sai là một điều mình vừa học."
                : `${state.profile.name} đã dành thời gian để luyện tập.`}
            </h2>
            <p>
              {result.total
                ? "Đây là kết quả bài ngắn, không quy đổi thành điểm VSTEP. Câu sai đã vào sổ tay."
                : "Đã lưu bài làm và phần tự kiểm tra. Chưa có điểm chấm của giáo viên hoặc AI."}
            </p>
            <div className="result-actions">
              <button className="button secondary small" onClick={retry}>
                Luyện lại
              </button>
              <Link
                className="button primary small"
                href={result.total ? "/mistakes" : "/progress"}
              >
                {result.total ? "Mở sổ tay lỗi sai" : "Xem lịch sử"}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
      <div className="practice-layout">
        <div
          className="panel reading-panel"
          tabIndex={0}
          role="region"
          aria-label="Ngữ liệu và hướng dẫn bài học"
        >
          <div className="panel-label">
            {lesson.skill === "reading"
              ? "READ THE PASSAGE"
              : lesson.skill === "listening"
                ? "LISTEN CAREFULLY"
                : "YOUR TASK"}
          </div>
          {lesson.skill === "listening" ? (
            <>
              <AudioPlayer text={lesson.text} />
              {result && (
                <details open>
                  <summary>Bản chép lời</summary>
                  <div className="passage">{lesson.text}</div>
                </details>
              )}
            </>
          ) : (
            <div className="passage" lang="en">
              {lesson.text}
            </div>
          )}
          <div style={{ marginTop: 24 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              <Lightbulb size={18} />
              <h3>Một gợi ý nhỏ</h3>
            </div>
            <ul className="tips-list">
              {lesson.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          {lesson.sample && result && (
            <details>
              <summary>Tham khảo một cách triển khai</summary>
              <div className="passage" lang="en">
                {lesson.sample}
              </div>
              <p className="help-copy">
                Bài mẫu tự biên soạn để tham khảo cách triển khai, không phải
                đáp án duy nhất hay bài được giám khảo chứng nhận.
              </p>
            </details>
          )}
        </div>
        <div>
          {lesson.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              chosen={answers[q.id]}
              submitted={Boolean(result)}
              confidence={confidence[q.id]}
              onChoose={(value) => {
                update((s) => {
                  const current = readQuizDraft(
                    s.drafts[`quiz:${lesson.id}`],
                    lesson,
                  );
                  return {
                    ...s,
                    drafts: {
                      ...s.drafts,
                      [`quiz:${lesson.id}`]: JSON.stringify({
                        answers: { ...current.answers, [q.id]: value },
                        confidence: current.confidence,
                        seconds: current.seconds,
                      }),
                    },
                  };
                });
              }}
              onConfidence={(value) => {
                update((s) => {
                  const current = readQuizDraft(
                    s.drafts[`quiz:${lesson.id}`],
                    lesson,
                  );
                  return {
                    ...s,
                    drafts: {
                      ...s.drafts,
                      [`quiz:${lesson.id}`]: JSON.stringify({
                        answers: current.answers,
                        confidence: { ...current.confidence, [q.id]: value },
                        seconds: current.seconds,
                      }),
                    },
                  };
                });
              }}
            />
          ))}
          {lesson.skill === "writing" && (
            <>
              <textarea
                className="writing-area"
                aria-label="Bài viết của bạn"
                lang="en"
                placeholder="Start with one sentence. The rest will follow…"
                value={text}
                readOnly={Boolean(result)}
                maxLength={30000}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    drafts: { ...s.drafts, [lesson.id]: e.target.value },
                  }))
                }
              />
              <div className="editor-status">
                <span>
                  {wordCount(text)} / {lesson.minWords} từ tối thiểu
                </span>
                <span>Nháp được lưu trên thiết bị</span>
              </div>
              {wordCount(text) > 0 &&
                wordCount(text) < (lesson.minWords ?? 0) && (
                  <p className="help-copy">
                    Còn thiếu {(lesson.minWords ?? 0) - wordCount(text)} từ so
                    với yêu cầu đề. Bạn vẫn có thể lưu một bài đang tập viết.
                  </p>
                )}
            </>
          )}
          {lesson.skill === "speaking" && (
            <section className="panel">
              <h2>Giọng nói của mình</h2>
              <Recorder id={lesson.id} onReady={setHasRecording} />
            </section>
          )}
          {!lesson.questions.length && (
            <section className="panel checklist" style={{ marginTop: 20 }}>
              <h2>Tự nhìn lại bài làm</h2>
              <p className="help-copy">
                Đánh dấu điều bạn thực sự đã làm được. Đây là tự kiểm tra, không
                phải điểm chấm.
              </p>
              {checklist.map((c) => (
                <label key={c}>
                  <input
                    type="checkbox"
                    disabled={Boolean(result)}
                    checked={checks.includes(c)}
                    onChange={(e) =>
                      setChecks((prev) =>
                        e.target.checked
                          ? [...prev, c]
                          : prev.filter((v) => v !== c),
                      )
                    }
                  />
                  {c}
                </label>
              ))}
            </section>
          )}
          {error && (
            <p className="notice error" role="alert" style={{ marginTop: 15 }}>
              {error}
            </p>
          )}
          {!result && (
            <div className="answer-submit">
              <p>
                {lesson.questions.length
                  ? `${Object.keys(answers).length}/${lesson.questions.length} câu đã trả lời · ${Object.keys(confidence).length}/${lesson.questions.length} mức chắc chắn`
                  : "Một lần thực hành là một lần tiến bộ."}
              </p>
              <button className="button primary" onClick={submit}>
                {lesson.questions.length
                  ? "Xem kết quả"
                  : "Hoàn thành buổi luyện"}
                <Sparkles size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
