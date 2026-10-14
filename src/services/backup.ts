import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNative } from "./persistence";
import { localDate } from "../utils/model";
export async function exportBackup(text: string): Promise<string> {
  const filename = `每日正反馈-${localDate()}.json`;
  if (isNative) {
    const file = await Filesystem.writeFile({
      path: filename,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: "每日正反馈 JSON 备份",
      files: [file.uri],
      dialogTitle: "保存或分享备份",
    });
    return "已打开系统分享，请选择保存位置或接收应用完成备份。";
  }
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "备份已导出。";
}
