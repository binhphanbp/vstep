"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#fff6fa",
          color: "#3f3a42",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <main
          style={{
            width: "min(100%, 520px)",
            padding: "36px 30px",
            border: "1px solid #f1dfe8",
            borderRadius: 24,
            background: "#fff",
            boxShadow: "0 18px 48px rgb(104 54 80 / 10%)",
          }}
        >
          <p style={{ margin: 0, color: "#c24178", fontWeight: 700 }}>
            MÂY VSTEP
          </p>
          <h1 style={{ margin: "12px 0 8px", fontSize: 28 }}>
            Góc học cần mở lại một chút.
          </h1>
          <p style={{ margin: "0 0 24px", lineHeight: 1.7 }}>
            Dữ liệu học trên thiết bị vẫn được giữ. Thử lại trước; nếu lỗi vẫn
            còn, hãy mở cài đặt để xuất bản sao.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0,
                borderRadius: 12,
                padding: "11px 16px",
                background: "#c24178",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Thử lại
            </button>
            <a
              href="/settings"
              style={{
                padding: "11px 16px",
                border: "1px solid #e8c9d8",
                borderRadius: 12,
                color: "#6d3652",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Mở cài đặt
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
