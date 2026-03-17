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
    max: isProduction ? 5 : 10,   // allow parallel queries in production
    ssl: "require",
    prepare: false,               // required for Supabase transaction pooler (port 6543)
    connect_timeout: 15,          // fail fast if can't connect within 15s
    idle_timeout: 20,             // release idle connections after 20s
  });

if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
