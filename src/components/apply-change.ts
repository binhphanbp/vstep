import type { StudyState } from "@/lib/learning";

/**
 * Runs a change against the freshest saved profile and hands back what the
 * change reported. The store calls the function at once, so a refusal (and the
 * reason) is there to show before the next line runs.
 */
export function applyChange<T extends { state: StudyState }>(
  update: (fn: (state: StudyState) => StudyState) => void,
  make: (state: StudyState) => T,
): T | undefined {
  let outcome = undefined as T | undefined;
  update((state) => {
    outcome = make(state);
    return outcome.state;
  });
  return outcome;
}
