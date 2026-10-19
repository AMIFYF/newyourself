import { test, expect } from "@playwright/test";
test("wishes carry across midnight, can be edited/deleted, and complete in the correct history day", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-19T23:59:00+08:00") });
  await page.clock.pauseAt(new Date("2026-10-19T23:59:01+08:00"));
  await page.goto("/");
  await page.getByLabel("新的想做的事").fill("读书");
  await page.getByRole("button", { name: "增加", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "想做的事：读书" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "修改", exact: true }).click();
  await page.getByLabel("修改想做的事").fill("读完一章");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(page.getByRole("button", { name: "保存修改" })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("article", { name: "想做的事：读完一章" }),
  ).toBeVisible();
  await page.getByLabel("新的想做的事").fill("临时事项");
  await page.getByRole("button", { name: "增加", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("article", { name: "想做的事：临时事项" })
    .getByRole("button", { name: "删除", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: "想做的事：临时事项" }),
  ).toHaveCount(0);
  await page.clock.fastForward(61000);
  await expect(
    page.getByRole("article", { name: "想做的事：读完一章" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "完成 +5 XP" }).click();
  await expect(page.locator(".focus-stats")).toHaveText(
    "5今日 XP0专注次数0专注分钟",
  );
  await expect(page.getByRole("button", { name: "完成 +5 XP" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".focus-stats")).toHaveText(
    "5今日 XP0专注次数0专注分钟",
  );
  await page.getByRole("button", { name: "02历史" }).click();
  await page
    .locator(".history-list button")
    .filter({ hasText: "2026 / 10 / 20" })
    .click();
  await expect(page.locator(".summary")).toContainText("读完一章");
  await expect(page.locator(".summary")).toContainText("2026/10/20");
  await expect(page.locator(".summary")).toContainText("+5 XP");
  await page.getByRole("button", { name: "03统计" }).click();
  await expect(page.locator(".metrics .card").first()).toContainText("5");
});
test("upgrades legacy browser data without losing notes, timers or XP", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "daily-feedback-v1",
      JSON.stringify({
        version: 1,
        days: {
          "2020-01-01": {
            date: "2020-01-01",
            morningNoPhone: true,
            coreTask: "旧任务",
            coreTaskCompleted: true,
            progressNotes: ["旧推进一", "旧推进二", "旧推进三"],
            focusSessions: [
              {
                id: "old-focus",
                duration: 25,
                xp: 10,
                completedAt: 1577836800000,
                manual: true,
              },
            ],
            lowStimulusActivities: [
              {
                id: "old-low",
                name: "散步",
                minutes: 30,
                createdAt: 1577836800000,
              },
            ],
          },
        },
        focus: {
          id: "paused",
          duration: 25,
          remainingMs: 60000,
          startedAt: null,
        },
        low: null,
      }),
    ),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "02历史" }).click();
  await page.locator(".history-list button").click();
  await expect(page.getByText("五项完成 5 / 5")).toBeVisible();
  await expect(page.getByText("旧推进一", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("daily-feedback-v1")!).version,
    ),
  ).toBe(2);
});
