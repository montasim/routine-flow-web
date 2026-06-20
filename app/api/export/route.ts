import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DB, RoutineLog, Routine } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DEFAULT_TIMEZONE } from '@/lib/constant';
import * as XLSX from 'xlsx';

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

export async function GET(request: Request) {
  const context = 'Export:Download';
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await DB.getSettings(user.id);
    const tz = settings?.timezone || DEFAULT_TIMEZONE;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'all'; // week, month, quarter, year, all
    const routineId = searchParams.get('routineId') || 'all';
    const format = searchParams.get('format') || 'xlsx'; // xlsx, csv

    // Fetch routines and logs
    const allRoutines = await DB.getRoutines(user.id);
    const allLogs = await DB.getLogs(user.id);

    // Filter routines if needed
    const routines = routineId !== 'all' ? allRoutines.filter(r => r.id === routineId) : allRoutines;
    const routineMap = new Map(allRoutines.map(r => [r.id, r]));

    // Filter logs based on date range
    let filteredLogs = allLogs;
    if (routineId !== 'all') {
      filteredLogs = filteredLogs.filter(l => l.routineId === routineId);
    }

    const now = new Date();
    if (range === 'week') {
      const boundaryDate = formatDateInTimezone(subtractDays(now, 7), tz);
      filteredLogs = filteredLogs.filter(l => l.date >= boundaryDate);
    } else if (range === 'month') {
      const boundaryDate = formatDateInTimezone(subtractDays(now, 30), tz);
      filteredLogs = filteredLogs.filter(l => l.date >= boundaryDate);
    } else if (range === 'quarter') {
      const boundaryDate = formatDateInTimezone(subtractDays(now, 90), tz);
      filteredLogs = filteredLogs.filter(l => l.date >= boundaryDate);
    } else if (range === 'year') {
      filteredLogs = filteredLogs.filter(l => l.date.startsWith('2026'));
    }

    // ─── Compile Streaks for Sheet 4 ───
    const streakData: any[] = [];
    const ascLogs = [...allLogs].reverse(); // oldest first for streaks
    const logsByRoutine = new Map<string, RoutineLog[]>();
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
          continue;
        }
      }
      streakData.push({
        'Routine': r.title,
        'Current Streak': `${currentStreak}d`,
        'Personal Best Streak': `${bestStreak}d`
      });
    }

    // ─── Compile Summary for Sheet 3 ───
    const totalScheduled = filteredLogs.filter(l => l.status === 'Completed' || l.status === 'Missed').length;
    const completedCount = filteredLogs.filter(l => l.status === 'Completed').length;
    const missedCount = filteredLogs.filter(l => l.status === 'Missed').length;
    const skippedCount = filteredLogs.filter(l => l.status === 'Skipped').length;
    
    const completionRate = totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 100;
    const completedLogsWithDelay = filteredLogs.filter(l => l.status === 'Completed' && l.delayMinutes !== null);
    const avgDelay = completedLogsWithDelay.length > 0
      ? Math.round(completedLogsWithDelay.reduce((sum, l) => sum + l.delayMinutes!, 0) / completedLogsWithDelay.length)
      : 0;

    const uniqueDates = new Set(filteredLogs.filter(l => l.status === 'Completed' || l.status === 'Missed').map(l => l.date));
    
    const summaryData = [
      { 'Metric': 'Date Range Filter', 'Value': range.toUpperCase() },
      { 'Metric': 'Routine Filter', 'Value': routineId === 'all' ? 'All Routines' : (routineMap.get(routineId)?.title || 'Selected Routine') },
      { 'Metric': 'Total Scheduled Occurrences', 'Value': totalScheduled },
      { 'Metric': 'Completed Count', 'Value': completedCount },
      { 'Metric': 'Missed Count', 'Value': missedCount },
      { 'Metric': 'Skipped Count', 'Value': skippedCount },
      { 'Metric': 'Completion Rate (%)', 'Value': `${completionRate}%` },
      { 'Metric': 'Average Delay (min)', 'Value': `${avgDelay} min` },
      { 'Metric': 'Active Measured Days', 'Value': uniqueDates.size }
    ];

    // ─── Format Primary Logs Sheet 2 ───
    const logsSheetData = filteredLogs.map(l => {
      const r = routineMap.get(l.routineId);
      let localDoneTime = '—';
      if (l.completedAt) {
        try {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: l.timezoneAtLog,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          const parts = formatter.formatToParts(l.completedAt);
          const p: any = {};
          parts.forEach(x => { p[x.type] = x.value; });
          const hourVal = p.hour === '24' ? '00' : p.hour;
          localDoneTime = `${hourVal}:${p.minute}`;
        } catch (e) {
          localDoneTime = l.completedAt.toISOString().slice(11, 16);
        }
      }

      return {
        'Date': l.date,
        'Routine': r ? r.title : 'Deleted Routine',
        'Scheduled (local)': l.scheduledTime,
        'Completed (local)': localDoneTime,
        'Delay (min)': l.delayMinutes !== null ? l.delayMinutes : '—',
        'Status': l.status,
        'Timezone': l.timezoneAtLog
      };
    });

    // ─── Format Routines Sheet 1 ───
    const routinesSheetData = routines.map(r => ({
      'ID': r.id,
      'Title': r.title,
      'Category': r.category,
      'Scheduled (local)': r.scheduledTime,
      'Schedule Type': r.scheduleType,
      'Recurrence': r.recurrenceType.charAt(0).toUpperCase() + r.recurrenceType.slice(1),
      'Status': r.isActive ? 'Active' : 'Paused',
      'Created At': r.createdAt.toISOString()
    }));

    // Create SheetJS Workbook
    const wb = XLSX.utils.book_new();

    const wsRoutines = XLSX.utils.json_to_sheet(routinesSheetData);
    const wsLogs = XLSX.utils.json_to_sheet(logsSheetData);
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsStreaks = XLSX.utils.json_to_sheet(ws2ObjectArray(streakData)); // Helper to ensure structure

    // Append sheets
    XLSX.utils.book_append_sheet(wb, wsRoutines, 'Routines');
    XLSX.utils.book_append_sheet(wb, wsLogs, 'Logs');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsStreaks, 'Streaks');

    if (format === 'csv') {
      // Export Logs sheet as flat CSV
      const csvContent = XLSX.utils.sheet_to_csv(wsLogs);
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="routineflow_logs_${range}.csv"`
        }
      });
    }

    // Export XLSX Binary Buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    logger.info(context, `Excel export generated for user ${user.email}. Range: ${range}. Logs: ${logsSheetData.length}`);

    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="routineflow_export_${range}.xlsx"`
      }
    });
  } catch (err) {
    logger.error(context, 'Error generating export file', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to ensure clean object arrays for sheets
function ws2ObjectArray(arr: any[]) {
  return arr.map(item => {
    const clean: any = {};
    for (const key of Object.keys(item)) {
      clean[key] = item[key] !== undefined ? item[key] : '';
    }
    return clean;
  });
}
