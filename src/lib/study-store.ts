"use client";
import {
  freshState,
  personalizeLegacyState,
  stateSchema,
  type StudyState,
} from "./learning";
import { STATE_REV, healStripped } from "./recovery";
const KEY = "may-study-v1";
const unreadableMessage =
  "Không đọc được dữ liệu thiết bị. Bản gốc chưa bị ghi đè; vào Cài đặt để xuất bản gốc hoặc nhập bản sao hợp lệ.";
type Snapshot = { state: StudyState; ready: boolean; storageError: string };
const serverSnapshot: Snapshot = {
  state: freshState(),
  ready: false,
  storageError: "",
};
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();
let initialized = false;
/**
 * The stored text as it looked when this tab last read or wrote it. Parsing
 * and validating the whole profile costs several milliseconds once the history
 * grows, and the timers on the practice and exam pages call in every second:
 * when the text has not changed there is nothing new to learn from it.
 */
let lastRaw: string | null = null;
function emit() {
  listeners.forEach((listener) => listener());
}
const healedListeners = new Set<() => void>();
/**
 * Called when this tab has put back what an older tab dropped from the
 * profile (see `src/lib/recovery.ts`), so that the learner is told.
 */
export function onHealed(listener: () => void) {
  healedListeners.add(listener);
  return () => {
    healedListeners.delete(listener);
  };
}
/**
 * Writes the healed profile, with the stamp that tells every other tab it is
 * whole again, unless another save has landed since the one being healed: that
 * one is dealt with when its own event arrives, and writing now would overwrite
 * it. Either way the healed profile is what this tab keeps.
 */
function persistHealed(healed: StudyState, expectedRaw: string): StudyState {
  const state: StudyState = {
    ...healed,
    rev: STATE_REV,
    updatedAt: new Date(
      Math.max(Date.now(), Date.parse(healed.updatedAt) + 1),
    ).toISOString(),
  };
  try {
    if (localStorage.getItem(KEY) !== expectedRaw) return healed;
    const raw = JSON.stringify(state);
    localStorage.setItem(KEY, raw);
    lastRaw = raw;
    return state;
  } catch {
    // The next ordinary save writes it.
    return healed;
  }
}
function readInitial() {
  let state = freshState();
  let storageError = "";
  try {
    const raw = localStorage.getItem(KEY);
    lastRaw = raw;
    if (raw) {
      const parsed = stateSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) throw Error("invalid");
      state = personalizeLegacyState(parsed.data);
    }
  } catch {
    storageError = unreadableMessage;
  }
  snapshot = { state, storageError, ready: true };
  initialized = true;
}
function onStorage(event: StorageEvent) {
  if (event.key !== KEY || !event.newValue || snapshot.storageError) return;
  lastRaw = event.newValue;
  try {
    const incoming = personalizeLegacyState(
      stateSchema.parse(JSON.parse(event.newValue)),
    );
    // A tab on an older build saves a profile without the fields it does not
    // know: what this tab still has of them is put back.
    const healed = healStripped(snapshot.state, incoming);
    if (incoming.updatedAt > snapshot.state.updatedAt) {
      const next =
        healed === incoming ? incoming : persistHealed(healed, event.newValue);
      snapshot = { ...snapshot, state: next };
      emit();
      if (healed !== incoming)
        healedListeners.forEach((listener) => listener());
    } else if (healed !== incoming) {
      // The older tab saved from a stale view, so what it wrote is not newer
      // than what this tab has. This tab's own profile is then the whole one:
      // it goes back, as it is, in place of the stripped one.
      snapshot = {
        ...snapshot,
        state: persistHealed(snapshot.state, event.newValue),
      };
      emit();
      healedListeners.forEach((listener) => listener());
    }
  } catch {
    snapshot = { ...snapshot, storageError: unreadableMessage };
    emit();
  }
}
export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!initialized) readInitial();
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}
export const getSnapshot = () => snapshot;
export const getServerSnapshot = () => serverSnapshot;
/**
 * The raw stored text. When the saved data cannot be parsed the in-memory
 * state is empty, so this is the learner's only remaining copy and must be
 * what gets exported before anything replaces it.
 */
export function rawStudyData(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
export function currentBackupState(): StudyState {
  // Refresh from another tab before an asynchronous import replaces local data.
  // updateStudy also preserves unsaved RAM state when storage is unavailable.
  updateStudy((state) => state);
  return snapshot.state;
}
export function updateStudy(fn: (state: StudyState) => StudyState) {
  if (!initialized) readInitial();
  // Read a more recent snapshot before applying a mutation from another tab.
  if (!snapshot.storageError) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw && raw !== lastRaw) {
        lastRaw = raw;
        const latest = personalizeLegacyState(
          stateSchema.parse(JSON.parse(raw)),
        );
        if (latest.updatedAt > snapshot.state.updatedAt) {
          const healed = healStripped(snapshot.state, latest);
          snapshot = {
            ...snapshot,
            state: healed === latest ? latest : persistHealed(healed, raw),
          };
          if (healed !== latest)
            healedListeners.forEach((listener) => listener());
        }
      }
    } catch {
      snapshot = { ...snapshot, storageError: unreadableMessage };
      emit();
    }
  }
  const next = fn(snapshot.state);
  if (next === snapshot.state) return;
  const state = {
    ...next,
    rev: STATE_REV,
    updatedAt: new Date(
      Math.max(Date.now(), Date.parse(snapshot.state.updatedAt) + 1),
    ).toISOString(),
  };
  let storageError = snapshot.storageError;
  if (!storageError) {
    try {
      const raw = JSON.stringify(state);
      localStorage.setItem(KEY, raw);
      lastRaw = raw;
    } catch {
      storageError =
        "Không lưu được trên thiết bị. Thay đổi mới đang ở phiên này; hãy xuất bản sao trong Cài đặt trước khi đóng trang.";
    }
  }
  snapshot = { state, ready: true, storageError };
  emit();
}
export function replaceStudy(input: unknown) {
  if (!initialized) readInitial();
  const parsed = personalizeLegacyState(stateSchema.parse(input));
  let previousTime = Date.parse(snapshot.state.updatedAt);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw)
      previousTime = Math.max(
        previousTime,
        Date.parse(stateSchema.parse(JSON.parse(raw)).updatedAt),
      );
  } catch {
    /* An explicit restore can replace damaged data. */
  }
  const state = {
    ...parsed,
    rev: STATE_REV,
    updatedAt: new Date(Math.max(Date.now(), previousTime + 1)).toISOString(),
  };
  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(KEY, raw);
    lastRaw = raw;
  } catch {
    throw Error("Không đủ bộ nhớ để nhập dữ liệu. Bản hiện tại vẫn được giữ.");
  }
  snapshot = { state, ready: true, storageError: "" };
  emit();
}

/** Bytes as something a person reads, rounded the way a file manager rounds. */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
/** How many bytes the study data itself takes in this browser. */
export function studyDataBytes() {
  try {
    return new Blob([localStorage.getItem(KEY) ?? ""]).size;
  } catch {
    return 0;
  }
}
