"use client";
import {
  freshState,
  personalizeLegacyState,
  stateSchema,
  type StudyState,
} from "./learning";
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
    const next = personalizeLegacyState(
      stateSchema.parse(JSON.parse(event.newValue)),
    );
    if (next.updatedAt > snapshot.state.updatedAt) {
      snapshot = { ...snapshot, state: next };
      emit();
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
        if (latest.updatedAt > snapshot.state.updatedAt)
          snapshot = { ...snapshot, state: latest };
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
