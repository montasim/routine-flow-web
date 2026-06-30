import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"

import { requireProductionMongo } from "@/lib/env"
import { getMongoDb } from "@/lib/db"
import { createSeedData } from "@/lib/seed"
import { normalizeAppData } from "@/lib/storage/normalize"
import type { AppData } from "@/lib/types"

const localDataDir = path.join(process.cwd(), ".data")
const localDataFile = path.join(localDataDir, "routineflow-data.json")

const collectionNames = [
  "users",
  "userSettings",
  "categories",
  "routines",
  "occurrences",
  "routineLogs",
  "sessions",
  "otpCodes",
  "mobileSocialAuthCodes",
  "idempotencyKeys",
  "syncTombstones",
  "exports",
  "scheduledJobs",
] as const

type CollectionName = (typeof collectionNames)[number]

const snapshotCacheTtlMs = 5_000

let bootstrapped = false
let dataWriteQueue: Promise<unknown> = Promise.resolve()
let pendingWrites = 0
let snapshotCache: { data: AppData; expiresAt: number } | null = null
let snapshotReadPromise: Promise<AppData> | null = null

export async function readAppData(): Promise<AppData> {
  await waitForPendingWrites()
  const cached = cachedSnapshot()
  if (cached) return cached

  if (!snapshotReadPromise) {
    const read = readAppDataUnlocked().then(cacheSnapshot)
    snapshotReadPromise = read
    read.finally(() => {
      if (snapshotReadPromise === read) snapshotReadPromise = null
    }).catch(() => undefined)
  }

  return snapshotReadPromise
}

export async function writeAppData(data: AppData) {
  await serializeDataWrite(async () => {
    await writeAppDataUnlocked(data)
    cacheSnapshot(data)
  })
}

export async function withAppData<T>(mutator: (data: AppData) => T | Promise<T>) {
  return serializeDataWrite(async () => {
    const data = await readAppDataUnlocked()
    const result = await mutator(data)
    await writeAppDataUnlocked(data)
    cacheSnapshot(data)
    return result
  })
}

function serializeDataWrite<T>(operation: () => Promise<T>) {
  pendingWrites += 1
  const run = dataWriteQueue.then(async () => {
    const activeRead = snapshotReadPromise
    if (activeRead) await activeRead.catch(() => undefined)
    snapshotCache = null
    snapshotReadPromise = null
    return operation()
  })
  dataWriteQueue = run.catch(() => undefined)
  return run.finally(() => {
    pendingWrites -= 1
  })
}

async function waitForPendingWrites() {
  while (pendingWrites > 0) await dataWriteQueue.catch(() => undefined)
}

function cachedSnapshot() {
  if (!snapshotCache || snapshotCache.expiresAt <= Date.now()) return null
  return snapshotCache.data
}

function cacheSnapshot(data: AppData) {
  snapshotCache = { data, expiresAt: Date.now() + snapshotCacheTtlMs }
  return data
}

async function readAppDataUnlocked(): Promise<AppData> {
  requireProductionMongo()
  const db = await getMongoDb()
  if (db) return readMongoData()
  return readLocalData()
}

async function writeAppDataUnlocked(data: AppData) {
  const normalized = normalizeAppData(data)
  requireProductionMongo()
  const db = await getMongoDb()
  if (db) {
    await writeMongoData(normalized)
    return
  }
  await writeLocalData(normalized)
}

async function readLocalData() {
  try {
    return normalizeAppData(JSON.parse(await readFile(localDataFile, "utf8")) as AppData)
  } catch {
    const data = createSeedData()
    await writeLocalData(data)
    return data
  }
}

async function writeLocalData(data: AppData) {
  await mkdir(localDataDir, { recursive: true })
  await writeFile(localDataFile, `${JSON.stringify(data, null, 2)}\n`, "utf8")
}

async function readMongoData() {
  const db = await getMongoDb()
  if (!db) return readLocalData()
  if (!bootstrapped) {
    await ensureIndexes()
    bootstrapped = true
  }
  const data = createEmptyLike()
  for (const name of collectionNames) {
    ;(data as unknown as Record<CollectionName, unknown[]>)[name] = await db.collection(name).find({}, { projection: { _id: 0 } }).toArray()
  }
  normalizeAppData(data)
  if (!data.users.length) {
    const seed = createSeedData()
    await writeMongoData(seed)
    return seed
  }
  return data
}

async function writeMongoData(data: AppData) {
  normalizeAppData(data)
  const db = await getMongoDb()
  if (!db) return writeLocalData(data)
  if (!bootstrapped) {
    await ensureIndexes()
    bootstrapped = true
  }
  for (const name of collectionNames) {
    const collection = db.collection(name)
    await collection.deleteMany({})
    const docs = (data as unknown as Record<CollectionName, Record<string, unknown>[]>)[name]
    if (docs.length) await collection.insertMany(docs.map((doc) => ({ ...doc })))
  }
}

function createEmptyLike(): AppData {
  return {
    users: [],
    userSettings: [],
    categories: [],
    routines: [],
    occurrences: [],
    routineLogs: [],
    sessions: [],
    otpCodes: [],
    mobileSocialAuthCodes: [],
    idempotencyKeys: [],
    syncTombstones: [],
    exports: [],
    scheduledJobs: [],
  }
}

async function ensureIndexes() {
  const db = await getMongoDb()
  if (!db) return
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("userSettings").createIndex({ userId: 1 }, { unique: true }),
    db.collection("categories").createIndex({ userId: 1, normalizedName: 1, isDeleted: 1 }, { unique: true }),
    db.collection("categories").createIndex({ userId: 1, sortOrder: 1 }),
    db.collection("routines").createIndex({ userId: 1, isDeleted: 1 }),
    db.collection("routines").createIndex({ userId: 1, categoryId: 1, isDeleted: 1 }),
    db.collection("occurrences").createIndex({ userId: 1, date: 1 }),
    db.collection("occurrences").createIndex({ userId: 1, routineId: 1, date: 1 }, { unique: true }),
    db.collection("occurrences").createIndex({ notificationDueAt: 1, status: 1 }),
    db.collection("routineLogs").createIndex({ userId: 1, date: 1 }),
    db.collection("routineLogs").createIndex({ occurrenceId: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ token: 1 }, { unique: true }),
    db.collection("otpCodes").createIndex({ email: 1, createdAt: 1 }),
    db.collection("otpCodes").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("mobileSocialAuthCodes").createIndex({ codeHash: 1 }, { unique: true }),
    db.collection("mobileSocialAuthCodes").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("idempotencyKeys").createIndex({ userId: 1, method: 1, path: 1, key: 1 }, { unique: true }),
    db.collection("idempotencyKeys").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("syncTombstones").createIndex({ userId: 1, resourceType: 1, deletedAt: 1 }),
  ])
}

export function collectionName(name: CollectionName) {
  return name
}
