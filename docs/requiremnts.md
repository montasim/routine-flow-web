Fair enough. Here's the updated BRD:

---

## RoutineFlow — Business Requirements Document (v1.1)

---

# 1. Product Definition

RoutineFlow is a cross-platform routine execution tracking system that records scheduled behaviors, captures real execution times, and produces structured behavioral analytics.

It is not a to-do app.

It is a behavioral measurement system.

---

# 2. Platform Scope

## Clients

* Mobile (primary) — iOS + Android, built with React Native + Expo
* Web (secondary) — Analytics + management dashboard, built with Next.js

---

# 3. Core System Principle

Every routine generates daily occurrences.

Every occurrence produces a log.

All analytics are derived from logs only.

No analytics are manually stored.

---

# 4. Time System (Critical Foundation)

## 4.1 Timezone Model

Each user has a single timezone stored in their settings:

```json
timezone: "Asia/Dhaka"
```

Rules:

* All scheduling is stored in user timezone as a local time string (HH:mm)
* All execution timestamps (`completedAt`) are stored in UTC internally
* All UI and exports convert to user timezone at render/export time

Default: auto-detect device timezone on signup. User can override.

---

## 4.2 Scheduling Rule

```text
07:00 Gym
```

Means 07:00 in the user's current timezone, not UTC.

---

## 4.3 Timezone Change Rule

When a user changes their timezone:

* The stored local time string (e.g. `07:00`) remains unchanged
* The real-world UTC equivalent shifts accordingly
* Future occurrences are generated using the new timezone interpretation

**Historical log integrity rule:**

Every `routine_log` entry must snapshot the user's timezone at the moment of that log:

```json
{
  routineId,
  date,
  scheduledTime,        // local time string: "07:00"
  scheduledTimeUtc,     // UTC equivalent at time of generation
  completedAt,          // UTC timestamp
  timezoneAtLog,        // e.g. "Asia/Dhaka" — snapshotted at log creation
  status,
  delayMinutes
}
```

This means historical analytics always reflect the timezone that was active when the behavior occurred. A user who moved from Dhaka to London will see their old logs computed correctly in their old timezone, and new logs in the new one.

---

## 4.4 Occurrence Timezone Snapshot

When an occurrence is generated, it must capture:

```json
{
  scheduledTimeUtc,
  timezoneAtGeneration
}
```

This allows correct delay calculation even if the user's timezone changes between occurrence generation and actual completion.

---

# 5. Occurrence Generation System (Critical)

This is the foundational mechanism the entire system depends on. It must be explicitly defined.

## 5.1 Generation Strategy

Occurrences are **not** pre-generated for all future dates.

They are generated on a **rolling daily basis** using a server-side scheduled job (cron).

**Rule:** Generate occurrences for the next calendar day at `23:00` user local time each night.

This means at 23:00 on June 20, occurrences for June 21 are created for all active routines belonging to that user.

---

## 5.2 Cron Job Specification

```text
Trigger:    Every hour, server-side
Logic:      For each user, check if it is currently 23:00 in their local timezone
            If yes, and occurrences for tomorrow have not yet been generated, generate them
Idempotent: Yes — generation is skipped if occurrences for that date already exist
```

Hourly execution (not nightly) is required because users span multiple timezones. A single nightly cron at midnight UTC would miss users in timezones ahead.

---

## 5.3 On-Demand Generation (App Launch Fallback)

When the app launches, it must check:

```text
Are today's occurrences present for this user?
If not → trigger generation immediately via API call
```

This handles:
* Cron failure recovery
* New users who sign up mid-day
* Edge cases around timezone boundaries

---

## 5.4 Occurrence Schema

```json
{
  id,
  routineId,
  userId,
  date,                   // "2026-06-21" in user timezone
  scheduledTime,          // "07:00" local
  scheduledTimeUtc,       // UTC equivalent
  timezoneAtGeneration,   // snapshotted IANA timezone
  status,                 // Pending | Completed | Missed | Skipped
  notificationScheduledAt // UTC time the notification was queued
}
```

---

## 5.5 Notification Scheduling on Generation

At the moment an occurrence is generated, the notification for it must also be scheduled:

```text
notificationTime = scheduledTimeUtc - reminderOffsetMinutes
```

The Expo notification is queued at this point, not at app launch.

This ensures notifications fire even if the app is never opened on that day.

---

## 5.6 App Reinstall / Device Change Recovery

When the app is installed or reinstalled:

1. Fetch all upcoming occurrences for the next 7 days from the server
2. Re-schedule all corresponding local notifications on the device
3. This must run automatically on first launch after install

Without this, a reinstall silently kills all future notifications.

---

# 6. Missed Detection System

## 6.1 Ownership

Missed detection is **server-side only**. The client never writes a `Missed` status.

Rationale: if missed detection were client-side, a user who never opens the app would accumulate no missed logs — the system would be blind to their absence.

---

## 6.2 Missed Detection Cron

