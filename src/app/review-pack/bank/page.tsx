import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { bankGroups } from "@/lib/review-bank";
export const metadata = { title: "Gói duyệt học liệu" };
export default function Page() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Gói duyệt học liệu</h1>
          <p>
            Mỗi gói là một tài liệu in được: ngữ liệu, câu hỏi, đáp án đang dùng
            và ô trống để giáo viên ghi nhận xét. Chưa có bài nào trong ngân
            hàng được người có chuyên môn duyệt, nên đây là bước đầu tiên để đổi
            điều đó.
          </p>
        </div>
      </div>
      <section className="panel">
        <div className="section-title">
          <ClipboardCheck size={20} />
          <h2>Chọn gói để in</h2>
        </div>
        <div className="bank-list">
          {bankGroups.map((group) => {
            const questions = group.lessons.reduce(
              (sum, lesson) => sum + lesson.questions.length,
              0,
            );
            return (
              <Link
                key={group.id}
                href={`/review-pack/bank/${group.id}`}
                className="button secondary"
              >
                {group.title} — {group.lessons.length} bài
                {questions ? `, ${questions} câu` : ""}
                <ArrowRight size={16} />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
