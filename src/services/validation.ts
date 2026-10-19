import type { Data } from "../types";
import { XP, WISH_XP } from "../config/rules";
import { localDate } from "../utils/model";
// Reject malformed backups before replacing any saved data. Totals are always derived.
export function parseData(text: string): Data {
  const s = JSON.parse(text);
  const fail = () => {
    throw new Error("备份格式无效，原有数据未修改。");
  };
  const object = (v: unknown) =>
    v !== null && typeof v === "object" && !Array.isArray(v);
  const number = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0;
  const str = (v: unknown) => typeof v === "string" && v.length <= 10000;
  const date = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    new Date(v + "T12:00:00").getDate() === Number(v.slice(-2));
  const ids = new Set<string>();
  const id = (v: unknown) => {
    if (typeof v !== "string" || !v || ids.has(v)) fail();
    ids.add(v as string);
  };
  if (!object(s) || ![1, 2].includes(s.version) || !object(s.days)) fail();
  const legacy = s.version === 1;
  if (legacy) s.wishes = [];
  if (!Array.isArray(s.wishes)) fail();
  const timestamp = (v: unknown) =>
    number(v) && (v as number) <= 8640000000000000;
  const wish = (w: any) => {
    if (
      !object(w) ||
      !str(w.text) ||
      !w.text.trim() ||
      w.text.length > 3000 ||
      !timestamp(w.createdAt)
    )
      fail();
    id(w.id);
  };
  for (const w of s.wishes) wish(w);
  for (const [key, d] of Object.entries(s.days) as [string, any][]) {
    if (
      !date(key) ||
      !object(d) ||
      d.date !== key ||
      typeof d.morningNoPhone !== "boolean" ||
      !str(d.coreTask) ||
      typeof d.coreTaskCompleted !== "boolean" ||
      !Array.isArray(d.progressNotes) ||
      d.progressNotes.length !== 3 ||
      !d.progressNotes.every(str) ||
      !Array.isArray(d.focusSessions) ||
      !Array.isArray(d.lowStimulusActivities)
    )
      fail();
    if (legacy) {
      d.completedWishes = [];
      d.legacyProgressCompleted =
        key < localDate() && d.progressNotes.every((n: string) => !!n.trim());
    }
    if (
      !Array.isArray(d.completedWishes) ||
      typeof d.legacyProgressCompleted !== "boolean"
    )
      fail();
    for (const w of d.completedWishes) {
      wish(w);
      if (!timestamp(w.completedAt) || w.xp !== WISH_XP) fail();
    }
    for (const f of d.focusSessions) {
      if (
        !object(f) ||
        ![25, 50].includes(f.duration) ||
        f.xp !== XP[f.duration as 25 | 50] ||
        !number(f.completedAt) ||
        f.completedAt > 8640000000000000 ||
        typeof f.manual !== "boolean"
      )
        fail();
      id(f.id);
    }
    for (const a of d.lowStimulusActivities) {
      if (
        !object(a) ||
        !str(a.name) ||
        !a.name.trim() ||
        !number(a.minutes) ||
        a.minutes <= 0 ||
        !number(a.createdAt) ||
        a.createdAt > 8640000000000000
      )
        fail();
      id(a.id);
    }
  }
  if (s.focus !== null) {
    const t = s.focus;
    if (
      !object(t) ||
      ![25, 50].includes(t.duration) ||
      !number(t.remainingMs) ||
      t.remainingMs > t.duration * 60000 ||
      (t.startedAt !== null && !number(t.startedAt))
    )
      fail();
    id(t.id);
  }
  if (s.low !== null) {
    if (!object(s.low) || !number(s.low.startedAt)) fail();
    id(s.low.id);
  }
  s.version = 2;
  return s as Data;
}
