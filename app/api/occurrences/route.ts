import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DEFAULT_TIMEZONE } from '@/lib/constant';

export async function GET(request: Request) {
  const context = 'Occurrences:List';
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let dateStr = searchParams.get('date');

    const settings = await DB.getSettings(user.id);
    const tz = settings?.timezone || DEFAULT_TIMEZONE;

    if (!dateStr) {
      // Find today's local date string in user's timezone
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
      dateStr = `${p.year}-${p.month}-${p.day}`;
    }

    const occurrences = await DB.getOccurrences(user.id, dateStr);
    return NextResponse.json({ success: true, date: dateStr, occurrences });
  } catch (err) {
    logger.error(context, 'Error fetching occurrences', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
