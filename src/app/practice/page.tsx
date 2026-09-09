import { Suspense } from "react";
import { PracticeLibrary } from "@/components/practice";
export const metadata = { title: "Luyện bốn kỹ năng" };
export default function Page() {
  return (
    <Suspense
      fallback={<div className="loading-state">Đang mở kho bài học…</div>}
    >
      <PracticeLibrary />
    </Suspense>
  );
}