```text
Trigger:    Every hour, server-side (same job as occurrence generation, second pass)
Logic:      For each user, check if it is currently 00:05 in their local timezone
            (5 minutes past midnight = end of previous day has definitively passed)
            Query all occurrences for yesterday with status = Pending
            Mark each as Missed
            Write a routine_log entry with status: Missed
Idempotent: Yes — only processes occurrences still in Pending state
```

---

## 6.3 Missed Log Entry

```json
{
  routineId,
  occurrenceId,
  date,
  scheduledTime,
  scheduledTimeUtc,
  completedAt: null,
  timezoneAtLog,
  status: "Missed",
  delayMinutes: null
}
```

---

## 6.4 Cron Failure Handling

If the missed detection cron fails for any reason:

* On next successful run, it processes all unresolved Pending occurrences older than the current day
* This is safe because the idempotency check uses occurrence date, not run time

---

# 7. Global Notification System

## 7.1 Global Reminder Setting

User defines one global offset:

```text
15 minutes before event
```

Options: 5, 10, 15, 20, 30, 45, 60 minutes. Custom minutes allowed.

---

## 7.2 Notification Rule

```text
Scheduled: 07:00 local
Reminder:  15 min before
Notification fires: 06:45 local (computed from scheduledTimeUtc - 15 min)
```

---

## 7.3 Per-Routine Override

```json
{
  useGlobalReminder: false,
  customReminderMinutes: 60
}
```

---

## 7.4 Notification Reliability

Notifications must work when the app is closed, backgrounded, or the device is restarted. Mobile OS-level scheduling via Expo Notifications is required. Notifications are scheduled at occurrence generation time, not at app open time.

---

# 8. Routine System

## 8.1 Routine Definition

```json
{
  id,
  userId,
  title,
  category,
  scheduledTime,        // "07:00" local time string
  recurrenceType,       // daily | weekly | monthly | custom
  recurrenceRules,      // e.g. { daysOfWeek: [1,3,5] }
  reminderOverride,     // null = use global
  isActive,
  scheduleType          // "fixed" | "dynamic" — see Section 8.3
}
```

---

## 8.2 Recurrence Types

* Daily
* Weekly (specific days)
* Monthly (specific dates)
* Custom interval

---

## 8.3 Prayer Routine — Schedule Type Design

Prayer times are location-based and change daily. They cannot be stored as a fixed `scheduledTime` string.

To avoid a schema migration in V2, the `scheduleType` field is introduced now:

```json
{
  scheduleType: "fixed",     // standard routines: use scheduledTime field
  scheduleType: "dynamic"    // prayer/dynamic routines: scheduledTime is null
                             // time is resolved at occurrence generation time
                             // from an external calculation engine
}
```

For V1, no dynamic routines are implemented. But the occurrence generation logic must branch on `scheduleType` so V2 can plug in the prayer time engine without touching the schema or the analytics layer.

---

# 9. Execution Model

## 9.1 Completion Rule

User taps Complete. System records:

```json
completedAt: current UTC timestamp
```

No manual time input. No exceptions.

---

## 9.2 Status Types

* `Pending` — generated, not yet acted on
* `Completed` — user tapped Complete
* `Missed` — server marked after end of day
* `Skipped` — user explicitly skipped

---

## 9.3 Delay Calculation

```text
delayMinutes = (completedAt - scheduledTimeUtc) in minutes
```

Negative = completed early. Positive = completed late. Stored on the log at write time, not computed at query time.

---

## 9.4 Skip Rule

User explicitly marks skip. A skip log is written immediately (does not wait for end of day). Skip does not trigger missed detection. Streak impact is configurable (default: no streak break).

---

# 10. Streak System

## 10.1 Definition

A streak is tracked per routine. It counts consecutive days on which the routine was completed.

---

## 10.2 Streak Rules (Explicit)

| Event | Effect |
|---|---|
| Completed | Streak increments by 1 |
| Missed | Streak resets to 0 |
| Skipped | Streak pauses (no increment, no reset) — V1 default |
| No occurrence that day (recurrence gap) | Streak unaffected |

"Pauses" means a skipped day is treated as a neutral gap, not a break. This is the default. Future settings can make skip break the streak if desired.

---

## 10.3 Streak Computation

Streaks are **not stored** as a running counter in the database.

They are computed at query time by walking the `routine_logs` collection in reverse chronological order until a `Missed` status or a gap (non-skipped missing day) is encountered.

This keeps the source of truth in logs only, consistent with the core system principle. Streak caching for performance is acceptable in V2 but must always be derived from logs.

---

## 10.4 Streak Stability (Weekly Metric)

Streak stability = percentage of the past 7 days on which each routine maintained its streak (i.e., was not missed). Computed from logs. No separate storage.

---

# 11. Data Model (MongoDB)

## 11.1 users

Basic auth and profile fields.

---

## 11.2 user_settings

```json
{
  userId,
  timezone,
  defaultReminderMinutes,
  notificationPreferences
}
```

---

## 11.3 routines

```json
{
  userId,
  title,
  category,
  scheduledTime,
  scheduleType,
  recurrenceType,
  recurrenceRules,
  reminderOverride,
  isActive
}
```

---

## 11.4 occurrences

