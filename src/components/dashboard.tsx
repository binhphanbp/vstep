"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Coffee,
  Headphones,
  Heart,
  Leaf,
  Plus,
  Sparkles,
  Sun,
  Target,
  Zap,
} from "lucide-react";
import { useStudy } from "./study-provider";
import { todayPlan, localDay, skillStats, dayOffset } from "@/lib/learning";
import { vocabulary, skillNames, type Skill } from "@/lib/content";
import { SkillIcon } from "./icons";
import { useNow } from "@/lib/use-now";
export function Dashboard() {
  const { state, update } = useStudy();
  const now = useNow();
  const plan = todayPlan(state, new Date(now));
  const today = localDay(new Date(now));
  const todayAttempts = state.attempts.filter(
    (a) => localDay(a.date) === today,
  );
  const nextLesson = plan.lessons.find(
    (l) => !todayAttempts.some((a) => a.lessonId === l.id),
  );
  const learnedMinutes = Math.round(
    todayAttempts.reduce((s, a) => s + a.seconds, 0) / 60,
  );
  const due = vocabulary.filter(
    (v) => !state.reviews[v.id] || Date.parse(state.reviews[v.id].due) <= now,
  ).length;
  const week = Array.from({ length: 7 }, (_, i) => dayOffset(today, i - 6));
  const completed = new Set(state.attempts.map((a) => a.lessonId));
  const dateLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(now));
  return (
    <div className="page dashboard">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Sun size={15} />
            {dateLabel}
          </div>
          <h1>
            Một ngày mới, một bước tiến<span className="mint-text">.</span>
          </h1>
          <p>
            Chào {state.profile.name}, cùng dành một chút thời gian cho chính
            mình nhé.
          </p>
        </div>
        <Link href="/settings" className="button secondary small">
          <Target size={16} />
          Mục tiêu của mình
          <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="welcome-card">
            <div className="welcome-content">
              <span className="capsule">
                <Sparkles size={14} />
                DÀNH RIÊNG CHO GÙA
              </span>
              <h2>
                Không cần hoàn hảo.
                <br />
                Chỉ cần bắt đầu.
              </h2>
              <p>
                {!nextLesson
                  ? `${state.profile.name} đã hoàn thành kế hoạch nhỏ hôm nay. Nghỉ một chút và tự hào về mình nhé.`
                  : state.profile.onboarded
                    ? `Buổi học ${plan.budget} phút đã được gợi ý theo mục tiêu của ${state.profile.name}. Một bài nhỏ cũng là một bước tiến.`
                    : `Góc học này được làm riêng cho ${state.profile.name}. Chọn mục tiêu, tìm nhịp học vừa sức và bắt đầu từ một bài nhỏ.`}
              </p>
              <Link
                href={
                  state.profile.onboarded
                    ? nextLesson
                      ? `/practice/${nextLesson.id}`
                      : "/progress"
                    : "/settings"
                }
                className="button primary"
              >
                {state.profile.onboarded
                  ? nextLesson
                    ? "Bắt đầu buổi học"
                    : "Nhìn lại buổi học"
                  : "Thiết kế hành trình của mình"}
                <ArrowRight size={17} />
              </Link>
              <span className="welcome-foot">
                <Heart size={13} />
                Chậm mà chắc. {state.profile.name} luôn có thể thử lại.
              </span>
            </div>
            <div
              className="goal-orbit"
              aria-label={`Mục tiêu ${state.profile.target}`}
            >
              <div className="orbit-ring outer" />
              <div className="orbit-ring inner" />
              <div className="orbit-label top">
                <Sparkles size={15} />a little every day
              </div>
              <div className="orbit-center">
                <span>GÙA · NEXT CHAPTER</span>
                <strong>{state.profile.target}</strong>
                <span>I can. I will.</span>
              </div>
              <span className="orbit-badge headphones">
                <Headphones size={22} />
              </span>
              <span className="orbit-badge leaf">
                <Leaf size={22} />
              </span>
              <span className="orbit-star">
                <Plus size={22} />
              </span>
              <span className="orbit-label bottom">
                one step closer <ArrowUpRight size={14} />
              </span>
            </div>
          </section>
          <section className="mood-bar" aria-labelledby="mood-title">
            <div>
              <Coffee size={21} />
              <div>
                <strong id="mood-title">
                  Hôm nay {state.profile.name} thấy thế nào?
                </strong>
                <span>Mình sẽ điều chỉnh nhịp học cho vừa sức.</span>
              </div>
            </div>
            <div className="mood-options">
              {(
                [
                  { key: "low", emoji: "☁️", text: "Hơi mệt" },
                  { key: "okay", emoji: "🌤️", text: "Ổn nè" },
                  { key: "great", emoji: "☀️", text: "Đầy năng lượng" },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  aria-pressed={state.mood[today] === m.key}
                  className={`mood-button ${state.mood[today] === m.key ? "selected" : ""}`}
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      mood: { ...s.mood, [today]: m.key },
                    }))
                  }
                >
                  <span>{m.emoji}</span>
                  {m.text}
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="section-heading">
              <div>
                <h2>
                  Kế hoạch nhỏ hôm nay{" "}
                  <span className="soft-badge">
                    {plan.lessons.length} hoạt động
                  </span>
                </h2>
                <p>
                  {plan.mood === "low"
                    ? "Hôm nay học nhẹ thôi. Nghỉ ngơi cũng là một phần của hành trình."
                    : "Một chút tập trung, một chút thử thách. Vừa đủ để tiến bộ."}
                </p>
              </div>
              <Link className="text-link" href="/journey">
                Xem lộ trình
                <ArrowRight size={15} />
              </Link>
            </div>
            <div className="plan-list">
              {plan.lessons.map((lesson, index) => {
                const done = todayAttempts.some(
                  (a) => a.lessonId === lesson.id,
                );
                return (
                  <Link
                    className="plan-row"
                    key={lesson.id}
                    href={`/practice/${lesson.id}`}
                  >
                    <span className={`step-number ${done ? "done" : ""}`}>
                      {done ? (
                        <Check size={15} />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <SkillIcon skill={lesson.skill} />
                    <div className="plan-row-main">
                      <div className="lesson-kicker">
                        {skillNames[lesson.skill]}
                        <span>·</span>
                        {lesson.part}
                        <span className="mini-tag">{lesson.level}</span>
                      </div>
                      <h3>{lesson.title}</h3>
                      <p>{lesson.subtitle}</p>
                    </div>
                    <div className="plan-row-end">
                      <span>
                        <Clock3 size={14} />
                        {lesson.minutes} phút
                      </span>
                      <span className={`row-action ${done ? "finished" : ""}`}>
                        {done ? "Đã học" : "Vào học"}
                        <ArrowRight size={15} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
          <section>
            <div className="section-heading">
              <div>
                <h2>Bốn kỹ năng, một mục tiêu</h2>
                <p>Đi đều từng bước, vững vàng cả bốn kỹ năng.</p>
              </div>
              <Link href="/practice" className="text-link">
                Tất cả bài tập
                <ArrowRight size={15} />
              </Link>
            </div>
            <div className="skills-grid">
              {(["listening", "reading", "writing", "speaking"] as Skill[]).map(
                (skill) => {
                  const stat = skillStats(state, skill);
                  return (
                    <Link
                      key={skill}
                      href={`/practice?skill=${skill}`}
                      className={`skill-card ${skill}`}
                    >
                      <div className="skill-card-top">
                        <SkillIcon skill={skill} />
                        <ArrowUpRight size={16} />
                      </div>
                      <h3>{skillNames[skill]}</h3>
                      <p>
                        {stat.count
                          ? `${stat.count} lượt luyện tập`
                          : "Bắt đầu khám phá"}
                      </p>
                      <div className="skill-progress-track">
                        <span
                          style={{
                            width: `${stat.accuracy ?? Math.min(100, stat.count * 10)}%`,
                          }}
                        />
                      </div>
                      <div className="skill-card-foot">
                        <span>
                          {stat.accuracy !== null
                            ? "Độ chính xác"
                            : "Bài luyện đã hoàn thành"}
                        </span>
                        <strong>
                          {stat.accuracy !== null
                            ? `${stat.accuracy}%`
                            : stat.count}
                        </strong>
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="panel daily-progress">
            <div className="panel-heading">
              <h2>Nhịp học của mình</h2>
              <span className="icon-soft">
                <Zap size={17} />
              </span>
            </div>
            <div
              className="progress-ring"
              style={
                {
                  "--progress": `${Math.min(100, (learnedMinutes / plan.budget) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong>
                  {learnedMinutes}
                  <span> / {plan.budget}</span>
                </strong>
                <small>phút học hôm nay</small>
              </div>
            </div>
            <div className="week-days">
              {week.map((day, i) => {
                const active = state.attempts.some(
                  (a) => localDay(a.date) === day,
                );
                return (
                  <div key={day}>
                    <span>
                      {new Intl.DateTimeFormat("vi-VN", { weekday: "short" })
                        .format(new Date(`${day}T12:00:00+07:00`))
                        .replace(/Thứ\s*|Th\s*/, "T")}
                    </span>
                    <span
                      className={`day-dot ${active ? "complete" : ""} ${i === 6 ? "today" : ""}`}
                    >
                      {active ? <Check size={12} /> : i === 6 ? <span /> : null}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="small-note">
              {todayAttempts.length
                ? `${state.profile.name} đã dành thời gian cho mình hôm nay. Tốt lắm!`
                : "Bắt đầu chuỗi ngày của mình từ hôm nay nhé."}
            </p>
          </section>
          <section className="vocab-teaser">
            <div className="panel-heading">
              <span className="icon-soft">
                <Leaf size={20} />
              </span>
              <span className="capsule">SPACED REPETITION</span>
            </div>
            <h2>
              Chăm một chút,
              <br />
              nhớ lâu hơn.
            </h2>
            <p>
              <strong>{due} từ</strong>{" "}
              {due === vocabulary.length
                ? `sẵn sàng để ${state.profile.name} khám phá.`
                : `đang chờ ${state.profile.name} ôn lại.`}
              <br />
              Thử nhớ trước khi lật thẻ nhé.
            </p>
            <Link href="/vocabulary" className="button secondary">
              Ghé vườn từ vựng
              <ArrowRight size={16} />
            </Link>
          </section>
          <section className="panel small-win">
            <div className="panel-heading">
              <h2>Một điều nho nhỏ</h2>
              <Heart size={17} />
            </div>
            <blockquote>
              “You don’t have to be great to start. You have to start to grow.”
            </blockquote>
            <p>
              Không cần giỏi mới bắt đầu.
              <br />
              Bắt đầu rồi, mình sẽ giỏi hơn.
            </p>
            <div className="small-win-footer">
              <span className="status-dot" />
              {completed.size
                ? `${completed.size} bài học đã được khám phá`
                : `Trang đầu tiên đang chờ ${state.profile.name}`}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
