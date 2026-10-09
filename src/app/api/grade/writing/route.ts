import { env } from "@/lib/grading/env";
import { geminiGenerate } from "@/lib/grading/gemini";
import { GradeLimiter, handleGradeWriting } from "@/lib/grading/server";

// Three independent gradings, each an analysis and a scoring call with the
// model thinking at its highest level, and two more when they disagree.
export const maxDuration = 300;

const limiter = new GradeLimiter();

export async function POST(request: Request) {
  return handleGradeWriting(request, {
    env: env(),
    generate: () => geminiGenerate(),
    limiter,
    log: (event) => console.info(`[grade] ${event}`),
  });
}
