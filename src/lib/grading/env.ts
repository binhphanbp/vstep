import type { GradeEnv } from "./server";

/** The two variables grading reads, taken from the server environment. */
export const env = (): GradeEnv => ({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GRADER_PASSCODE: process.env.GRADER_PASSCODE,
});
