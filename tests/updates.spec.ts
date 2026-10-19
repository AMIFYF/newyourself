import { test, expect } from "@playwright/test";
test("anonymous API rate limit uses the same repository release manifest", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ status: 403, json: { message: "rate limit" } }),
  );
  await page.route(
    "https://raw.githubusercontent.com/AMIFYF/newyourself/main/latest-release.json",
    (route) => route.fulfill({ json: release }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "检查更新", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "发现新版本 v1.3.0" }),
  ).toBeVisible();
});
const endpoint =
  "https://api.github.com/repos/AMIFYF/newyourself/releases/latest";
const release = {
  tag_name: "v1.3.0",
  draft: false,
  prerelease: false,
  body: "保留原有记录\n优化操作",
  assets: [
    {
      name: "daily-feedback-debug.apk",
      state: "uploaded",
      size: 12345,
      browser_download_url:
        "https://github.com/AMIFYF/newyourself/releases/download/v1.3.0/daily-feedback-debug.apk",
    },
  ],
};
test("check update, download, retry and local records persist", async ({
  page,
  context,
}) => {
  await page.route(endpoint, (route) => route.fulfill({ json: release }));
  await page.goto("/");
  await page.getByLabel("今日核心任务", { exact: true }).fill("更新时保留");
  await page.getByRole("button", { name: "完成核心任务" }).click();
  await page.getByRole("button", { name: "检查更新", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "发现新版本 v1.3.0" }),
  ).toBeVisible();
  await context.route(
    "https://github.com/AMIFYF/newyourself/releases/download/**",
    (route) =>
      route.fulfill({ contentType: "text/html", body: "APK download test" }),
  );
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "下载并更新" }).click();
  const downloadTab = await popup;
  expect(downloadTab.url()).toContain("/releases/download/v1.3.0/");
  await downloadTab.close();
  await expect(page.getByLabel("今日核心任务", { exact: true })).toHaveValue(
    "更新时保留",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "已经完成 ✓" })).toBeVisible();
  await page.unroute(endpoint);
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { ...release, tag_name: "v1.2.0" } }),
  );
  await page.getByRole("button", { name: "检查更新", exact: true }).click();
  await expect(page.getByText("当前版本 v1.2.0 已是最新版本。")).toBeVisible();
  await page.unroute(endpoint);
  await page.route(endpoint, (route) => route.abort());
  await page.getByRole("button", { name: "检查更新", exact: true }).click();
  await expect(
    page.getByText("无法连接 GitHub，请检查网络后重试。"),
  ).toBeVisible();
  await expect(page.getByLabel("今日核心任务", { exact: true })).toHaveValue(
    "更新时保留",
  );
});
test("not found and missing APK never produce a download button", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ status: 404, json: { message: "Not Found" } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "检查更新", exact: true }).click();
  await expect(
    page.getByText("仓库中尚未发布正式版本，或该仓库未公开。"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "下载并更新" })).toHaveCount(0);
  await page.unroute(endpoint);
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { ...release, assets: [] } }),
  );
  await page.getByRole("button", { name: "检查更新", exact: true }).click();
  await expect(
    page.getByText("新版已发布，但还没有可下载的 APK，请稍后再试。"),
  ).toBeVisible();
});
