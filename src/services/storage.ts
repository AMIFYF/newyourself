import type { Data } from "../types";
import { emptyData, settle } from "../utils/model";
import { parseData } from "./validation";
import { persistence, STORAGE_KEY, isNative } from "./persistence";
export { STORAGE_KEY } from "./persistence";
let state = emptyData();
let error = "";
let blocked = false;
let needsMigration = false;
let pending: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const emit = () => {
  state = { ...state };
  listeners.forEach((f) => f());
};
async function read() {
  try {
    const raw = await persistence.read();
    state = raw ? parseData(raw) : emptyData();
    needsMigration = !!raw && JSON.parse(raw).version === 1;
    error = "";
    blocked = false;
  } catch {
    error =
      "无法读取本地数据。为保护原始记录，已停止写入。请先导出原始数据，或导入有效备份恢复。";
    blocked = true;
  }
}
// Serializing native writes prevents resume callbacks and button actions overwriting each other.
function enqueue(operation: () => Promise<void>) {
  pending = pending
    .then(async () => {
      if (!isNative && navigator.locks)
        await navigator.locks.request(STORAGE_KEY, operation);
      else await operation();
    })
    .catch(() => {
      error = "保存失败，请检查设备存储空间或权限。";
      emit();
    });
  return pending;
}
async function write(next: Data) {
  try {
    await persistence.write(JSON.stringify(next));
    state = next;
    error = "";
    blocked = false;
  } catch {
    error = "保存失败，可能是设备存储空间不足。此次更改未保存，请导出备份。";
  }
  emit();
}
export const store = {
  subscribe: (f: () => void) => {
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  },
  snapshot: () => state,
  error: () => error,
  initialize: () =>
    enqueue(async () => {
      await read();
      if (!blocked) {
        const next = structuredClone(state);
        if (settle(next, Date.now()) || needsMigration) await write(next);
      }
      emit();
    }),
  update: (change: (data: Data) => void) => {
    // A protected/corrupt snapshot stays read-only until explicit initialization or import.
    if (blocked) {
      emit();
      return Promise.resolve();
    }
    return enqueue(async () => {
      await read();
      if (blocked) {
        emit();
        return;
      }
      const next = structuredClone(state);
      settle(next, Date.now());
      change(next);
      await write(next);
    });
  },
  replace: (next: Data) => enqueue(() => write(next)),
  flush: () => pending,
  async exportText() {
    await pending;
    return (await persistence.read()) ?? JSON.stringify(state);
  },
};
if (!isNative)
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === null) void store.initialize();
  });
