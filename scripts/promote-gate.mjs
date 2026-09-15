/**
 * What the GitHub check runs for one commit mean, with no network in the way.
 *
 * Kept apart from the Vercel entry point so it can be tested: the entry point
 * ends in process.exit, which a test cannot import.
 */
export const GATE_WORKFLOW = "Validate Mây";

/**
 * Returns "build" once the workflow succeeded, "skip" once it failed, and
 * "wait" while it has not finished — including when it has not appeared yet,
 * because a queued run and an absent run look the same from here.
 */
export function decideFromChecks(checkRuns, workflow = GATE_WORKFLOW) {
  const runs = (checkRuns ?? []).filter((run) => run?.name === workflow);
  if (!runs.length) return "wait";
  if (runs.some((run) => run.status !== "completed")) return "wait";
  return runs.every((run) => run.conclusion === "success") ? "build" : "skip";
}
