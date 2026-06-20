import { NextResponse } from 'next/server';
import { DB } from '@/lib/db';
import { generateOccurrencesForUser, markMissedOccurrencesForUser } from '@/lib/cron';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';

// Helper to get local date components in a specific timezone
function getLocalDateAndTime(timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(new Date());
  const p: any = {};
  parts.forEach(x => { p[x.type] = x.value; });

  const hour = Number(p.hour === '24' ? '00' : p.hour);
  const minute = Number(p.minute);
  
  return {
    dateStr: `${p.year}-${p.month}-${p.day}`,
    hour,
    minute
  };
}

// Helper for date arithmetic
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const result = new Date(y, m - 1, d + days);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  const context = 'Cron:Trigger';
  
  // Basic token authentication (optional, can check search params)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  // We allow bypass in development
  if (config.isProduction && secret !== config.cronSecret) {
    logger.warn(context, 'Unauthorized cron attempt blocked');
    return new Response('Unauthorized', { status: 401 });
  }

  logger.info(context, 'Starting hourly cron cycle...');

  // In Next.js App router, we can query users
  // Wait, if no users exist in our DB, we can skip or run.
  // Let's get all active settings or users
  let allSettings: any[] = [];
  try {
    // We can read all settings. Since DB doesn't have a listAllSettings, let's add one or read directly.
    // Wait, let's check how to list all settings.
    // If it's MongoDB, we can query the user_settings collection directly.
    // If it's File, we read the settings array.
    // Let's implement listAllSettings in our DB client or query users and get their settings.
    // Actually, let's query all users and then fetch their settings one-by-one, or add a method in DB.
    // Let's look at lib/db.ts. There is no listAllSettings or listAllUsers.
    // Let's add a small helper in DB or load users directly.
    // Wait! Let's read them. Since we have DB.isMongo() check, we can implement getSettings for all or read local.
    // Let's write a clean query:
    const isMongo = !!config.mongodbUri;
    if (isMongo) {
      const client = new MongoClient(config.mongodbUri!);
      await client.connect();
      const db = client.db();
      allSettings = await db.collection('user_settings').find({}).toArray();
      await client.close();
    } else {
      // Local file
      try {
        const fileContent = await fs.readFile(path.join(process.cwd(), 'db-fallback', 'db.json'), 'utf-8');
        const dbData = JSON.parse(fileContent);
        allSettings = dbData.settings || [];
      } catch (e) {
        allSettings = [];
      }
    }
  } catch (err) {
    logger.error(context, 'Failed to fetch user settings for cron', err);
    return NextResponse.json({ success: false, error: 'Database query failed' }, { status: 500 });
  }

  const results: any[] = [];

  for (const setting of allSettings) {
    const { userId, timezone } = setting;
    const { dateStr, hour } = getLocalDateAndTime(timezone);
    
    logger.info(context, `User ${userId} local time is ${dateStr} at ${hour}:00 in timezone ${timezone}`);

    const userResult = {
      userId,
      timezone,
      localHour: hour,
      occurrencesGenerated: 0,
      missedMarked: 0
    };

    // 1. Generation check: triggers at 23:00 local time
    if (hour === 23) {
      const tomorrowStr = addDays(dateStr, 1);
      logger.info(context, `Generating occurrences for user ${userId} for tomorrow: ${tomorrowStr}`);
      userResult.occurrencesGenerated = await generateOccurrencesForUser(userId, tomorrowStr);
    }

    // 2. Missed detection: triggers at 00:00 (covers 00:05) local time
    if (hour === 0) {
      const yesterdayStr = addDays(dateStr, -1);
      logger.info(context, `Scanning missed occurrences for user ${userId} for yesterday: ${yesterdayStr}`);
      userResult.missedMarked = await markMissedOccurrencesForUser(userId, yesterdayStr);
    }

    results.push(userResult);
  }

  logger.info(context, `Cron cycle completed. Processed ${results.length} users.`);
  return NextResponse.json({ success: true, processedUsers: results });
}

// Importing fs/promises and path since they are used in fallback branch
import fs from 'fs/promises';
import path from 'path';
import { MongoClient } from 'mongodb';
