import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DB } from '@/lib/db';
import { generateOccurrencesForUser } from '@/lib/cron';
import { logger } from '@/lib/logger';

export async function GET() {
  const context = 'Routines:List';
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const routines = await DB.getRoutines(user.id);
    return NextResponse.json({ success: true, routines });
  } catch (err) {
    logger.error(context, 'Error fetching routines', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const context = 'Routines:Create';
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, category, scheduledTime, recurrenceType, recurrenceRules, reminderOverride } = body;

    if (!title || !category || !scheduledTime || !recurrenceType) {
      return NextResponse.json({ error: 'Title, category, scheduledTime, and recurrenceType are required' }, { status: 400 });
    }

    const routine = await DB.createRoutine({
      userId: user.id,
      title,
      category,
      scheduledTime,
      scheduleType: 'fixed',
      recurrenceType,
      recurrenceRules: recurrenceRules || {},
      reminderOverride: reminderOverride !== undefined ? reminderOverride : null,
      isActive: true
    });

    // On-demand occurrence generation check for today.
    // If occurrences have already been generated for today for this user,
    // let's generate the occurrence for this new routine immediately if it qualifies.
    const settings = await DB.getSettings(user.id);
    const tz = settings?.timezone || 'Asia/Dhaka';
    const localDateStr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    }).formatToParts(new Date());
    
    const p: any = {};
    localDateStr.forEach(x => { p[x.type] = x.value; });
    const todayStr = `${p.year}-${p.month}-${p.day}`;

    // Try generating occurrences for today
    await generateOccurrencesForUser(user.id, todayStr);

    logger.info(context, `Routine "${title}" created by user ${user.email}`);
    return NextResponse.json({ success: true, routine });
  } catch (err) {
    logger.error(context, 'Error creating routine', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
