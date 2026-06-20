import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DEFAULT_TIMEZONE, DEFAULT_REMINDER_MINUTES } from '@/lib/constant';
import { config } from '@/lib/config';

export async function GET() {
  const context = 'Auth:Me';
  try {
    const googleLoginEnabled = !!(config.googleClientId && config.googleClientSecret);

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, googleLoginEnabled }, { status: 401 });
    }

    const settings = await DB.getSettings(user.id);
    return NextResponse.json({
      authenticated: true,
      googleLoginEnabled,
      user,
      settings: settings || {
        userId: user.id,
        timezone: DEFAULT_TIMEZONE,
        defaultReminderMinutes: DEFAULT_REMINDER_MINUTES,
        notificationPreferences: { notifEnabled: true, useGlobal: true, skipBreaksStreak: false }
      }
    });
  } catch (err) {
    logger.error(context, 'Error fetching user session', err);
    return NextResponse.json({ authenticated: false, error: 'Internal server error' }, { status: 500 });
  }
}
