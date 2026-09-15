import { describe, expect, it } from "vitest";
import {
  decideFromChecks,
  GATE_WORKFLOW,
} from "../../scripts/promote-gate.mjs";
import { readFileSync } from "node:fs";

const run = (conclusion: string, status = "completed") => ({
  name: GATE_WORKFLOW,
  status,
  conclusion,
});

describe("the gate between a push and Gùa's phone", () => {
  it("builds only when the whole check suite has passed", () => {
    expect(decideFromChecks([run("success")])).toBe("build");
    expect(decideFromChecks([run("success"), run("success")])).toBe("build");
  });
  it("skips a failed, cancelled or timed-out commit", () => {
    for (const bad of ["failure", "cancelled", "timed_out", "action_required"])
      expect(decideFromChecks([run(bad)])).toBe("skip");
    expect(decideFromChecks([run("success"), run("failure")])).toBe("skip");
  });
  it("waits while the check is queued, running, or has not appeared yet", () => {
    expect(decideFromChecks([run("", "queued")])).toBe("wait");
    expect(decideFromChecks([run("", "in_progress")])).toBe("wait");
    expect(decideFromChecks([run("success"), run("", "in_progress")])).toBe(
      "wait",
    );
    expect(decideFromChecks([])).toBe("wait");
    expect(decideFromChecks(null)).toBe("wait");
    expect(
      decideFromChecks([
        {
          name: "Smoke production",
          status: "completed",
          conclusion: "success",
        },
      ]),
    ).toBe("wait");
  });
  it("names the workflow the CI file actually defines", () => {
    const workflow = readFileSync(".github/workflows/check.yml", "utf8");
    expect(workflow).toContain(`name: ${GATE_WORKFLOW}`);
  });
});
