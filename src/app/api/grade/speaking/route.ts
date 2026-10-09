import { env } from "@/lib/grading/env";
import { geminiGenerate } from "@/lib/grading/gemini";
import { GradeLimiter, handleGradeSpeaking } from "@/lib/grading/server";

// A transcription call per part, then three (or five) gradings that each
// listen to the whole recording with the model thinking at its highest level.
export const maxDuration = 300;

const limiter = new GradeLimiter();

export async function POST(request: Request) {
  return handleGradeSpeaking(request, {
    env: env(),
    generate: () => geminiGenerate(),
    limiter,
    log: (event) => console.info(`[grade] ${event}`),
  });
}
