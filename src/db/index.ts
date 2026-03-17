import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(process.env.DATABASE_URL!, {
    max: process.env.NODE_ENV === "production" ? 3 : 5,
    ssl: "require",
    prepare: false,               // required for Supabase transaction pooler (port 6543)
    connect_timeout: 30,
    idle_timeout: 30,
    connection: {
      statement_timeout: 55000,   // override Supabase's default 8s limit
    },
  });

if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
