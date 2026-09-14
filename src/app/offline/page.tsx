export const metadata = { title: "Đang ngoại tuyến" };
export default function Page() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Mạng đang không ổn</h1>
          <p>
            Trang này chưa được lưu sẵn trên máy nên chưa mở được khi ngoại
            tuyến. Những trang Gùa đã mở gần đây vẫn xem lại được, và mọi tiến
            độ đang lưu ngay trên máy nên không mất đi đâu cả.
          </p>
        </div>
      </div>
      <div className="empty-state">
        <h2>Thử lại khi có mạng nhé.</h2>
        <p>
          Khi có mạng lại, mở lại trang là mọi thứ trở về bình thường. Bài đang
          làm dở và bản nháp vẫn nằm nguyên trên thiết bị này.
        </p>
      </div>
    </div>
  );
}
