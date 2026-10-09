/**
 * Does Gemini read this recording? One transcription request per file; prints
 * the first words it heard. Meant for the formats a browser can produce:
 *
 *   GEMINI_API_KEY=… npx tsx scripts/grading-eval/audio-probe.ts <file>… [--model <id>]
 *
 * The type is taken from the extension (.webm, .mp4/.m4a, .ogg, .mp3, .wav).
 * Safari records AAC in a fragmented MP4; to make a stand-in from any speech
 * file without a Safari at hand:
 *
 *   ffmpeg -t 20 -i speech.mp3 -ac 1 -ar 44100 -c:a aac -b:a 32k \
 *     -movflags frag_keyframe+empty_moov+default_base_moof -f mp4 safari-like.mp4
 *
 * A file recorded by a real Safari is still the better test.
 */
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { GRADER_MODEL } from "../../src/lib/grading/config";
import { geminiGenerate } from "../../src/lib/grading/gemini";

const TYPES: Record<string, string> = {
  ".webm": "audio/webm",
  ".mp4": "audio/mp4",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

async function main() {
  const argv = process.argv.slice(2);
  const at = argv.indexOf("--model");
  const model = at >= 0 ? argv.splice(at, 2)[1] : GRADER_MODEL;
  if (!argv.length) {
    console.error("usage: audio-probe.ts <file>… [--model <id>]");
    process.exit(2);
  }
  const generate = geminiGenerate();
  for (const file of argv) {
    const mimeType = TYPES[extname(file).toLowerCase()];
    if (!mimeType) {
      console.log(`${file}: unknown extension`);
      continue;
    }
    const started = Date.now();
    try {
      const out = (await generate({
        model,
        system: "Transcribe the speech exactly. Reply as JSON.",
        parts: [
          { text: "Transcribe this recording." },
          {
            audio: {
              mimeType,
              base64: readFileSync(file).toString("base64"),
            },
          },
        ],
        jsonSchema: {
          type: "object",
          properties: { transcript: { type: "string" } },
          required: ["transcript"],
        },
        thinking: "LOW",
      } as never)) as { transcript: string };
      console.log(
        `${file} (${mimeType}) ${Date.now() - started} ms:`,
        JSON.stringify(out.transcript.slice(0, 160)),
      );
    } catch (error) {
      console.log(
        `${file} (${mimeType}) FAILED:`,
        String((error as Error).message).slice(0, 240),
      );
    }
  }
}
void main();
