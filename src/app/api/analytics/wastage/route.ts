export const revalidate = 60;
import { NextRequest } from "next/server";
import { db } from "@/db";
import { kitUsage, shipments } from "@/db/schema";
import { sql, gte, lte, and } from "drizzle-orm";
import { successResponse, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [];
    if (from) conditions.push(gte(kitUsage.usage_date, from));
    if (to) conditions.push(lte(kitUsage.usage_date, to));

    const wastageData = await db
      .select({
        month: sql<string>`TO_CHAR(usage_date, 'YYYY-MM')`,
        total_used: sql<number>`SUM(kits_used)`,
        total_wasted: sql<number>`SUM(kits_wasted)`,
        total_returned: sql<number>`SUM(kits_returned)`,
      })
      .from(kitUsage)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(sql`TO_CHAR(usage_date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(usage_date, 'YYYY-MM')`);

    return successResponse(wastageData);
  } catch (e) {
    return serverError(e);
  }
}
