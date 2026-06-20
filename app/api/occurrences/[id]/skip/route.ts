import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DB } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = 'Occurrences:Skip';
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

    // Process skip
    const settings = await DB.getSettings(user.id);
    const timezoneAtLog = settings?.timezone || 'Asia/Dhaka';

    // Update status to Skipped
    const updatedOcc = await DB.updateOccurrenceStatus(id, 'Skipped');

    // Create routine log
    const log = await DB.createLog({
      routineId: occurrence.routineId,
      occurrenceId: occurrence.id,
      userId: user.id,
      date: occurrence.date,
      scheduledTime: occurrence.scheduledTime,
      scheduledTimeUtc: occurrence.scheduledTimeUtc,
      completedAt: null,
      timezoneAtLog,
      status: 'Skipped',
      delayMinutes: null
    });

    logger.info(context, `Occurrence ${id} marked Skipped by user ${user.email}`);

    return NextResponse.json({
      success: true,
      occurrence: updatedOcc,
      log
    });
  } catch (err) {
    logger.error(context, 'Error skipping occurrence', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
