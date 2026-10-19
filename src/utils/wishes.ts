import type { Data } from "../types";
import { WISH_XP } from "../config/rules";
import { getDay, localDate } from "./model";
export function addWish(data: Data, id: string, text: string, now: number) {
  const value = text.trim();
  if (
    !value ||
    value.length > 3000 ||
    data.wishes.some((w) => w.id === id) ||
    Object.values(data.days).some((d) =>
      d.completedWishes.some((w) => w.id === id),
    )
  )
    return;
  data.wishes.push({ id, text: value, createdAt: now });
}
export function editWish(data: Data, id: string, text: string) {
  const wish = data.wishes.find((w) => w.id === id),
    value = text.trim();
  if (wish && value && value.length <= 3000) wish.text = value;
}
export function deleteWish(data: Data, id: string) {
  data.wishes = data.wishes.filter((w) => w.id !== id);
}
export function completeWish(data: Data, id: string, now: number) {
  const wish = data.wishes.find((w) => w.id === id);
  if (!wish) return;
  if (
    !Object.values(data.days).some((d) =>
      d.completedWishes.some((w) => w.id === id),
    )
  ) {
    getDay(data, localDate(now)).completedWishes.push({
      ...wish,
      completedAt: now,
      xp: WISH_XP,
    });
  }
  deleteWish(data, id);
}
