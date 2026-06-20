import { DB, Occurrence, Routine, UserSettings } from './db';
import { logger } from './logger';

// ─── Timezone Conversion Utility ───

/**
 * Converts a local date and time string in a specific timezone to a UTC Date object.
 * Uses a self-correcting convergence loop to handle DST offsets without external libraries.
 */
export function localToUtc(dateStr: string, timeStr: string, timezone: string): Date {
  const localString = `${dateStr}T${timeStr}:00`;
  const utcEstimate = new Date(localString + 'Z');

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  let convergedTime = utcEstimate.getTime();
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(convergedTime));
    const p: any = {};
    parts.forEach(x => { p[x.type] = x.value; });
    
    const pad = (n: any) => String(n).padStart(2, '0');
    // Normalize hour '24' if returned by some environments
    const hourVal = p.hour === '24' ? '00' : p.hour;
    const formattedStr = `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(hourVal)}:${pad(p.minute)}:00`;
    
    const diff = new Date(localString + 'Z').getTime() - new Date(formattedStr + 'Z').getTime();
    if (diff === 0) break;
    convergedTime += diff;
  }
  return new Date(convergedTime);
}

// Helper to determine if a routine should run on a specific local date
export function shouldRoutineRunOnDate(routine: Routine, dateStr: string): boolean {
  if (!routine.isActive) return false;
  if (routine.recurrenceType === 'daily') return true;
  
  // Construct date object using YYYY-MM-DD in local context
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay(); // 0 (Sun) - 6 (Sat)
  const dayOfMonth = dateObj.getDate(); // 1-31

  if (routine.recurrenceType === 'weekly') {
    return routine.recurrenceRules?.daysOfWeek?.includes(dayOfWeek) || false;
  }
  if (routine.recurrenceType === 'monthly') {
    return routine.recurrenceRules?.daysOfMonth?.includes(dayOfMonth) || false;
  }
  
  return false;
}

// ─── Occurrence Generator ───

export async function generateOccurrencesForUser(userId: string, dateStr: string): Promise<number> {
  const context = `Cron:Generate:${userId}`;
  try {
    const settings = await DB.getSettings(userId);
    if (!settings) {
      logger.warn(context, `No settings found for user ${userId}. Skipping occurrence generation.`);
      return 0;
    }

    const routines = await DB.getRoutines(userId);
    const activeRoutines = routines.filter(r => r.isActive);

    const occurrencesToCreate: Omit<Occurrence, 'id'>[] = [];
    const existingOccurrences = await DB.getOccurrences(userId, dateStr);
    const existingRoutineIds = new Set(existingOccurrences.map(o => o.routineId));

    for (const r of activeRoutines) {
      if (existingRoutineIds.has(r.id)) {
        // Already generated for this routine on this date (idempotency check)
        continue;
      }

      if (!shouldRoutineRunOnDate(r, dateStr)) {
        continue;
      }

      // Convert local time string to UTC
      const scheduledTimeUtc = localToUtc(dateStr, r.scheduledTime, settings.timezone);

      // Determine reminder minutes
      const offset = r.reminderOverride !== null ? r.reminderOverride : settings.defaultReminderMinutes;
      const notificationScheduledAt = new Date(scheduledTimeUtc.getTime() - offset * 60 * 1000);

      occurrencesToCreate.push({
        routineId: r.id,
        userId,
        date: dateStr,
        scheduledTime: r.scheduledTime,
        scheduledTimeUtc,
        timezoneAtGeneration: settings.timezone,
        status: 'Pending',
        notificationScheduledAt
      });
    }

    if (occurrencesToCreate.length > 0) {
      await DB.createOccurrences(occurrencesToCreate);
      logger.info(context, `Successfully generated ${occurrencesToCreate.length} occurrences for ${dateStr}.`);
    } else {
      logger.debug(context, `No new occurrences to generate for ${dateStr}.`);
    }

    return occurrencesToCreate.length;
  } catch (err) {
    logger.error(context, `Error generating occurrences for ${dateStr}`, err);
    return 0;
  }
}

// ─── Missed Routine Detector ───

export async function markMissedOccurrencesForUser(userId: string, yesterdayDateStr: string): Promise<number> {
  const context = `Cron:Missed:${userId}`;
  try {
    const settings = await DB.getSettings(userId);
    if (!settings) {
      logger.warn(context, `No settings found for user ${userId}. Skipping missed routine scan.`);
      return 0;
    }

    // Find all occurrences for yesterday that are still in 'Pending' state
    const pendingOccurrences = await DB.getOccurrencesByQuery({
      userId,
      date: yesterdayDateStr,
      status: 'Pending'
    });

    let missedCount = 0;
    for (const o of pendingOccurrences) {
      // Mark occurrence as missed
      await DB.updateOccurrenceStatus(o.id, 'Missed');

      // Create routine_log entry
      await DB.createLog({
        routineId: o.routineId,
        occurrenceId: o.id,
        userId,
        date: o.date,
        scheduledTime: o.scheduledTime,
        scheduledTimeUtc: o.scheduledTimeUtc,
        completedAt: null,
        timezoneAtLog: settings.timezone,
        status: 'Missed',
        delayMinutes: null
      });

      missedCount++;
    }

    if (missedCount > 0) {
      logger.info(context, `Successfully marked ${missedCount} occurrences as Missed for ${yesterdayDateStr}.`);
    } else {
      logger.debug(context, `No pending occurrences to mark as Missed for ${yesterdayDateStr}.`);
    }

    return missedCount;
  } catch (err) {
    logger.error(context, `Error marking missed occurrences for ${yesterdayDateStr}`, err);
    return 0;
  }
}
