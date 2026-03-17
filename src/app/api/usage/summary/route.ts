export const revalidate = 60;
import { db } from "@/db";
import { kitUsage } from "@/db/schema";
import { sql } from "drizzle-orm";
import { successResponse, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const summary = await db
      .select({
        total_used: sql<number>`SUM(kits_used)`,
        total_wasted: sql<number>`SUM(kits_wasted)`,
        total_returned: sql<number>`SUM(kits_returned)`,
        total_records: sql<number>`COUNT(*)`,
      })
      .from(kitUsage);

    return successResponse(summary[0]);
  } catch (e) {
    return serverError(e);
  }
}
