import { MongoClient, Db, ObjectId } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';
import { config } from './config';
import { DEFAULT_TIMEZONE, DEFAULT_REMINDER_MINUTES } from './constant';

// ─── Interfaces ───

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
}

export interface UserSettings {
  userId: string;
  timezone: string;
  defaultReminderMinutes: number;
  notificationPreferences?: any;
}

export interface Routine {
  id: string;
  userId: string;
  title: string;
  category: string;
  scheduledTime: string; // "HH:mm" in local user time
  scheduleType: 'fixed' | 'dynamic';
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceRules: {
    daysOfWeek?: number[]; // [0-6] for weekly
    daysOfMonth?: number[]; // [1-31] for monthly
  };
  reminderOverride: number | null; // minutes offset or null to use global
  isActive: boolean;
  createdAt: Date;
}

export interface Occurrence {
  id: string;
  routineId: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  scheduledTime: string; // "HH:mm"
  scheduledTimeUtc: Date;
  timezoneAtGeneration: string;
  status: 'Pending' | 'Completed' | 'Missed' | 'Skipped';
  notificationScheduledAt: Date | null;
}

export interface RoutineLog {
  id: string;
  routineId: string;
  occurrenceId: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  scheduledTime: string; // "HH:mm"
  scheduledTimeUtc: Date;
  completedAt: Date | null;
  timezoneAtLog: string;
  status: 'Completed' | 'Missed' | 'Skipped';
  delayMinutes: number | null;
}

// ─── Database File Fallback Definition ───

interface LocalDbSchema {
  users: User[];
  settings: UserSettings[];
  routines: Routine[];
  occurrences: Occurrence[];
  logs: RoutineLog[];
  sessions: any[];
  accounts: any[];
  verifications: any[];
}

const FALLBACK_DIR = path.join(process.cwd(), 'db-fallback');
const FALLBACK_PATH = path.join(FALLBACK_DIR, 'db.json');

// Write queue lock to prevent concurrent JSON file writes
let fileQueue = Promise.resolve();
async function queueWrite<T>(action: () => Promise<T>): Promise<T> {
  const result = fileQueue.then(action);
  fileQueue = result.then(() => {}, () => {});
  return result;
}

// ─── MongoDB Native Connection ───

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function getMongoDb(): Promise<Db> {
  const uri = config.mongodbUri;
  if (!uri) throw new Error('MONGODB_URI not set');

  if (cachedDb) return cachedDb;

  logger.info('Database', 'Connecting to MongoDB...');
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = uri.split('/').pop()?.split('?')[0] || 'routineflow';
  const db = client.db(dbName);
  
  cachedClient = client;
  cachedDb = db;
  logger.info('Database', 'MongoDB connection established successfully.');
  return db;
}

