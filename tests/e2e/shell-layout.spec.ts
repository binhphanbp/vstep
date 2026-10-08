import { test, expect } from "@playwright/test";
import { freshState } from "../../src/lib/learning";

/**
 * The side column is fixed to the screen's height, so on a laptop it must fit
 * its last links (the guide, Settings, the profile) without being scrolled
 * to: nobody scrolls a menu to find out it goes on.
 */
const state = () => {
  const s = freshState();
  s.profile.onboarded = true;
  return s;
};

for (const height of [700, 720, 768, 800, 900, 1080]) {
  test(`at ${height} px tall the side column shows everything, down to the profile`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height });
    await page.addInitScript((initial) => {
      if (!localStorage.getItem("may-study-v1"))
        localStorage.setItem("may-study-v1", JSON.stringify(initial));
    }, state());
    await page.goto("/");
    const side = page.locator(".sidebar");
    await expect(
      side.getByRole("link", { name: /Hành trình đến/ }),
    ).toBeVisible();
    const fits = await side.evaluate((el) => ({
      scrolls: el.scrollHeight > el.clientHeight,
      last: el.querySelector(".profile-link")!.getBoundingClientRect().bottom,
      screen: innerHeight,
    }));
    expect(fits.scrolls).toBe(false);
    expect(fits.last).toBeLessThanOrEqual(fits.screen);
  });
}

test("the paper bank is in the menu, and is the page the menu marks while a paper is open", async ({
  page,
}) => {
  await page.addInitScript((initial) => {
    if (!localStorage.getItem("may-study-v1"))
      localStorage.setItem("may-study-v1", JSON.stringify(initial));
  }, state());
  await page.goto("/papers/132");
  const mark = page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("link", { name: "Kho đề luyện" });
  await expect(mark).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".breadcrumb strong")).toHaveText("Kho đề luyện");
  await page.getByRole("link", { name: "Phòng thi thử" }).click();
  await expect(page).toHaveURL(/\/exam$/);
  await page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("link", { name: "Kho đề luyện" })
    .click();
  await expect(page).toHaveURL(/\/papers$/);
});
