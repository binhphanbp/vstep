import type { Generate, GenerateRequest } from "./generate";

/**
 * The real model call. Server only: it reads the key from the environment, and
 * the key never reaches a browser or the repository. `@google/genai` is loaded
 * on first use so importing this file costs nothing where it is not called.
 *
 * `generateContent` is used on purpose: unlike the Interactions API (which
 * keeps what it is sent by default) it does not retain the request. On the
 * paid tier the content is also not used to improve Google's products and is
 * only logged for a limited time to detect abuse; the free tier does use it
 * and lets people read it, which is why the key must belong to a billed project.
 */

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_WAITS_MS = [2000, 5000];

type GoogleModule = typeof import("@google/genai");
let loaded: Promise<GoogleModule> | undefined;

export function geminiGenerate(apiKey = process.env.GEMINI_API_KEY): Generate {
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được đặt");
  let client: InstanceType<GoogleModule["GoogleGenAI"]> | undefined;
  return async (request: GenerateRequest) => {
    const google = await (loaded ??= import("@google/genai"));
    client ??= new google.GoogleGenAI({ apiKey });
    const contents = [
      {
        role: "user",
        parts: request.parts.map((part) =>
          "text" in part
            ? { text: part.text }
            : {
                inlineData: {
                  mimeType: part.audio.mimeType,
                  data: part.audio.base64,
                },
              },
        ),
      },
    ];
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await client.models.generateContent({
          model: request.model,
          contents,
          config: {
            systemInstruction: request.system,
            responseMimeType: "application/json",
            responseJsonSchema: request.jsonSchema,
            thinkingConfig: {
              thinkingLevel: google.ThinkingLevel[request.thinking],
            },
          },
        });
        const text = response.text;
        if (!text) throw new Error("model trả về rỗng");
        return JSON.parse(text);
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (
          attempt < RETRY_WAITS_MS.length &&
          status !== undefined &&
          RETRY_STATUS.has(status)
        ) {
          await new Promise((done) =>
            setTimeout(done, RETRY_WAITS_MS[attempt]),
          );
          continue;
        }
        throw error;
      }
    }
  };
}