// Helper to convert MongoDB object with _id to clean id string
function mapId(doc: any): any {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

// ─── Data Repository ───

export class DB {
  private static isMongo(): boolean {
    return !!config.mongodbUri;
  }

  // Ensure JSON file exists and return contents
  private static async readLocal(): Promise<LocalDbSchema> {
    try {
      await fs.mkdir(FALLBACK_DIR, { recursive: true });
      try {
        const content = await fs.readFile(FALLBACK_PATH, 'utf-8');
        const data = JSON.parse(content);
        
        // Deserialize dates
        data.users = data.users.map((u: any) => ({ ...u, createdAt: new Date(u.createdAt) }));
        data.routines = data.routines.map((r: any) => ({ ...r, createdAt: new Date(r.createdAt) }));
        data.occurrences = data.occurrences.map((o: any) => ({ ...o, scheduledTimeUtc: new Date(o.scheduledTimeUtc), notificationScheduledAt: o.notificationScheduledAt ? new Date(o.notificationScheduledAt) : null }));
        data.logs = data.logs.map((l: any) => ({ ...l, scheduledTimeUtc: new Date(l.scheduledTimeUtc), completedAt: l.completedAt ? new Date(l.completedAt) : null }));
        
        return data;
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          // Initialize empty
          const initial: LocalDbSchema = { users: [], settings: [], routines: [], occurrences: [], logs: [], sessions: [], accounts: [], verifications: [] };
          await fs.writeFile(FALLBACK_PATH, JSON.stringify(initial, null, 2), 'utf-8');
          return initial;
        }
        throw err;
      }
    } catch (e) {
      logger.error('Database', 'Failed to read local fallback DB file', e);
      return { users: [], settings: [], routines: [], occurrences: [], logs: [], sessions: [], accounts: [], verifications: [] };
    }
  }

  private static async writeLocal(data: LocalDbSchema): Promise<void> {
    await queueWrite(async () => {
      await fs.writeFile(FALLBACK_PATH, JSON.stringify(data, null, 2), 'utf-8');
    });
  }

  // ─── User CRUD ───

  static async findUserByEmail(email: string): Promise<User | null> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      const doc = await db.collection('users').findOne({ email: email.toLowerCase() });
      return mapId(doc);
    } else {
      const db = await this.readLocal();
      return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
  }

  static async createUser(name: string, email: string): Promise<User> {
    const user: User = {
      id: this.isMongo() ? new ObjectId().toString() : Math.random().toString(36).substring(2, 9),
      name,
      email: email.toLowerCase(),
      createdAt: new Date()
    };

    if (this.isMongo()) {
      const db = await getMongoDb();
      const { id, ...mongoData } = user;
      await db.collection('users').insertOne({ _id: new ObjectId(id), ...mongoData });
    } else {
      const db = await this.readLocal();
      db.users.push(user);
      await this.writeLocal(db);
    }
    logger.info('Database', `User created: ${email}`);
    return user;
  }

  static async findUserById(id: string): Promise<User | null> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      const doc = await db.collection('users').findOne({ _id: new ObjectId(id) });
      return mapId(doc);
    } else {
      const db = await this.readLocal();
      return db.users.find(u => u.id === id) || null;
    }
  }

  // ─── Settings CRUD ───

  static async getSettings(userId: string): Promise<UserSettings | null> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      const doc = await db.collection('user_settings').findOne({ userId });
      return doc ? { userId: doc.userId, timezone: doc.timezone, defaultReminderMinutes: doc.defaultReminderMinutes, notificationPreferences: doc.notificationPreferences } : null;
    } else {
      const db = await this.readLocal();
      return db.settings.find(s => s.userId === userId) || null;
    }
  }

  static async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      await db.collection('user_settings').updateOne(
        { userId },
        { $set: settings },
        { upsert: true }
      );
      const doc = await db.collection('user_settings').findOne({ userId });
      return { userId: doc!.userId, timezone: doc!.timezone, defaultReminderMinutes: doc!.defaultReminderMinutes, notificationPreferences: doc!.notificationPreferences };
    } else {
      const db = await this.readLocal();
      let index = db.settings.findIndex(s => s.userId === userId);
      if (index === -1) {
        const newSettings: UserSettings = {
          userId,
          timezone: settings.timezone || DEFAULT_TIMEZONE,
          defaultReminderMinutes: settings.defaultReminderMinutes ?? DEFAULT_REMINDER_MINUTES,
          notificationPreferences: settings.notificationPreferences || { notifEnabled: true, useGlobal: true, skipBreaksStreak: false }
        };
        db.settings.push(newSettings);
        index = db.settings.length - 1;
      } else {
        db.settings[index] = { ...db.settings[index], ...settings };
      }
      await this.writeLocal(db);
      return db.settings[index];
    }
  }

  // ─── Routine CRUD ───

  static async getRoutines(userId: string): Promise<Routine[]> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      const docs = await db.collection('routines').find({ userId }).toArray();
      return docs.map(mapId);
    } else {
      const db = await this.readLocal();
      return db.routines.filter(r => r.userId === userId);
    }
  }

  static async createRoutine(routine: Omit<Routine, 'id' | 'createdAt'>): Promise<Routine> {
    const newRoutine: Routine = {
      id: this.isMongo() ? new ObjectId().toString() : Math.random().toString(36).substring(2, 9),
      ...routine,
      createdAt: new Date()
    };

    if (this.isMongo()) {
      const db = await getMongoDb();
      const { id, ...mongoData } = newRoutine;
      await db.collection('routines').insertOne({ _id: new ObjectId(id), ...mongoData });
    } else {
      const db = await this.readLocal();
      db.routines.push(newRoutine);
      await this.writeLocal(db);
    }
    return newRoutine;
  }

  static async updateRoutine(id: string, routine: Partial<Routine>): Promise<Routine | null> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      const { id: _, createdAt: __, ...updateData } = routine;
      await db.collection('routines').updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      const doc = await db.collection('routines').findOne({ _id: new ObjectId(id) });
      return mapId(doc);
    } else {
      const db = await this.readLocal();
      const index = db.routines.findIndex(r => r.id === id);
      if (index === -1) return null;
      db.routines[index] = { ...db.routines[index], ...routine } as Routine;
      await this.writeLocal(db);
      return db.routines[index];
    }
  }

  static async deleteRoutine(id: string): Promise<boolean> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      const res = await db.collection('routines').deleteOne({ _id: new ObjectId(id) });
      return res.deletedCount > 0;
    } else {
      const db = await this.readLocal();
      const origLen = db.routines.length;
      db.routines = db.routines.filter(r => r.id !== id);
      await this.writeLocal(db);
      return db.routines.length < origLen;
    }
  }

  static async getActiveRoutines(): Promise<Routine[]> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      const docs = await db.collection('routines').find({ isActive: true }).toArray();
      return docs.map(mapId);
    } else {
      const db = await this.readLocal();
      return db.routines.filter(r => r.isActive);
    }
  }

  // ─── Occurrence CRUD ───

  static async getOccurrences(userId: string, date?: string): Promise<Occurrence[]> {
    const filter: any = { userId };
    if (date) filter.date = date;

    if (this.isMongo()) {
      const db = await getMongoDb();
      const docs = await db.collection('occurrences').find(filter).toArray();
      return docs.map(mapId);
    } else {
      const db = await this.readLocal();
      return db.occurrences.filter(o => o.userId === userId && (!date || o.date === date));
    }
  }

  static async getOccurrencesByQuery(query: Partial<Occurrence>): Promise<Occurrence[]> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      const filter: any = {};
      if (query.userId) filter.userId = query.userId;
      if (query.date) filter.date = query.date;
      if (query.routineId) filter.routineId = query.routineId;
      if (query.status) filter.status = query.status;
      const docs = await db.collection('occurrences').find(filter).toArray();
      return docs.map(mapId);
    } else {
      const db = await this.readLocal();
      return db.occurrences.filter(o => {
        if (query.userId && o.userId !== query.userId) return false;
        if (query.date && o.date !== query.date) return false;
        if (query.routineId && o.routineId !== query.routineId) return false;
        if (query.status && o.status !== query.status) return false;
        return true;
      });
    }
  }

  static async createOccurrences(occurrences: Omit<Occurrence, 'id'>[]): Promise<Occurrence[]> {
    const newOccs: Occurrence[] = occurrences.map(o => ({
      id: this.isMongo() ? new ObjectId().toString() : Math.random().toString(36).substring(2, 9),
      ...o
    }));

    if (this.isMongo()) {
      const db = await getMongoDb();
      const mongoDocs = newOccs.map(({ id, ...rest }) => ({ _id: new ObjectId(id), ...rest }));
      if (mongoDocs.length > 0) {
        await db.collection('occurrences').insertMany(mongoDocs);
      }
    } else {
      const db = await this.readLocal();
      db.occurrences.push(...newOccs);
      await this.writeLocal(db);
    }
    return newOccs;
  }

  static async updateOccurrenceStatus(id: string, status: Occurrence['status']): Promise<Occurrence | null> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      await db.collection('occurrences').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      const doc = await db.collection('occurrences').findOne({ _id: new ObjectId(id) });
      return mapId(doc);
    } else {
      const db = await this.readLocal();
      const index = db.occurrences.findIndex(o => o.id === id);
      if (index === -1) return null;
      db.occurrences[index].status = status;
      await this.writeLocal(db);
      return db.occurrences[index];
    }
  }

  static async findOccurrenceById(id: string): Promise<Occurrence | null> {
    if (this.isMongo()) {
      const db = await getMongoDb();
      const doc = await db.collection('occurrences').findOne({ _id: new ObjectId(id) });
      return mapId(doc);
    } else {
      const db = await this.readLocal();
      return db.occurrences.find(o => o.id === id) || null;
    }
  }

  // ─── Routine Log CRUD ───

  static async getLogs(userId: string, query?: { routineId?: string; startDate?: string; endDate?: string }): Promise<RoutineLog[]> {
    const filter: any = { userId };
    if (query?.routineId) filter.routineId = query.routineId;
    if (query?.startDate || query?.endDate) {
      filter.date = {};
      if (query.startDate) filter.date.$gte = query.startDate;
      if (query.endDate) filter.date.$lte = query.endDate;
    }

    if (this.isMongo()) {
      const db = await getMongoDb();
      const docs = await db.collection('routine_logs').find(filter).sort({ date: -1, scheduledTime: -1 }).toArray();
      return docs.map(mapId);
    } else {
      const db = await this.readLocal();
      let logs = db.logs.filter(l => l.userId === userId);
      if (query?.routineId) logs = logs.filter(l => l.routineId === query.routineId);
      if (query?.startDate) logs = logs.filter(l => l.date >= query.startDate!);
      if (query?.endDate) logs = logs.filter(l => l.date <= query.endDate!);
      
      // Sort desc
      return logs.sort((a, b) => {
        const da = `${a.date}T${a.scheduledTime}`;
        const dbTime = `${b.date}T${b.scheduledTime}`;
        return dbTime.localeCompare(da);
      });
    }
  }

  static async createLog(log: Omit<RoutineLog, 'id'>): Promise<RoutineLog> {
    const newLog: RoutineLog = {
      id: this.isMongo() ? new ObjectId().toString() : Math.random().toString(36).substring(2, 9),
      ...log
    };

    if (this.isMongo()) {
      const db = await getMongoDb();
      const { id, ...mongoData } = newLog;
      await db.collection('routine_logs').insertOne({ _id: new ObjectId(id), ...mongoData });
    } else {
      const db = await this.readLocal();
      // Remove any existing log for this occurrence first (idempotent overwrite)
      db.logs = db.logs.filter(l => l.occurrenceId !== log.occurrenceId);
      db.logs.push(newLog);
      await this.writeLocal(db);
    }
    return newLog;
  }

  // ─── Seeding Logic (To WOW the User) ───

  static async seedDefaultData(userId: string): Promise<void> {
    logger.info('Database', `Checking if seed data is needed for user: ${userId}`);

    // Verify if routines already exist
    const currentRoutines = await this.getRoutines(userId);
    if (currentRoutines.length > 0) {
      logger.info('Database', 'Seed data exists. Skipping.');
      return;
    }

    logger.info('Database', 'Creating default routines and seeding 60 days of historical occurrences/logs...');

    // 1. Create routines
    const routinesData = [
      { title: 'Morning Gym', category: 'Fitness', time: '07:00', type: 'daily', rules: {} },
      { title: 'Vitamins', category: 'Health', time: '08:15', type: 'daily', rules: {} },
      { title: 'Deep work block', category: 'Work', time: '09:30', type: 'weekly', rules: { daysOfWeek: [1, 3, 5] } }, // Mon, Wed, Fri
      { title: 'Language practice', category: 'Mind', time: '18:00', type: 'daily', rules: {} },
      { title: 'Read 20 minutes', category: 'Mind', time: '22:30', type: 'daily', rules: {} }
    ];

    const routines: Routine[] = [];
    for (const r of routinesData) {
      const created = await this.createRoutine({
        userId,
        title: r.title,
        category: r.category,
        scheduledTime: r.time,
        scheduleType: 'fixed',
        recurrenceType: r.type as any,
        recurrenceRules: r.rules,
        reminderOverride: null,
        isActive: true
      });
      routines.push(created);
    }

    // 2. Generate occurrences and logs for the past 60 days to match specs
    // We go from 60 days ago up to today.
    // User local time is Asia/Dhaka. Offset is UTC+6.
    const tz = DEFAULT_TIMEZONE;
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    const occurrencesToCreate: Omit<Occurrence, 'id'>[] = [];
    const logsToCreate: Omit<RoutineLog, 'id'>[] = [];

    // Helper to determine if routine runs on a date
    const shouldRun = (routine: Routine, date: Date): boolean => {
      if (routine.recurrenceType === 'daily') return true;
      if (routine.recurrenceType === 'weekly') {
        const day = date.getDay(); // 0 (Sun) - 6 (Sat)
        return routine.recurrenceRules.daysOfWeek?.includes(day) || false;
      }
      return false;
    };

    // We generate logs from 60 days ago up to yesterday (since today is active/pending)
    for (let i = 60; i >= 1; i--) {
      const date = new Date(now.getTime() - i * msPerDay);
      // Format as YYYY-MM-DD in Dhaka
      const dateStr = date.toISOString().split('T')[0];

      for (const r of routines) {
        if (!shouldRun(r, date)) continue;

        // Scheduled local time
        const [hh, mm] = r.scheduledTime.split(':').map(Number);
        
        // Compute scheduledTimeUtc in Asia/Dhaka (UTC+6)
        const localDateTime = new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          hh - 6, // Dhaka offset is +6
          mm
        ));

        // Let's decide a deterministic status based on seed index to yield exact statistics:
        // - Morning Gym: consistency ~92%, streak 28. Missed on day 29, completed before.
        // - Vitamins: consistency ~98%, streak 54. Completed all last 54 days.
        // - Deep work: consistency ~74%, streak 6. Missed on day 7, completed before.
        // - Language practice: consistency ~61%, streak 0. Missed yesterday.
        // - Read 20 minutes: consistency ~83%, streak 11. Missed 12 days ago, completed since.

        let status: Occurrence['status'] = 'Completed';
        let delayMinutes: number | null = Math.floor(Math.random() * 15) - 3; // range -3 to 12 mins (mostly early/on time/slightly late)

        if (r.title === 'Morning Gym') {
          // Gym: Missed day 29 (counting backward). So let's make it missed if i === 29.
          // Other misses scattered to get 92% (e.g. day 45).
          if (i === 29 || i === 45) {
            status = 'Missed';
            delayMinutes = null;
          }
        } else if (r.title === 'Vitamins') {
          // Vitamins: Streak 54. Missed at day 56.
          if (i === 56) {
            status = 'Missed';
            delayMinutes = null;
          } else {
            // High consistency, mostly 0 delay
            delayMinutes = Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0;
          }
        } else if (r.title === 'Deep work block') {
          // Deep work: runs Mon, Wed, Fri.
          // Streak = 6 occurrences. We count occurrences backwards.
          // Let's calculate occurrence indices backwards: if index === 7, make it Missed.
          // Other misses scattered to get ~74% consistency.
          const day = date.getDay();
          // Let's make every 4th occurrence missed, and specifically the 7th occurrence from today missed.
          // We can use the loop iteration i to scatter it
          if (i % 8 === 0 || i === 15) {
            status = 'Missed';
            delayMinutes = null;
          }
        } else if (r.title === 'Language practice') {
          // Language: Streak 0. Missed yesterday (i === 1).
          // Scattering misses to get 61%.
          if (i === 1 || i % 3 === 0) {
            status = 'Missed';
            delayMinutes = null;
          }
        } else if (r.title === 'Read 20 minutes') {
          // Read 20 mins: Streak 11. Missed 12 days ago (i === 12).
          // Scatter misses to get 83%.
          if (i === 12 || i === 25 || i === 40) {
            status = 'Missed';
            delayMinutes = null;
          } else if (i === 32) {
            status = 'Skipped';
            delayMinutes = null;
          }
        }

        // Add occurrence
        const occ: Omit<Occurrence, 'id'> = {
          routineId: r.id,
          userId,
          date: dateStr,
          scheduledTime: r.scheduledTime,
          scheduledTimeUtc: localDateTime,
          timezoneAtGeneration: tz,
          status,
          notificationScheduledAt: new Date(localDateTime.getTime() - 15 * 60 * 1000)
        };
        occurrencesToCreate.push(occ);

        // Add log
        const log: Omit<RoutineLog, 'id'> = {
          routineId: r.id,
          occurrenceId: '', // populated in next step
          userId,
          date: dateStr,
          scheduledTime: r.scheduledTime,
          scheduledTimeUtc: localDateTime,
          completedAt: status === 'Completed' ? new Date(localDateTime.getTime() + (delayMinutes ?? 0) * 60 * 1000) : null,
          timezoneAtLog: tz,
          status: status as any,
          delayMinutes
        };
        logsToCreate.push(log);
      }
    }

    // Now insert them in the DB
    const createdOccs = await this.createOccurrences(occurrencesToCreate);
    
    // Map occurrences ids back to logs
    for (let k = 0; k < createdOccs.length; k++) {
      logsToCreate[k].occurrenceId = createdOccs[k].id;
      await this.createLog(logsToCreate[k]);
    }

    // 3. For "Today", let's create Pending occurrences so they show up on the dashboard to interact with!
    const todayStr = now.toISOString().split('T')[0];
    const todayOccs: Omit<Occurrence, 'id'>[] = [];
    for (const r of routines) {
      const dateToday = new Date(now);
      if (!shouldRun(r, dateToday)) continue;

      const [hh, mm] = r.scheduledTime.split(':').map(Number);
      const localDateTime = new Date(Date.UTC(
        dateToday.getUTCFullYear(),
        dateToday.getUTCMonth(),
        dateToday.getUTCDate(),
        hh - 6,
        mm
      ));

      // Check if gym, vitamins, and deep work are completed/skipped for today,
      // and read/language practice are still pending! This matches routineflow_web.html's dashboard exactly!
      let status: Occurrence['status'] = 'Pending';
      let doneTime: Date | null = null;
      let delayMinutes: number | null = null;

      if (r.title === 'Morning Gym') {
        status = 'Completed';
        delayMinutes = 4;
        doneTime = new Date(localDateTime.getTime() + 4 * 60 * 1000);
      } else if (r.title === 'Vitamins') {
        status = 'Completed';
        delayMinutes = 0;
        doneTime = new Date(localDateTime.getTime());
      } else if (r.title === 'Read 20 minutes') {
        status = 'Skipped';
      }

      const occ: Omit<Occurrence, 'id'> = {
        routineId: r.id,
        userId,
        date: todayStr,
        scheduledTime: r.scheduledTime,
        scheduledTimeUtc: localDateTime,
        timezoneAtGeneration: tz,
        status,
        notificationScheduledAt: new Date(localDateTime.getTime() - 15 * 60 * 1000)
      };

      todayOccs.push(occ);
    }

    const createdTodayOccs = await this.createOccurrences(todayOccs);

    // Create logs for finalized ones
    for (const o of createdTodayOccs) {
      if (o.status !== 'Pending') {
        let delayMinutes: number | null = null;
        let doneTime: Date | null = null;
        if (o.status === 'Completed') {
          delayMinutes = o.scheduledTime === '07:00' ? 4 : 0;
          doneTime = new Date(o.scheduledTimeUtc.getTime() + (delayMinutes ?? 0) * 60 * 1000);
        }
        await this.createLog({
          routineId: o.routineId,
          occurrenceId: o.id,
          userId,
          date: o.date,
          scheduledTime: o.scheduledTime,
          scheduledTimeUtc: o.scheduledTimeUtc,
          completedAt: doneTime,
          timezoneAtLog: tz,
          status: o.status as any,
          delayMinutes
        });
      }
    }

    logger.info('Database', 'Seed data loaded and historical logs successfully written.');
  }

  // ─── Generic Collection Helpers (Better Auth Custom Adapter) ───

  private static getCollectionName(model: string): string {
    if (model === 'user') return 'users';
    if (model === 'session') return 'sessions';
    if (model === 'account') return 'accounts';
    if (model === 'verification') return 'verifications';
    return model;
  }

  private static buildMongoQuery(where: { field: string; value: any }[]) {
    const query: any = {};
    where.forEach(w => {
      if (w.field === 'id') {
        if (typeof w.value === 'string' && /^[0-9a-fA-F]{24}$/.test(w.value)) {
          query._id = new ObjectId(w.value);
        } else {
          query._id = w.value;
        }
      } else {
        query[w.field] = w.value;
      }
    });
    return query;
  }

  private static matchConditions(item: any, where: { field: string; value: any }[]) {
    return where.every(w => {
      const val = item[w.field];
      const targetVal = w.value;
      if (val instanceof Date && targetVal instanceof Date) {
        return val.getTime() === targetVal.getTime();
      }
      return val === targetVal;
    });
  }

  static async createRecord(model: string, data: any): Promise<any> {
    const collection = this.getCollectionName(model);
    const id = data.id || (this.isMongo() ? new ObjectId().toString() : Math.random().toString(36).substring(2, 9));
    const record = { id, ...data };

    if (this.isMongo()) {
      const db = await getMongoDb();
      const { id: _, ...mongoData } = record;
      let docId = id;
      if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
        docId = new ObjectId(id);
      }
      await db.collection(collection).insertOne({ _id: docId as any, ...mongoData });
    } else {
      const db = await this.readLocal();
      const dbArr = (db as any)[collection] || [];
      dbArr.push(record);
      (db as any)[collection] = dbArr;
      await this.writeLocal(db);
    }
    return record;
  }

  static async findRecord(model: string, where: { field: string; value: any }[]): Promise<any | null> {
    const collection = this.getCollectionName(model);
    if (this.isMongo()) {
      const db = await getMongoDb();
      const query = this.buildMongoQuery(where);
      const doc = await db.collection(collection).findOne(query);
      return mapId(doc);
    } else {
      const db = await this.readLocal();
      const dbArr = (db as any)[collection] || [];
      const found = dbArr.find((item: any) => this.matchConditions(item, where));
      return found || null;
    }
  }

  static async findRecords(model: string, where: { field: string; value: any }[]): Promise<any[]> {
    const collection = this.getCollectionName(model);
    if (this.isMongo()) {
      const db = await getMongoDb();
      const query = this.buildMongoQuery(where);
      const docs = await db.collection(collection).find(query).toArray();
      return docs.map(mapId);
    } else {
      const db = await this.readLocal();
      const dbArr = (db as any)[collection] || [];
      return dbArr.filter((item: any) => this.matchConditions(item, where));
    }
  }

  static async updateRecord(model: string, where: { field: string; value: any }[], update: any): Promise<any | null> {
    const collection = this.getCollectionName(model);
    if (this.isMongo()) {
      const db = await getMongoDb();
      const query = this.buildMongoQuery(where);
      await db.collection(collection).updateOne(query, { $set: update });
      const doc = await db.collection(collection).findOne(query);
      return mapId(doc);
    } else {
      const db = await this.readLocal();
      const dbArr = (db as any)[collection] || [];
      const index = dbArr.findIndex((item: any) => this.matchConditions(item, where));
      if (index === -1) return null;
      dbArr[index] = { ...dbArr[index], ...update };
      (db as any)[collection] = dbArr;
      await this.writeLocal(db);
      return dbArr[index];
    }
  }

  static async deleteRecord(model: string, where: { field: string; value: any }[]): Promise<boolean> {
    const collection = this.getCollectionName(model);
    if (this.isMongo()) {
      const db = await getMongoDb();
      const query = this.buildMongoQuery(where);
      const res = await db.collection(collection).deleteOne(query);
      return (res.deletedCount || 0) > 0;
    } else {
      const db = await this.readLocal();
      const dbArr = (db as any)[collection] || [];
      const origLen = dbArr.length;
      const filtered = dbArr.filter((item: any) => !this.matchConditions(item, where));
      (db as any)[collection] = filtered;
      await this.writeLocal(db);
      return filtered.length < origLen;
    }
  }

  static async deleteManyRecords(model: string, where: { field: string; value: any }[]): Promise<number> {
    const collection = this.getCollectionName(model);
    if (this.isMongo()) {
      const db = await getMongoDb();
      const query = this.buildMongoQuery(where);
      const res = await db.collection(collection).deleteMany(query);
      return res.deletedCount || 0;
    } else {
      const db = await this.readLocal();
      const dbArr = (db as any)[collection] || [];
      const origLen = dbArr.length;
      const filtered = dbArr.filter((item: any) => !this.matchConditions(item, where));
      (db as any)[collection] = filtered;
      await this.writeLocal(db);
      return origLen - filtered.length;
    }
  }

  static async updateManyRecords(model: string, where: { field: string; value: any }[], update: any): Promise<number> {
    const collection = this.getCollectionName(model);
    if (this.isMongo()) {
      const db = await getMongoDb();
      const query = this.buildMongoQuery(where);
      const res = await db.collection(collection).updateMany(query, { $set: update });
      return res.modifiedCount || 0;
    } else {
      const db = await this.readLocal();
      const dbArr = (db as any)[collection] || [];
      let count = 0;
      const updated = dbArr.map((item: any) => {
        if (this.matchConditions(item, where)) {
          count++;
          return { ...item, ...update };
        }
        return item;
      });
      (db as any)[collection] = updated;
      await this.writeLocal(db);
      return count;
    }
  }
}
