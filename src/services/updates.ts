import { App } from "@capacitor/app";
import { AppLauncher } from "@capacitor/app-launcher";
import { CapacitorHttp } from "@capacitor/core";
import config from "../../app-release.json";
import { isNative } from "./persistence";

export type UpdateResult =
  | { kind: "current"; currentVersion: string }
  | {
      kind: "available";
      currentVersion: string;
      version: string;
      notes: string;
      downloadUrl: string;
    };
export const RELEASE_CONFIG = config;

function parts(version: string): number[] {
  if (!/^v?\d+\.\d+(?:\.\d+)?$/.test(version))
    throw new Error("版本号格式无效，请使用如 v1.1.0 的正式版本。");
  const values = version.replace(/^v/, "").split(".").map(Number);
  if (!values.every(Number.isSafeInteger))
    throw new Error("版本号超出有效范围。");
  return [values[0], values[1], values[2] ?? 0];
}
export function compareVersions(a: string, b: string): number {
  const left = parts(a),
    right = parts(b);
  for (let i = 0; i < 3; i++)
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}
export function validateRepository(repository: string): string {
  if (!/^[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(repository))
    throw new Error("更新仓库尚未正确配置。");
  return repository;
}
export function validateDownloadUrl(
  value: unknown,
  repository: string,
): string {
  if (typeof value !== "string") throw new Error("更新下载地址无效。");
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    !url.pathname
      .toLowerCase()
      .startsWith(
        `/${validateRepository(repository).toLowerCase()}/releases/download/`,
      )
  ) {
    throw new Error("更新下载地址不属于当前 GitHub 仓库。");
  }
  return url.href;
}
export function evaluateRelease(
  value: unknown,
  currentVersion: string,
  repository: string,
): UpdateResult {
  if (!value || typeof value !== "object")
    throw new Error("GitHub 返回了无效的版本信息。");
  const release = value as Record<string, unknown>;
  if (
    release.draft !== false ||
    release.prerelease !== false ||
    typeof release.tag_name !== "string"
  )
    throw new Error("目前没有可用的正式版本。");
  if (compareVersions(release.tag_name, currentVersion) <= 0)
    return { kind: "current", currentVersion };
  const asset = Array.isArray(release.assets)
    ? release.assets.find(
        (a: unknown) =>
          a &&
          typeof a === "object" &&
          (a as Record<string, unknown>).name === config.apkAssetName,
      )
    : undefined;
  if (
    !asset ||
    asset.state !== "uploaded" ||
    typeof asset.size !== "number" ||
    asset.size <= 0
  )
    throw new Error("新版已发布，但还没有可下载的 APK，请稍后再试。");
  return {
    kind: "available",
    currentVersion,
    version: release.tag_name.replace(/^v/, ""),
    notes: typeof release.body === "string" ? release.body.slice(0, 10000) : "",
    downloadUrl: validateDownloadUrl(asset.browser_download_url, repository),
  };
}
export async function currentAppVersion(): Promise<string> {
  return isNative ? (await App.getInfo()).version : config.version;
}
export async function checkForUpdates(): Promise<UpdateResult> {
  const repository = validateRepository(config.githubRepository);
  const version = await currentAppVersion();
  const url = `https://api.github.com/repos/${repository}/releases/latest`;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  try {
    let status: number, data: unknown;
    if (isNative) {
      const response = await CapacitorHttp.get({
        url,
        headers,
        connectTimeout: 12000,
        readTimeout: 12000,
        responseType: "json",
      });
      status = response.status;
      data = response.data;
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(url, {
          headers,
          signal: controller.signal,
          cache: "no-store",
        });
        status = response.status;
        data = response.ok ? await response.json() : null;
      } finally {
        clearTimeout(timeout);
      }
    }
    if (status === 404)
      throw new Error("仓库中尚未发布正式版本，或该仓库未公开。");
    if (status === 403 || status === 429)
      throw new Error("GitHub 请求次数受限，请稍后再检查。");
    if (status !== 200)
      throw new Error("GitHub 暂时无法提供更新，请稍后重试。");
    return evaluateRelease(data, version, repository);
  } catch (error) {
    if (
      error instanceof Error &&
      /GitHub|版本|仓库|APK|下载地址/.test(error.message)
    )
      throw error;
    throw new Error("无法连接 GitHub，请检查网络后重试。");
  }
}
export async function openUpdate(downloadUrl: string): Promise<void> {
  const url = validateDownloadUrl(downloadUrl, config.githubRepository);
  if (isNative) {
    const result = await AppLauncher.openUrl({ url });
    if (!result.completed)
      throw new Error("无法打开下载链接，请检查手机是否有可用浏览器。");
  } else {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  }
}
