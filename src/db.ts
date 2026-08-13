import "dotenv/config";
import { Pool } from "pg";

export const db = new Pool({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB ?? "logs_db",
  user: process.env.POSTGRES_USER ?? "logs_user",
  password: process.env.POSTGRES_PASSWORD ?? "logs_password",
  max: Number(process.env.DB_POOL_MAX ?? 10),
});

export async function initDB() {
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    CREATE TABLE IF NOT EXISTS logs (
      id BIGSERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL,
      level TEXT NOT NULL CHECK (
        level IN ('debug', 'info', 'warn', 'error')
      ),
      service TEXT NOT NULL,
      message TEXT NOT NULL,
      attributes JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_logs_timestamp_id
      ON logs (timestamp DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_logs_service_timestamp
      ON logs (service, timestamp DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_logs_level_timestamp
      ON logs (level, timestamp DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_logs_attributes
      ON logs USING GIN (attributes);

    CREATE INDEX IF NOT EXISTS idx_logs_message_trgm
      ON logs USING GIN (message gin_trgm_ops);
  `);
}

export async function closeDB() {
  await db.end();
}