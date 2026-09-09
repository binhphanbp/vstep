"use client";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Route, Target } from "lucide-react";
import { useStudy } from "./study-provider";
import { daysUntil, todayPlan, skillStats } from "@/lib/learning";
import { lessons } from "@/lib/content";
export function JourneyPage() {
  const { state } = useStudy();
  const plan = todayPlan(state);
  const days = daysUntil(state.profile.examDate);
  const explored = new Set(state.attempts.map((a) => a.lessonId));
  const basics = lessons.filter((l) => l.level === "B1");
  const advanced = lessons.filter((l) => l.level === "B2");
  const steps = [
    {
      title: "Làm quen và tìm nhịp",
      description:
        "Chọn mục tiêu, thời gian học và kỹ năng muốn ưu tiên. Thử một bài Nghe và một bài Đọc để có dữ liệu ban đầu.",
      done:
        state.profile.onboarded &&
        skillStats(state, "reading").count > 0 &&
        skillStats(state, "listening").count > 0,
      href: state.profile.onboarded ? "/practice" : "/settings",
      action: state.profile.onboarded
        ? "Khám phá bài đầu tiên"
        : "Thiết kế nhịp học",
    },
    {
      title: "Vững nền, từng bài nhỏ",
      description: `Làm quen với ${basics.length} bài B1, viết email và trả lời câu hỏi về cuộc sống. Ôn từ và câu sai giữa các buổi. Đã khám phá ${basics.filter((l) => explored.has(l.id)).length}/${basics.length} bài.`,
      done: basics.every((l) => explored.has(l.id)),
      href: "/practice",
      action: "Xây nền cùng mình",
    },
    {
      title: "Mở rộng và kết nối ý",
      description: `Luyện suy luận khi đọc, theo dõi bài nói, phát triển essay và so sánh lựa chọn khi nói. Đã khám phá ${advanced.filter((l) => explored.has(l.id)).length}/${advanced.length} bài B2.`,
      done: advanced.every((l) => explored.has(l.id)),
      href: "/practice?skill=writing",
      action: "Thử một bước khó hơn",
    },
    {
      title: "Tập nhịp thi và nhìn lại",
      description:
        "Chọn buổi rút gọn hoặc đề đủ cấu trúc để luyện phân bổ thời gian, rồi xem lại các câu cần ôn. Đối chiếu hướng dẫn đơn vị thi trước khi đăng ký.",
      done: state.attempts.some((a) => a.id.startsWith("exam:")),
      href: "/exam",
      action: "Vào phòng luyện có giờ",
    },
  ];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Route size={15} />
            YOUR OWN PACE
          </div>
          <h1>Đường đến {state.profile.target}, theo nhịp của mình.</h1>
          <p>
            Lộ trình linh hoạt theo kết quả và thời gian bạn có. Không có ngày
            nào bị bỏ lại phía sau.
          </p>
        </div>
        <Link className="button secondary small" href="/settings">
          <Target size={16} />
          Điều chỉnh mục tiêu
        </Link>
      </div>
      <div className="content-grid">
        <div className="timeline">
          {steps.map((step, i) => (
            <section className="timeline-card" key={step.title}>
              <span className="timeline-number">
                {step.done ? (
                  <Check size={20} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <span className="panel-label">
                  CHẶNG {i + 1}
                  {step.done ? " · ĐÃ KHÁM PHÁ" : ""}
                </span>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
                <Link className="text-link" href={step.href}>
                  {step.action}
                  <ArrowRight size={15} />
                </Link>
              </div>
            </section>
          ))}
        </div>
        <aside className="stack">
          <section className="panel">
            <div className="section-title">
              <CalendarDays size={20} />
              <h2>Mốc hẹn của mình</h2>
            </div>
            <strong style={{ fontSize: 30, fontWeight: 500 }}>
              {days === null
                ? "Chưa chốt ngày"
                : days >= 0
                  ? `${days} ngày`
                  : "Cập nhật ngày thi"}
            </strong>
            <p className="help-copy">
              {days === null
                ? "Bạn vẫn có thể học ngay khi chưa có lịch thi."
                : days >= 0
                  ? `Đến ${new Date(`${state.profile.examDate}T12:00:00+07:00`).toLocaleDateString("vi-VN")}. Mục tiêu là kế hoạch cá nhân, không phải xác nhận lịch từ trường.`
                  : "Ngày dự kiến đã qua. Bạn có thể đặt mốc mới hoặc để trống."}
            </p>
            <Link className="text-link" href="/guide" style={{ marginTop: 15 }}>
              Xem nguồn lịch thi chính thức
              <ArrowRight size={14} />
            </Link>
          </section>
          <section className="vocab-teaser">
            <h2>Hôm nay, bắt đầu từ đây.</h2>
            <p>
              {plan.lessons[0].title}
              <br />
              {plan.lessons[0].minutes} phút · Gợi ý theo kỹ năng ưu tiên, chủ
              đề yêu thích và bài chưa học.
            </p>
            <Link
              className="button secondary"
              href={`/practice/${plan.lessons[0].id}`}
            >
              Vào học
              <ArrowRight size={16} />
            </Link>
          </section>
          <p className="help-copy">
            Hoàn thành các chặng không đồng nghĩa đạt chứng chỉ. Cần luyện đề đủ
            độ dài và nhận phản hồi chuyên môn, đặc biệt ở Viết/Nói.
          </p>
        </aside>
      </div>
    </div>
  );
}
