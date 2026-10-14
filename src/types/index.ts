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
  lowStimulusActivities: Activity[];
}
export interface FocusTimer {
  id: string;
  duration: Duration;
  remainingMs: number;
  startedAt: number | null;
}
export interface Data {
  version: 1;
  days: Record<string, DailyRecord>;
  focus: FocusTimer | null;
  low: { id: string; startedAt: number } | null;
}
