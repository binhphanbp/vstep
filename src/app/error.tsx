"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page">
      <div className="empty-state">
        <h1>Góc học gặp một chút trục trặc.</h1>
        <p>Thử mở lại trang nhé. Dữ liệu đã lưu trên thiết bị vẫn được giữ.</p>
        <button type="button" className="button primary" onClick={reset}>
          Thử lại
        </button>
        <a href="/settings" className="text-link">
          Mở cài đặt để xuất bản sao
        </a>
      </div>
    </div>
  );
}
