import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DB } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = 'Occurrences:Complete';
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const occurrence = await DB.findOccurrenceById(id);
    
    if (!occurrence) {
      return NextResponse.json({ error: 'Occurrence not found' }, { status: 404 });
    }

    if (occurrence.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (occurrence.status !== 'Pending') {
      return NextResponse.json({ error: 'Occurrence is already finalized' }, { status: 400 });
    }

    // Process completion
    const completedAt = new Date();
    const settings = await DB.getSettings(user.id);
    const timezoneAtLog = settings?.timezone || 'Asia/Dhaka';

    // Calculate delay in minutes: delayMinutes = (completedAt - scheduledTimeUtc) in minutes
    // Negative = early, Positive = late
    const delayMinutes = Math.round((completedAt.getTime() - occurrence.scheduledTimeUtc.getTime()) / (60 * 1000));

    // Update status to Completed
    const updatedOcc = await DB.updateOccurrenceStatus(id, 'Completed');

    // Create routine log
    const log = await DB.createLog({
      routineId: occurrence.routineId,
      occurrenceId: occurrence.id,
      userId: user.id,
      date: occurrence.date,
      scheduledTime: occurrence.scheduledTime,
      scheduledTimeUtc: occurrence.scheduledTimeUtc,
      completedAt,
      timezoneAtLog,
      status: 'Completed',
      delayMinutes
    });

    logger.info(context, `Occurrence ${id} marked Completed by user ${user.email} with ${delayMinutes}m delay`);

    return NextResponse.json({
      success: true,
      occurrence: updatedOcc,
      log
    });
  } catch (err) {
    logger.error(context, 'Error completing occurrence', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
