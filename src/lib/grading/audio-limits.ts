/**
 * What one Speaking request may carry. Kept in a file with no server code so
 * the browser can check a request before sending it, and the server can
 * enforce the same numbers.
 */
export const AUDIO_LIMITS = {
  /** Parts in one test: Speaking has three. */
  parts: 3,
  /** All audio together, in bytes. A Vercel function accepts about 4.5 MB in all. */
  bytes: 4_200_000,
  /** Below this a file is not a recording. */
  minBytes: 1500,
  /** One part, in seconds. */
  seconds: 900,
  prompt: 4000,
  title: 120,
  id: 120,
} as const;
