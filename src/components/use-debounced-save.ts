"use client";
import { useCallback, useEffect, useRef } from "react";

/**
 * Saves a text a moment after the last keystroke without losing the last
 * words: what is still waiting is written the instant the box loses focus,
 * the page is hidden or left, or the box goes away.
 *
 * Writing the whole profile on every keystroke is what the notes avoid. It
 * costs a few milliseconds on a laptop and more on a phone, and on the
 * listening screen every change re-renders the page the audio is playing on.
 */
export function useDebouncedSave(save: (value: string) => void, delay = 900) {
  const pending = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const saver = useRef(save);
  useEffect(() => {
    saver.current = save;
  }, [save]);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const value = pending.current;
    pending.current = null;
    if (value !== null) saver.current(value);
  }, []);

  const schedule = useCallback(
    (value: string) => {
      pending.current = value;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, delay);
    },
    [flush, delay],
  );

  useEffect(() => {
    const leave = () => flush();
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", hidden);
      flush();
    };
  }, [flush]);

  return { schedule, flush };
}
