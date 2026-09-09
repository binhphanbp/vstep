import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { StudyProvider } from "@/components/study-provider";
import { Shell } from "@/components/shell";
import { CustomCursor } from "@/components/custom-cursor";

const font = Be_Vietnam_Pro({
  variable: "--font-main",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mây · Góc học VSTEP của Gùa",
    template: "%s · Mây VSTEP",
  },
  description:
    "Góc luyện VSTEP được làm riêng cho Gùa: lộ trình vừa sức, bốn kỹ năng, ôn từ vựng và hiểu lỗi sai.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${font.variable} h-full antialiased`}>
      <body>
        <StudyProvider>
          <Shell>{children}</Shell>
        </StudyProvider>
        <CustomCursor />
      </body>
    </html>
  );
}
