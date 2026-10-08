/** The one seam between the grading code and a model. Tests pass a fake. */
export type Part =
  { text: string } | { audio: { mimeType: string; base64: string } };

export type Thinking = "LOW" | "MEDIUM" | "HIGH";

export type GenerateRequest = {
  /** For logs and tests only; never sent to the model. */
  label: string;
  model: string;
  system: string;
  parts: Part[];
  jsonSchema: object;
  thinking: Thinking;
};

/** Returns the reply already parsed from JSON; the caller validates the values. */
export type Generate = (request: GenerateRequest) => Promise<unknown>;

/** A hash that stands for "this exact grading request", for caching results. */
export async function gradeKey(parts: (string | number)[]) {
  const data = new TextEncoder().encode(JSON.stringify(parts));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
