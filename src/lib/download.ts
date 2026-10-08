import { markBackup } from "./backup-mark";
import { currentBackupState, rawStudyData } from "./study-store";

export function downloadJson(data: unknown, name: string) {
  downloadText(JSON.stringify(data, null, 2), name);
}
/**
 * Exports whatever the learner still has. With damaged storage the parsed
 * state is empty, so the raw text is the only copy worth saving.
 */
export function downloadBackup(damaged: boolean, name: string) {
  const raw = damaged ? rawStudyData() : null;
  if (raw === null) {
    const state = currentBackupState();
    downloadJson(state, name);
    markBackup(state);
  } else downloadText(raw, name);
}
function downloadText(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
