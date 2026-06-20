import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DB } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = 'Routines:Update';
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Check ownership
    const routines = await DB.getRoutines(user.id);
    const exists = routines.some(r => r.id === id);
    if (!exists) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    const updated = await DB.updateRoutine(id, body);
    logger.info(context, `Routine "${id}" updated by user ${user.email}`);
    return NextResponse.json({ success: true, routine: updated });
  } catch (err) {
    logger.error(context, 'Error updating routine', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = 'Routines:Delete';
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Check ownership
    const routines = await DB.getRoutines(user.id);
    const exists = routines.some(r => r.id === id);
    if (!exists) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    const success = await DB.deleteRoutine(id);
    logger.info(context, `Routine "${id}" deleted by user ${user.email}`);
    return NextResponse.json({ success });
  } catch (err) {
    logger.error(context, 'Error deleting routine', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
