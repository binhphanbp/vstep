import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { RecoveryKeeper } from "@/components/recovery-keeper";
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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mây VSTEP",
    statusBarStyle: "default",
  },
  other: {
    // The app teaches English and carries its own Vietnamese where it is
    // wanted. A browser that offers to translate a page it takes for English
    // (the long passages tip its guess) would rewrite the very text she is
    // there to read, so the offer is switched off (also `translate="no"`).
    google: "notranslate",
    "may-release":
      process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "local",
  },
};

export const viewport: Viewport = {
  themeColor: "#fff8fb",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      translate="no"
      className={`${font.variable} h-full antialiased`}
    >
      <body>
        <StudyProvider>
          <Shell>{children}</Shell>
          <RecoveryKeeper />
        </StudyProvider>
        <CustomCursor />
      </body>
    </html>
  );
}
