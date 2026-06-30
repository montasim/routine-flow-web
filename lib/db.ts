import { MongoClient } from "mongodb"

import { env, requireProductionMongo } from "@/lib/env"

let clientPromise: Promise<MongoClient> | null = null

export function getMongoClient() {
  requireProductionMongo()
  if (!env.MONGODB_URI) return null
  if (!clientPromise) {
    const client = new MongoClient(env.MONGODB_URI, {
      minPoolSize: 0,
      maxPoolSize: 10,
    })
    clientPromise = client.connect()
  }
  return clientPromise
}

export async function getMongoDb() {
  const client = await getMongoClient()
  return client?.db() ?? null
}
