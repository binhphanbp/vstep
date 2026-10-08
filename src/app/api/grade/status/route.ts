import { env } from "@/lib/grading/env";
import { handleStatus } from "@/lib/grading/server";

// Reads the environment on every request, so it must not be prerendered.
export const dynamic = "force-dynamic";

export async function GET() {
  return handleStatus(env());
}
