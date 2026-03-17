export const revalidate = 60;
import { db } from "@/db";
import { kitUsage, shipments, sites } from "@/db/schema";
import { sql } from "drizzle-orm";
import { successResponse, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const siteUsage = await db
      .select({
        site_id: kitUsage.site_id,
        total_used: sql<number>`COALESCE(SUM(kits_used), 0)`,
        total_wasted: sql<number>`COALESCE(SUM(kits_wasted), 0)`,
        total_returned: sql<number>`COALESCE(SUM(kits_returned), 0)`,
        record_count: sql<number>`COUNT(*)`,
      })
      .from(kitUsage)
      .groupBy(kitUsage.site_id);

    const allSites = await db.select().from(sites);
    const enriched = siteUsage.map((row) => {
      const site = allSites.find((s) => s.id === row.site_id);
      return {
        ...row,
        site_name: site?.site_name || "Unknown",
        location: site?.location || "—",
        country: site?.country || "—",
      };
    });

    return successResponse(enriched);
  } catch (e) {
    return serverError(e);
  }
}
