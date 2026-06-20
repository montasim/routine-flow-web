import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DB, RoutineLog, Routine } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DEFAULT_TIMEZONE } from '@/lib/constant';

// Helper for date arithmetic
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

// Convert Date object to YYYY-MM-DD string in a specific timezone
function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const p: any = {};
  parts.forEach(x => { p[x.type] = x.value; });
  return `${p.year}-${p.month}-${p.day}`;
}

export async function GET() {
  const context = 'Analytics:Compute';
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await DB.getSettings(user.id);
    const tz = settings?.timezone || DEFAULT_TIMEZONE;

    const routines = await DB.getRoutines(user.id);
    const logs = await DB.getLogs(user.id); // sorted desc by default
    const occurrences = await DB.getOccurrences(user.id);

    // ─── Streaks & Personal Bests Calculation ───
    // Derived from logs sorted ascending
    const streakMap = new Map<string, { current: number; best: number }>();
    
    // Group logs by routine
    const logsByRoutine = new Map<string, RoutineLog[]>();
    // Since logs is sorted desc, let's reverse it to get asc for walking streaks
    const ascLogs = [...logs].reverse();
    for (const log of ascLogs) {
      if (!logsByRoutine.has(log.routineId)) {
        logsByRoutine.set(log.routineId, []);
      }
      logsByRoutine.get(log.routineId)!.push(log);
    }

    for (const r of routines) {
      const rLogs = logsByRoutine.get(r.id) || [];
      let currentStreak = 0;
      let bestStreak = 0;

      for (const log of rLogs) {
        if (log.status === 'Completed') {
          currentStreak++;
          if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
          }
        } else if (log.status === 'Missed') {
          currentStreak = 0;
        } else if (log.status === 'Skipped') {
          // Streak pauses: no reset, no increment
          continue;
        }
      }
      streakMap.set(r.id, { current: currentStreak, best: bestStreak });
    }

    // ─── Timeline Dates ───
    const now = new Date();
    const todayStr = formatDateInTimezone(now, tz);
    const yesterday = subtractDays(now, 1);
    const yesterdayStr = formatDateInTimezone(yesterday, tz);

    // Get dates for past 7 days
    const past7Days: string[] = [];
    const past7DaysNames: string[] = [];
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = subtractDays(now, i);
      past7Days.push(formatDateInTimezone(d, tz));
      past7DaysNames.push(weekdayNames[d.getDay()]);
    }

    // Get dates for past 30 days
    const past30Days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      past30Days.push(formatDateInTimezone(subtractDays(now, i), tz));
    }

    // ─── 1. Daily Metrics ───
    // We look at occurrences for today.
    const todayOccurrences = occurrences.filter(o => o.date === todayStr);
    const todayLogs = logs.filter(l => l.date === todayStr);

    const todayTotal = todayOccurrences.length;
    const todayCompleted = todayOccurrences.filter(o => o.status === 'Completed').length;
    const todayMissed = todayOccurrences.filter(o => o.status === 'Missed').length;
    const todayCompletedLogs = todayLogs.filter(l => l.status === 'Completed');
    
    const todayCompletionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 100;
    const todayAvgDelay = todayCompletedLogs.length > 0
      ? Math.round(todayCompletedLogs.reduce((sum, l) => sum + (l.delayMinutes || 0), 0) / todayCompletedLogs.length)
      : 0;

    // Best routine by delay today
    let bestRoutineToday = '—';
    if (todayCompletedLogs.length > 0) {
      let minDelay = Infinity;
      let bestRid = '';
      for (const l of todayCompletedLogs) {
        if (l.delayMinutes !== null && l.delayMinutes < minDelay) {
          minDelay = l.delayMinutes;
          bestRid = l.routineId;
        }
      }
      const r = routines.find(x => x.id === bestRid);
      if (r) bestRoutineToday = r.title;
    }

    // ─── 2. Weekly Metrics ───
    const weeklyLogs = logs.filter(l => past7Days.includes(l.date));
    const weeklyCompleted = weeklyLogs.filter(l => l.status === 'Completed');
    const weeklyMissed = weeklyLogs.filter(l => l.status === 'Missed');
    
    const weeklyTotalSched = weeklyCompleted.length + weeklyMissed.length;
    const weeklyCompletionRate = weeklyTotalSched > 0 ? Math.round((weeklyCompleted.length / weeklyTotalSched) * 100) : 100;
    const weeklyAvgDelay = weeklyCompleted.length > 0
      ? Math.round(weeklyCompleted.reduce((sum, l) => sum + (l.delayMinutes || 0), 0) / weeklyCompleted.length)
      : 0;

    // Standard deviation for weekly delay
    let weeklyDelayVariation = 0;
    if (weeklyCompleted.length > 1) {
      const mean = weeklyAvgDelay;
      const variance = weeklyCompleted.reduce((sum, l) => sum + Math.pow((l.delayMinutes || 0) - mean, 2), 0) / weeklyCompleted.length;
      weeklyDelayVariation = Math.round(Math.sqrt(variance));
    }

    // Streak stability: percentage of scheduled days where streak was not missed in past 7 days
    let streakStabilitySum = 0;
    let activeRoutinesCount = 0;
    for (const r of routines) {
      const rWeeklyLogs = weeklyLogs.filter(l => l.routineId === r.id);
      const rWeeklyMissed = rWeeklyLogs.filter(l => l.status === 'Missed').length;
      const rWeeklySched = rWeeklyLogs.filter(l => l.status === 'Completed' || l.status === 'Missed').length;
      
      if (rWeeklySched > 0) {
        streakStabilitySum += ((rWeeklySched - rWeeklyMissed) / rWeeklySched) * 100;
        activeRoutinesCount++;
      }
    }
    const weeklyStreakStability = activeRoutinesCount > 0 ? Math.round(streakStabilitySum / activeRoutinesCount) : 100;

    // Weekly day-by-day trend
    const weekTrend = past7Days.map((date, idx) => {
      const dayLogs = weeklyLogs.filter(l => l.date === date);
      const done = dayLogs.filter(l => l.status === 'Completed').length;
      const missed = dayLogs.filter(l => l.status === 'Missed').length;
      const total = done + missed;
      return {
        day: past7DaysNames[idx],
        rate: total > 0 ? done / total : 1.0 // default to 1.0 if not scheduled
      };
    });

    // ─── 3. Monthly Metrics ───
    const monthlyLogs = logs.filter(l => past30Days.includes(l.date));
    const monthlyCompleted = monthlyLogs.filter(l => l.status === 'Completed');
    const monthlyMissed = monthlyLogs.filter(l => l.status === 'Missed');
    
    const monthlyTotalSched = monthlyCompleted.length + monthlyMissed.length;
    const monthlyCompletionRate = monthlyTotalSched > 0 ? Math.round((monthlyCompleted.length / monthlyTotalSched) * 100) : 100;
    const monthlyAvgDelay = monthlyCompleted.length > 0
      ? Math.round(monthlyCompleted.reduce((sum, l) => sum + (l.delayMinutes || 0), 0) / monthlyCompleted.length)
      : 0;

    // Consistency score per routine (past 30 days)
    const routineConsistencyList = routines.map(r => {
      const rLogs = monthlyLogs.filter(l => l.routineId === r.id);
      const done = rLogs.filter(l => l.status === 'Completed').length;
      const missed = rLogs.filter(l => l.status === 'Missed').length;
      const total = done + missed;
      const streakObj = streakMap.get(r.id) || { current: 0, best: 0 };
      
      return {
        id: r.id,
        title: r.title,
        category: r.category,
        time: r.scheduledTime,
        recurrence: r.recurrenceType.charAt(0).toUpperCase() + r.recurrenceType.slice(1),
        streak: streakObj.current,
        best: streakObj.best,
        consistency: total > 0 ? done / total : 0.0,
        active: r.isActive
      };
    });

    // ─── 4. Yearly Heatmap & Discipline Score ───
    // Grid structure: 53 weeks, 7 days per week.
    // Let's build calendar for the current year 2026.
    // 2026-01-01 was a Thursday.
    // To align week columns starting Sunday:
    // We construct a 53-week structure. Each entry has 7 cells.
    const yearStart = new Date(Date.UTC(2026, 0, 1));
    const yearEnd = new Date(Date.UTC(2026, 11, 31));
    
    // Find preceding Sunday to start week 0
    const startOffset = yearStart.getUTCDay(); // 4 (Thursday)
    const firstSunday = new Date(yearStart.getTime() - startOffset * 24 * 60 * 60 * 1000);

    const yearHeatmap: { rate: number | null }[][] = [];
    
    for (let w = 0; w < 53; w++) {
      const weekCells: { rate: number | null }[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(firstSunday.getTime() + (w * 7 + d) * 24 * 60 * 60 * 1000);
        const cellDateStr = cellDate.toISOString().split('T')[0];
        
        // If date is outside 2026 or in the future relative to user, rate is null
        if (cellDate.getUTCFullYear() !== 2026 || cellDateStr > todayStr) {
          weekCells.push({ rate: null });
        } else {
          // Calculate completion rate for this date from logs
          const dayLogs = logs.filter(l => l.date === cellDateStr);
          const done = dayLogs.filter(l => l.status === 'Completed').length;
          const missed = dayLogs.filter(l => l.status === 'Missed').length;
          const total = done + missed;
          weekCells.push({
            rate: total > 0 ? done / total : 0.0
          });
        }
      }
      yearHeatmap.push(weekCells);
    }

    // ─── Discipline Score Calculation ───
    // disciplineScore = (completionRate * 0.40) + (consistencyScore * 0.30) + (delayPenalty * 0.20) + (streakBonus * 0.10)
    // 1. Completion Rate (past 30 days)
    const scoreCompletion = monthlyCompletionRate;
    
    // 2. Consistency Score (past 30 days)
    // Average consistency percentage across routines
    const scoreConsistency = routineConsistencyList.length > 0
      ? Math.round((routineConsistencyList.reduce((sum, r) => sum + r.consistency, 0) / routineConsistencyList.length) * 100)
      : 100;
      
    // 3. Delay Penalty
    // 0 min delay = 100. 60+ min delay = 0.
    const scoreDelayPenalty = Math.max(0, 100 - Math.min(100, Math.max(0, monthlyAvgDelay * (100 / 60))));

    // 4. Streak Bonus
    // Average (current streak / PB streak) * 100 across routines
    let streakBonusSum = 0;
    let routinesWithStreak = 0;
    for (const r of routines) {
      const streaks = streakMap.get(r.id);
      if (streaks && streaks.best > 0) {
        streakBonusSum += (streaks.current / streaks.best) * 100;
        routinesWithStreak++;
      }
    }
    const scoreStreakBonus = routinesWithStreak > 0 ? Math.round(streakBonusSum / routinesWithStreak) : 100;

    const disciplineScore = Math.round(
      (scoreCompletion * 0.40) +
      (scoreConsistency * 0.30) +
      (scoreDelayPenalty * 0.20) +
      (scoreStreakBonus * 0.10)
    );

    // Active days count in 2026: days where at least one routine was completed or missed
    const completedOrMissedDays = new Set(logs.filter(l => l.date.startsWith('2026') && (l.status === 'Completed' || l.status === 'Missed')).map(l => l.date));
    const activeDaysCount = completedOrMissedDays.size;

    // Behavioral drift: rolling 30-day consistency trend comparison
    // Compare past 30 days consistency against previous 30 days consistency
    const prev30Days: string[] = [];
    for (let i = 59; i >= 30; i--) {
      prev30Days.push(formatDateInTimezone(subtractDays(now, i), tz));
    }
    const prevLogs = logs.filter(l => prev30Days.includes(l.date));
    const prevDone = prevLogs.filter(l => l.status === 'Completed').length;
    const prevMissed = prevLogs.filter(l => l.status === 'Missed').length;
    const prevConsistency = (prevDone + prevMissed) > 0 ? (prevDone / (prevDone + prevMissed)) * 100 : 80;
    
    const driftValue = Math.round(monthlyCompletionRate - prevConsistency);
    const driftStr = driftValue >= 0 ? `+${driftValue}%` : `${driftValue}%`;

    const metrics = {
      daily: {
        completion: todayCompletionRate,
        missed: todayMissed,
        avgDelay: todayAvgDelay,
        bestRoutine: bestRoutineToday
      },
      weekly: {
        completion: weeklyCompletionRate,
        missed: weeklyMissed.length,
        avgDelay: weeklyAvgDelay,
        stability: weeklyStreakStability,
        variation: weeklyDelayVariation
      },
      monthly: {
        completion: monthlyCompletionRate,
        missed: monthlyMissed.length,
        avgDelay: monthlyAvgDelay
      },
      yearly: {
        discipline: disciplineScore,
        completion: Math.round(logs.filter(l => l.status === 'Completed').length / Math.max(1, logs.filter(l => l.status === 'Completed' || l.status === 'Missed').length) * 100),
        drift: driftStr,
        activeDays: activeDaysCount
      }
    };

    // Return mapped streaks alongside user routines for list views
    const enrichedRoutines = routineConsistencyList;

    return NextResponse.json({
      success: true,
      metrics,
      weekTrend,
      year: yearHeatmap,
      routines: enrichedRoutines
    });
  } catch (err) {
    logger.error(context, 'Error computing analytics', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
