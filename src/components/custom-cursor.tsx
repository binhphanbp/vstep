"use client";

import { useEffect, useRef, useState } from "react";

const interactiveSelector =
  'a, button, summary, label, [role="button"], [role="link"], input[type="checkbox"], input[type="radio"], [data-cursor="interactive"]';
const nativeCursorSelector =
  'input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"], [data-cursor="native"]';

export function CustomCursor() {
  const dotRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(!reducedMotion.matches);

    update();
    reducedMotion.addEventListener("change", update);
    return () => {
      reducedMotion.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let frame = 0;
    let visible = false;
    let pressed = false;
    let targetX = -48;
    let targetY = -48;
    let ringX = targetX;
    let ringY = targetY;

    const paintDot = () => {
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) scale(${pressed ? 0.72 : 1})`;
    };
    const animateRing = () => {
      ringX += (targetX - ringX) * 0.22;
      ringY += (targetY - ringY) * 0.22;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${pressed ? 0.82 : 1})`;
      frame = window.requestAnimationFrame(animateRing);
    };
    const hide = () => {
      if (!visible) return;
      visible = false;
      root.classList.remove("custom-cursor-active");
      dot.classList.remove("is-visible", "is-pressed");
      ring.classList.remove("is-visible", "is-interactive", "is-disabled");
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") {
        hide();
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(nativeCursorSelector)) {
        hide();
        return;
      }

      targetX = event.clientX;
      targetY = event.clientY;
      paintDot();
      if (!visible) {
        ringX = targetX;
        ringY = targetY;
        visible = true;
        root.classList.add("custom-cursor-active");
        dot.classList.add("is-visible");
        ring.classList.add("is-visible");
      }

      const interactive = target?.closest(interactiveSelector);
      ring.classList.toggle("is-interactive", Boolean(interactive));
      ring.classList.toggle(
        "is-disabled",
        Boolean(
          interactive?.matches(":disabled, [aria-disabled='true']") ||
          interactive?.closest("[aria-disabled='true']"),
        ),
      );
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      pressed = true;
      dot.classList.add("is-pressed");
      paintDot();
    };
    const up = () => {
      pressed = false;
      dot.classList.remove("is-pressed");
      paintDot();
    };
    const leaveWindow = (event: PointerEvent) => {
      if (event.relatedTarget === null) hide();
    };
    const visibility = () => {
      if (document.hidden) hide();
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    window.addEventListener("pointerout", leaveWindow, { passive: true });
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", visibility);
    frame = window.requestAnimationFrame(animateRing);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("pointerout", leaveWindow);
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", visibility);
      root.classList.remove("custom-cursor-active");
    };
  }, [enabled]);

  return (
    <div className="custom-cursor" aria-hidden="true">
      <span ref={ringRef} className="custom-cursor-ring" />
      <span ref={dotRef} className="custom-cursor-dot" />
    </div>
  );
}
