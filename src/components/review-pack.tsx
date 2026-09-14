"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import { useStudy } from "./study-provider";
import { criteriaFor, SELF_CHECK_DISCLAIMER } from "@/lib/criteria";
import { allLessons } from "@/lib/full-exam-content";
import { skillNames } from "@/lib/content";
import type { Attempt } from "@/lib/learning";
/**
 * One page a teacher can mark by hand.
 *
 * "Find a teacher to validate the work" was a sentence in a document and
 * nothing in the app. This makes it a single action: the prompt she answered,
 * what she wrote, an empty grid for the marker, and room for comments - then a
 * box to type what came back, filed against that same session so the history
 * keeps the two together. The recording is downloaded separately from the
 * session in the history rather than zipped in, so no new dependency is needed
 * to produce the pack.
 */
export function ReviewPackPage() {
  const { state } = useStudy();
  const params = useSearchParams();
  const id = params.get("attempt") ?? "";
  const attempt = state.attempts.find((item) => item.id === id);
  const lesson =
    attempt?.lessonSnapshot ??
    allLessons.find((item) => item.id === attempt?.lessonId);
  if (!attempt || !lesson)
    return (
      <div className="page">
        <Link className="back-link" href="/progress">
          <ArrowLeft size={15} />
          Về lịch sử học
        </Link>
        <div className="page-heading">
          <div>
            <h1>Gói gửi giáo viên</h1>
            <p>
              Mở trang Nhìn lại tiến bộ, chọn một buổi Viết hoặc Nói rồi bấm “In
              gói gửi giáo viên” để tạo gói cho người chấm.
            </p>
          </div>
        </div>
        <div className="empty-state">
          <h2>Chưa chọn buổi học nào.</h2>
          <p>
            Trang này cần một buổi học cụ thể để in đúng đề bài và bài làm của
            buổi đó.
          </p>
          <Link href="/progress" className="button primary">
            Chọn một buổi học
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  const criteria = criteriaFor(lesson);
  const date = new Date(attempt.date).toLocaleString("vi-VN");
  return (
    <div className="page review-pack">
      <div className="no-print">
        <Link className="back-link" href="/progress">
          <ArrowLeft size={15} />
          Về lịch sử học
        </Link>
      </div>
      <div className="page-heading no-print">
        <div>
          <h1>Gói gửi giáo viên</h1>
          <p>
            In trang này (hoặc lưu thành PDF) rồi gửi cho người chấm. Bản ghi âm
            tải riêng ở buổi học trong lịch sử.
          </p>
        </div>
      </div>
      {/* Its own row rather than the page heading: heading actions are hidden
          below 800px, and printing is the whole point of this page. */}
      <div className="pack-actions no-print">
        <button
          type="button"
          className="button secondary small"
          onClick={() => window.print()}
        >
          <Printer size={16} />
          In hoặc lưu PDF
        </button>
      </div>
      <section className="panel pack-sheet">
        <h2>
          {skillNames[lesson.skill]} · {lesson.title}
        </h2>
        <p className="help-copy">
          {lesson.part} · Bậc biên soạn {lesson.level} · Buổi học ngày {date} ·
          Người học: {state.profile.name}
        </p>
        <h3>Đề bài</h3>
        <div className="passage" lang="en">
          {lesson.text}
        </div>
        <h3>Bài làm</h3>
        {attempt.text ? (
          <div className="passage" lang="en">
            {attempt.text}
          </div>
        ) : (
          <p className="help-copy">
            Buổi này là phần Nói. Bản ghi âm được tải riêng từ buổi học trong
            lịch sử; xin nghe kèm khi chấm.
          </p>
        )}
        {criteria && (
          <>
            <h3>Bảng nhận xét để người chấm điền</h3>
            <p className="help-copy">{SELF_CHECK_DISCLAIMER}</p>
            <table className="pack-table">
              <thead>
                <tr>
                  <th scope="col">Tiêu chí</th>
                  <th scope="col">Nhận xét của người chấm</th>
                </tr>
              </thead>
              <tbody>
                {criteria.items.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">
                      {item.label}
                      <small>{item.question}</small>
                    </th>
                    <td />
                  </tr>
                ))}
                <tr>
                  <th scope="row">
                    Việc cần làm tiếp
                    <small>Một việc cụ thể cho buổi học tới</small>
                  </th>
                  <td />
                </tr>
              </tbody>
            </table>
          </>
        )}
      </section>
      <FeedbackBox key={attempt.id} attempt={attempt} />
    </div>
  );
}
/**
 * Its own component, keyed by the session id: the text box starts from what is
 * already filed for that session without an effect that writes state back.
 */
function FeedbackBox({ attempt }: { attempt: Attempt }) {
  const { update, toast } = useStudy();
  const [note, setNote] = useState(attempt.feedback ?? "");
  return (
    <section className="panel no-print">
      <h2>Nhận xét nhận được</h2>
      <p className="help-copy">
        Gõ lại nhận xét của người chấm vào đây; nó được lưu cùng đúng buổi học
        này trong lịch sử.
      </p>
      <textarea
        className="draft-area"
        aria-label="Nhận xét của giáo viên"
        rows={6}
        value={note}
        onChange={(event) => setNote(event.target.value.slice(0, 4000))}
      />
      <button
        type="button"
        className="button primary small"
        onClick={() => {
          update((current) => ({
            ...current,
            attempts: current.attempts.map((item) =>
              item.id === attempt.id
                ? { ...item, feedback: note.trim() || undefined }
                : item,
            ),
          }));
          toast(
            note.trim()
              ? "Đã lưu nhận xét vào buổi học này."
              : "Đã xoá nhận xét của buổi học này.",
          );
        }}
      >
        Lưu nhận xét
      </button>
    </section>
  );
}
