/**
 * The promote gate: production only builds from a commit CI already passed.
 *
 * Vercel starts a production build the moment `main` moves, which is usually
 * minutes before GitHub finishes checking the same commit. That is how a red
 * commit reaches the one person using this app. Vercel runs this file as its
 * "Ignored Build Step": exit 1 means build, exit 0 means skip.
 *
 * It fails closed. No token, no answer from GitHub, a red or still-running
 * check — none of those become a production deploy. Previews are never gated,
 * so nothing here gets in the way of looking at a branch.
 *
 * Set up in Vercel → Settings → Git → Ignored Build Step:
 *   node scripts/vercel-ignore-build.mjs
 * and add a repo-scoped token as the environment variable MAY_CI_TOKEN.
 */
import { decideFromChecks, GATE_WORKFLOW } from "./promote-gate.mjs";

const POLL_SECONDS = 20;
const WAIT_MINUTES = 20;

const BUILD = 1;
const SKIP = 0;

function stop(code, reason) {
  console.log(reason);
  console.log(
    code === BUILD ? "→ Cho phép build production." : "→ Bỏ qua build này.",
  );
  process.exit(code);
}

if (process.env.VERCEL_ENV !== "production")
  stop(BUILD, `Môi trường ${process.env.VERCEL_ENV ?? "(không rõ)"}: không chặn.`);

const sha = process.env.VERCEL_GIT_COMMIT_SHA;
const owner = process.env.VERCEL_GIT_REPO_OWNER;
const repo = process.env.VERCEL_GIT_REPO_SLUG;
const token = process.env.MAY_CI_TOKEN;
if (!sha || !owner || !repo)
  stop(SKIP, "Thiếu thông tin commit từ Vercel nên không kiểm tra được CI.");
if (!token)
  stop(
    SKIP,
    "Chưa có MAY_CI_TOKEN nên không đọc được kết quả CI. Thêm biến môi trường này trong Vercel rồi deploy lại.",
  );

const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100`;
const headers = {
  accept: "application/vnd.github+json",
  authorization: `Bearer ${token}`,
  "user-agent": "may-vstep-promote-gate",
};

const deadline = Date.now() + WAIT_MINUTES * 60_000;
for (;;) {
  let decision = "wait";
  try {
    const response = await fetch(url, { headers });
    if (!response.ok)
      stop(SKIP, `GitHub trả ${response.status} khi hỏi kết quả CI.`);
    const body = await response.json();
    decision = decideFromChecks(body.check_runs);
  } catch (error) {
    stop(SKIP, `Không hỏi được GitHub: ${error.message}`);
  }
  if (decision === "build") stop(BUILD, `CI "${GATE_WORKFLOW}" đã đạt ở ${sha.slice(0, 7)}.`);
  if (decision === "skip") stop(SKIP, `CI "${GATE_WORKFLOW}" chưa đạt ở ${sha.slice(0, 7)}.`);
  if (Date.now() >= deadline)
    stop(
      SKIP,
      `Chờ ${WAIT_MINUTES} phút mà CI chưa xong. Khi CI xanh, bấm Redeploy trong Vercel.`,
    );
  await new Promise((resolve) => setTimeout(resolve, POLL_SECONDS * 1000));
}
