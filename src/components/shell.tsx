"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cloud,
  LayoutDashboard,
  Route,
  BookOpen,
  Timer,
  Layers,
  NotebookPen,
  ChartNoAxesCombined,
  Settings,
  Heart,
  Flame,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  CircleHelp,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStudy } from "./study-provider";
import { streak, daysUntil } from "@/lib/learning";
const nav = [
  { href: "/", label: "Góc học hôm nay", icon: LayoutDashboard },
  { href: "/journey", label: "Lộ trình của mình", icon: Route },
  { href: "/practice", label: "Luyện 4 kỹ năng", icon: BookOpen },
  { href: "/exam", label: "Phòng thi thử", icon: Timer },
  { href: "/vocabulary", label: "Vườn từ vựng", icon: Layers },
  { href: "/mistakes", label: "Sổ tay lỗi sai", icon: NotebookPen },
  { href: "/progress", label: "Nhìn lại tiến bộ", icon: ChartNoAxesCombined },
];
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, ready, storageError } = useStudy();
  const [mobile, setMobile] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobile) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = menuButton.current;
    document.body.style.overflow = "hidden";
    const links = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>("a[href],button") ?? [],
      ).filter((element) => element.offsetParent !== null);
    links()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
      if (event.key !== "Tab") return;
      const items = links();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keydown);
      trigger?.focus();
    };
  }, [mobile]);
  const current = nav.find((n) =>
    n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
  );
  const days = daysUntil(state.profile.examDate);
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Đến nội dung chính
      </a>
      {mobile && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Đóng menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside ref={sidebar} className={`sidebar ${mobile ? "open" : ""}`}>
        <Link className="brand" href="/" onClick={() => setMobile(false)}>
          <span className="brand-mark">
            <Cloud size={30} fill="currentColor" />
          </span>
          <span>
            mây<span className="brand-dot">.</span>
            <small>A LITTLE SPACE FOR GÙA</small>
          </span>
        </Link>
        <button
          type="button"
          className="mobile-close icon-button"
          aria-label="Đóng menu"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="workspace-label">
          GÓC HỌC CỦA GÙA <Sparkles size={13} />
        </div>
        <nav aria-label="Điều hướng chính">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobile(false)}
              className={`nav-item ${current?.href === item.href ? "active" : ""}`}
              aria-current={current?.href === item.href ? "page" : undefined}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.href === "/vocabulary" && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="love-note">
            <Heart size={19} />
            <p>
              Gùa cứ đi theo nhịp của mình,
              <br />
              chậm mà chắc là được.
            </p>
            <span>Rùa nhỏ vẫn đang tiến về phía trước.</span>
          </div>
          <Link
            className={`nav-item ${pathname === "/guide" ? "active" : ""}`}
            href="/guide"
            onClick={() => setMobile(false)}
          >
            <CircleHelp size={19} />
            Cẩm nang VSTEP
          </Link>
          <Link
            className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
            href="/settings"
            onClick={() => setMobile(false)}
          >
            <Settings size={19} />
            Cài đặt của mình
          </Link>
          <Link
            href="/settings"
            className="profile-link"
            onClick={() => setMobile(false)}
          >
            <span className="avatar">
              {state.profile.name[0].toUpperCase()}
            </span>
            <span>
              <strong>{state.profile.name}</strong>
              <small>
                {state.profile.name === "Gùa" ? "Rùa nhỏ · " : ""}Hành trình đến{" "}
                {state.profile.target}
              </small>
            </span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              type="button"
              className="mobile-menu icon-button"
              ref={menuButton}
              aria-expanded={mobile}
              aria-label="Mở menu"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span>Không gian học tập</span>
            <ChevronRight size={14} />
            <strong>
              {current?.label ??
                (pathname === "/settings"
                  ? "Cài đặt của mình"
                  : "Cẩm nang VSTEP")}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="streak-pill">
              <Flame size={16} />
              {streak(state.attempts)} ngày
            </span>
            <Link className="target-pill" href="/settings">
              <span className="status-dot" />
              Mục tiêu {state.profile.target}
              {days !== null && (
                <span className="countdown">
                  {" "}
                  · {days >= 0 ? `${days} ngày nữa` : "Đã qua ngày dự kiến"}
                </span>
              )}
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {storageError && (
            <div className="notice error" role="alert">
              {storageError}
            </div>
          )}
          {ready ? (
            children
          ) : (
            <div className="loading-state">
              <Cloud size={36} />
              <p>Đang mở góc học của {state.profile.name}…</p>
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>
            Made with a little love for Gùa <Heart size={12} />
          </span>
          <span>Đi một chút. Tiến một chút.</span>
        </footer>
      </div>
    </div>
  );
}
