export type Duration = 25 | 50;
export interface FocusSession {
  id: string;
  duration: Duration;
  xp: number;
  completedAt: number;
  manual: boolean;
}
export interface Activity {
  id: string;
  name: string;
  minutes: number;
  createdAt: number;
}
export interface DailyRecord {
  date: string;
  morningNoPhone: boolean;
  coreTask: string;
  coreTaskCompleted: boolean;
  focusSessions: FocusSession[];
  progressNotes: [string, string, string];
  completedWishes: CompletedWish[];
  legacyProgressCompleted: boolean;
  lowStimulusActivities: Activity[];
}
export interface FocusTimer {
  id: string;
  duration: Duration;
  remainingMs: number;
  startedAt: number | null;
}
export interface Data {
  version: 2;
  wishes: Wish[];
  days: Record<string, DailyRecord>;
  focus: FocusTimer | null;
  low: { id: string; startedAt: number } | null;
}
export interface Wish {
  id: string;
  text: string;
  createdAt: number;
}
export interface CompletedWish extends Wish {
  completedAt: number;
  xp: number;
}
