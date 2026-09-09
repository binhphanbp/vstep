"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { recordAttempt, type StudyState, type Attempt } from "@/lib/learning";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  updateStudy,
  replaceStudy,
} from "@/lib/study-store";
type Context = {
  state: StudyState;
  ready: boolean;
  storageError: string;
  update: (fn: (s: StudyState) => StudyState) => void;
  addAttempt: (a: Attempt) => void;
  replace: (s: unknown) => void;
  toast: (message: string) => void;
};
const StudyContext = createContext<Context | null>(null);
export function StudyProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(id);
  }, [message]);
  const addAttempt = useCallback(
    (attempt: Attempt) => updateStudy((s) => recordAttempt(s, attempt)),
    [],
  );
  return (
    <StudyContext.Provider
      value={{
        ...snapshot,
        update: updateStudy,
        addAttempt,
        replace: replaceStudy,
        toast: setMessage,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </StudyContext.Provider>
  );
}
export function useStudy() {
  const value = useContext(StudyContext);
  if (!value) throw Error("Missing StudyProvider");
  return value;
}
