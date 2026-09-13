import { chromium } from "@playwright/test";

const baseURL = process.env.MAY_PRODUCTION_URL;
const expectedSha = process.env.MAY_EXPECTED_SHA;
if (!baseURL || !baseURL.startsWith("https://")) {
  console.error("MAY_PRODUCTION_URL must be an HTTPS URL.");
  process.exit(1);
}

const routes = [
  "/settings",
  "/practice/reading-cafe",
  "/practice/listening-weekend",
];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  if (expectedSha) {
    let servedSha = "";
    for (let attempt = 0; attempt < 12; attempt++) {
      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      servedSha =
        (await page
          .locator('meta[name="may-release"]')
          .getAttribute("content")) ?? "";
      if (servedSha === expectedSha) break;
      await page.waitForTimeout(5000);
    }
    if (servedSha !== expectedSha)
      throw Error(
        `Production serves ${servedSha || "no release SHA"}; expected ${expectedSha}.`,
      );
  }

  for (const path of routes) {
    const response = await page.goto(new URL(path, baseURL).href, {
      waitUntil: "networkidle",
    });
    if (!response || response.status() !== 200)
      throw Error(`${path} returned ${response?.status() ?? "no response"}.`);
    await page.locator("main").waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw Error(`${path} overflows at 390px.`);
    const headers = response.headers();
    for (const name of [
      "content-security-policy",
      "x-content-type-options",
      "referrer-policy",
    ]) {
      if (!headers[name]) throw Error(`${path} is missing ${name}.`);
    }
  }
  if (runtimeErrors.length) throw Error(runtimeErrors.join("\n"));

  const missing = await page.goto(
    new URL(`/release-smoke-${Date.now()}`, baseURL).href,
    { waitUntil: "domcontentloaded" },
  );
  if (!missing || missing.status() !== 404)
    throw Error(
      `Unknown route returned ${missing?.status() ?? "no response"}.`,
    );
  console.log(`Production smoke passed for ${baseURL}`);
} finally {
  await browser.close();
}
