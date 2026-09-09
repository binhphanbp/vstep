import Link from "next/link";
import { Cloud } from "lucide-react";
export default function NotFound() {
  return (
    <div className="page">
      <div className="empty-state">
        <Cloud size={40} />
        <h1>Hình như mình đi lạc một chút.</h1>
        <p>
          Trang này chưa có hoặc bài học đã đổi địa chỉ. Góc học vẫn ở đây nhé.
        </p>
        <Link href="/" className="button primary">
          Về góc học hôm nay
        </Link>
      </div>
    </div>
  );
}
