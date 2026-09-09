"use client";
import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, Sparkles } from "lucide-react";
import { useStudy } from "./study-provider";
import { dayOffset, localDay, skillStats, streak } from "@/lib/learning";
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
            Nhìn lại những lần bạn đã dành thời gian cho mình. Mọi số liệu đều
            từ buổi học đã lưu.
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
                    <small>{stats.count} lượt luyện</small>
                  </div>
                  <strong>
                    {stats.accuracy !== null
                      ? `${stats.accuracy}% đúng`
                      : "Chưa chấm điểm"}
                  </strong>
                </div>
              );
            },
          )}
          <p className="help-copy">
            Nghe/Đọc: độ chính xác gộp của 5 lượt gần nhất. Không quy đổi sang
            bậc VSTEP.
          </p>
        </section>
      </div>
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
                        <h3>{lesson?.title ?? "Bài luyện đã lưu"}</h3>
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
