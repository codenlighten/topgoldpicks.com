import { MongoClient } from 'mongodb';
import { config } from '../config.js';

let client;
let db;

export async function connectDb() {
  if (db) return db;
  if (!config.mongodbUri) throw new Error('MONGODB_URI is not set');

  client = new MongoClient(config.mongodbUri);
  await client.connect();
  db = client.db('topgoldpicks');

  await db.collection('picks').createIndex(
    { sport_key: 1, date: -1 },
    { unique: true, name: 'sport_date_unique' },
  );
  await db.collection('picks').createIndex({ generated_at: -1 });

  await db.collection('signups').createIndex(
    { email: 1 },
    { unique: true, name: 'email_unique' },
  );
  await db.collection('signups').createIndex({ createdAt: -1 });

  console.log('MongoDB connected');
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not connected — call connectDb() first');
  return db;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
