import { beforeEach, afterEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getInfo: vi.fn(),
  http: vi.fn(),
  open: vi.fn(),
  native: false,
}));
vi.mock("../src/services/persistence", () => ({
  get isNative() {
    return mocks.native;
  },
}));
vi.mock("@capacitor/app", () => ({ App: { getInfo: mocks.getInfo } }));
vi.mock("@capacitor/core", () => ({ CapacitorHttp: { get: mocks.http } }));
vi.mock("@capacitor/app-launcher", () => ({
  AppLauncher: { openUrl: mocks.open },
}));
import {
  compareVersions,
  evaluateRelease,
  validateDownloadUrl,
  checkForUpdates,
  openUpdate,
} from "../src/services/updates";
const repo = "AMIFYF/newyourself",
  url = `https://github.com/${repo}/releases/download/v1.2.0/daily-feedback-debug.apk`;
const release = {
  tag_name: "v1.2.0",
  draft: false,
  prerelease: false,
  body: "更新说明",
  assets: [
    {
      name: "daily-feedback-debug.apk",
      state: "uploaded",
      size: 12345,
      browser_download_url: url,
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.native = false;
  mocks.getInfo.mockResolvedValue({ version: "1.1.0", build: "2" });
  mocks.http.mockResolvedValue({ status: 200, data: release });
  mocks.open.mockResolvedValue({ completed: true });
});
afterEach(() => vi.unstubAllGlobals());
it("falls back to the published manifest when anonymous API is rate limited", async () => {
  mocks.native = true;
  mocks.http
    .mockResolvedValueOnce({ status: 403, data: null })
    .mockResolvedValueOnce({ status: 200, data: release });
  await expect(checkForUpdates()).resolves.toMatchObject({ kind: "available" });
  expect(mocks.http).toHaveBeenLastCalledWith(
    expect.objectContaining({
      url: "https://raw.githubusercontent.com/AMIFYF/newyourself/main/latest-release.json",
    }),
  );
});
it("still validates APK URLs in the fallback manifest", async () => {
  mocks.native = true;
  mocks.http
    .mockResolvedValueOnce({ status: 429, data: null })
    .mockResolvedValueOnce({
      status: 200,
      data: {
        ...release,
        assets: [
          {
            ...release.assets[0],
            browser_download_url: "https://evil.example/app.apk",
          },
        ],
      },
    });
  await expect(checkForUpdates()).rejects.toThrow("下载地址");
});
it.each([
  ["1.10.0", "1.2.0", 1],
  ["v1.1.0", "1.1", 0],
  ["1.1.0", "1.2.0", -1],
  ["2.0.0", "1.99.99", 1],
])("compares %s with %s numerically", (a, b, n) =>
  expect(compareVersions(a, b)).toBe(n),
);
it("rejects malformed and prerelease versions", () => {
  for (const value of ["latest", "1.2.0-beta", "1.2.3.4", "NaN.1.0"])
    expect(() => compareVersions(value, "1.1.0")).toThrow();
});
it("offers only a newer release with an uploaded APK", () => {
  expect(evaluateRelease(release, "1.1.0", repo)).toMatchObject({
    kind: "available",
    version: "1.2.0",
    downloadUrl: url,
  });
  expect(evaluateRelease(release, "1.2.0", repo)).toMatchObject({
    kind: "current",
  });
  expect(evaluateRelease(release, "2.0.0", repo)).toMatchObject({
    kind: "current",
  });
  expect(() =>
    evaluateRelease({ ...release, assets: [] }, "1.1.0", repo),
  ).toThrow("APK");
  expect(() =>
    evaluateRelease({ ...release, prerelease: true }, "1.1.0", repo),
  ).toThrow();
});
it("rejects HTTP, foreign hosts and APKs from a different repository", () => {
  for (const value of [
    "http://github.com/AMIFYF/newyourself/releases/download/v2/app.apk",
    "https://evil.example/app.apk",
    "https://github.com/other/repo/releases/download/v2/app.apk",
    "https://github.com/AMIFYF/newyourself-evil/releases/download/v2/app.apk",
    "https://github.com@evil.example/AMIFYF/newyourself/releases/download/v2/app.apk",
  ])
    expect(() => validateDownloadUrl(value, repo)).toThrow();
});
it("uses native installed version, HTTP and Android external URL launcher", async () => {
  mocks.native = true;
  expect(await checkForUpdates()).toMatchObject({
    kind: "available",
    currentVersion: "1.1.0",
  });
  expect(mocks.http).toHaveBeenCalledWith(
    expect.objectContaining({
      url: `https://api.github.com/repos/${repo}/releases/latest`,
      readTimeout: 12000,
    }),
  );
  await openUpdate(url);
  expect(mocks.open).toHaveBeenCalledWith({ url });
  mocks.open.mockResolvedValue({ completed: false });
  await expect(openUpdate(url)).rejects.toThrow("浏览器");
});
it.each([404, 403, 429, 500])(
  "reports status %i as an error rather than latest",
  async (status) => {
    mocks.native = true;
    mocks.http.mockResolvedValue({ status, data: null });
    await expect(checkForUpdates()).rejects.toThrow();
  },
);
it("uses unauthenticated browser fetch and handles network failure", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({ status: 200, ok: true, json: async () => release });
  vi.stubGlobal("fetch", fetch);
  await expect(checkForUpdates()).resolves.toMatchObject({ kind: "available" });
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/releases/latest"),
    expect.objectContaining({ cache: "no-store" }),
  );
  fetch.mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(checkForUpdates()).rejects.toThrow("网络");
});
