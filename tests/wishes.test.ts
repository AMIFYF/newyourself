import { it, expect } from "vitest";
import {
  addWish,
  editWish,
  deleteWish,
  completeWish,
} from "../src/utils/wishes";
import { emptyData, getDay, totals, localDate } from "../src/utils/model";
import { parseData } from "../src/services/validation";
it("unfinished wishes survive calendar changes, restart, edits and deletion without XP", () => {
  const s = emptyData(),
    start = new Date(2026, 9, 19, 10).getTime();
  addWish(s, "a", "  想读书  ", start);
  addWish(s, "b", "散步", start);
  addWish(s, "empty", "  ", start);
  expect(s.wishes).toHaveLength(2);
  const reopened = parseData(JSON.stringify(s));
  getDay(reopened, "2026-10-25");
  expect(reopened.wishes[0].text).toBe("想读书");
  editWish(reopened, "a", "读完一章");
  editWish(reopened, "a", " ");
  deleteWish(reopened, "b");
  expect(reopened.wishes).toHaveLength(1);
  expect(reopened.wishes[0].text).toBe("读完一章");
  expect(totals(reopened.days["2026-10-25"]).xp).toBe(0);
});
it("completion is attributed to the actual local completion day and rewarded once", () => {
  const s = emptyData(),
    start = new Date(2026, 9, 19, 23, 59).getTime(),
    end = new Date(2026, 9, 20, 0, 1).getTime();
  addWish(s, "a", "一件事", start);
  completeWish(s, "a", end);
  completeWish(s, "a", end + 1000);
  expect(s.wishes).toHaveLength(0);
  expect(s.days[localDate(start)]).toBeUndefined();
  expect(s.days["2026-10-20"].completedWishes).toEqual([
    { id: "a", text: "一件事", createdAt: start, completedAt: end, xp: 5 },
  ]);
  expect(totals(s.days["2026-10-20"])).toMatchObject({
    xp: 5,
    wishes: 1,
    minutes: 0,
  });
  const restored = parseData(JSON.stringify(s));
  addWish(restored, "a", "重复", end);
  completeWish(restored, "a", end);
  expect(totals(restored.days["2026-10-20"]).xp).toBe(5);
});
it("old backups migrate without inventing XP or changing earlier history completion", () => {
  const s = emptyData(),
    d = getDay(s, "2020-01-01");
  d.progressNotes = ["a", "b", "c"];
  const old = JSON.parse(JSON.stringify(s));
  old.version = 1;
  delete old.wishes;
  delete old.days[d.date].completedWishes;
  delete old.days[d.date].legacyProgressCompleted;
  const migrated = parseData(JSON.stringify(old));
  expect(migrated.version).toBe(2);
  expect(migrated.wishes).toEqual([]);
  expect(migrated.days[d.date].progressNotes).toEqual(["a", "b", "c"]);
  expect(totals(migrated.days[d.date])).toMatchObject({
    xp: 0,
    wishes: 0,
    complete: 1,
  });
  expect(parseData(JSON.stringify(migrated))).toEqual(migrated);
});
it("validates duplicate IDs, empty titles and wrong rewards before importing", () => {
  const s = emptyData();
  addWish(s, "a", "事情", 0);
  getDay(s, "2026-10-20").completedWishes.push({
    id: "a",
    text: "事情",
    createdAt: 0,
    completedAt: 1,
    xp: 5,
  });
  expect(() => parseData(JSON.stringify(s))).toThrow();
  s.wishes = [];
  s.days["2026-10-20"].completedWishes[0].xp = 10;
  expect(() => parseData(JSON.stringify(s))).toThrow();
  s.days["2026-10-20"].completedWishes[0].xp = 5;
  s.days["2026-10-20"].completedWishes[0].text = " ";
  expect(() => parseData(JSON.stringify(s))).toThrow();
});
