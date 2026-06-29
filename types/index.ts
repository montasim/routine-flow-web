export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface UserSettings {
  userId: string;
  timezone: string;
  defaultReminderMinutes: number;
  notificationPreferences: {
    notifEnabled: boolean;
    useGlobal: boolean;
    skipBreaksStreak: boolean;
  };
}

export interface Routine {
  id: string;
  title: string;
  category: string;
  time: string;
  recurrence: string;
  streak: number;
  best: number;
  consistency: number;
  active: boolean;
}

export interface Occurrence {
  id: string;
  routineId: string;
  userId: string;
  date: string;
  scheduledTime: string;
  scheduledTimeUtc: string;
  status: "Pending" | "Completed" | "Missed" | "Skipped";
  delay?: number | null;
}

export interface LogItem {
  id: string;
  date: string;
  routine: string;
  category: string;
  sched: string;
  done: string | null;
  delay: number | null;
  status: "Completed" | "Missed" | "Skipped";
  timezone: string;
}

export interface AnalyticsData {
  metrics: {
    daily: { completion: number; missed: number; avgDelay: number; bestRoutine?: string };
    weekly: { completion: number; missed: number; avgDelay: number; stability: number; variation: number };
    monthly: { completion: number; missed: number; avgDelay: number };
    yearly: { discipline: number; completion: number; drift: string; activeDays: number };
  };
  weekTrend: { day: string; rate: number }[];
  year: { rate: number | null }[][];
  routines: Routine[];
}
