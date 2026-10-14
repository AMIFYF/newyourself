import { test, expect, chromium } from "@playwright/test";
test("data persists after closing and restarting the browser", async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBe("chromium");
  const profile = testInfo.outputPath("persistent-profile");
  let context = await chromium.launchPersistentContext(profile, {
    channel: process.env.PW_CHANNEL,
    headless: true,
  });
  try {
    let page = context.pages()[0];
    await page.goto("http://127.0.0.1:5173/");
    await page
      .getByLabel("今日核心任务", { exact: true })
      .fill("浏览器重启后仍保留");
    await page.getByRole("button", { name: "完成核心任务" }).click();
    await expect(
      page.getByRole("button", { name: "已经完成 ✓" }),
    ).toBeVisible();
    await context.close();
    context = await chromium.launchPersistentContext(profile, {
      channel: process.env.PW_CHANNEL,
      headless: true,
    });
    page = context.pages()[0];
    await page.goto("http://127.0.0.1:5173/");
    await expect(page.getByLabel("今日核心任务", { exact: true })).toHaveValue(
      "浏览器重启后仍保留",
    );
    await expect(
      page.getByRole("button", { name: "已经完成 ✓" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
test("two tabs settle the same overdue session exactly once", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "daily-feedback-v1",
      JSON.stringify({
        version: 1,
        days: {},
        focus: {
          id: "concurrent-session",
          duration: 25,
          remainingMs: 1500000,
          startedAt: Date.now() - 1501000,
        },
        low: null,
      }),
    ),
  );
  const other = await context.newPage();
  await Promise.all([page.reload(), other.goto("/")]);
  await expect(page.locator(".focus-stats")).toHaveText(
    "10今日 XP1专注次数25专注分钟",
  );
  await expect(other.locator(".focus-stats")).toHaveText(
    "10今日 XP1专注次数25专注分钟",
  );
  await page.reload();
  await expect(page.locator(".focus-stats")).toHaveText(
    "10今日 XP1专注次数25专注分钟",
  );
});
test("storage failure is visible and corrupt data is not overwritten", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("daily-feedback-v1", "broken-backup"),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("已停止写入");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("daily-feedback-v1")),
  ).toBe("broken-backup");
  await page.evaluate(() => localStorage.removeItem("daily-feedback-v1"));
  await page.reload();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("保存失败");
});
test("desktop and mobile render without overflow or runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await page.screenshot({
    path: "../../work/today-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../../work/today-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
