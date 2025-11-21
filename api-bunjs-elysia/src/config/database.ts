import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getClient(): postgres.Sql {
  if (!client) {
    client = postgres({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'pocks_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 10, // Conservative pool size for clustering (10 * numCPUs)
      idle_timeout: 0, // Disable idle timeout to avoid warning under load
      connect_timeout: 0, // Disable connect timeout
      prepare: true,
    });
  }
  return client;
}

export function getDb() {
  if (!dbInstance) {
    const client = getClient();
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export async function initializeDatabase() {
  const client = getClient();

  await client`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      age INTEGER NOT NULL
    )`;
  // Optimize for write performance
  await client`ALTER TABLE users SET UNLOGGED`;
  console.log('Database initialized successfully (UNLOGGED table)');
}
