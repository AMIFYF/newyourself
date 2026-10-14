import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { emptyData, getDay, localDate, totals } from "../src/utils/model";

const mocks = vi.hoisted(() => ({
  values: new Map<string, string>(),
  legacy: new Map<string, string>(),
  get: vi.fn(),
  set: vi.fn(),
  share: vi.fn(),
  writeFile: vi.fn(),
  listener: undefined as undefined | ((state: { isActive: boolean }) => void),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: mocks.get, set: mocks.set },
}));
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: mocks.writeFile },
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));
vi.mock("@capacitor/share", () => ({ Share: { share: mocks.share } }));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (_event, listener) => {
      mocks.listener = listener;
      return { remove: vi.fn() };
    }),
  },
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.values.clear();
  mocks.legacy.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mocks.legacy.get(key) ?? null,
  });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  mocks.get.mockImplementation(async ({ key }) => ({
    value: mocks.values.get(key) ?? null,
  }));
  mocks.set.mockImplementation(async ({ key, value }) => {
    await Promise.resolve();
    mocks.values.set(key, value);
  });
  mocks.writeFile.mockResolvedValue({ uri: "file:///cache/backup.json" });
  mocks.share.mockResolvedValue({});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("native persistence and lifecycle adapter", () => {
  it("preserves every record and running timers after store restart", async () => {
    const { store } = await import("../src/services/storage");
    await store.initialize();
    const data = emptyData();
    const date = localDate();
    const d = getDay(data, date);
    d.coreTask = "保留任务";
    d.coreTaskCompleted = true;
    d.morningNoPhone = true;
    d.progressNotes = ["一", "二", "三"];
    d.focusSessions = [
      {
        id: "done",
        duration: 50,
        xp: 25,
        manual: true,
        completedAt: Date.now(),
      },
    ];
    d.lowStimulusActivities = [
      { id: "walk", name: "散步", minutes: 30, createdAt: Date.now() },
    ];
    data.focus = {
      id: "running",
      duration: 25,
      remainingMs: 1500000,
      startedAt: Date.now(),
    };
    data.low = { id: "low", startedAt: Date.now() };
    getDay(data, "2026-01-01").coreTask = "历史";
    await store.replace(data);
    vi.resetModules();
    const reopened = (await import("../src/services/storage")).store;
    await reopened.initialize();
    expect(reopened.snapshot()).toEqual(data);
    expect(totals(reopened.snapshot().days[date]).complete).toBe(5);
    expect(mocks.legacy.size).toBe(0);
  });
  it("migrates a valid WebView legacy record once without deleting the original", async () => {
    const data = emptyData();
    getDay(data, "2026-10-07").coreTask = "旧记录";
    mocks.legacy.set("daily-feedback-v1", JSON.stringify(data));
    const { persistence } = await import("../src/services/persistence");
    expect(await persistence.read()).toBe(JSON.stringify(data));
    expect(mocks.set).toHaveBeenCalledTimes(1);
    await persistence.read();
    expect(mocks.set).toHaveBeenCalledTimes(1);
    expect(mocks.legacy.size).toBe(1);
  });
  it("serializes competing completions and resume events without duplicate XP", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T23:50:00+08:00"));
    const { store } = await import("../src/services/storage");
    await store.initialize();
    await store.update((s) => {
      s.focus = {
        id: "only-once",
        duration: 25,
        remainingMs: 1500000,
        startedAt: Date.now(),
      };
    });
    const { watchLifecycle } = await import("../src/services/lifecycle");
    const tick = vi.fn();
    const cleanup = watchLifecycle(tick);
    mocks.listener!({ isActive: false });
    vi.setSystemTime(new Date("2026-10-08T01:00:00+08:00"));
    mocks.listener!({ isActive: true });
    mocks.listener!({ isActive: true });
    await Promise.all([
      store.initialize(),
      store.update(() => {}),
      store.initialize(),
    ]);
    expect(
      Object.values(store.snapshot().days).flatMap((d) => d.focusSessions),
    ).toHaveLength(1);
    expect(
      Object.values(store.snapshot().days).reduce(
        (n, d) => n + totals(d).xp,
        0,
      ),
    ).toBe(10);
    expect(tick).toHaveBeenCalledTimes(2);
    cleanup();
  });
  it("leaves paused focus paused through background and a restart", async () => {
    const { store } = await import("../src/services/storage");
    await store.initialize();
    await store.update((s) => {
      s.focus = {
        id: "paused",
        duration: 50,
        remainingMs: 60000,
        startedAt: null,
      };
    });
    vi.resetModules();
    const reopened = (await import("../src/services/storage")).store;
    await reopened.initialize();
    expect(reopened.snapshot().focus?.remainingMs).toBe(60000);
    expect(reopened.snapshot().focus?.startedAt).toBeNull();
    expect(Object.keys(reopened.snapshot().days)).toHaveLength(0);
  });
  it("does not overwrite records if native storage write fails", async () => {
    const { store } = await import("../src/services/storage");
    await store.initialize();
    await store.update((s) => {
      getDay(s, "2026-10-07").coreTask = "原始记录";
    });
    const saved = mocks.values.get("daily-feedback-v1");
    mocks.set.mockRejectedValue(new Error("disk full"));
    await store.replace(emptyData());
    expect(store.error()).toContain("保存失败");
    expect(mocks.values.get("daily-feedback-v1")).toBe(saved);
  });
  it("exports UTF-8 JSON through the native file and share APIs", async () => {
    const { exportBackup } = await import("../src/services/backup");
    await exportBackup('{"中文":"保留"}');
    expect(mocks.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        data: '{"中文":"保留"}',
        encoding: "utf8",
        directory: "CACHE",
      }),
    );
    expect(mocks.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: ["file:///cache/backup.json"] }),
    );
  });
});
