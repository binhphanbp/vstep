"use client";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { skillNames, type Lesson } from "@/lib/content";
import { defaultProvenance, provenanceFor } from "@/lib/provenance";
import { SELF_CHECK_DISCLAIMER } from "@/lib/criteria";
import type { BankGroup } from "@/lib/review-bank";
const letter = (index: number) => "ABCD"[index] ?? String(index + 1);
/**
 * One printable document asking a teacher to check the material itself.
 *
 * The other pack in this folder sends one of Gùa's own sessions to a marker.
 * This one sends the bank: passages, keys, the sentence each key rests on, and
 * an empty column for the reviewer's verdict. It exists because "chưa có giáo
 * viên duyệt học liệu" was the largest open risk in the project documents and
 * had no first step — the questions were only readable as TypeScript.
 *
 * Nothing here is generated or scored: the verdict comes back on paper and is
 * typed into `provenance.ts` by hand, with a real name and a real date.
 */
export function BankReviewPage({ group }: { group: BankGroup }) {
  const questions = group.lessons.reduce(
    (sum, lesson) => sum + lesson.questions.length,
    0,
  );
  return (
    <div className="page review-pack">
      <div className="no-print">
        <Link className="back-link" href="/review-pack/bank">
          <ArrowLeft size={15} />
          Về danh sách gói duyệt
        </Link>
      </div>
      <div className="page-heading no-print">
        <div>
          <h1>Gói duyệt học liệu · {group.title}</h1>
          <p>
            In trang này hoặc lưu thành PDF rồi gửi cho giáo viên. {group.blurb}
          </p>
        </div>
      </div>
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
        <h2>Gói duyệt học liệu · {group.title}</h2>
        <p className="help-copy">
          {group.lessons.length} bài · {questions} câu hỏi · {group.blurb}
        </p>
        <h3>Xin nhờ thầy/cô kiểm giúp</h3>
        <ul className="plain-list">
          <li>Đáp án đánh dấu sẵn có đúng không.</li>
          <li>
            Câu dẫn hoặc phương án có chỗ nào mơ hồ, có hai cách hiểu không.
          </li>
          <li>
            Độ khó ghi trong bài (B1 hoặc B2) có gần với mức thầy/cô thấy không.
          </li>
          <li>Ngữ liệu có chỗ nào không tự nhiên với người bản ngữ không.</li>
        </ul>
        <p className="help-copy">
          <strong>Nói rõ:</strong> {defaultProvenance.source} Toàn bộ do{" "}
          {defaultProvenance.author.toLowerCase()}, <strong>chưa</strong> qua
          giáo viên nào. Nhãn B1/B2 trong tài liệu là ý định biên soạn, không
          phải kết quả hiệu chuẩn, và ứng dụng không quy đổi kết quả luyện tập
          thành bậc. {SELF_CHECK_DISCLAIMER}
        </p>
      </section>
      {group.lessons.map((lesson) => (
        <LessonSheet key={lesson.id} lesson={lesson} />
      ))}
    </div>
  );
}
function LessonSheet({ lesson }: { lesson: Lesson }) {
  const provenance = provenanceFor(lesson.id);
  const transcript = lesson.skill === "listening";
  return (
    <section className="panel pack-sheet bank-sheet">
      <h2>
        {skillNames[lesson.skill]} · {lesson.title}
      </h2>
      <p className="help-copy">
        {lesson.part} · bậc biên soạn {lesson.level} · {lesson.minutes} phút ·
        mã <code>{lesson.id}</code> bản {lesson.version} ·{" "}
        {provenance.status === "reviewed"
          ? `đã duyệt bởi ${provenance.reviewer} ngày ${provenance.reviewedOn}`
          : "chưa có người duyệt"}
      </p>
      <h3>{transcript ? "Lời thoại (khi luyện chỉ được nghe)" : "Ngữ liệu"}</h3>
      <div className="passage" lang="en">
        {lesson.text}
      </div>
      {lesson.questions.length > 0 && (
        <>
          <h3>Câu hỏi và đáp án đang dùng</h3>
          <ol className="bank-questions">
            {lesson.questions.map((question) => (
              <li key={question.id}>
                <p lang="en">{question.text}</p>
                <ul className="plain-list">
                  {question.options.map((option, index) => (
                    <li key={option} lang="en">
                      {index === question.answer ? <strong>✔ </strong> : null}
                      {letter(index)}. {option}
                    </li>
                  ))}
                </ul>
                {question.evidence && (
                  <p className="help-copy" lang="en">
                    Căn cứ: “{question.evidence}”
                  </p>
                )}
                <p className="help-copy">Giải thích: {question.explanation}</p>
              </li>
            ))}
          </ol>
          <h3>Ô để thầy/cô ghi</h3>
          <table className="pack-table">
            <thead>
              <tr>
                <th scope="col">Câu</th>
                <th scope="col">Đáp án đúng chưa</th>
                <th scope="col">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {lesson.questions.map((question, index) => (
                <tr key={question.id}>
                  <th scope="row">
                    Câu {index + 1}
                    <small>{question.tag}</small>
                  </th>
                  <td />
                  <td />
                </tr>
              ))}
              <tr>
                <th scope="row">
                  Cả bài
                  <small>Độ khó, độ tự nhiên, chỗ cần sửa</small>
                </th>
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </>
      )}
      {lesson.sample && (
        <>
          <h3>
            Bài mẫu tự biên soạn
            {lesson.minWords ? ` (≥ ${lesson.minWords} từ)` : ""}
          </h3>
          <div className="passage" lang="en">
            {lesson.sample}
          </div>
          <table className="pack-table">
            <thead>
              <tr>
                <th scope="col">Mục</th>
                <th scope="col">Nhận xét của thầy/cô</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  Đề bài
                  <small>Có giống dạng đề thật không</small>
                </th>
                <td />
              </tr>
              <tr>
                <th scope="row">
                  Bài mẫu
                  <small>Có xứng đáng làm mẫu để học theo không</small>
                </th>
                <td />
              </tr>
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
