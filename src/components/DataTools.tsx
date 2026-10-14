import { useRef, useState } from "react";
import { store } from "../services/storage";
import { parseData } from "../services/validation";
import { emptyData } from "../utils/model";
import { exportBackup } from "../services/backup";
export function DataTools() {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  return (
    <details className="data-tools">
      <summary>本地数据与备份</summary>
      <p className="muted">
        备份包含所有日期记录和正在进行的计时。导入会替换现有数据，建议先导出。
      </p>
      <div className="row">
        <button
          onClick={async () => {
            try {
              setMessage(await exportBackup(await store.exportText()));
            } catch {
              setMessage("导出未完成，请重试并选择保存位置或接收应用。");
            }
          }}
        >
          导出 JSON
        </button>
        <button onClick={() => input.current?.click()}>导入 JSON</button>
        <button
          onClick={async () => {
            if (
              !confirm("确定要清空所有日期记录和计时状态吗？建议先导出备份。")
            )
              return;
            if (!confirm("再次确认：清空后无法撤销，是否继续？")) return;
            await store.replace(emptyData());
            setMessage(store.error() || "全部数据已清空。");
          }}
        >
          清空全部数据
        </button>
      </div>
      <input
        className="sr-only"
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label="导入备份文件"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            if (file.size > 10 * 1024 * 1024)
              throw new Error("备份文件不能超过 10 MB。");
            const data = parseData(await file.text());
            if (
              !confirm(
                `导入 ${Object.keys(data.days).length} 天记录，并替换当前全部数据？`,
              )
            )
              return;
            await store.replace(data);
            setMessage(store.error() || "导入成功。");
          } catch (err) {
            setMessage(
              err instanceof Error ? err.message : "导入失败，原有数据未修改。",
            );
          }
        }}
      />
      {message && <p role="status">{message}</p>}
    </details>
  );
}
