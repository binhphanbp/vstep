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
  // AbortSignal.any only reached Safari 17.4 and Firefox 124. Forwarding the
  // upstream signal by hand keeps cloud sync working on an older phone instead
  // of throwing before the request is even sent.
  if (upstream) {
    if (upstream.aborted) controller.abort(upstream.reason);
    else
      upstream.addEventListener(
        "abort",
        () => controller.abort(upstream.reason),
        { once: true },
      );
  }
  const signal = controller.signal;
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
