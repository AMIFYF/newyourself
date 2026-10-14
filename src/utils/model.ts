import type { Data, DailyRecord, FocusTimer } from "../types";
import { LOW_GOAL, XP } from "../config/rules";
export const localDate = (time = Date.now()) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const dateOffset = (date: string, offset: number) => {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return localDate(d.getTime());
};
export const emptyData = (): Data => ({
  version: 1,
  days: {},
  focus: null,
  low: null,
});
export const emptyDay = (date: string): DailyRecord => ({
  date,
  morningNoPhone: false,
  coreTask: "",
  coreTaskCompleted: false,
  focusSessions: [],
  progressNotes: ["", "", ""],
  lowStimulusActivities: [],
});
export const getDay = (s: Data, date: string) =>
  (s.days[date] ??= emptyDay(date));
export function totals(d: DailyRecord) {
  const xp = d.focusSessions.reduce((v, s) => v + s.xp, 0);
  const minutes = d.focusSessions.reduce((v, s) => v + s.duration, 0);
  const low = d.lowStimulusActivities.reduce((v, a) => v + a.minutes, 0);
  const notes = d.progressNotes.filter((n) => n.trim()).length;
  const flags = [
    d.morningNoPhone,
    !!d.coreTask.trim() && d.coreTaskCompleted,
    d.focusSessions.length > 0,
    notes === 3,
    low >= LOW_GOAL,
  ];
  return {
    xp,
    minutes,
    low,
    notes,
    flags,
    complete: flags.filter(Boolean).length,
  };
}
export const remaining = (t: FocusTimer, now: number) =>
  Math.max(
    0,
    t.remainingMs - (t.startedAt === null ? 0 : Math.max(0, now - t.startedAt)),
  );
export function settle(s: Data, now: number) {
  const t = s.focus;
  if (!t || t.startedAt === null || remaining(t, now) > 0) return false;
  const completedAt = t.startedAt + t.remainingMs;
  if (
    !Object.values(s.days).some((d) =>
      d.focusSessions.some((f) => f.id === t.id),
    )
  )
    getDay(s, localDate(completedAt)).focusSessions.push({
      id: t.id,
      duration: t.duration,
      xp: XP[t.duration],
      completedAt,
      manual: false,
    });
  s.focus = null;
  return true;
}
export function streak(s: Data, today: string) {
  let date =
    totals(s.days[today] ?? emptyDay(today)).complete === 5
      ? today
      : dateOffset(today, -1);
  let count = 0;
  while (s.days[date] && totals(s.days[date]).complete === 5) {
    count++;
    date = dateOffset(date, -1);
  }
  return count;
}
export const displayMinutes = (n: number) => Number(n.toFixed(2)).toString();
