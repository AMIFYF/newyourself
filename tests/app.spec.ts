import { test, expect } from "@playwright/test";
test("typing, abandonment, 50-minute manual entry and reopening a tab", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const input = page.getByLabel("今日核心任务", { exact: true });
  await input.pressSequentially("A focused task", { delay: 30 });
  await expect(input).toHaveValue("A focused task");
  await page.getByRole("button", { name: "开始专注", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "放弃", exact: true }).click();
  await expect(page.locator(".focus-stats")).toHaveText(
    "0今日 XP0专注次数0专注分钟",
  );
  await page
    .getByRole("button", { name: "50 分钟 +25 XP", exact: true })
    .click();
  await page.getByText("忘记计时？手动补录").click();
  await page
    .getByRole("button", { name: "补录 50 分钟 / +25 XP", exact: true })
    .click();
  await expect(page.locator(".focus-stats")).toHaveText(
    "25今日 XP1专注次数50专注分钟",
  );
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/");
  await expect(
    reopened.getByLabel("今日核心任务", { exact: true }),
  ).toHaveValue("A focused task");
  await expect(reopened.locator(".focus-stats")).toHaveText(
    "25今日 XP1专注次数50专注分钟",
  );
  await reopened.getByText("本地数据与备份", { exact: true }).click();
  let count = 0;
  reopened.on("dialog", async (d) => {
    count++;
    if (count === 1) await d.accept();
    else await d.dismiss();
  });
  await reopened.getByRole("button", { name: "清空全部数据" }).click();
  await expect(reopened.locator(".focus-stats")).toHaveText(
    "25今日 XP1专注次数50专注分钟",
  );
});
test("complete day, refresh, history, statistics, export/import and double-confirm clear", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByLabel("今日核心任务", { exact: true }).fill("完成第一版 MVP");
  await page.getByRole("button", { name: "完成核心任务", exact: true }).click();
  for (let i = 1; i <= 3; i++)
    await page.getByLabel(`推进事项${i}`).fill(`推进事项 ${i}`);
  await page.getByText("忘记计时？手动补录").click();
  await page
    .getByRole("button", { name: "补录 25 分钟 / +10 XP", exact: true })
    .click();
  await page.getByLabel("活动名称").fill("散步");
  await page.getByLabel("持续分钟").fill("30");
  await page.getByRole("button", { name: "记录", exact: true }).click();
  await expect(page.getByText("五项完成 5 / 5")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("今日核心任务", { exact: true })).toHaveValue(
    "完成第一版 MVP",
  );
  await expect(page.getByText("五项完成 5 / 5")).toBeVisible();
  await page.getByRole("button", { name: "02历史" }).click();
  await page.locator(".history-list button").click();
  await expect(
    page.getByText("25 分钟 · +10 XP · 手动补录", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "03统计" }).click();
  await expect(page.locator(".metrics .card").first()).toContainText("10");
  await page.getByText("本地数据与备份", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 JSON" }).click();
  const file = await download;
  const path = await file.path();
  expect(path).toBeTruthy();
  let dialogs = 0;
  page.on("dialog", async (d) => {
    dialogs++;
    await d.accept();
  });
  await page.getByRole("button", { name: "清空全部数据" }).click();
  await expect(page.getByText("全部数据已清空。")).toBeVisible();
  expect(dialogs).toBe(2);
  await page.getByLabel("导入备份文件").setInputFiles(path!);
  await expect(page.getByText("导入成功。")).toBeVisible();
  await page.getByRole("button", { name: "01今日" }).click();
  await expect(page.getByText("五项完成 5 / 5")).toBeVisible();
  await page
    .getByLabel("导入备份文件")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":9}'),
    });
  await expect(page.getByText("备份格式无效，原有数据未修改。")).toBeVisible();
  await expect(page.getByText("五项完成 5 / 5")).toBeVisible();
});
test("running and paused timers survive reload, completion settles only once; low timer restores", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-07T10:00:00+08:00") });
  await page.clock.pauseAt(new Date("2026-10-07T10:00:01+08:00"));
  await page.goto("/");
  await page.getByRole("button", { name: "开始专注", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(60000);
  await page.reload();
  await expect(page.getByLabel("专注剩余时间")).toHaveText("24:00");
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(120000);
  await page.reload();
  await expect(page.getByLabel("专注剩余时间")).toHaveText("24:00");
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(24 * 60000);
  await expect(page.locator(".focus-stats")).toContainText("10");
  await page.reload();
  await expect(page.locator(".focus-stats")).toContainText("10");
  await page
    .getByRole("button", { name: "开始低刺激活动", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "结束并记录" })).toBeVisible();
  await page.clock.fastForward(30 * 60000);
  await page.reload();
  await expect(page.getByLabel("低刺激计时")).toHaveText("30:00");
  await page.getByRole("button", { name: "结束并记录" }).click();
  await expect(page.locator(".low-progress")).toContainText("30 / 30 min");
  await page
    .getByRole("button", { name: "50 分钟 +25 XP", exact: true })
    .click();
  await page.getByRole("button", { name: "开始专注", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(50 * 60000);
  await expect(page.locator(".focus-stats")).toContainText("35");
  await page.reload();
  await expect(page.locator(".focus-stats")).toContainText("35");
});
test("local midnight resets today while retaining yesterday; mobile layout", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-07T23:59:00+08:00") });
  await page.goto("/");
  await page.getByLabel("今日核心任务", { exact: true }).fill("昨天的任务");
  await expect(page.getByLabel("今日核心任务", { exact: true })).toHaveValue(
    "昨天的任务",
  );
  await page.clock.fastForward(61000);
  await expect(page.getByLabel("今日核心任务", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByText("2026年10月8日星期四")).toBeVisible();
  await page.getByRole("button", { name: "02历史" }).click();
  await page.locator(".history-list button").click();
  await expect(page.getByText("昨天的任务", { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
