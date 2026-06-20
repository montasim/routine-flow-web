import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DB } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const context = 'Logs:List';
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const routineId = searchParams.get('routineId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const rawLogs = await DB.getLogs(user.id, { routineId, startDate, endDate });
    const routines = await DB.getRoutines(user.id);
    const routineMap = new Map(routines.map(r => [r.id, r]));

    const formattedLogs = rawLogs.map(l => {
      const routine = routineMap.get(l.routineId);
      
      // Format completedAt to local "HH:mm" time in snapshot timezone
      let doneStr = null;
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
          doneStr = `${hourVal}:${p.minute}`;
        } catch (e) {
          // Fallback simple parsing
          doneStr = l.completedAt.toISOString().slice(11, 16);
        }
      }

      return {
        id: l.id,
        date: l.date,
        routine: routine ? routine.title : 'Deleted Routine',
        category: routine ? routine.category : '',
        sched: l.scheduledTime,
        done: doneStr,
        delay: l.delayMinutes,
        status: l.status,
        timezone: l.timezoneAtLog
      };
    });

    return NextResponse.json({ success: true, logs: formattedLogs });
  } catch (err) {
    logger.error(context, 'Error fetching logs', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
