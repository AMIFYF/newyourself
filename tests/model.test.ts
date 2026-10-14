import { describe, it, expect } from "vitest";
import {
  emptyData,
  getDay,
  localDate,
  remaining,
  settle,
  streak,
  totals,
  dateOffset,
} from "../src/utils/model";
import { parseData } from "../src/services/validation";
describe("focus and daily rules", () => {
  it.each([25, 50] as const)("settles %i minutes exactly once", (duration) => {
    const s = emptyData(),
      start = new Date(2026, 9, 7, 10).getTime();
    s.focus = {
      id: "session",
      duration,
      remainingMs: duration * 60000,
      startedAt: start,
    };
    expect(settle(s, start + duration * 60000 - 1)).toBe(false);
    expect(settle(s, start + duration * 60000)).toBe(true);
    expect(settle(s, start + duration * 60000 + 100)).toBe(false);
    expect(totals(s.days[localDate(start)]).xp).toBe(duration === 25 ? 10 : 25);
    expect(s.days[localDate(start)].focusSessions).toHaveLength(1);
  });
  it("paused time never advances", () => {
    const s = emptyData();
    s.focus = { id: "p", duration: 25, remainingMs: 60000, startedAt: null };
    expect(remaining(s.focus, 999999999)).toBe(60000);
    expect(settle(s, 999999999)).toBe(false);
    s.focus.startedAt = 1000;
    expect(remaining(s.focus, 31000)).toBe(30000);
  });
  it("restores running timers and attributes delayed settlement to actual local completion date", () => {
    const start = new Date(2026, 9, 7, 23, 50).getTime();
    const s = emptyData();
    s.focus = {
      id: "night",
      duration: 25,
      remainingMs: 1500000,
      startedAt: start,
    };
    const restored = parseData(JSON.stringify(s));
    settle(restored, start + 3 * 86400000);
    expect(restored.days["2026-10-08"].focusSessions).toHaveLength(1);
    expect(localDate(new Date(2026, 9, 7, 0, 1).getTime())).toBe("2026-10-07");
  });
  it("requires all five explicit conditions and ignores whitespace notes", () => {
    const s = emptyData(),
      d = getDay(s, "2026-10-07");
    d.coreTask = "任务";
    d.progressNotes = ["a", "b", " "];
    expect(totals(d).complete).toBe(0);
    d.morningNoPhone = true;
    d.coreTaskCompleted = true;
    d.progressNotes[2] = "c";
    d.focusSessions.push({
      id: "f",
      duration: 50,
      xp: 25,
      manual: true,
      completedAt: 0,
    });
    d.lowStimulusActivities.push({
      id: "a",
      name: "散步",
      minutes: 30,
      createdAt: 0,
    });
    expect(totals(d)).toMatchObject({
      complete: 5,
      xp: 25,
      minutes: 50,
      low: 30,
    });
  });
  it("counts consecutive calendar days including yesterday when today incomplete", () => {
    const s = emptyData();
    for (const date of ["2026-10-05", "2026-10-06"]) {
      const d = getDay(s, date);
      d.morningNoPhone = true;
      d.coreTask = "x";
      d.coreTaskCompleted = true;
      d.progressNotes = ["a", "b", "c"];
      d.focusSessions = [
        { id: date, duration: 25, xp: 10, manual: true, completedAt: 0 },
      ];
      d.lowStimulusActivities = [
        { id: "l" + date, name: "walk", minutes: 30, createdAt: 0 },
      ];
    }
    expect(streak(s, "2026-10-07")).toBe(2);
    expect(streak(s, "2026-10-08")).toBe(0);
    expect(dateOffset("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("round-trips backups and rejects invalid records and duplicate sessions", () => {
    const s = emptyData();
    const d = getDay(s, "2026-10-07");
    d.focusSessions = [
      { id: "same", duration: 25, xp: 10, manual: true, completedAt: 0 },
    ];
    expect(parseData(JSON.stringify(s))).toEqual(s);
    d.focusSessions.push({ ...d.focusSessions[0] });
    expect(() => parseData(JSON.stringify(s))).toThrow();
    d.focusSessions.pop();
    d.focusSessions[0].xp = 100;
    expect(() => parseData(JSON.stringify(s))).toThrow();
    expect(() => parseData('{"version":2}')).toThrow();
  });
});
