import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { StudyState } from "../../src/lib/learning";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "learner@example.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

async function login(page: Page) {
  await page.route("https://*.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/v1/token") {
      const encode = (data: unknown) =>
        Buffer.from(JSON.stringify(data)).toString("base64url");
      const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })}.test-signature`;
      await route.fulfill({
        json: {
          access_token: token,
          refresh_token: "test-refresh",
          token_type: "bearer",
          expires_in: 3600,
          user,
        },
      });
    } else if (url.pathname === "/auth/v1/user") {
      await route.fulfill({ json: user });
    } else {
      // Tests never send requests or learner data to the real project.
      await route.fulfill({
        status: 503,
        json: { message: "Mock endpoint unavailable" },
      });
    }
  });
  await page.goto("/settings");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByText(`Đã đăng nhập: ${user.email}`, { exact: false }),
  ).toBeVisible();
  await page.getByPlaceholder("Tên hoặc biệt danh").fill("Gùa kiểm thử");
  await page.getByRole("button", { name: "Lưu nhịp học của mình" }).click();
}

test("cloud push reports local changes made while the upload was pending", async ({
  page,
}) => {
  await login(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let received!: () => void;
  const requestArrived = new Promise<void>((resolve) => {
    received = resolve;
  });
  const uploads: {
    p_expected_revision: number;
    p_payload: { profile: { name: string } };
  }[] = [];
  await page.route("**/rest/v1/rpc/save_study_snapshot", async (route) => {
    uploads.push(route.request().postDataJSON());
    received();
    await gate;
    await route.fulfill({ json: uploads.length });
  });
  await page
    .getByRole("button", { name: "Lưu lên đám mây", exact: true })
    .click();
  await requestArrived;
  try {
    await page.getByPlaceholder("Tên hoặc biệt danh").fill("Gùa vừa học thêm");
    await page.getByRole("button", { name: "Lưu nhịp học của mình" }).click();
  } finally {
    release();
  }
  await expect(
    page.getByText("Có thay đổi mới trên thiết bị chưa được lưu lên đám mây.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Tên hoặc biệt danh")).toHaveValue(
    "Gùa vừa học thêm",
  );
  await page
    .getByRole("button", { name: "Lưu lên đám mây", exact: true })
    .click();
  await expect(
    page.getByText("Đã lưu lên đám mây lúc", { exact: false }),
  ).toBeVisible();
  expect(
    uploads.map((upload) => [
      upload.p_expected_revision,
      upload.p_payload.profile.name,
    ]),
  ).toEqual([
    [0, "Gùa kiểm thử"],
    [1, "Gùa vừa học thêm"],
  ]);
});

test("cloud conflict clears an earlier success and preserves local data", async ({
  page,
}) => {
  await login(page);
  let requests = 0;
  await page.route("**/rest/v1/rpc/save_study_snapshot", async (route) => {
    if (++requests === 1) await route.fulfill({ json: 1 });
    else
      await route.fulfill({
        status: 400,
        json: { code: "P0001", message: "revision_conflict" },
      });
  });
  const push = page.getByRole("button", {
    name: "Lưu lên đám mây",
    exact: true,
  });
  await push.click();
  await expect(
    page.getByText("Đã lưu lên đám mây lúc", { exact: false }),
  ).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem("may-study-v1"),
  );
  await push.click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "Đám mây có bản mới hơn",
  );
  await expect(
    page.getByText("Đã lưu lên đám mây lúc", { exact: false }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("may-study-v1"))).toBe(
    before,
  );
  await expect(push).toBeEnabled();
});

test("invalid cloud payload cannot replace the learner state", async ({
  page,
}) => {
  await login(page);
  await page.route("**/rest/v1/study_snapshots?**", async (route) => {
    await route.fulfill({
      json: {
        payload: { version: 99 },
        revision: 1,
        updated_at: new Date().toISOString(),
      },
    });
  });
  const before = await page.evaluate(() =>
    localStorage.getItem("may-study-v1"),
  );
  await page
    .getByRole("button", { name: "Tải về thiết bị", exact: true })
    .click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "Bản sao trên đám mây không hợp lệ",
  );
  expect(await page.evaluate(() => localStorage.getItem("may-study-v1"))).toBe(
    before,
  );
});

test("cloud restore backs up edits made while waiting and persists the restored profile", async ({
  page,
}) => {
  await login(page);
  const cloud = await page.evaluate(
    () => JSON.parse(localStorage.getItem("may-study-v1")!) as StudyState,
  );
  cloud.profile.name = "Gùa trên đám mây";
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let received!: () => void;
  const requestArrived = new Promise<void>((resolve) => {
    received = resolve;
  });
  await page.route("**/rest/v1/study_snapshots?**", async (route) => {
    received();
    await gate;
    await route.fulfill({
      json: {
        payload: cloud,
        revision: 7,
        updated_at: new Date().toISOString(),
      },
    });
  });
  page.once("dialog", (dialog) => dialog.accept());
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Tải về thiết bị", exact: true })
    .click();
  await requestArrived;
  try {
    await page
      .getByPlaceholder("Tên hoặc biệt danh")
      .fill("Gùa mới lưu trên máy");
    await page.getByRole("button", { name: "Lưu nhịp học của mình" }).click();
  } finally {
    release();
  }
  const backupPath = await (await download).path();
  const backup = JSON.parse(await readFile(backupPath!, "utf8")) as StudyState;
  expect(backup.profile.name).toBe("Gùa mới lưu trên máy");
  await expect(page.getByPlaceholder("Tên hoặc biệt danh")).toHaveValue(
    "Gùa trên đám mây",
  );
  expect(
    await page.evaluate(
      (id) => localStorage.getItem(`may-revision:${id}`),
      user.id,
    ),
  ).toBe("7");
  await page.reload();
  await expect(page.getByPlaceholder("Tên hoặc biệt danh")).toHaveValue(
    "Gùa trên đám mây",
  );
});