```json
{
  routineId,
  userId,
  date,
  scheduledTime,
  scheduledTimeUtc,
  timezoneAtGeneration,
  status,
  notificationScheduledAt
}
```

---

## 11.5 routine_logs (Source of Truth)

```json
{
  routineId,
  occurrenceId,
  userId,
  date,
  scheduledTime,
  scheduledTimeUtc,
  completedAt,
  timezoneAtLog,
  status,
  delayMinutes
}
```

Every analytics query, export, and streak computation reads from this collection only.

---

# 12. Analytics Engine

All metrics are computed from `routine_logs`. Nothing is pre-aggregated in V1.

## 12.1 Daily Metrics

* Completion rate
* Missed count
* Average delay
* Best/worst routine by delay

---

## 12.2 Weekly Metrics

* Completion trend (day-by-day for the week)
* Streak stability per routine (see 10.4)
* Delay variation (std deviation of delayMinutes)

---

## 12.3 Monthly Metrics

* Consistency score per routine (completed days / scheduled days)
* Routine reliability ranking
* Category performance

---

## 12.4 Yearly Metrics

* Heatmap calendar (completion rate per day)
* Discipline score (0–100, see 12.5)
* Behavioral drift (rolling 30-day consistency trend over the year)

---

## 12.5 Discipline Score Formula

```text
disciplineScore =
  (completionRate × 0.40)
+ (consistencyScore × 0.30)
+ (delayPenalty × 0.20)
+ (streakBonus × 0.10)
```

Where:
* `completionRate` = completed / total scheduled, as a 0–100 value
* `consistencyScore` = how evenly distributed completions are (no long gaps), 0–100
* `delayPenalty` = 100 minus a scaled average delay (0 delay = 100, 60+ min delay = 0)
* `streakBonus` = current streak / personal best streak × 100

All inputs normalized to 0–100 before weighting.

---

# 13. UI System

## 13.1 Mobile App (Primary)

* Home — today's occurrences with Complete / Skip actions
* Calendar — past and future occurrence view
* Analytics — charts and metrics
* Routine management — CRUD
* Settings — timezone, reminders, profile

---

## 13.2 Web App (Secondary)

* Analytics dashboard
* Historical analysis
* Export tools
* Settings management

---

# 14. Data Export System

## 14.1 Export Types

* Full export
* Date-range export
* Routine-specific export

---

## 14.2 Output Format

Primary: Excel (.xlsx). Optional: CSV fallback.

---

## 14.3 Excel Structure

**Sheet 1 — Routines:** routine metadata

**Sheet 2 — Logs (Primary Dataset):**
```text
Date | Routine | Scheduled (local) | Completed (local) | Delay (min) | Status | Timezone
```

**Sheet 3 — Summary:** aggregated statistics

**Sheet 4 — Streaks:** per-routine streak history

---

## 14.4 Export Rules

* All times converted to user timezone at export time using `timezoneAtLog`
* Data must exactly match what analytics displays
* No partial or missing status rows

---

# 15. System Architecture

## Frontend
* React Native + Expo (mobile)
* Next.js (web)

## State Management
* Zustand

## Data Fetching
* TanStack Query

## Backend
* Next.js API routes
* MongoDB native driver

## Background Jobs
* Server-side cron (occurrence generation + missed detection)
* Runs hourly, timezone-aware per user

---

# 16. Notification Architecture

* Expo Notifications for local device scheduling
* Notifications are scheduled at occurrence generation time (server triggers, device executes)
* On app reinstall or device change: fetch upcoming 7 days of occurrences and re-schedule all notifications on launch
* Web: no notification dependency

---

# 17. Core Design Constraint

The `routine_logs` collection is the single source of truth.

If logs are correct: analytics, exports, and future AI insights are all correct.

If logs are wrong: the entire system is wrong.

The occurrence generation cron and the completion/missed/skip write paths are the two most critical code paths in the system. They must be the most tested.

---

# 18. V1 Scope

**Included:**
* Routine CRUD
* Occurrence generation (server cron + app-launch fallback)
* Notifications (scheduled at occurrence generation, reinstall recovery)
* Completion and skip tracking
* Missed detection (server cron)
* Delay tracking
* Analytics (daily / weekly / monthly / yearly)
* Streak system (computed from logs)
* Discipline score
* Timezone system with per-log timezone snapshot
* Global and per-routine reminder system
* Excel export

**Excluded:**
* AI coach
* Social and team features
* Wearables
* Smart rescheduling automation
* Dynamic prayer time engine (schema is ready, implementation is V2)

---

# 19. System Behavior Summary

User defines routines once.

Server generates occurrences nightly via cron, with app-launch fallback.

Notifications are scheduled at occurrence generation time.

User interacts only by completing or skipping.

Server detects and logs missed routines at end of each user's day.

The system continuously builds a structured behavioral dataset in `routine_logs`.

That dataset drives analytics, exports, and future AI analysis.

---

*End of specification. Version 1.1 — gaps addressed: occurrence generation mechanism, missed detection ownership, streak rules formalized, prayer routine schema future-proofed, timezone snapshot on logs.*