export const DEFAULT_TIMEZONE = 'Asia/Dhaka';
export const DEFAULT_REMINDER_MINUTES = 15;
export const CONVERGENCE_LOOP_LIMIT = 3;

export const CATEGORIES = ["Health", "Fitness", "Work", "Mind", "Personal", "Finance", "Social"];

export const CATEGORY_COLORS: Record<string, string> = {
  Health: "var(--completed-600)",
  Fitness: "var(--signal-500)",
  Mind: "var(--skipped-600)",
  Work: "var(--ink-700)",
  Faith: "var(--ramp-3)"
};

export const TIMEZONES = [
  "Asia/Dhaka",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney"
];

export const SETTINGS_TIMEZONES = [
  "Asia/Dhaka",
  "Europe/London",
  "America/New_York",
  "Asia/Dubai",
  "Asia/Tokyo"
];

export const REMINDER_OPTIONS = ["5", "10", "15", "30", "60"];

export const OVERVIEW_TABS = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" }
];

export const EXPORTS_SHEETS = [
  { sheet: "Sheet 1", label: "Routines", desc: "Routine metadata and settings" },
  { sheet: "Sheet 2", label: "Logs", desc: "Complete routine_logs dataset" },
  { sheet: "Sheet 3", label: "Summary", desc: "Aggregated statistics" },
  { sheet: "Sheet 4", label: "Streaks", desc: "Per-routine streak history" }
];

export const DEFAULT_SETTINGS = {
  timezone: DEFAULT_TIMEZONE,
  defaultReminderMinutes: DEFAULT_REMINDER_MINUTES,
  notificationPreferences: {
    notifEnabled: true,
    useGlobal: true,
    skipBreaksStreak: false
  }
};
