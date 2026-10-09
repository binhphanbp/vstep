"use client";
import { useStudy } from "./study-provider";
import { gradeTrend, type TrendPoint } from "@/lib/grade-trend";
import { localDay } from "@/lib/learning";
import { scoreText } from "./grade-parts";

const WIDTH = 640;
const HEIGHT = 240;
const LEFT = 36;
const RIGHT = 16;
const TOP = 14;
const BOTTOM = 34;
const TICKS = [0, 2, 4, 6, 8, 10];

const NAME = { writing: "Viết", speaking: "Nói" } as const;
const dayText = (iso: string) => {
  const day = localDay(iso);
  return `${day.slice(8)}/${day.slice(5, 7)}`;
};

function Marker({ point, x, y }: { point: TrendPoint; x: number; y: number }) {
  const label = `${NAME[point.skill]} · ${dayText(point.at)} · ${scoreText(point.score)}/10`;
  return point.skill === "writing" ? (
    <circle
      className="trend-mark writing"
      cx={x}
      cy={y}
      r={5}
      data-skill="writing"
    >
      <title>{label}</title>
    </circle>
  ) : (
    <rect
      className="trend-mark speaking"
      x={x - 5}
      y={y - 5}
      width={10}
      height={10}
      transform={`rotate(45 ${x} ${y})`}
      data-skill="speaking"
    >
      <title>{label}</title>
    </rect>
  );
}

/**
 * How the AI's marks for her Writing and Speaking have moved, oldest to newest.
 * It plots only what was shown to her, says these are estimates, and has the
 * same numbers as a table for anyone who cannot read a picture.
 */
export function GradeTrend() {
  const { state } = useStudy();
  const points = gradeTrend(state);
  if (!points.length) return null;
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const x = (index: number) =>
    points.length === 1
      ? LEFT + plotWidth / 2
      : LEFT + (index / (points.length - 1)) * plotWidth;
  const y = (score: number) => TOP + (1 - score / 10) * plotHeight;
  const place = points.map((point, index) => ({
    point,
    x: x(index),
    y: y(point.score),
  }));
  const kinds = (["writing", "speaking"] as const).filter((skill) =>
    points.some((point) => point.skill === skill),
  );
  return (
    <section className="panel" aria-labelledby="grade-trend-title">
      <div className="panel-heading">
        <h2 id="grade-trend-title">Điểm AI ước lượng theo thời gian</h2>
        <span className="pill">{points.length} lần chấm</span>
      </div>
      <ul className="trend-legend" aria-label="Chú thích">
        {kinds.map((skill) => (
          <li key={skill}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              {skill === "writing" ? (
                <circle className="trend-mark writing" cx="7" cy="7" r="5" />
              ) : (
                <rect
                  className="trend-mark speaking"
                  x="2"
                  y="2"
                  width="10"
                  height="10"
                  transform="rotate(45 7 7)"
                />
              )}
            </svg>
            {skill === "writing"
              ? "Viết (điểm từng bài)"
              : "Nói (điểm cả bài thi)"}
          </li>
        ))}
      </ul>
      <svg
        className="trend-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Điểm AI ước lượng: ${points
          .map(
            (point) =>
              `${NAME[point.skill]} ${dayText(point.at)} ${scoreText(point.score)}/10`,
          )
          .join(", ")}`}
      >
        {TICKS.map((tick) => (
          <g key={tick}>
            <line
              className="trend-grid"
              x1={LEFT}
              x2={WIDTH - RIGHT}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="trend-axis"
              x={LEFT - 8}
              y={y(tick) + 4}
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        ))}
        {kinds.map((skill) => {
          const line = place.filter((entry) => entry.point.skill === skill);
          return line.length > 1 ? (
            <polyline
              key={skill}
              className={`trend-line ${skill}`}
              points={line.map((entry) => `${entry.x},${entry.y}`).join(" ")}
            />
          ) : null;
        })}
        {place.map((entry) => (
          <Marker key={entry.point.id} {...entry} />
        ))}
        <text
          className="trend-axis"
          x={LEFT}
          y={HEIGHT - 10}
          textAnchor="start"
        >
          {dayText(points[0].at)}
        </text>
        {points.length > 1 && (
          <text
            className="trend-axis"
            x={WIDTH - RIGHT}
            y={HEIGHT - 10}
            textAnchor="end"
          >
            {dayText(points[points.length - 1].at)}
          </text>
        )}
      </svg>
      <p className="help-copy">
        Mỗi điểm là một lần chấm, xếp theo thời gian chấm, không theo khoảng
        cách ngày. Đây là điểm AI ước lượng: xem đường đi lên hay đi xuống thì
        có ích, còn từng con số thì có thể lệch.
      </p>
      <details>
        <summary>Xem dạng bảng</summary>
        <table className="trend-table">
          <thead>
            <tr>
              <th scope="col">Ngày</th>
              <th scope="col">Kỹ năng</th>
              <th scope="col">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((point) => (
              <tr key={point.id}>
                <td>{dayText(point.at)}</td>
                <td>{NAME[point.skill]}</td>
                <td>{scoreText(point.score)}/10</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
