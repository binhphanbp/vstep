"use client";
import Link from "next/link";
import { useState } from "react";
import { useStudy } from "./study-provider";
import { paperCatalog } from "@/lib/papers";

export function PaperBank() {
  const { state, ready } = useStudy();
  // Fixed when the page opens; the label below only shows once the saved
  // state is ready, which the server never is, so the two cannot disagree.
  const [now] = useState(() => Date.now());
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">BỘ ĐỀ ĐÃ NHẬP</div>
          <h1>Năm đề có đáp án để luyện và đối chiếu.</h1>
          <p>
            Mỗi đề có 35 câu Nghe, 40 câu Đọc, hai bài Viết và ba phần Nói. Tiến
            độ nằm trong bản sao dữ liệu Mây; bản ghi âm cần sao lưu riêng.
          </p>
        </div>
      </div>
      <div className="notice">
        Các đề được nhập từ bộ dữ liệu người dùng cung cấp. Đề 132–135 cùng
        Review 13/09 có đáp án gốc nhưng chưa được Mây hoặc giáo viên thẩm định;
        kết quả chỉ là số câu đúng, không quy đổi sang bậc VSTEP.
      </div>
      <div className="paper-grid">
        {paperCatalog.map((paper) => {
          const runs = (state.paperRuns ?? []).filter(
            (run) => run.paperId === paper.id,
          );
          const latest = runs.at(-1);
          return (
            <section className="panel paper-card" key={paper.id}>
              <span className="pill">
                {paper.id === "review-1309" ? "Review 13/09" : `Đề ${paper.id}`}
              </span>
              <h2>{paper.title}</h2>
              <p className="help-copy">
                172 phút cả đề, hoặc luyện riêng từng kỹ năng có giờ · Nghe có
                audio · Viết và Nói tự luyện
              </p>
              <p className="help-copy">
                {paper.graded
                  ? "Có đáp án Nghe/Đọc để đối chiếu"
                  : "Chưa có đáp án Nghe/Đọc — không chấm điểm"}
              </p>
              {ready && latest && (
                <p className="help-copy">
                  {latest.finishedAt
                    ? `Đã làm ${runs.filter((run) => run.finishedAt).length} lượt`
                    : now > latest.deadline
                      ? "Đã quá giờ · mở để chốt bài và xem kết quả"
                      : latest.only === undefined
                        ? `Đang làm · phần ${latest.stage + 1}/4`
                        : `Đang luyện riêng ${["Nghe", "Đọc", "Viết", "Nói"][latest.stage]}`}
                </p>
              )}
              <Link className="button primary" href={`/papers/${paper.id}`}>
                {latest && !latest.finishedAt ? "Tiếp tục làm đề" : "Mở đề"}
              </Link>
            </section>
          );
        })}
      </div>
    </div>
  );
}
