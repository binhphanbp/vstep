"use client";
import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, Sparkles } from "lucide-react";
import {
  allCriteria,
  selfCheckLevels,
  SELF_CHECK_DISCLAIMER,
} from "@/lib/criteria";
import { useStudy } from "./study-provider";
import {
  compareSittings,
  dayOffset,
  examSittings,
  localDay,
  paperNames,
  skillStats,
  streak,
  type StudyState,
} from "@/lib/learning";
import { skillNames, type Skill } from "@/lib/content";
import { allLessons as lessons } from "@/lib/full-exam-content";
import { SkillIcon } from "./icons";
import { RecordingHistory } from "./audio-tools";
export function ProgressPage() {
  const { state } = useStudy();
  const totalMinutes = Math.round(
    state.attempts.reduce((s, a) => s + a.seconds, 0) / 60,
  );
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = dayOffset(localDay(), i - 6);
    return {
      day,
      minutes: Math.round(
        state.attempts
          .filter((a) => localDay(a.date) === day)
          .reduce((s, a) => s + a.seconds, 0) / 60,
      ),
    };
  });
  const max = Math.max(
    state.profile.dailyMinutes,
    ...week.map((d) => d.minutes),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <ChartNoAxesCombined size={15} />
            LOOK HOW FAR YOU’VE COME
          </div>
          <h1>Tiến bộ đôi khi rất khẽ.</h1>
          <p>
            Nhìn lại từng lần {state.profile.name} đã dành thời gian cho mình.
            Mọi số liệu đều từ buổi học đã lưu.
          </p>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat-card">
          <span>Thời gian luyện kỹ năng</span>
          <strong>
            {totalMinutes}
            <small> phút</small>
          </strong>
          <small>Buổi đã hoàn thành</small>
        </div>
        <div className="stat-card">
          <span>Lượt luyện tập</span>
          <strong>{state.attempts.length}</strong>
          <small>
            {new Set(state.attempts.map((a) => a.lessonId)).size} bài khác nhau
          </small>
        </div>
        <div className="stat-card">
          <span>Nhịp học hiện tại</span>
          <strong>
            {streak(state.attempts)}
            <small> ngày</small>
          </strong>
          <small>Nghỉ một ngày, bắt đầu lại cũng được</small>
        </div>
        <div className="stat-card">
          <span>Từ đã khám phá</span>
          <strong>{Object.keys(state.reviews).length}</strong>
          <small>
            {
              Object.values(state.reviews).filter((r) => r.repetitions >= 3)
                .length
            }{" "}
            từ nhớ qua ít nhất 3 lần ôn
          </small>
        </div>
      </div>
      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Nhịp học 7 ngày gần nhất</h2>
            <span className="pill">Phút luyện kỹ năng</span>
          </div>
          <div
            className="activity-chart"
            role="img"
            aria-label={week
              .map((d) => `${d.day}: ${d.minutes} phút`)
              .join(", ")}
          >
            {week.map((d) => (
              <div className="activity-column" key={d.day}>
                <span>{d.minutes}</span>
                <div
                  className="activity-bar"
                  style={{
                    height: `${Math.max(2, (d.minutes / max) * 115)}px`,
                  }}
                />
                <span>
                  {d.day.slice(8)}/{d.day.slice(5, 7)}
                </span>
              </div>
            ))}
          </div>
          <p className="help-copy">
            Ngày tính theo giờ Việt Nam. Buổi luyện thường chỉ tính khi trang
            đang mở và có hoạt động gần đây; bài có giờ tính theo thời gian của
            từng phần.
          </p>
        </section>
        <section className="panel">
          <h2>Bức tranh từng kỹ năng</h2>
          {(["listening", "reading", "writing", "speaking"] as Skill[]).map(
            (skill) => {
              const stats = skillStats(state, skill);
              return (
                <div className="history-row" key={skill}>
                  <SkillIcon skill={skill} size={19} />
                  <div>
                    <h3>{skillNames[skill]}</h3>
                    <small>
                      {stats.firstCount} bài lần đầu
                      {stats.practiceCount > 0
                        ? ` · ${stats.practiceCount} lượt luyện lại`
                        : ""}
                    </small>
                  </div>
                  <div className="skill-accuracy">
                    <strong>
                      {stats.accuracy !== null
                        ? `${stats.accuracy}%`
                        : "Chưa có"}
                    </strong>
                    <small>
                      {stats.practiceAccuracy !== null
                        ? `Luyện lại ${stats.practiceAccuracy}%`
                        : "lần đầu"}
                    </small>
                  </div>
                </div>
              );
            },
          )}
          <p className="help-copy">
            Con số lớn là độ chính xác của <strong>lần đầu</strong> gặp mỗi bài,
            tính trên khoảng 30 câu gần nhất — đây là con số nói về năng lực, và
            cũng là con số kế hoạch ngày dùng để chọn bài. Lượt luyện lại đếm
            riêng vì khi đã biết đáp án thì điểm cao là chuyện đương nhiên. Bài
            được viết lại nội dung sẽ tính là lần đầu trở lại. Không quy đổi
            sang bậc VSTEP.
          </p>
        </section>
      </div>
      <ExamSittings state={state} />
      <section style={{ marginTop: 25 }}>
        <div className="section-heading">
          <h2>Những bước chân đã qua</h2>
          <Link className="text-link" href="/practice">
            Học tiếp
            <ArrowRight size={15} />
          </Link>
        </div>
        {state.attempts.length ? (
          <div className="panel">
            {[...state.attempts].reverse().map((a) => {
              const lesson = lessons.find((l) => l.id === a.lessonId);
              return (
                <div key={a.id}>
                  <div className="history-row">
                    <SkillIcon skill={a.skill} />
                    <div>
                      <Link href={`/practice/${a.lessonId}`}>
                        <h3>
                          {a.lessonSnapshot?.title ??
                            lesson?.title ??
                            "Bài luyện đã lưu"}
                        </h3>
                      </Link>
                      <small>
                        {new Date(a.date).toLocaleString("vi-VN")} ·{" "}
                        {Math.round(a.seconds / 60)} phút
                        {a.id.startsWith("exam:") ? " · Luyện có giờ" : ""}
                      </small>
                    </div>
                    <strong>
                      {a.total ? `${a.correct}/${a.total}` : "Đã thực hành"}
                    </strong>
                  </div>
                  {a.text && (
                    <details>
                      <summary>Xem lại bài viết đã nộp</summary>
                      <div className="passage" lang="en">
                        {a.text}
                      </div>
                    </details>
                  )}
                  {a.recordingId && <RecordingHistory id={a.recordingId} />}
                  {(a.skill === "writing" || a.skill === "speaking") && (
                    <Link
                      className="text-link"
                      href={`/review-pack?attempt=${a.id}`}
                    >
                      In gói gửi giáo viên
                      <ArrowRight size={14} />
                    </Link>
                  )}
                  {a.feedback && (
                    <details>
                      <summary>Nhận xét của người chấm</summary>
                      <p className="help-copy">{a.feedback}</p>
                    </details>
                  )}
                  {a.selfCheck && Object.keys(a.selfCheck).length > 0 && (
                    <details>
                      <summary>Mình đã tự chấm theo tiêu chí</summary>
                      <ul className="tips-list">
                        {Object.entries(a.selfCheck).map(([id, level]) => (
                          <li key={id}>
                            {allCriteria.find((item) => item.id === id)
                              ?.label ?? id}
                            :{" "}
                            {selfCheckLevels.find(
                              (item) => item.value === level,
                            )?.label ?? level}
                          </li>
                        ))}
                      </ul>
                      <p className="help-copy">{SELF_CHECK_DISCLAIMER}</p>
                    </details>
                  )}
                  {a.reflection && a.reflection.length > 0 && (
                    <details>
                      <summary>Điều mình đã tự kiểm tra</summary>
                      <ul className="tips-list">
                        {a.reflection.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Sparkles size={35} />
            <h2>Chưa có bước chân nào, và điều đó ổn.</h2>
            <p>
              Hoàn thành bài đầu tiên để bắt đầu ghi lại hành trình. Không có
              điểm hay tiến độ giả ở đây.
            </p>
            <Link className="button primary" href="/practice">
              Chọn bài đầu tiên
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * The timed room, sitting by sitting.
 *
 * Two full papers exist precisely so that a second mock can mean something, so
 * this block compares the last two — and says plainly when it cannot, because
 * repeating one paper measures memory of it as much as ability.
 */
function ExamSittings({ state }: { state: StudyState }) {
  const sittings = examSittings(state);
  if (!sittings.length) return null;
  const comparison = compareSittings(state);
  const shift = (points: number | null) =>
    points === null
      ? "chưa đủ dữ liệu"
      : points > 0
        ? `+${points} điểm phần trăm`
        : points < 0
          ? `${points} điểm phần trăm`
          : "không đổi";
  return (
    <section className="panel" style={{ marginTop: 25 }}>
      <h2>Những lần thi thử</h2>
      {[...sittings].reverse().map((sitting) => (
        <div className="history-row" key={sitting.id}>
          <SkillIcon skill="reading" size={19} />
          <div>
            <h3>{paperNames[sitting.paper]}</h3>
            <small>
              {new Date(sitting.date).toLocaleDateString("vi-VN")} ·{" "}
              {sitting.minutes} phút
              {sitting.writing || sitting.speaking
                ? ` · đã nộp ${sitting.writing} bài viết, ${sitting.speaking} phần nói`
                : ""}
            </small>
          </div>
          <div className="skill-accuracy">
            <strong>
              {sitting.listening.total
                ? `${sitting.listening.correct}/${sitting.listening.total}`
                : "—"}{" "}
              Nghe
            </strong>
            <small>
              {sitting.reading.total
                ? `${sitting.reading.correct}/${sitting.reading.total}`
                : "—"}{" "}
              Đọc
            </small>
          </div>
        </div>
      ))}
      {comparison ? (
        <p className="help-copy">
          So hai lần gần nhất ({paperNames[comparison.before.paper]} →{" "}
          {paperNames[comparison.after.paper]}): Nghe{" "}
          {shift(comparison.listening)}, Đọc {shift(comparison.reading)}.{" "}
          {comparison.comparable
            ? "Hai đề khác nhau nên chênh lệch này nói được phần nào về năng lực."
            : "Hai lần này là cùng một đề, nên chênh lệch đo trí nhớ về đề nhiều hơn là đo năng lực — muốn so cho thật thì làm đề còn lại."}{" "}
          Phần Viết và Nói chỉ được lưu lại, không có điểm, và không quy đổi
          sang bậc VSTEP.
        </p>
      ) : (
        <p className="help-copy">
          Làm đủ hai đề (01 và 02) thì ở đây sẽ hiện chênh lệch từng phần giữa
          hai lần thi. Phần Viết và Nói chỉ được lưu lại, không chấm điểm.
        </p>
      )}
    </section>
  );
}
