import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const isProduction = process.env.NODE_ENV === "production";

const conn =
  globalForDb.conn ??
  postgres(process.env.DATABASE_URL!, {
    max: 1,                       // 1 connection per serverless instance
    ssl: "require",
    prepare: false,               // required for Supabase transaction pooler (port 6543)
    connect_timeout: 30,
    idle_timeout: 30,
  });

if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
