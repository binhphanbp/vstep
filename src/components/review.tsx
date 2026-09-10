"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  NotebookPen,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { vocabulary } from "@/lib/content";
import { mistakes, scheduleReview } from "@/lib/learning";
import { useStudy } from "./study-provider";
import { QuestionCard } from "./practice";
import { AudioPlayer } from "./audio-tools";
export function VocabularyPage() {
  const { state, update, toast } = useStudy();
  const [flipped, setFlipped] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"review" | "all">("review");
  const due = vocabulary
    .filter(
      (v) => !state.reviews[v.id] || Date.parse(state.reviews[v.id].due) <= now,
    )
    .sort(
      (a, b) => (state.reviews[a.id] ? 0 : 1) - (state.reviews[b.id] ? 0 : 1),
    );
  const card = due[0];
  const learned = vocabulary.filter((v) => state.reviews[v.id]).length;
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(tick);
      window.speechSynthesis?.cancel();
    };
  }, []);
  function rate(quality: "again" | "hard" | "good" | "easy") {
    if (!card) return;
    update((s) => ({
      ...s,
      reviews: {
        ...s.reviews,
        [card.id]: scheduleReview(s.reviews[card.id], quality),
      },
    }));
    setFlipped(false);
  }
  function speak(word: string) {
    if (!window.speechSynthesis) {
      toast("Trình duyệt chưa hỗ trợ giọng đọc.");
      return;
    }
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(word);
    voice.lang = "en-GB";
    voice.rate = 0.85;
    voice.onerror = () =>
      toast("Không phát được âm thanh. Kiểm tra giọng đọc của trình duyệt.");
    window.speechSynthesis.speak(voice);
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Leaf size={15} />A LITTLE GARDEN OF WORDS
          </div>
          <h1>Gieo một từ. Nuôi một thói quen.</h1>
          <p>
            Thử nhớ nghĩa và đặt một câu trước khi lật thẻ. Không nhớ cũng không
            sao.
          </p>
        </div>
        <span className="pill">
          {learned}/{vocabulary.length} từ đã khám phá
        </span>
      </div>
      <div className="filters">
        <button
          type="button"
          className={`filter ${mode === "review" ? "active" : ""}`}
          onClick={() => setMode("review")}
          aria-pressed={mode === "review"}
        >
          Ôn hôm nay · {due.length}
        </button>
        <button
          type="button"
          className={`filter ${mode === "all" ? "active" : ""}`}
          onClick={() => setMode("all")}
          aria-pressed={mode === "all"}
        >
          Tất cả từ vựng
        </button>
      </div>
      {mode === "review" ? (
        <div className="content-grid">
          <div>
            {card ? (
              <>
                <div className="vocab-toolbar">
                  <span className="pill">{card.topic}</span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Nghe phát âm ${card.word}`}
                    onClick={() => speak(card.word)}
                  >
                    <Volume2 size={20} />
                  </button>
                </div>
                <button
                  type="button"
                  className="flashcard"
                  onClick={() => setFlipped((f) => !f)}
                  aria-label={
                    flipped ? "Lật về mặt từ" : "Lật thẻ để xem nghĩa"
                  }
                >
                  <span className="panel-label">
                    {flipped ? "A WORD TO KEEP" : "CAN YOU REMEMBER?"}
                  </span>
                  <h2>{card.word}</h2>
                  {flipped ? (
                    <>
                      <span className="meaning">{card.meaning}</span>
                      <p className="example" lang="en">
                        “{card.example}”
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="ipa">{card.ipa}</span>
                      <small>Chạm để lật thẻ · Hãy thử nhớ trước nhé</small>
                    </>
                  )}
                </button>
                {flipped ? (
                  <div className="review-buttons">
                    {(
                      [
                        { key: "again", label: "Chưa nhớ" },
                        { key: "hard", label: "Hơi khó" },
                        { key: "good", label: "Nhớ rồi" },
                        { key: "easy", label: "Rất dễ" },
                      ] as const
                    ).map((r) => {
                      const next = scheduleReview(
                        state.reviews[card.id],
                        r.key,
                        new Date(now),
                      );
                      return (
                        <button
                          type="button"
                          key={r.key}
                          onClick={() => rate(r.key)}
                        >
                          {r.label}
                          <small>
                            {next.interval < 1
                              ? "10 phút nữa"
                              : `${next.interval} ngày nữa`}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="help-copy" style={{ textAlign: "center" }}>
                    Lật thẻ rồi chọn mức nhớ thật của bạn để xếp lần ôn tiếp
                    theo.
                  </p>
                )}
              </>
            ) : (
              <div className="empty-state">
                <CheckCircle2 size={38} />
                <h2>Vườn từ đã được chăm rồi!</h2>
                <p>
                  Hôm nay bạn đã ôn hết những từ đến hạn. Lịch ôn sẽ tự mở lại
                  khi tới lượt.
                </p>
                <Link href="/practice" className="button primary">
                  Khám phá một bài mới
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
          <aside className="stack">
            <section className="panel">
              <h2>Nhớ lâu, không nhồi nhét</h2>
              <ul className="tips-list">
                <li>Chưa nhớ: gặp lại sau 10 phút.</li>
                <li>Hơi khó: ôn lại sau một ngày.</li>
                <li>Nhớ tốt: khoảng cách tăng theo các lần ôn.</li>
                <li>
                  Đặt một câu liên quan đến chính mình giúp từ có ý nghĩa hơn.
                </li>
              </ul>
              <p className="help-copy">
                Lịch ôn là thuật toán đơn giản điều chỉnh theo mức nhớ tự đánh
                giá; không phải phép đo trí nhớ.
              </p>
            </section>
            <section className="vocab-teaser">
              <h2>Học ít mà sâu.</h2>
              <p>
                Một từ dùng được trong bài nói đáng giá hơn một danh sách dài
                chỉ vừa đọc qua.
              </p>
            </section>
          </aside>
        </div>
      ) : (
        <>
          <input
            className="search-input"
            aria-label="Tìm từ vựng"
            placeholder="Tìm từ, nghĩa hoặc chủ đề…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="vocab-list">
            {vocabulary
              .filter((v) =>
                `${v.word} ${v.meaning} ${v.topic}`
                  .toLocaleLowerCase("vi")
                  .includes(query.toLocaleLowerCase("vi")),
              )
              .map((v) => (
                <div className="vocab-list-item" key={v.id}>
                  <div>
                    <strong>{v.word}</strong>
                    <small>
                      {v.meaning} · {v.topic}
                    </small>
                    <small>
                      {state.reviews[v.id]
                        ? `Lần ôn tiếp: ${new Date(state.reviews[v.id].due).toLocaleString("vi-VN")}`
                        : "Chưa ôn"}
                    </small>
                    <p className="help-copy" lang="en">
                      {v.example}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Nghe phát âm ${v.word}`}
                    onClick={() => speak(v.word)}
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              ))}
          </div>
          {!vocabulary.some((v) =>
            `${v.word} ${v.meaning} ${v.topic}`
              .toLocaleLowerCase("vi")
              .includes(query.toLocaleLowerCase("vi")),
          ) && (
            <p className="help-copy">
              Chưa tìm thấy từ phù hợp. Thử tìm bằng tiếng Anh nhé.
            </p>
          )}
        </>
      )}
    </div>
  );
}
export function MistakesPage() {
  const { state, update, toast } = useStudy();
  const [filter, setFilter] = useState<"due" | "all">("due");
  const [now, setNow] = useState(() => Date.now());
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<string[]>([]);
  const all = mistakes(state, new Date(now));
  const filtered = all.filter(
    (m) =>
      filter === "all" ||
      revealed.includes(m.question.id) ||
      !state.mistakeReviews[m.question.id] ||
      Date.parse(state.mistakeReviews[m.question.id].due) <= now,
  );
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  function review(id: string, answer: number) {
    if (chosen[id] === undefined) {
      toast("Chọn một đáp án trước khi kiểm tra nhé.");
      return;
    }
    setRevealed((r) => [...r, id]);
    const correct = chosen[id] === answer;
    update((s) => ({
      ...s,
      mistakeReviews: {
        ...s.mistakeReviews,
        [id]: scheduleReview(s.mistakeReviews[id], correct ? "good" : "again"),
      },
    }));
    toast(
      correct
        ? `${state.profile.name} đã hiểu lại câu này. Hẹn lần ôn tiếp theo!`
        : "Đọc giải thích rồi thử lại sau 10 phút nhé.",
    );
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <NotebookPen size={15} />
            MISTAKES ARE PART OF LEARNING
          </div>
          <h1>Không phải lỗi. Là điều vừa học.</h1>
          <p>Những câu từng làm mình phân vân, gom lại để lần sau vững hơn.</p>
        </div>
        <span className="pill">{all.length} câu đã ghi lại</span>
      </div>
      <div className="filters">
        <button
          type="button"
          className={`filter ${filter === "due" ? "active" : ""}`}
          onClick={() => setFilter("due")}
          aria-pressed={filter === "due"}
        >
          Đến lúc ôn
        </button>
        <button
          type="button"
          className={`filter ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
        >
          Tất cả câu từng sai
        </button>
      </div>
      {filtered.length ? (
        <div className="stack">
          {filtered.map((item, i) => {
            const seen = revealed.includes(item.question.id);
            return (
              <section className="panel" key={item.question.id}>
                <div className="section-heading">
                  <div>
                    <div className="mistake-signals">
                      <span className="pill">{item.question.tag}</span>
                      {item.confidence && (
                        <span
                          className={`confidence-pill ${item.confidence === "sure" ? "priority" : ""}`}
                        >
                          {item.confidence === "sure"
                            ? "Ưu tiên · Đã rất chắc"
                            : item.confidence === "unsure"
                              ? "Đã chưa chắc"
                              : "Đã đoán"}
                        </span>
                      )}
                      {item.wrongCount > 1 && (
                        <span className="confidence-pill">
                          Sai {item.wrongCount} lần
                        </span>
                      )}
                    </div>
                    <p>
                      {item.lesson.title} ·{" "}
                      {new Date(item.date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <Link
                    href={`/practice/${item.lesson.id}`}
                    className="text-link"
                  >
                    Mở bài gốc
                    <ArrowRight size={14} />
                  </Link>
                </div>
                <details>
                  <summary>
                    {item.lesson.skill === "listening"
                      ? "Nghe lại ngữ liệu"
                      : "Đọc lại ngữ liệu"}
                  </summary>
                  {item.lesson.skill === "listening" ? (
                    <AudioPlayer text={item.lesson.text} />
                  ) : (
                    <div className="passage" lang="en">
                      {item.lesson.text}
                    </div>
                  )}
                </details>
                <div style={{ marginTop: 18 }}>
                  <QuestionCard
                    question={item.question}
                    index={i}
                    chosen={chosen[item.question.id]}
                    submitted={seen}
                    onChoose={(v) =>
                      setChosen((c) => ({ ...c, [item.question.id]: v }))
                    }
                  />
                </div>
                {!seen ? (
                  <button
                    type="button"
                    className="button primary small"
                    onClick={() =>
                      review(item.question.id, item.question.answer)
                    }
                  >
                    <RotateCcw size={14} />
                    Kiểm tra lại
                  </button>
                ) : (
                  <p className="help-copy">
                    Đã xếp lịch ôn tiếp:{" "}
                    {new Date(
                      state.mistakeReviews[item.question.id].due,
                    ).toLocaleString("vi-VN")}
                    .
                  </p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <NotebookPen size={36} />
          <h2>
            {all.length
              ? "Hôm nay không còn câu đến hạn."
              : "Một cuốn sổ đang chờ những bài học."}
          </h2>
          <p>
            {all.length
              ? "Bạn có thể xem lại tất cả câu từng sai hoặc bắt đầu một bài khác."
              : "Sau mỗi bài Nghe hoặc Đọc, câu sai sẽ tự xuất hiện ở đây cùng giải thích. Mình không cần nhớ mọi lỗi một mình."}
          </p>
          <Link href="/practice" className="button primary">
            Luyện một bài nhỏ
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
