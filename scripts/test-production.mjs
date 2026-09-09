import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test"],
  {
    env: { ...process.env, MAY_E2E_PRODUCTION: "1" },
    stdio: "inherit",
    windowsHide: true,
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
