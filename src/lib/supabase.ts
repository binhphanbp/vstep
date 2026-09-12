import { createClient } from "@supabase/supabase-js";
export const CLOUD_REQUEST_TIMEOUT = 20000;
export function isCloudTimeout(error: unknown) {
  const value =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error ?? "");
  return /abort|timeout|timed out|mất quá lâu/i.test(value);
}
async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () =>
      controller.abort(
        new DOMException("Cloud request timed out", "TimeoutError"),
      ),
    CLOUD_REQUEST_TIMEOUT,
  );
  const upstream = init?.signal;
  const signal = upstream
    ? AbortSignal.any([upstream, controller.signal])
    : controller.signal;
  try {
    return await fetch(input, { ...init, signal });
  } finally {
    clearTimeout(timeout);
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key
    ? createClient(url, key, { global: { fetch: fetchWithTimeout } })
    : null;
