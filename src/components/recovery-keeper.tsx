"use client";
import { useCallback, useEffect, useRef } from "react";
import { stateSchema } from "@/lib/learning";
import { putBack, recoverableOf, writtenByOlderBuild } from "@/lib/recovery";
import { clearCopy, readCopy, writeCopy } from "@/lib/recovery-copy";
import {
  currentBackupState,
  getSnapshot,
  onHealed,
  rawStudyData,
} from "@/lib/study-store";
import { useStudy } from "./study-provider";

const QUIET = 2000;

/**
 * Looks after the notes, scratch pages and highlights against a tab that is
 * still running a build from before they existed (see `src/lib/recovery.ts`).
 * It draws nothing. Three jobs:
 *
 * - tells the learner when a tab put something back;
 * - on opening, if the profile came back without this build's stamp, puts back
 *   from the copy in IndexedDB what an older tab erased while no tab of this
 *   build was open;
 * - keeps that copy current, a moment after the last change.
 *
 * The copy is the last place the notes may be, so it is only ever replaced by
 * something that is known to be whole: never before it has been read, and
 * never by a profile that an older build may have emptied.
 */
export function RecoveryKeeper() {
  const { state, ready, storageError, update, toast } = useStudy();
  const started = useRef(false);
  const settled = useRef(false);
  // The parts of the profile the copy was last made from, by reference: an
  // answer to a question changes none of them, and serializing the notes to
  // find that out would cost milliseconds on every pause.
  const seen = useRef<unknown[] | null>(null);
  // A copy exists, so a profile without this build's stamp may not touch it.
  const haveCopy = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  // One notice a minute is enough: an older tab that is still being used would
  // otherwise say it with every answer it saves.
  const toldAt = useRef(0);
  useEffect(
    () =>
      onHealed(() => {
        if (Date.now() - toldAt.current < 60_000) return;
        toldAt.current = Date.now();
        toast(
          "Một tab chạy bản cũ của trang vừa xóa nhầm ghi chú, nháp hoặc câu tô; Mây đã đưa chúng về. Hãy đóng hoặc tải lại tab đó.",
        );
      }),
    [toast],
  );

  const write = useCallback(async () => {
    // Not before the copy has been read: this one would overwrite it. Nor
    // while the profile cannot be read: what is in memory is then empty, and
    // the copy may be the only other place the notes are.
    if (!settled.current || getSnapshot().storageError) return;
    const current = currentBackupState();
    // A profile that no save of this build has stamped may be one an older tab
    // emptied. With a copy to protect, wait until a save of this build says the
    // profile is whole.
    if (writtenByOlderBuild(current) && haveCopy.current) return;
    const parts = [
      current.notes,
      current.attempts,
      current.paperRuns,
      current.exam,
    ];
    if (seen.current && parts.every((part, i) => part === seen.current![i]))
      return;
    const saved = recoverableOf(current);
    let done = true;
    if (Object.keys(saved).length === 0) {
      if (haveCopy.current) {
        await clearCopy();
        haveCopy.current = false;
      }
    } else if (await writeCopy({ savedAt: new Date().toISOString(), saved })) {
      haveCopy.current = true;
    } else done = false;
    if (done) seen.current = parts;
  }, []);
  // One at a time, each working from the profile as it is when its turn comes:
  // two writes in flight could leave the older one on disk.
  const keep = useCallback(() => {
    queue.current = queue.current.then(write, write);
    return queue.current;
  }, [write]);

  useEffect(() => {
    if (!ready || started.current || storageError) return;
    started.current = true;
    void (async () => {
      // No saved profile: a fresh start, or one the learner wiped. A copy left
      // from before must not bring the old notes back into it.
      if (rawStudyData() === null) {
        await clearCopy();
        haveCopy.current = false;
      } else {
        // A copy that cannot be read is still there. Ask again a few times, and
        // if it never answers leave it alone for the whole visit.
        let copy = await readCopy();
        for (const wait of [3_000, 15_000, 60_000]) {
          if (copy !== undefined) break;
          await new Promise((resolve) => window.setTimeout(resolve, wait));
          copy = await readCopy();
        }
        if (copy === undefined) return;
        haveCopy.current = copy !== null;
        let restored = false;
        if (copy) {
          update((current) => {
            if (!writtenByOlderBuild(current)) return current;
            const next = putBack(current, copy.saved);
            if (next === current) return current;
            // A copy is only a copy: never let it make the profile unreadable.
            if (
              !stateSchema.safeParse(JSON.parse(JSON.stringify(next))).success
            )
              return current;
            restored = true;
            return next;
          });
          if (restored)
            toast(
              getSnapshot().storageError
                ? "Ghi chú, nháp và câu tô bị bản cũ của trang xóa nhầm đã được đưa về, nhưng máy không lưu được. Hãy xuất bản sao ở Cài đặt trước khi đóng trang."
                : "Một tab chạy bản cũ của trang đã xóa nhầm ghi chú, nháp hoặc câu tô; Mây đã đưa chúng về từ bản dự phòng trên máy.",
            );
        }
        // From here on a profile without the stamp can only be one written by
        // a build older than the loose schemas (the builds in between keep the
        // stamp, because they keep every field they do not know). So the
        // profile is stamped now, once it is known to be whole.
        const whole = getSnapshot().state;
        if (
          writtenByOlderBuild(whole) &&
          (!copy || putBack(whole, copy.saved) === whole)
        )
          update((current) =>
            writtenByOlderBuild(current) ? { ...current } : current,
          );
      }
      settled.current = true;
      void keep();
    })();
  }, [ready, storageError, update, toast, keep]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => void keep(), QUIET);
    const hide = () => {
      if (document.visibilityState !== "hidden") return;
      window.clearTimeout(timer);
      void keep();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [state, ready, keep]);

  return null;
}
