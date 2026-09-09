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
function emit() {
  listeners.forEach((listener) => listener());
}
function readInitial() {
  let state = freshState();
  let storageError = "";
  try {
    const raw = localStorage.getItem(KEY);
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
export function updateStudy(fn: (state: StudyState) => StudyState) {
  if (!initialized) readInitial();
  // Read a more recent snapshot before applying a mutation from another tab.
  if (!snapshot.storageError) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
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
      localStorage.setItem(KEY, JSON.stringify(state));
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
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    throw Error("Không đủ bộ nhớ để nhập dữ liệu. Bản hiện tại vẫn được giữ.");
  }
  snapshot = { state, ready: true, storageError: "" };
  emit();
}
