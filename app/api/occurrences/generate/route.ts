import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DB } from '@/lib/db';
import { generateOccurrencesForUser, markMissedOccurrencesForUser } from '@/lib/cron';
import { logger } from '@/lib/logger';

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const result = new Date(y, m - 1, d + days);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
}

export async function POST() {
  const context = 'Occurrences:Generate';
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await DB.getSettings(user.id);
    const tz = settings?.timezone || 'Asia/Dhaka';

    // Find today's local date in user timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const p: any = {};
    parts.forEach(x => { p[x.type] = x.value; });
    const todayStr = `${p.year}-${p.month}-${p.day}`;
    const yesterdayStr = addDays(todayStr, -1);

    logger.info(context, `Running on-demand checks for user ${user.email}. Today local: ${todayStr}`);

    // Run missed detection for yesterday as recovery
    const missedMarked = await markMissedOccurrencesForUser(user.id, yesterdayStr);

    // Generate occurrences for today
    const occurrencesGenerated = await generateOccurrencesForUser(user.id, todayStr);

    return NextResponse.json({
      success: true,
      today: todayStr,
      yesterday: yesterdayStr,
      occurrencesGenerated,
      missedMarked
    });
  } catch (err) {
    logger.error(context, 'Error running on-demand generation', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
