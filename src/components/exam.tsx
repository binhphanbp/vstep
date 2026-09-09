"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Headphones,
  Timer,
} from "lucide-react";
import { useStudy } from "./study-provider";
import { advanceExam, getExamStages, wordCount } from "@/lib/learning";
import { allLessons as lessons } from "@/lib/full-exam-content";
import { SkillIcon } from "./icons";
import { AudioPlayer, Recorder } from "./audio-tools";
import { QuestionCard } from "./practice";
export function ExamPage() {
  const { state, update, addAttempt } = useStudy();
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"mini" | "full">("mini");
  const [sections, setSections] = useState<Record<number, number>>({});
  const exam = state.exam;
  const examStages = getExamStages(exam?.mode ?? mode);
  const full = (exam?.mode ?? mode) === "full";
  useEffect(() => {
    const tick = () => {
      const time = Date.now();
      setNow(time);
      update((s) =>
        s.exam && !s.exam.finished && time >= s.exam.deadline
          ? advanceExam(s, time)
          : s,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [update]);
  useEffect(() => {
    if (!exam || exam.finished) return;
    const leave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [exam?.id, exam?.finished, exam]);
  function start() {
    const time = Date.now();
    update((s) =>
      s.exam
        ? s
        : {
            ...s,
            exam: {
              id: crypto.randomUUID(),
              mode,
              startedAt: time,
              stage: 0,
              deadline: time + examStages[0].seconds * 1000,
              answers: {},
              writing: "",
              writingTask2: "",
              finished: false,
            },
          },
    );
    setNow(time);
  }
  function finishStage() {
    const submitting = exam;
    if (!submitting || submitting.finished) return;
    if (
      !window.confirm(
        exam?.stage === 3
          ? "Kết thúc buổi luyện và lưu kết quả hiện có?"
          : "Nộp phần này và chuyển tiếp? Bạn sẽ không quay lại sửa phần đã nộp.",
      )
    )
      return;
    update((s) =>
      s.exam?.id === submitting.id && s.exam.stage === submitting.stage
        ? advanceExam(s, Date.now(), true)
        : s,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (!exam)
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <Timer size={15} />A QUIET PLACE TO CHALLENGE YOURSELF
            </div>
            <h1>Tập bình tĩnh, trước ngày thi thật.</h1>
            <p>
              Luyện chuyển kỹ năng và phân bổ thời gian trong một buổi có đồng
              hồ.
            </p>
          </div>
        </div>
        <div className="content-grid">
          <section className="panel">
            <div className="filters">
              <button
                className={`filter ${!full ? "active" : ""}`}
                onClick={() => setMode("mini")}
                aria-pressed={!full}
              >
                Rút gọn · 51 phút
              </button>
              <button
                className={`filter ${full ? "active" : ""}`}
                onClick={() => setMode("full")}
                aria-pressed={full}
              >
                Đủ cấu trúc · 172 phút
              </button>
            </div>
            <span className="pill">
              {full
                ? "Đề tự biên soạn số 01 · Đủ cấu trúc"
                : "Mô phỏng rút gọn · 51 phút"}
            </span>
            <h2 style={{ fontSize: 26, margin: "17px 0" }}>
              Một vòng luyện, đủ bốn kỹ năng.
            </h2>
            <p className="body-text muted">
              {full
                ? "35 câu Nghe qua 3 phần, 40 câu Đọc qua 4 văn bản, email và essay, cả 3 phần Nói. Luyện sức bền và cách phân bổ thời gian theo khung VSTEP bậc 3–5."
                : "8 câu Nghe, 10 câu Đọc, 1 email và một phần Nói tương tác xã hội. Bài tập lấy từ kho bài Mây để luyện thao tác, không dùng đo trình độ đầu vào."}
            </p>
            <div className="stack" style={{ marginTop: 22 }}>
              {examStages.map((s, i) => (
                <div className="history-row" key={s.skill}>
                  <SkillIcon skill={s.skill} />
                  <div>
                    <h3>
                      {i + 1}. {s.label}
                    </h3>
                    <small>
                      {s.seconds / 60} phút ·{" "}
                      {full
                        ? [
                            "35 câu · 8 / 12 / 15 câu từng phần",
                            "40 câu · 4 bài đọc",
                            "Email 120 từ + essay 250 từ",
                            "3 phần · tương tác, giải pháp, chủ đề",
                          ][i]
                        : i === 0
                          ? "2 bài nghe"
                          : i === 1
                            ? "2 bài đọc"
                            : i === 2
                              ? "Email tối thiểu 120 từ"
                              : "Ghi âm câu trả lời"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            <div className="notice" style={{ marginTop: 22 }}>
              {full
                ? "Đủ số câu và thời lượng theo khung, nhưng nội dung chưa được giáo viên thẩm định độ khó. Bài nghe dùng giọng tổng hợp, cho phép nghe lại; không phải bản thu kỳ thi thật. Viết/Nói chưa được chấm."
                : "Đây chưa phải một đề VSTEP đầy đủ. Bài thi chính thức dài hơn, có 35 câu Nghe, 40 câu Đọc, 2 bài Viết và 3 phần Nói."}{" "}
              Không quy đổi kết quả buổi này sang B1/B2/C1.
            </div>
            <label
              className="field"
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <input
                type="checkbox"
                checked={ready}
                onChange={(e) => setReady(e.target.checked)}
                style={{ width: 18, minHeight: 18, marginTop: 4 }}
              />
              <span style={{ fontSize: 13, fontWeight: 400 }}>
                Mình có thời gian, đã kiểm tra âm thanh và hiểu đồng hồ vẫn chạy
                khi rời trang hoặc tải lại.
              </span>
            </label>
            <button
              className="button primary"
              style={{ marginTop: 22 }}
              disabled={!ready}
              onClick={start}
            >
              Bắt đầu {full ? 172 : 51} phút của mình
              <ArrowRight size={16} />
            </button>
          </section>
          <aside className="stack">
            <section className="panel">
              <h2>
                <Headphones
                  size={19}
                  style={{ display: "inline", marginRight: 8 }}
                />
                Kiểm tra trước khi bắt đầu
              </h2>
              <p className="help-copy">
                Chuẩn bị tai nghe, chỗ ngồi yên tĩnh và cho phép micro khi đến
                phần Nói. Bấm phát để kiểm tra giọng tiếng Anh trên thiết bị.
              </p>
              <div style={{ marginTop: 16 }}>
                <AudioPlayer text="Welcome to your practice session. Please check that you can hear this sentence clearly." />
              </div>
            </section>
            <section className="vocab-teaser">
              <h2>Một lần tập, bớt một chút lo.</h2>
              <p>
                Đừng tra đáp án giữa buổi. Sau khi hoàn thành, mình sẽ cùng nhìn
                lại các câu cần ôn.
              </p>
              <Link className="button secondary" href="/guide">
                Tìm hiểu kỳ thi chính thức
                <ArrowRight size={14} />
              </Link>
            </section>
          </aside>
        </div>
      </div>
    );
  if (exam.finished) {
    const result = state.attempts.filter((a) =>
      a.id.startsWith(`exam:${exam.id}:`),
    );
    const objective = result.filter((a) => a.total > 0);
    const correct = objective.reduce((s, a) => s + a.correct, 0);
    const total = objective.reduce((s, a) => s + a.total, 0);
    return (
      <div className="page">
        <div className="result-banner">
          <CheckCircle2 size={42} />
          <div>
            <h1>Buổi luyện đã khép lại.</h1>
            <p>Mình xem lại điều đã làm được và chỗ cần thêm thời gian nhé.</p>
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <span>Nghe & Đọc</span>
            <strong>
              {correct}/{total}
            </strong>
            <small>Câu đúng · không phải điểm VSTEP</small>
          </div>
          <div className="stat-card">
            <span>Bài viết</span>
            <strong>
              {wordCount(exam.writing) + wordCount(exam.writingTask2 ?? "")}
              <small> từ</small>
            </strong>
            <small>
              {exam.writing || exam.writingTask2
                ? "Đã lưu · chưa được chấm"
                : "Chưa có bài làm"}
            </small>
          </div>
        </div>
        <div className="button-row">
          <Link className="button primary" href="/mistakes">
            Xem các câu cần ôn
            <ArrowRight size={16} />
          </Link>
          <Link className="button secondary" href="/progress">
            Lịch sử bài làm
          </Link>
          <button
            className="button secondary"
            onClick={() => {
              update((s) => ({ ...s, exam: null }));
              setReady(false);
              setSections({});
            }}
          >
            Chuẩn bị lượt mới
          </button>
        </div>
        <p className="help-copy">
          Kết quả lượt cũ vẫn nằm trong lịch sử. Bài Nói được lưu trên thiết bị
          nếu bạn đã ghi âm; chưa có điểm chấm tự động.
        </p>
        <section className="panel" style={{ marginTop: 25 }}>
          <h2>Nghe lại phần Nói</h2>
          {examStages[3].lessonIds.map((id) => (
            <div key={id}>
              <p className="help-copy">
                {lessons.find((l) => l.id === id)?.part}
              </p>
              <Recorder
                id={full ? `exam-${exam.id}-${id}` : `exam-${exam.id}`}
                readOnly
              />
            </div>
          ))}
        </section>
        {exam.writing && (
          <details>
            <summary>Xem bài email đã nộp</summary>
            <div className="passage" lang="en">
              {exam.writing}
            </div>
          </details>
        )}
        {exam.writingTask2 && (
          <details>
            <summary>Xem bài essay đã nộp</summary>
            <div className="passage" lang="en">
              {exam.writingTask2}
            </div>
          </details>
        )}
        {examStages
          .slice(0, 2)
          .flatMap((s) => s.lessonIds)
          .map((id) => {
            const lesson = lessons.find((l) => l.id === id)!;
            return (
              <details key={id}>
                <summary>{lesson.title} · Xem đáp án và giải thích</summary>
                {lesson.questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    chosen={exam.answers[q.id]}
                    submitted
                    onChoose={() => {}}
                  />
                ))}
              </details>
            );
          })}
      </div>
    );
  }
  const stage = examStages[exam.stage];
  const remaining = Math.max(0, Math.ceil((exam.deadline - now) / 1000));
  const currentLessons = stage.lessonIds.map((id) =>
    lessons.find((l) => l.id === id)!,
  );
  const activeIndex = Math.min(
    sections[exam.stage] ?? 0,
    currentLessons.length - 1,
  );
  return (
    <div className="page">
      <div className="study-header">
        <div>
          <div className="eyebrow">
            {full ? "ĐỀ ĐỦ CẤU TRÚC" : "MÔ PHỎNG RÚT GỌN"} · PHẦN{" "}
            {exam.stage + 1}/4
          </div>
          <h1>{stage.label}: cứ tập trung từng bước.</h1>
        </div>
        <span
          className={`timer ${remaining < 60 ? "urgent" : ""}`}
          role="timer"
        >
          <Clock3 size={18} />
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="exam-stages">
        {examStages.map((s, i) => (
          <div
            key={s.skill}
            className={`exam-stage ${i === exam.stage ? "current" : i < exam.stage ? "complete" : ""}`}
          >
            <SkillIcon skill={s.skill} size={18} />
            {i + 1}. {s.label}
            {i < exam.stage ? " ✓" : ""}
          </div>
        ))}
      </div>
      <p className="help-copy" style={{ marginBottom: 20 }}>
        Hết giờ sẽ tự lưu và chuyển phần. Các đáp án được lưu ngay trên thiết
        bị. Đồng hồ không dừng khi rời trang.
      </p>
      <label className="field" style={{ marginBottom: 22 }}>
        <span>
          {stage.skill === "writing"
            ? "Chọn bài viết"
            : stage.skill === "speaking"
              ? "Chọn phần Nói"
              : "Chọn ngữ liệu"}
        </span>
        <select
          value={activeIndex}
          onChange={(e) =>
            setSections((s) => ({ ...s, [exam.stage]: Number(e.target.value) }))
          }
        >
          {currentLessons.map((l, i) => (
            <option key={l.id} value={i}>
              {i + 1}. {l.part} · {l.title}
              {l.questions.length
                ? ` (${l.questions.filter((q) => exam.answers[q.id] !== undefined).length}/${l.questions.length} đã chọn)`
                : ""}
            </option>
          ))}
        </select>
      </label>
      {currentLessons.slice(activeIndex, activeIndex + 1).map((lesson) => (
        <div
          className="practice-layout"
          key={lesson.id}
          style={{ marginBottom: 30 }}
        >
          <section className="panel">
            <div className="panel-label">{lesson.title}</div>
            {lesson.skill === "listening" ? (
              <AudioPlayer text={lesson.text} allowSpeed={false} />
            ) : (
              <div
                className="passage"
                lang="en"
                tabIndex={0}
                role="region"
                aria-label="Ngữ liệu của phần thi"
              >
                {lesson.text}
              </div>
            )}
          </section>
          <div>
            {lesson.questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={
                  currentLessons
                    .slice(0, activeIndex)
                    .reduce((n, l) => n + l.questions.length, 0) + i
                }
                chosen={exam.answers[q.id]}
                submitted={false}
                onChoose={(value) =>
                  update((s) =>
                    s.exam && !s.exam.finished && Date.now() < s.exam.deadline
                      ? {
                          ...s,
                          exam: {
                            ...s.exam,
                            answers: { ...s.exam.answers, [q.id]: value },
                          },
                        }
                      : s,
                  )
                }
              />
            ))}
            {lesson.skill === "writing" && (
              <>
                <textarea
                  className="writing-area"
                  aria-label="Bài viết trong phòng thi"
                  placeholder={
                    lesson.id === "writing-essay"
                      ? "Write your essay here…"
                      : "Write your email here…"
                  }
                  value={
                    lesson.id === "writing-essay"
                      ? (exam.writingTask2 ?? "")
                      : exam.writing
                  }
                  maxLength={30000}
                  onChange={(e) =>
                    update((s) =>
                      s.exam && !s.exam.finished && Date.now() < s.exam.deadline
                        ? {
                            ...s,
                            exam: {
                              ...s.exam,
                              [lesson.id === "writing-essay"
                                ? "writingTask2"
                                : "writing"]: e.target.value,
                            },
                          }
                        : s,
                    )
                  }
                />
                <div className="editor-status">
                  <span>
                    {wordCount(
                      lesson.id === "writing-essay"
                        ? (exam.writingTask2 ?? "")
                        : exam.writing,
                    )}{" "}
                    / {lesson.minWords} từ tối thiểu
                  </span>
                  <span>Đang lưu trên thiết bị</span>
                </div>
              </>
            )}
            {lesson.skill === "speaking" && (
              <section className="panel">
                <h2>Phần trả lời của bạn</h2>
                <Recorder
                  id={full ? `exam-${exam.id}-${lesson.id}` : `exam-${exam.id}`}
                  onReady={(has, duration) => {
                    if (has)
                      addAttempt({
                        id: `exam:${exam.id}:${lesson.id}`,
                        lessonId: lesson.id,
                        skill: "speaking",
                        date: new Date().toISOString(),
                        answers: {},
                        correct: 0,
                        total: 0,
                        recordingId: full
                          ? `exam-${exam.id}-${lesson.id}`
                          : `exam-${exam.id}`,
                        seconds: duration ?? 0,
                      });
                  }}
                />
                <p className="help-copy">
                  Dừng ghi âm trước khi nộp để lưu bản trả lời. Bạn được nghe
                  lại sau buổi luyện.
                </p>
              </section>
            )}
          </div>
        </div>
      ))}
      <div className="answer-submit">
        <div>
          <p>Phần đã nộp sẽ khoá đáp án.</p>
          {activeIndex < currentLessons.length - 1 && (
            <button
              className="button secondary"
              onClick={() => {
                setSections((s) => ({ ...s, [exam.stage]: activeIndex + 1 }));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Ngữ liệu tiếp theo
              <ArrowRight size={15} />
            </button>
          )}
        </div>
        <button className="button primary" onClick={finishStage}>
          {exam.stage === 3 ? "Kết thúc buổi luyện" : "Nộp phần này & tiếp tục"}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
