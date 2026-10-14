import { useState } from "react";
import {
  checkForUpdates,
  openUpdate,
  RELEASE_CONFIG,
  type UpdateResult,
} from "../services/updates";
export function UpdateCheck() {
  const [checking, setChecking] = useState(false),
    [opening, setOpening] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null),
    [message, setMessage] = useState("");
  return (
    <section className="update-check" aria-label="应用更新">
      <div className="row spread">
        <small>每日正反馈 · v{RELEASE_CONFIG.version}</small>
        <button
          disabled={checking}
          onClick={async () => {
            setChecking(true);
            setResult(null);
            setMessage("");
            try {
              const next = await checkForUpdates();
              setResult(next);
              if (next.kind === "current")
                setMessage(`当前版本 v${next.currentVersion} 已是最新版本。`);
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "检查更新失败，请重试。",
              );
            } finally {
              setChecking(false);
            }
          }}
        >
          {checking ? "正在检查…" : "检查更新"}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {result?.kind === "available" && (
        <div className="update-available">
          <h3>发现新版本 v{result.version}</h3>
          <p className="muted">
            当前 v{result.currentVersion} → v{result.version}
          </p>
          {result.notes && <p className="update-notes">{result.notes}</p>}
          <p className="muted">
            下载后确认覆盖安装即可。请保留旧 App，升级前可导出 JSON 备份。
          </p>
          <button
            className="primary"
            disabled={opening}
            onClick={async () => {
              setOpening(true);
              try {
                await openUpdate(result.downloadUrl);
                setMessage("已打开下载链接。下载完成后点击 APK 确认更新。");
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : "打开下载失败。",
                );
              } finally {
                setOpening(false);
              }
            }}
          >
            {opening ? "正在打开…" : "下载并更新"}
          </button>
          <button
            className="later"
            onClick={() => {
              setResult(null);
              setMessage("");
            }}
          >
            稍后
          </button>
        </div>
      )}
    </section>
  );
}
