import { test, expect } from "@playwright/test";

test("custom cursor follows the mouse and preserves native text editing", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();

  await page.mouse.move(540, 320);
  await expect(page.locator("html")).toHaveClass(/custom-cursor-active/);
  await expect(page.locator(".custom-cursor-dot")).toHaveClass(/is-visible/);

  await page.getByRole("link", { name: "Luyện 4 kỹ năng" }).hover();
  await expect(page.locator(".custom-cursor-ring")).toHaveClass(
    /is-interactive/,
  );

  await page.goto("/settings");
  const nameField = page.getByLabel("Tên thân mật trong góc học");
  await expect(nameField).toBeVisible();
  await nameField.hover();
  await expect(page.locator("html")).not.toHaveClass(/custom-cursor-active/);
  await expect(page.locator(".custom-cursor-dot")).not.toHaveClass(
    /is-visible/,
  );
});

test("custom cursor respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await page.mouse.move(540, 320);

  await expect(page.locator("html")).not.toHaveClass(/custom-cursor-active/);
  await expect(page.locator(".custom-cursor")).toHaveCSS("display", "none");
});
