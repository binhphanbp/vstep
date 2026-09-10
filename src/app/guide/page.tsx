import { ArrowUpRight, BookOpen, MapPin } from "lucide-react";
import { sources } from "@/lib/content";
export const metadata = { title: "Cẩm nang VSTEP tại TP.HCM" };
export default function Page() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <BookOpen size={15} />
            KNOW THE TEST, FEEL MORE PREPARED
          </div>
          <h1>Hiểu kỳ thi. Bớt một chút lo.</h1>
          <p>
            Những điều cần biết về VSTEP bậc 3–5 và nơi tra cứu thông tin tại
            TP.HCM.
          </p>
        </div>
      </div>
      <div className="stack">
        <section className="panel">
          <h2>Định dạng bài thi đầy đủ</h2>
          <p className="help-copy" style={{ marginBottom: 18 }}>
            Tóm lược theo định dạng VSTEP bậc 3–5 do Trường ĐH Ngoại ngữ,
            ĐHQGHN công bố và đối chiếu với nguồn tại ĐH Sư phạm TP.HCM ngày
            10/09/2026. Kiểm tra hướng dẫn của kỳ thi bạn đăng ký.
          </p>
          <div className="table-scroll">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Kỹ năng</th>
                  <th>Thời gian</th>
                  <th>Cấu trúc</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Listening</td>
                  <td>Khoảng 40 phút</td>
                  <td>35 câu trắc nghiệm, 3 phần</td>
                </tr>
                <tr>
                  <td>Reading</td>
                  <td>60 phút</td>
                  <td>40 câu, 4 bài đọc; tổng khoảng 1.900–2.500 từ</td>
                </tr>
                <tr>
                  <td>Writing</td>
                  <td>60 phút</td>
                  <td>
                    Thư/email khoảng 120 từ (1/3 điểm) và essay khoảng 250 từ
                    (2/3 điểm)
                  </td>
                </tr>
                <tr>
                  <td>Speaking</td>
                  <td>12 phút</td>
                  <td>
                    Tương tác xã hội, thảo luận giải pháp, phát triển chủ đề
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="help-copy">
            Điểm từng kỹ năng và điểm trung bình bốn kỹ năng được làm tròn đến
            0,5: B1 từ 4,0–5,5; B2 từ 6,0–8,0; C1 từ 8,5–10. Dưới 4,0 chưa xét
            bậc theo định dạng này.{" "}
            <a
              className="text-link"
              href={sources[0].url}
              target="_blank"
              rel="noreferrer"
            >
              Xem bản công bố gốc
              <ArrowUpRight size={14} />
            </a>
          </p>
          <p className="help-copy">
            Đề luyện đủ cấu trúc hiện có của Mây dùng khoảng 1.900–2.050 từ
            cho phần Reading, nằm trong phạm vi công bố trên.
          </p>
        </section>
        <div className="content-grid">
          <section className="panel">
            <div className="section-title">
              <MapPin size={20} />
              <h2>Tra cứu thông tin tại TP.HCM</h2>
            </div>
            <p className="help-copy">
              Lịch thi, phí và hồ sơ có thể thay đổi. Mở thông báo từ trường để
              xem thời điểm đăng ký và yêu cầu mới nhất.
            </p>
            {sources.map((s) => (
              <a
                key={s.url}
                className="source-link"
                href={s.url}
                target="_blank"
                rel="noreferrer"
              >
                {s.title}
                <ArrowUpRight size={17} />
              </a>
            ))}
            <p className="help-copy">
              Mây không nhận đăng ký hay thu phí thi. Ngày bạn đặt trong Cài đặt
              chỉ là mốc học cá nhân.
            </p>
          </section>
          <section className="vocab-teaser">
            <h2>Đừng để ngày thi là lần đầu.</h2>
            <p>
              Trước kỳ thi, đọc hướng dẫn của đơn vị tổ chức và tập với một đề
              đủ độ dài. Làm quen bàn phím, tai nghe, micro và cách chuyển phần
              sẽ giúp bạn bình tĩnh hơn.
            </p>
          </section>
        </div>
        <section className="panel">
          <h2>Học với Mây thế nào cho hiệu quả?</h2>
          <div className="form-grid" style={{ marginTop: 18 }}>
            {[
              {
                title: "Nghe: hiểu vì sao mình bỏ lỡ",
                text: "Làm trước khi đọc bản chép lời. Sau đó tìm đúng chỗ đã nghe nhầm: âm nối, từ khoá hay thông tin được sửa lại.",
              },
              {
                title: "Đọc: tìm bằng chứng",
                text: "Mỗi đáp án cần có một câu hoặc một ý trong bài hỗ trợ. Đừng chọn chỉ vì một từ xuất hiện giống hệt câu hỏi.",
              },
              {
                title: "Viết: đủ ý trước, hay sau",
                text: "Lập dàn ý theo yêu cầu đề. Viết xong mới rà bố cục, từ vựng và ngữ pháp. Nhờ giáo viên phản hồi một vài bài để phát hiện lỗi mình chưa tự thấy.",
              },
              {
                title: "Nói: ghi lại, nghe lại, thử lại",
                text: "Trả lời trực tiếp rồi mở rộng bằng lý do và ví dụ. Mỗi lần nghe lại chỉ chọn một điểm cần cải thiện, rồi ghi bản mới.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3>{item.title}</h3>
                <p className="help-copy">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
        <p className="help-copy">
          Kho bài Mây hiện có bài luyện ngắn tự biên soạn ở mức dự kiến B1–B2 và
          giọng đọc tổng hợp. Không phải ngân hàng đề chính thức; chưa được
          chuẩn hoá độ khó. Tự kiểm tra Viết/Nói không thay thế đánh giá của
          giáo viên.
        </p>
      </div>
    </div>
  );
}
